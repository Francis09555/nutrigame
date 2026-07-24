-- Nutrition Quest 2–3 player Realtime co-op rooms
-- Run after schema.sql, then enable Realtime for both tables in Dashboard.
create table if not exists public.multiplayer_rooms(
 id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[A-Z2-9]{6}$'),
 host_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'lobby' check(status in('lobby','playing','closed')),
 max_players smallint not null default 3 check(max_players between 2 and 3),
 created_at timestamptz not null default now(),last_active timestamptz not null default now()
);
create table if not exists public.multiplayer_members(
 room_id uuid not null references public.multiplayer_rooms(id) on delete cascade,
 player_id uuid not null references auth.users(id) on delete cascade,
 player_name text not null,avatar text not null default '🦸',ready boolean not null default false,
 connected boolean not null default true,last_seen timestamptz not null default now(),
 reconnect_state jsonb,primary key(room_id,player_id)
);
alter table public.multiplayer_rooms enable row level security;
alter table public.multiplayer_members enable row level security;
create policy "authenticated can read active rooms" on public.multiplayer_rooms for select to authenticated using(status<>'closed');
create policy "authenticated can create own room" on public.multiplayer_rooms for insert to authenticated with check(auth.uid()=host_id);
create policy "host can update room" on public.multiplayer_rooms for update to authenticated using(auth.uid()=host_id);
create policy "members readable" on public.multiplayer_members for select to authenticated using(true);
-- Security-definer helper avoids recursive RLS evaluation while enforcing
-- the three-player room limit.
create or replace function public.can_join_multiplayer_room(p_room uuid,p_player uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from multiplayer_rooms r where r.id=p_room and r.status='lobby')
 and (exists(select 1 from multiplayer_members m where m.room_id=p_room and m.player_id=p_player)
      or (select count(*) from multiplayer_members m where m.room_id=p_room and m.connected)<3);
$$;
revoke all on function public.can_join_multiplayer_room(uuid,uuid) from public,anon;
grant execute on function public.can_join_multiplayer_room(uuid,uuid) to authenticated;
drop policy if exists "join as self" on public.multiplayer_members;
create policy "join as self" on public.multiplayer_members for insert to authenticated
with check(auth.uid()=player_id and public.can_join_multiplayer_room(room_id,player_id));
create policy "update self" on public.multiplayer_members for update to authenticated using(auth.uid()=player_id) with check(auth.uid()=player_id);

create or replace function public.leave_multiplayer_room(p_room uuid) returns void language plpgsql security definer set search_path=public as $$
declare next_host uuid;begin
 delete from multiplayer_members where room_id=p_room and player_id=auth.uid();
 if not exists(select 1 from multiplayer_members where room_id=p_room) then delete from multiplayer_rooms where id=p_room;return;end if;
 if exists(select 1 from multiplayer_rooms where id=p_room and host_id=auth.uid()) then
  select player_id into next_host from multiplayer_members where room_id=p_room order by last_seen desc limit 1;
  update multiplayer_rooms set host_id=next_host,last_active=now() where id=p_room;
 end if;
end $$;
grant execute on function public.leave_multiplayer_room(uuid) to authenticated;

create or replace function public.cleanup_multiplayer_rooms() returns integer language plpgsql security definer set search_path=public as $$
declare n integer;begin delete from multiplayer_rooms where last_active<now()-interval '30 minutes';get diagnostics n=row_count;return n;end $$;
revoke all on function public.cleanup_multiplayer_rooms() from public,anon,authenticated;

-- Realtime publication (safe if already added).
do $$ begin alter publication supabase_realtime add table public.multiplayer_rooms;exception when duplicate_object then null;end $$;
do $$ begin alter publication supabase_realtime add table public.multiplayer_members;exception when duplicate_object then null;end $$;
