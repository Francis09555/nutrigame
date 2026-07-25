-- Permanent Battle Points and exclusive Starter Weapon progression
alter table public.profiles add column if not exists battle_points bigint not null default 0 check(battle_points>=0);
alter table public.profiles add column if not exists selected_starter text;
alter table public.profiles add column if not exists free_starter_spin boolean not null default true;
alter table public.profiles add column if not exists banned boolean not null default false;

create table if not exists public.starter_inventory(
 user_id uuid not null references auth.users(id) on delete cascade,
 weapon_id text not null,
 copies integer not null default 1 check(copies>=1),
 star_rank smallint not null default 0 check(star_rank between 0 and 5),
 unlocked_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,weapon_id)
);
create table if not exists public.gacha_state(
 user_id uuid primary key references auth.users(id) on delete cascade,
 total_spins integer not null default 0,
 since_rare integer not null default 0,
 since_epic integer not null default 0,
 since_legendary integer not null default 0,
 since_mythic integer not null default 0,
 updated_at timestamptz not null default now()
);
create table if not exists public.progression_admins(
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'admin' check(role in('admin','owner')),
 created_at timestamptz not null default now()
);
create table if not exists public.bp_reward_claims(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 claim_key text not null,event_type text not null,bp_awarded integer not null,created_at timestamptz not null default now(),
 unique(user_id,claim_key)
);
create table if not exists public.progression_admin_log(
 id bigint generated always as identity primary key,admin_id uuid not null references auth.users(id),target_id uuid not null references auth.users(id),action text not null,details jsonb,created_at timestamptz not null default now()
);
alter table public.starter_inventory enable row level security;alter table public.gacha_state enable row level security;alter table public.progression_admins enable row level security;alter table public.bp_reward_claims enable row level security;alter table public.progression_admin_log enable row level security;
drop policy if exists "own starter inventory read" on public.starter_inventory;create policy "own starter inventory read" on public.starter_inventory for select to authenticated using(auth.uid()=user_id);
drop policy if exists "own gacha state read" on public.gacha_state;create policy "own gacha state read" on public.gacha_state for select to authenticated using(auth.uid()=user_id);
-- All writes use service-role Edge Functions. No browser write policies exist.
notify pgrst,'reload schema';

-- Prevent authenticated browsers from changing protected progression columns
-- through the otherwise legitimate own-profile update policy.
create or replace function public.protect_progression_columns()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if auth.role()='authenticated' and (
   new.battle_points is distinct from old.battle_points or
   new.selected_starter is distinct from old.selected_starter or
   new.free_starter_spin is distinct from old.free_starter_spin or
   new.banned is distinct from old.banned
 ) then raise exception 'Permanent progression must be changed by a verified server function';
 end if;
 return new;
end $$;
drop trigger if exists protect_progression_columns_trigger on public.profiles;
create trigger protect_progression_columns_trigger before update on public.profiles
for each row execute function public.protect_progression_columns();

-- A short atomic lock rejects simultaneous duplicate spin requests.
create table if not exists public.gacha_spin_locks(
 user_id uuid not null references auth.users(id) on delete cascade,
 time_bucket bigint not null,
 created_at timestamptz not null default now(),
 primary key(user_id,time_bucket)
);
alter table public.gacha_spin_locks enable row level security;
-- No client policies; only service-role functions can insert.
