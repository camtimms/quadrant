-- Migration 5: members' pictures (R61, R62, R63; NFR5 as amended in v6).
-- Design reference: docs/specs/02-design.md section 16.1.
--
-- Each member's Google account picture can be shown beside their name. Only
-- the picture's ADDRESS is kept here, never a copy of the image, and only
-- while the member has left it switched on.
--
-- The whole of this file exists to guarantee one thing: the stored address
-- is always a picture on Google's own servers. Every friend's browser
-- fetches whatever address is stored. If a member could store an address of
-- their own choosing, they could learn when each friend opens a page, and
-- from where. So members are not allowed to write the column at all; the
-- database fills it in itself, and checks what it is about to store.

-- ---------------------------------------------------------------------------
-- The rule: what counts as a Google picture address
-- ---------------------------------------------------------------------------
-- Written once, as a function, so the three places that need it (the check
-- on the column, and the function that fills it in) can never disagree.
--
-- "~" tests text against a pattern. Piece by piece:
--   ^https://                  starts with https (never plain http)
--   lh[0-9]                    lh3, lh4, ... Google's picture servers
--   \.googleusercontent\.com   that exact name ("\." is a literal dot)
--   /                          then a slash, so the name must END there:
--                              "googleusercontent.com.evil.example" fails
-- The length limit refuses anything absurd; real addresses are about 100
-- characters.
--
-- "immutable" promises the answer depends only on the input, which is what
-- lets a check constraint use it. coalesce(..., false) makes "no address"
-- answer false rather than "unknown".
create function private.is_google_picture(address text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    address ~ '^https://lh[0-9]\.googleusercontent\.com/'
      and char_length(address) <= 500,
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Two new columns on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  -- The member's choice (R63). On unless they switch it off. Existing rows
  -- get the default too.
  add column show_picture boolean not null default true,
  -- null = no picture: the member has none, or has switched it off. The app
  -- then shows the first letter of their name instead.
  add column avatar_url text
    constraint profiles_avatar_url_is_google
      check (avatar_url is null or private.is_google_picture(avatar_url));

comment on column public.profiles.avatar_url is
  'Address of the member''s Google account picture, or null. Written only by sync_profile_picture().';

-- ---------------------------------------------------------------------------
-- Who may write which columns
-- ---------------------------------------------------------------------------
-- Until now members could insert and update ANY column of their own profile
-- row. Take that away and give back only the columns that are theirs to
-- set. avatar_url and created_at are deliberately missing from both lists.
--
-- (id is in the update list because the app saves a profile with "insert,
-- or update if it exists", which names every column it was given. The row
-- policies from migration 1 still stop a member turning their row into
-- somebody else's.)
--
-- Reading is unchanged: members may read every column of every profile.
revoke insert, update on public.profiles from authenticated;
grant insert (id, display_name, show_picture)
  on public.profiles to authenticated;
grant update (id, display_name, show_picture)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Switching the picture off removes the address, always
-- ---------------------------------------------------------------------------
-- A trigger (see migration 3 for what one is). Just before any profile row
-- is saved, if the picture is switched off, the address is emptied. The
-- member's choice therefore takes effect in the same step as it is saved,
-- whoever is saving and whatever else they forgot to do: a row can never
-- say "off" and still hold an address.
create function private.clear_hidden_picture()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.show_picture then
    new.avatar_url := null;
  end if;
  return new;
end;
$$;

create trigger profiles_clear_hidden_picture
  before insert or update on public.profiles
  for each row
  execute function private.clear_hidden_picture();

-- ---------------------------------------------------------------------------
-- sync_profile_picture(): the only way an address gets stored (R62)
-- ---------------------------------------------------------------------------
-- The app calls this after a member signs in and after they save their
-- choice. It takes no arguments on purpose: there is nothing a caller can
-- pass in. It looks at whoever is calling (auth.uid()) and sets THEIR
-- avatar_url to the picture Google supplied at sign-in, or to null if they
-- have switched it off, have no picture, or the address fails the rule.
--
-- Where the address comes from: Supabase keeps what Google said about a
-- user in auth.users.raw_user_meta_data. The field is "avatar_url" (checked
-- with a real sign-in, design 16.8).
--
-- Why the rule is checked here as well: a signed-in user can EDIT that
-- record about themselves through Supabase's API. "It was in the sign-in
-- record" therefore does not prove "Google put it there". The address is
-- only stored if it passes is_google_picture().
--
-- security definer: it runs with the rights of the function's owner, not
-- the caller's. It has to, because members cannot read auth.users and may
-- not write avatar_url. That power is safe to lend out because the function
-- does exactly one fixed thing to exactly one row, the caller's own.
-- (Compare save_rating in migration 3, which needs no borrowed rights and
-- so is "security invoker".)
--
-- A caller who is not a member, or has no profile yet, changes nothing.
create function public.sync_profile_picture()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles as p
  set avatar_url = case
    when p.show_picture then (
      select u.raw_user_meta_data ->> 'avatar_url'
      from auth.users as u
      where u.id = p.id
        and private.is_google_picture(u.raw_user_meta_data ->> 'avatar_url')
    )
    -- Switched off: null. (The trigger above would do this anyway.)
    else null
  end
  where p.id = (select auth.uid())
    and (select private.is_member());
$$;

-- Functions can be run by everyone unless told otherwise. Signed-in users
-- only; a signed-out visitor may not call it at all.
revoke all on function public.sync_profile_picture() from public, anon;
grant execute on function public.sync_profile_picture() to authenticated;
