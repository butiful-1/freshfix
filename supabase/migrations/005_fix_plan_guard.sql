-- Run in Supabase Dashboard → SQL Editor.
-- Fix for 004: inside a SECURITY DEFINER function, current_user is the
-- function owner (postgres), so the dashboard exemption matched everyone.
-- Use session_user (the connecting role: 'authenticator' for API calls,
-- 'postgres' for the dashboard) and drop SECURITY DEFINER.
create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
as $$
begin
  if new.plan is distinct from old.plan
     and coalesce(auth.role(), '') <> 'service_role'
     and session_user not in ('postgres', 'supabase_admin') then
    raise exception 'plan can only be changed by the server'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
