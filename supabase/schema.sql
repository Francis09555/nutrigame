-- Nutrition Quest global leaderboard schema
-- Run this in the Supabase SQL editor, then deploy the Edge Functions.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_name text not null check (char_length(player_name) between 1 and 20),
  normalized_name text generated always as (lower(trim(player_name))) stored,
  avatar text not null default '🦸' check (char_length(avatar) <= 16),
  registration_date timestamptz not null default now(),
  total_games bigint not null default 0,
  total_wins bigint not null default 0,
  total_play_time bigint not null default 0,
  total_kills bigint not null default 0,
  best_endless_score bigint not null default 0,
  best_survival integer not null default 0,
  highest_level integer not null default 0,
  total_bosses bigint not null default 0,
  favorite_weapon text,
  evolutions_unlocked text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_name_unique on public.profiles(normalized_name);

create table if not exists public.run_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('endless')),
  started_at timestamptz not null default now(),
  last_checkpoint_at timestamptz not null default now(),
  checkpoint_count integer not null default 0,
  last_elapsed integer not null default 0,
  last_score bigint not null default 0,
  nonce uuid not null default gen_random_uuid(),
  completed boolean not null default false,
  expires_at timestamptz not null default (now() + interval '12 hours')
);
create index if not exists sessions_player_idx on public.run_sessions(player_id, started_at desc);

create table if not exists public.endless_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.run_sessions(id),
  player_id uuid not null references public.profiles(id) on delete cascade,
  score bigint not null check (score >= 0),
  survival_time integer not null check (survival_time >= 0),
  level integer not null check (level >= 1),
  bosses integer not null check (bosses >= 0),
  kills integer not null check (kills >= 0),
  favorite_weapon text,
  evolutions text[] not null default '{}',
  achieved_at timestamptz not null default now(),
  validation_version integer not null default 1
);
create index if not exists runs_score_idx on public.endless_runs(score desc, survival_time desc, level desc, bosses desc);
create index if not exists runs_survival_idx on public.endless_runs(survival_time desc, score desc);
create index if not exists runs_level_idx on public.endless_runs(level desc, score desc);
create index if not exists runs_boss_idx on public.endless_runs(bosses desc, score desc);

alter table public.profiles enable row level security;
alter table public.run_sessions enable row level security;
alter table public.endless_runs enable row level security;
create policy "public profiles readable" on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);
-- Sessions and runs are written only by service-role Edge Functions.
create policy "own sessions readable" on public.run_sessions for select to authenticated using (auth.uid()=player_id);
create policy "public runs readable" on public.endless_runs for select using (true);

create or replace view public.global_endless_leaderboard as
select r.player_id,p.player_name,p.avatar,max(r.score)::bigint as score,max(r.survival_time)::integer as survival_time,max(r.level)::integer as level,max(r.bosses)::integer as bosses,max(r.achieved_at) as achieved_at
from public.endless_runs r join public.profiles p on p.id=r.player_id
group by r.player_id,p.player_name,p.avatar;
grant select on public.global_endless_leaderboard to anon,authenticated;

-- Atomic server-only profile aggregation called by finish-run.
create or replace function public.apply_validated_run(
 p_session uuid,p_player uuid,p_score bigint,p_time integer,p_level integer,p_bosses integer,p_kills integer,p_weapon text,p_evolutions text[]
) returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
 if exists(select 1 from run_sessions where id=p_session and completed) then raise exception 'duplicate submission'; end if;
 update run_sessions set completed=true where id=p_session and player_id=p_player and not completed;
 if not found then raise exception 'invalid session'; end if;
 insert into endless_runs(session_id,player_id,score,survival_time,level,bosses,kills,favorite_weapon,evolutions)
 values(p_session,p_player,p_score,p_time,p_level,p_bosses,p_kills,p_weapon,coalesce(p_evolutions,'{}')) returning id into new_id;
 update profiles set total_games=total_games+1,total_play_time=total_play_time+p_time,total_kills=total_kills+p_kills,total_bosses=total_bosses+p_bosses,
 best_endless_score=greatest(best_endless_score,p_score),best_survival=greatest(best_survival,p_time),highest_level=greatest(highest_level,p_level),
 favorite_weapon=coalesce(p_weapon,favorite_weapon),evolutions_unlocked=(select array(select distinct unnest(evolutions_unlocked||coalesce(p_evolutions,'{}')))),updated_at=now()
 where id=p_player;
 return new_id;
end $$;
revoke all on function public.apply_validated_run from public,anon,authenticated;

create or replace function public.get_global_leaderboard(p_category text default 'score',p_search text default null,p_player uuid default null)
returns table(global_rank bigint,player_id uuid,player_name text,avatar text,score bigint,survival_time integer,level integer,bosses integer,achieved_at timestamptz)
language sql stable security definer set search_path=public as $$
 with ranked as (
  select row_number() over(order by
   case when p_category='survival' then g.survival_time end desc,
   case when p_category='level' then g.level end desc,
   case when p_category='bosses' then g.bosses end desc,
   g.score desc,g.survival_time desc,g.level desc,g.bosses desc) as global_rank,g.*
  from global_endless_leaderboard g
 ) select r.global_rank,r.player_id,r.player_name,r.avatar,r.score,r.survival_time,r.level,r.bosses,r.achieved_at from ranked r
 where (p_search is null and (r.global_rank<=100 or r.player_id=p_player)) or (p_search is not null and r.player_name ilike '%'||left(p_search,20)||'%')
 order by r.global_rank limit 101;
$$;
grant execute on function public.get_global_leaderboard(text,text,uuid) to anon,authenticated;
