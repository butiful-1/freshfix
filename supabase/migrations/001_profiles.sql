-- Run this in your Supabase project:
-- Dashboard → SQL Editor → New query → paste → Run

-- ── Profiles table ──────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  plan        text    not null default 'free',
  swaps_used  integer not null default 0,
  swaps_month text    not null default '',
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Row-level security ───────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── Auto-create profile on signup ───────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, plan, swaps_used, swaps_month)
  values (
    new.id,
    'free',
    0,
    to_char(now() at time zone 'utc', 'YYYY-MM')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
