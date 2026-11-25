-- =============================================================
-- Habit tracker: esquema inicial
-- Tablas: profiles, habits, habit_completions
-- Todas con Row Level Security: cada usuario solo ve sus filas.
-- =============================================================

-- ---------- Tipos ----------
create type public.habit_frequency as enum (
  'daily',
  'every_other_day',
  'weekly',
  'biweekly',
  'monthly',
  'weekly_flexible'
);

-- ---------- Función genérica updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  timezone text not null default 'UTC',
  streak_threshold smallint not null default 100
    check (streak_threshold between 50 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Valida que la zona horaria exista en PostgreSQL.
create or replace function public.validate_profile_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Zona horaria inválida: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.validate_profile_timezone();

-- Crea el perfil automáticamente cuando se registra un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text := coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC');
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;

  insert into public.profiles (id, name, timezone)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), ''), 80),
    v_tz
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- habits ----------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  color text not null default '#10b981' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon text not null default '✅' check (char_length(icon) between 1 and 16),
  frequency_type public.habit_frequency not null default 'daily',
  frequency_config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(frequency_config) = 'object'),
  start_date date not null default current_date,
  archived_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Permite una FK compuesta desde habit_completions para garantizar
  -- que un cumplimiento siempre pertenece al dueño del hábito.
  unique (id, user_id)
);

create index habits_user_id_idx on public.habits (user_id);
create index habits_user_active_idx on public.habits (user_id) where archived_on is null;

create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

-- ---------- habit_completions ----------
create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null,
  -- Fecha LOCAL del usuario (según la zona horaria de su perfil).
  date date not null,
  created_at timestamptz not null default now(),
  constraint habit_completions_habit_date_key unique (habit_id, date),
  constraint habit_completions_habit_owner_fkey
    foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);

create index habit_completions_user_date_idx on public.habit_completions (user_id, date);
create index habit_completions_user_habit_idx on public.habit_completions (user_id, habit_id);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

-- profiles: el perfil lo crea el trigger; el usuario solo puede leer y editar el suyo.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

-- habits
create policy "habits_select_own" on public.habits
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "habits_insert_own" on public.habits
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "habits_update_own" on public.habits
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habits_delete_own" on public.habits
  for delete to authenticated using ((select auth.uid()) = user_id);

-- habit_completions
create policy "completions_select_own" on public.habit_completions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "completions_insert_own" on public.habit_completions
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.habits h
      where h.id = habit_id and h.user_id = (select auth.uid())
    )
  );
create policy "completions_update_own" on public.habit_completions
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "completions_delete_own" on public.habit_completions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- El rol anónimo no necesita acceso a ninguna tabla.
revoke all on public.profiles, public.habits, public.habit_completions from anon;
