-- Migration 1: who is allowed in, and who they are.
-- Design reference: docs/specs/02-design.md sections 3.1, 3.2 and 3.5.
--
-- A "migration" is a file of SQL that changes the database's structure. They
-- are applied in filename order, once each, so the same sequence of files
-- rebuilds an identical database anywhere (dev, prod, a fresh project).
--
-- The idea that matters most in this file: ROW-LEVEL SECURITY (RLS).
-- With RLS enabled on a table, Postgres itself checks every single row a
-- request tries to read or write against the table's "policies". No matching
-- policy means no access. So even if the web app had a bug, or someone called
-- the database directly with their own session, the rules below still hold.

-- ---------------------------------------------------------------------------
-- A schema the API cannot see
-- ---------------------------------------------------------------------------
-- Supabase's API exposes the "public" schema. Anything in "private" can be
-- used by the database's own rules but cannot be called from outside.
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- allowed_emails: the invite list (R4, R6)
-- ---------------------------------------------------------------------------
-- The owner edits this table by hand in the Supabase dashboard. One row per
-- invited friend. Remove the row and that person is locked out.
create table public.allowed_emails (
  -- Always stored in lower case, so "Sam@Gmail.com" and "sam@gmail.com" can
  -- never be two different entries. The check refuses anything else.
  email text primary key check (email = lower(email)),
  -- A reminder for the owner, e.g. "Sam from uni". Never shown in the app.
  note text,
  added_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;

-- Deliberately NO policies. RLS on + no policy = nobody can read or write
-- this table through the API, signed in or not. That keeps friends' email
-- addresses private (NFR5) and stops a member inviting other people (R6).
-- The dashboard and the functions below are not subject to RLS, so the
-- owner can still edit it and is_member() can still read it.
--
-- Belt and braces: also remove the table-level permissions.
revoke all on public.allowed_emails from anon, authenticated;

-- ---------------------------------------------------------------------------
-- is_member(): "is the person making this request on the invite list?"
-- ---------------------------------------------------------------------------
-- Every policy in the app calls this. It is the single definition of
-- "friends only" (R5, NFR1).
--
--   security definer  runs with the permissions of the function's owner, not
--                     the caller's. That is what lets it read allowed_emails
--                     even though the caller cannot.
--   stable            tells Postgres the answer will not change within one
--                     query, so it can be worked out once and reused.
--   search_path = ''  a standard safety measure for security definer
--                     functions: every table must be named in full
--                     (public.allowed_emails), so nobody can trick the
--                     function into reading a look-alike table.
--
-- auth.jwt() is the caller's sign-in token. It is signed by Supabase, so the
-- caller cannot forge or edit it. The email inside it is the address Google
-- verified at sign-in.
create function private.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.allowed_emails
    where email = lower(auth.jwt() ->> 'email')
  );
$$;

-- Only signed-in users need to run it (inside policies). Nobody else may.
revoke all on function private.is_member() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_member() to authenticated;

-- ---------------------------------------------------------------------------
-- profiles: one row per member (R7)
-- ---------------------------------------------------------------------------
create table public.profiles (
  -- The same id Supabase Auth gives the user. "references auth.users" means
  -- a profile cannot exist for a user who does not.
  id uuid primary key references auth.users (id),
  -- Shown beside the member's ratings. 1 to 40 characters after trimming
  -- spaces, so a name of only spaces is refused.
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 40),
  created_at timestamptz not null default now()
);

-- Note there is no email column. A member's address stays in Supabase's own
-- auth.users table, which the API does not expose, so members only ever see
-- each other's display names (NFR5).

alter table public.profiles enable row level security;

-- Table-level permissions say which KINDS of action a role may attempt at
-- all; the policies below then decide WHICH ROWS. Both must allow a request.
-- Signed-out visitors ("anon") get nothing. Members may read, add and change
-- profiles, but never delete them.
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

-- A note on "(select ...)": wrapping the function calls like this lets
-- Postgres work the answer out once per query instead of once per row.
-- The result is identical; it is only faster.

-- Any member can see every member's display name.
create policy "Members can read all profiles"
  on public.profiles
  for select
  to authenticated
  using ((select private.is_member()));

-- A member can create a profile only for themselves.
-- auth.uid() is the id of whoever is making the request.
create policy "Members can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (
    (select private.is_member())
    and id = (select auth.uid())
  );

-- A member can change only their own profile.
--   using       which existing rows they may pick to change
--   with check  what the row must still look like afterwards
-- Having both stops someone editing their own row into somebody else's.
create policy "Members can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (
    (select private.is_member())
    and id = (select auth.uid())
  )
  with check (
    (select private.is_member())
    and id = (select auth.uid())
  );

-- No delete policy: profiles are never deleted through the app. A removed
-- member's ratings stay visible under their name (requirements E16).
