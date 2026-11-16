-- Migration 6: likes on reviews (R69–R72, design section 20, task T42a).
--
-- A member can like a written review on a film's page, their own included;
-- every member can see how many likes a review has and who gave them.
-- Editing a review keeps its likes; removing its text, or deleting the
-- rating, removes them.

-- ---------------------------------------------------------------------------
-- review_likes: one row per member per liked review
-- ---------------------------------------------------------------------------
create table public.review_likes (
  -- A like belongs to the rating row that holds the review. save_rating
  -- edits that same row in place, so an edited review keeps its likes; a
  -- deleted rating takes its likes with it ("on delete cascade").
  rating_id bigint not null references public.ratings (id) on delete cascade,
  -- Pointing at profiles, like ratings.user_id, so a like can be shown with
  -- the liker's name in one nested query.
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- One like per member per review (E51): a second one is refused by the
  -- database, however quickly or often the button is pressed.
  primary key (rating_id, user_id)
);

-- The primary key already makes "likes of this review" fast. This makes
-- "likes by this member" fast too, which the cascade from profiles needs.
create index review_likes_by_user on public.review_likes (user_id);

alter table public.review_likes enable row level security;

-- Table permissions first, then row policies; a request needs both (see
-- migration 1). There is no update permission at all: a like is added or
-- taken away, never changed into another.
revoke all on public.review_likes from anon, authenticated;
grant select, delete on public.review_likes to authenticated;
grant insert (rating_id, user_id) on public.review_likes to authenticated;

-- R70: every member sees every like, with the liker's name.
create policy "Members can read all likes"
  on public.review_likes
  for select
  to authenticated
  using ((select private.is_member()));

-- R69, R71, E54: a member likes only as themselves (their own review is
-- allowed), and only a current rating that has a written review.
create policy "Members can like a written review, as themselves"
  on public.review_likes
  for insert
  to authenticated
  with check (
    (select private.is_member())
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.ratings as rated
      where rated.id = rating_id
        and rated.is_current
        and rated.review is not null
    )
  );

-- A member takes back only their own like.
create policy "Members can remove their own likes"
  on public.review_likes
  for delete
  to authenticated
  using (
    (select private.is_member())
    and user_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- R72: removing a review's text removes its likes
-- ---------------------------------------------------------------------------
-- The likes are other members' rows, which the policies above (rightly) do
-- not let the reviewer delete. So this trigger function runs with its
-- owner's rights ("security definer"). It is kept to one statement that
-- only ever touches the likes of the rating being updated, and its
-- search_path is empty so it cannot be tricked into using another table.
create function private.clear_review_likes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.review_likes where rating_id = new.id;
  return new;
end;
$$;

revoke all on function private.clear_review_likes() from public;

-- Runs only when a review goes from some text to none (save_rating stores a
-- blank review as null). Editing the text, or changing only the scores,
-- leaves the likes alone.
create trigger ratings_clear_likes_when_review_removed
  after update of review on public.ratings
  for each row
  when (old.review is not null and new.review is null)
  execute function private.clear_review_likes();
