-- Run this in Supabase Dashboard → SQL Editor

create table if not exists saved_recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  recipe_data jsonb not null,
  created_at  timestamptz default now()
);

alter table saved_recipes enable row level security;

-- Owner can read/write/delete their own recipes
create policy "owner_all" on saved_recipes
  for all using (auth.uid() = user_id);

-- Anyone (including anonymous) can read a recipe by ID for sharing
create policy "public_read" on saved_recipes
  for select using (true);
