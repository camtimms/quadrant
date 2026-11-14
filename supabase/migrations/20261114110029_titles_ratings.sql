-- Migration 3: films and ratings.
-- Design reference: docs/specs/02-design.md sections 3.3 to 3.7.
--
-- Two tables:
--   titles   our own copy of each film somebody has rated (R14)
--   ratings  one row per viewing: who, which film, two scores, a review
--
-- The rules from migration 1 carry on here. Every policy calls
-- private.is_member(), so only invited friends can see or change anything
-- (NFR1), and a member can only ever write rows that carry their own id (R22).

-- ---------------------------------------------------------------------------
-- titles: our copy of each rated film (R14)
-- ---------------------------------------------------------------------------
-- Why keep a copy at all? So charts and lists can show a film's name, year
-- and poster without asking TMDB every time, and keep working when TMDB is
-- down.
--
-- Why "titles" and not "films"? So that TV series can be added later without
-- renaming anything (NFR20). media_type says what kind of thing a row is;
-- today the only kind allowed is 'movie'.
create table public.titles (
  -- "generated always as identity": the database hands out 1, 2, 3, ... and
  -- refuses any attempt to choose the number by hand.
  id bigint generated always as identity primary key,
  media_type text not null default 'movie' check (media_type in ('movie')),
  -- TMDB's id for the film. Ratings never point at this; they point at our
  -- own id above, so nothing else depends on TMDB's numbering.
  tmdb_id integer not null,
  title text not null,
  -- Both may be missing: TMDB does not have a date or a poster for every
  -- film (R10).
  release_year smallint,
  -- TMDB's path such as '/abc.jpg', not a full address.
  poster_path text,
  -- When this copy was last refreshed from TMDB. Their terms forbid keeping
  -- data for more than six months, so stale rows get re-fetched (E10).
  fetched_at timestamptz not null,

  -- One row per film. A unique constraint is also an index, so this is what
  -- makes "do we already have film 10999?" fast.
  unique (media_type, tmdb_id)
);

alter table public.titles enable row level security;

-- Members may read titles and nothing else. There is deliberately no insert,
-- update or delete for them: if there were, any member could write junk film
-- rows straight into the database using their own session. Film rows are
-- written only by the server, using the secret key, after it has fetched the
-- details from TMDB itself (design section 4.2).
revoke all on public.titles from anon, authenticated;
grant select on public.titles to authenticated;
-- "service_role" is what the secret key signs in as. It skips row-level
-- security entirely, which is why that key must never leave the server.
grant select, insert, update on public.titles to service_role;

create policy "Members can read all titles"
  on public.titles
  for select
  to authenticated
  using ((select private.is_member()));

-- ---------------------------------------------------------------------------
-- ratings: one row per viewing (R15 to R22)
-- ---------------------------------------------------------------------------
create table public.ratings (
  id bigint generated always as identity primary key,
  -- Pointing at profiles (not auth.users) means every rating has a display
  -- name to show beside it.
  user_id uuid not null references public.profiles (id),
  title_id bigint not null references public.titles (id),

  -- The "check" rules are the database's own copy of R16 and R17. The form
  -- checks the same things, but a request that skips the form still cannot
  -- store an 11, a -1 or a 501-character review.
  --
  -- smallint holds whole numbers only, and "not null" means a score cannot
  -- be left out. So 0 is a real score, and "no score" cannot exist (E14).
  quality smallint not null check (quality between 0 and 10),
  enjoyment smallint not null check (enjoyment between 0 and 10),
  -- null means "no review". char_length counts characters, not bytes, so an
  -- emoji or an accented letter counts as one.
  review text check (char_length(review) <= 500),

  -- Is this the member's current opinion of the film? Today it is always
  -- true: editing a rating overwrites it. The column exists so that a rewatch
  -- log can be added later (NFR19): a rewatch would mark the old row false
  -- and add a new one, and no existing data would need to change.
  is_current boolean not null default true,

  created_at timestamptz not null default now(),
  -- Kept up to date by the trigger further down (R20).
  updated_at timestamptz not null default now()
);

-- A member can have only ONE current rating per film (R19).
--
-- This is a "partial" unique index: the "where is_current" means the rule
-- only applies to current rows, leaving room for older viewings later.
-- Because the database enforces it, two browser tabs saving at the same
-- instant still cannot produce two rows.
create unique index ratings_one_current
  on public.ratings (user_id, title_id)
  where is_current;

-- Makes "every current rating of this film" fast (the film page and the
-- group average).
create index ratings_current_by_title
  on public.ratings (title_id)
  where is_current;

alter table public.ratings enable row level security;

-- Table-level permissions, then row-level policies; both must allow a
-- request (see migration 1).
--
-- The insert and update permissions are limited to named columns. A member
-- can set the scores and review, and say which film a new rating is for, but
-- cannot touch id, is_current, created_at or updated_at. Those are filled in
-- by the database, so nobody can back-date a rating or quietly retire one.
revoke all on public.ratings from anon, authenticated;
grant select, delete on public.ratings to authenticated;
grant insert (user_id, title_id, quality, enjoyment, review)
  on public.ratings to authenticated;
grant update (quality, enjoyment, review)
  on public.ratings to authenticated;

-- Every member can see every rating: that is the point of the app.
create policy "Members can read all ratings"
  on public.ratings
  for select
  to authenticated
  using ((select private.is_member()));

-- A member can add a rating only under their own id (R22).
create policy "Members can add their own ratings"
  on public.ratings
  for insert
  to authenticated
  with check (
    (select private.is_member())
    and user_id = (select auth.uid())
  );

-- A member can change only their own ratings (R20, R22).
create policy "Members can update their own ratings"
  on public.ratings
  for update
  to authenticated
  using (
    (select private.is_member())
    and user_id = (select auth.uid())
  )
  with check (
    (select private.is_member())
    and user_id = (select auth.uid())
  );

-- A member can delete only their own ratings (R21, R22).
create policy "Members can delete their own ratings"
  on public.ratings
  for delete
  to authenticated
  using (
    (select private.is_member())
    and user_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- updated_at: record when a rating was last changed (R20)
-- ---------------------------------------------------------------------------
-- A trigger is a function the database runs by itself when something happens
-- to a table. This one runs just before any row in ratings is updated and
-- stamps the time. Doing it here means it cannot be forgotten by the app or
-- faked by a request.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- "new" is the row as it is about to be saved.
  new.updated_at := now();
  return new;
end;
$$;

create trigger ratings_set_updated_at
  before update on public.ratings
  for each row
  execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- save_rating(): create or edit, in one step (R15, R19, R20)
-- ---------------------------------------------------------------------------
-- The app does not decide between "insert" and "update" itself. It calls
-- this, and the database does whichever applies:
--
--   insert ... on conflict ... do update
--
-- tries to add a row and, if the member already has a current rating for the
-- film (the unique index above objects), changes that row instead. It is a
-- single atomic step, so pressing Save twice, or in two tabs at once, can
-- never leave two rows or an error (E5).
--
-- security invoker: it runs with the CALLER's permissions, not the owner's.
-- Every policy above still applies, so the function gives nobody any power
-- they did not already have. It always writes under auth.uid(), the caller's
-- own id; there is no parameter for whose rating it is.
create function public.save_rating(
  p_title_id bigint,
  p_quality smallint,
  p_enjoyment smallint,
  p_review text
)
returns public.ratings
language sql
security invoker
set search_path = ''
as $$
  insert into public.ratings (user_id, title_id, quality, enjoyment, review)
  values (
    (select auth.uid()),
    p_title_id,
    p_quality,
    p_enjoyment,
    -- Tidy the review: trim spaces, and store "nothing but spaces" as null
    -- (no review) rather than as an empty string.
    nullif(btrim(p_review), '')
  )
  on conflict (user_id, title_id) where is_current
  do update set
    -- "excluded" is the row we tried to insert.
    quality = excluded.quality,
    enjoyment = excluded.enjoyment,
    review = excluded.review
  returning *;
$$;

revoke all on function public.save_rating(bigint, smallint, smallint, text)
  from public, anon;
grant execute on function public.save_rating(bigint, smallint, smallint, text)
  to authenticated;
