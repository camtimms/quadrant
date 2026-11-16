-- Migration 8: the rewatch log (R83–R87, design section 24, task T38a).
--
-- A member who watches a film again can log a rewatch: their current
-- rating is kept as an earlier viewing and a new entry becomes current.
-- Migration 3 left room for this (NFR19): ratings.is_current, and a unique
-- index that allows only ONE current rating per member per film but any
-- number of earlier ones. No existing row changes.

-- ---------------------------------------------------------------------------
-- watch_number: which viewing an entry is
-- ---------------------------------------------------------------------------
-- 1 for a first rating, 2 for the first rewatch, and so on. "Watched 3
-- times" is simply the current entry's number, so no page has to count a
-- member's history. Every rating so far is a first viewing, so the default
-- of 1 is right for all of them.
--
-- Members cannot write this column: migration 3's grants name the columns a
-- member may insert and update, and this one is not among them. Only
-- log_rewatch (below) sets it.
alter table public.ratings
  add column watch_number smallint not null default 1
    check (watch_number >= 1);

-- ---------------------------------------------------------------------------
-- log_rewatch(): keep the current entry, add a new current one (R83)
-- ---------------------------------------------------------------------------
-- security definer: this runs with its OWNER's permissions, not the
-- caller's. It has to, because members are rightly not allowed to change
-- is_current themselves (that would let anyone "retire" a rating without a
-- new one). So this function does its own checking, and is careful to:
--   * refuse anyone who is not a member right now;
--   * only ever read or write rows of auth.uid(), the caller's own id
--     (there is no parameter for whose rating it is);
--   * leave the scores and the review to the table's own checks.
-- set search_path = '' stops a caller from slipping in their own object
-- with the same name as one used here; every name below is written in full.
create function public.log_rewatch(
  p_title_id bigint,
  p_quality smallint,
  p_enjoyment smallint,
  p_review text
)
returns public.ratings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  next_watch smallint;
  saved public.ratings;
begin
  if caller is null or not (select private.is_member()) then
    -- 42501 is Postgres's "permission denied", the same answer the
    -- table's own rules give a non-member.
    raise exception 'Only members can log a rewatch.'
      using errcode = '42501';
  end if;

  -- Two rewatches of the same film at the same moment (a double tap, two
  -- tabs) must queue, not both read "this is watch 2". Locking the current
  -- row is not enough: the second request would wait, then find that row
  -- no longer current and see no row at all. So this takes a lock on the
  -- member-and-film pair itself, held until the transaction ends; the
  -- second request waits here and then reads what the first one wrote.
  perform pg_advisory_xact_lock(hashtextextended(caller::text || ':' || p_title_id::text, 0));

  -- The next number follows the highest so far. With nothing rated yet
  -- (deleted in another tab, E71), this is 1: a plain first rating.
  select coalesce(max(watch_number), 0) + 1
    into next_watch
    from public.ratings
    where user_id = caller and title_id = p_title_id;

  -- Keep the current entry as an earlier viewing. This must happen before
  -- the insert, or the unique index would see two current rows.
  update public.ratings
    set is_current = false
    where user_id = caller and title_id = p_title_id and is_current;

  insert into public.ratings
    (user_id, title_id, quality, enjoyment, review, watch_number)
  values (
    caller,
    p_title_id,
    p_quality,
    p_enjoyment,
    -- Tidied exactly as save_rating does: trimmed, and "only spaces" is
    -- stored as no review.
    nullif(btrim(p_review), ''),
    next_watch
  )
  returning * into saved;

  -- If the insert fails (a score of 11, say), the whole function fails and
  -- the update above is undone with it: the current entry stays current.
  return saved;
end;
$$;

revoke all on function public.log_rewatch(bigint, smallint, smallint, text)
  from public, anon;
grant execute on function public.log_rewatch(bigint, smallint, smallint, text)
  to authenticated;
