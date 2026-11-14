-- Migration 2: refuse people who were never invited (R4).
-- Design reference: docs/specs/02-design.md section 5.2.
--
-- Migration 1 already protects the DATA: an uninvited person who signs in
-- sees nothing, because every policy calls private.is_member(). This file
-- adds two things on top:
--
--   1. A sign-up hook, so an uninvited person never gets an account at all
--      and is told why.
--   2. A way for the app to ask "is the current user a member?", so it can
--      show a proper message instead of an empty page.
--
-- Neither is relied on for security. If both were deleted, the rules in
-- migration 1 would still keep every row private.

-- ---------------------------------------------------------------------------
-- 1. The sign-up hook
-- ---------------------------------------------------------------------------
-- Supabase Auth can call a database function just before it creates a new
-- user (the "Before User Created" hook). It passes details of the person
-- signing up as JSON and waits for an answer:
--   '{}'                        allow
--   {"error": {...}}            refuse, with this message
--
-- The hook only runs when an account is being CREATED. Someone who already
-- has an account and is later removed from the invite list is handled by
-- is_member() instead.
--
-- IMPORTANT: creating the function does not switch the hook on. That is done
-- once per project in the dashboard: Authentication > Hooks.
create function public.hook_check_invite(event jsonb)
returns jsonb
language plpgsql
-- security definer + empty search_path: same reasons as is_member() in
-- migration 1. The Auth service's role cannot read allowed_emails itself.
security definer
set search_path = ''
as $$
declare
  -- "event -> 'user' ->> 'email'" reads event.user.email out of the JSON.
  signup_email text := lower(event -> 'user' ->> 'email');
begin
  if exists (
    select 1 from public.allowed_emails where email = signup_email
  ) then
    return '{}'::jsonb;
  end if;

  -- The same answer for every refused address, so the message cannot be
  -- used to discover who IS on the list (requirements E17).
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'This app is invite-only. Sign in with the Google account you were invited with.'
    )
  );
end;
$$;

-- Only Supabase's Auth service may call it. Without the revoke, anyone could
-- call it through the API with made-up addresses and learn who is invited
-- from which ones are allowed.
revoke all on function public.hook_check_invite(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_check_invite(jsonb) to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- 2. "Am I a member?"
-- ---------------------------------------------------------------------------
-- private.is_member() cannot be called from the app, on purpose. This is a
-- thin public wrapper that answers only about the CALLER: it takes no
-- arguments, so it cannot be used to ask about anyone else.
--
-- security invoker (the default, stated here to be explicit) means it runs
-- with the caller's own permissions and adds no power of its own.
create function public.is_current_user_member()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_member();
$$;

revoke all on function public.is_current_user_member() from public, anon;
grant execute on function public.is_current_user_member() to authenticated;
