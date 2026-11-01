-- AI Buddy Phase 1 schema.
-- Credentials live only in auth.users (managed by Supabase Auth). Everything here is protected by RLS.

create extension if not exists moddatetime schema extensions;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- avatars: catalogue of starter avatars (read-only for clients).
-- ---------------------------------------------------------------------------
create table public.avatars (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  asset_ref text not null,
  animation_config jsonb not null default '{}'::jsonb,
  appearance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- personality_presets: versioned, immutable preset definitions (read-only for clients).
-- ---------------------------------------------------------------------------
create table public.personality_presets (
  id text not null check (id ~ '^[a-z0-9-]{2,40}$'),
  version integer not null check (version > 0),
  name text not null,
  config jsonb not null,
  default_avatar_id text not null references public.avatars (id),
  voice_preferences jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (id, version)
);

-- ---------------------------------------------------------------------------
-- buddies: the persistent Buddy identity. One per account in Phase 1.
-- ---------------------------------------------------------------------------
create table public.buddies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  preset_id text not null,
  preset_version integer not null,
  avatar_id text not null references public.avatars (id),
  voice_preference jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buddies_one_per_owner unique (owner_id),
  constraint buddies_preset_fk foreign key (preset_id, preset_version)
    references public.personality_presets (id, version)
);

create index buddies_preset_idx on public.buddies (preset_id, preset_version);

-- ---------------------------------------------------------------------------
-- buddy_personality_settings: user-approved customisation layered over the preset.
-- ---------------------------------------------------------------------------
create table public.buddy_personality_settings (
  buddy_id uuid primary key references public.buddies (id) on delete cascade,
  adjustments jsonb not null default '{}'::jsonb check (jsonb_typeof(adjustments) = 'object'),
  catchphrase_preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(catchphrase_preferences) = 'object'),
  behaviour_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(behaviour_settings) = 'object'),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- devices: installations linked to an account.
-- ---------------------------------------------------------------------------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  device_type text not null check (device_type in ('windows-desktop', 'android-tablet', 'web', 'other')),
  operating_system text,
  os_version text,
  app_version text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_owner_installation_unique unique (owner_id, installation_id)
);

-- updated_at maintenance
create trigger profiles_updated_at before update on public.profiles
  for each row execute function extensions.moddatetime (updated_at);
create trigger avatars_updated_at before update on public.avatars
  for each row execute function extensions.moddatetime (updated_at);
create trigger buddies_updated_at before update on public.buddies
  for each row execute function extensions.moddatetime (updated_at);
create trigger buddy_personality_settings_updated_at before update on public.buddy_personality_settings
  for each row execute function extensions.moddatetime (updated_at);
create trigger devices_updated_at before update on public.devices
  for each row execute function extensions.moddatetime (updated_at);

-- Ownership of a buddy cannot be transferred.
create function public.prevent_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger buddies_owner_immutable before update on public.buddies
  for each row execute function public.prevent_owner_change();
create trigger devices_owner_immutable before update on public.devices
  for each row execute function public.prevent_owner_change();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.avatars enable row level security;
alter table public.personality_presets enable row level security;
alter table public.buddies enable row level security;
alter table public.buddy_personality_settings enable row level security;
alter table public.devices enable row level security;

create policy "Profiles: owner can read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Profiles: owner can update" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Avatars: anyone can read" on public.avatars
  for select to anon, authenticated using (true);

create policy "Presets: anyone can read" on public.personality_presets
  for select to anon, authenticated using (true);

create policy "Buddies: owner can read" on public.buddies
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Buddies: owner can create" on public.buddies
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Buddies: owner can update" on public.buddies
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Buddies: owner can delete" on public.buddies
  for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "Buddy settings: owner can read" on public.buddy_personality_settings
  for select to authenticated
  using (exists (select 1 from public.buddies b where b.id = buddy_id and b.owner_id = (select auth.uid())));
create policy "Buddy settings: owner can create" on public.buddy_personality_settings
  for insert to authenticated
  with check (exists (select 1 from public.buddies b where b.id = buddy_id and b.owner_id = (select auth.uid())));
create policy "Buddy settings: owner can update" on public.buddy_personality_settings
  for update to authenticated
  using (exists (select 1 from public.buddies b where b.id = buddy_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.buddies b where b.id = buddy_id and b.owner_id = (select auth.uid())));

create policy "Devices: owner can read" on public.devices
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Devices: owner can create" on public.devices
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Devices: owner can update" on public.devices
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Devices: owner can delete" on public.devices
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- Least privilege: clients never write catalogue tables.
revoke insert, update, delete, truncate on public.avatars, public.personality_presets from anon, authenticated;
revoke all on public.profiles, public.buddies, public.buddy_personality_settings, public.devices from anon;

-- ---------------------------------------------------------------------------
-- Account deletion (self-service). Cascades to all user data.
-- ---------------------------------------------------------------------------
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
