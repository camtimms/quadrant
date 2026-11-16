-- Migration 7: uploading your own picture (R79–R82, design 23.1, task T41a).
--
-- A private storage bucket for one small picture per member, its access
-- rules, and two profile columns: which picture a member has chosen, and a
-- version number raised on each upload.

-- ---------------------------------------------------------------------------
-- The bucket
-- ---------------------------------------------------------------------------
-- Private: every read goes through the policies below; nothing is served to
-- someone who merely has an address (R82, NFR6). Only JPEGs, at most 200 KB
-- (an uploaded 256 x 256 square is about 20-40 KB; design 23.3).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 204800, array['image/jpeg']);

-- ---------------------------------------------------------------------------
-- Who may do what with the files (row-level security on storage.objects)
-- ---------------------------------------------------------------------------
-- Each member's picture lives at avatars/<their id>/avatar.jpg. The folder
-- name is how a policy knows whose file it is: (storage.foldername(name))[1]
-- is the first folder in the path. auth.jwt() ->> 'sub' is the signed-in
-- member's id, as Supabase's storage guide writes it.

-- R82: every member sees every member's picture; nobody else sees any.
create policy "Members can see uploaded pictures"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select private.is_member())
  );

-- R80: a member uploads only into their own folder.
create policy "Members can upload their own picture"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (select private.is_member())
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

-- Replacing the picture in place ("upsert") also needs update permission.
create policy "Members can replace their own picture"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select private.is_member())
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  )
  with check (
    bucket_id = 'avatars'
    and (select private.is_member())
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

-- R81: a member removes only their own picture.
create policy "Members can remove their own picture"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select private.is_member())
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

-- ---------------------------------------------------------------------------
-- Which picture a member shows (R79)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column picture_source text not null default 'google'
    constraint profiles_picture_source_choice
      check (picture_source in ('google', 'upload', 'initial')),
  -- Raised on each upload; the picture's address carries it, so a new
  -- picture is never served from a stale cache (design 23.2).
  add column picture_version integer not null default 0
    constraint profiles_picture_version_not_negative
      check (picture_version >= 0);

-- Existing members keep what they chose with the old switch.
update public.profiles
  set picture_source = case when show_picture then 'google' else 'initial' end;

-- A member sets their own choice and version (row policies from migration 1
-- already limit them to their own row).
grant insert (picture_source, picture_version) on public.profiles to authenticated;
grant update (picture_source, picture_version) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Keeping the old switch in step
-- ---------------------------------------------------------------------------
-- show_picture still means "the Google picture is on": the sign-in code and
-- migration 5's trigger (which empties avatar_url when it is off) rely on it.
-- Until the app's form is changed (T41d) it still writes show_picture, so
-- the two are kept in step in BOTH directions:
--   - the choice changed: the switch follows it;
--   - only the switch changed (the current form): the choice follows it.
-- Named to sort before profiles_clear_hidden_picture: triggers of the same
-- kind run in name order, and that one must see the settled switch.
create function private.sync_picture_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.picture_source = 'google' and not new.show_picture then
      new.picture_source := 'initial';
    end if;
  elsif new.picture_source is distinct from old.picture_source then
    null; -- the choice leads; the switch follows below
  elsif new.show_picture is distinct from old.show_picture then
    new.picture_source := case when new.show_picture then 'google' else 'initial' end;
  end if;
  new.show_picture := (new.picture_source = 'google');
  return new;
end;
$$;

create trigger profiles_a_sync_picture_source
  before insert or update on public.profiles
  for each row
  execute function private.sync_picture_source();
