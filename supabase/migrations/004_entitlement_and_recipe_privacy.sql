-- Run in Supabase Dashboard → SQL Editor.
-- 1) Plan/entitlement changes are only allowed through trusted server logic
--    (service role / dashboard). Users keep updating their own profile
--    (usage counters, preferences), but cannot change `plan`.
-- 2) Saved recipes are private to their owner unless explicitly shared.

-- ── 1. Guard profiles.plan ──────────────────────────────────────────────
create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.plan is distinct from old.plan
     and coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'plan can only be changed by the server'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_plan on public.profiles;
create trigger protect_profile_plan
  before update on public.profiles
  for each row execute function public.protect_profile_plan();

-- ── 2. Saved recipes: private by default, public only when shared ───────
alter table public.saved_recipes
  add column if not exists is_shared boolean not null default false;

-- Owner keeps full access (existing policy "owner_all").
-- Replace the blanket public read with "shared recipes only".
drop policy if exists "public_read" on public.saved_recipes;
create policy "public_read_shared" on public.saved_recipes
  for select using (is_shared = true);
