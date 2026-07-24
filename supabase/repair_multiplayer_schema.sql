-- COMPLETE MULTIPLAYER SCHEMA REPAIR
-- Safe for game progress: this only resets temporary multiplayer rooms.

drop function if exists public.leave_multiplayer_room(uuid) cascade;
drop function if exists public.cleanup_multiplayer_rooms() cascade;
drop function if exists public.can_join_multiplayer_room(uuid,uuid) cascade;
drop table if exists public.multiplayer_members cascade;
drop table if exists public.multiplayer_rooms cascade;

create table public.multiplayer_rooms(
 id uuid primary key default gen_random_uuid(),
 code text not null unique check(code ~ '^[A-Z2-9]{6}$'),
 host_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'lobby' check(status in('lobby','playing','closed')),
 max_players smallint not null default 3 check(max_players between 2 and 3),
 created_at timestamptz not null default now(),
 last_active timestamptz not null default now()
);

create table public.multiplayer_members(
 room_id uuid not null references public.multiplayer_rooms(id) on delete cascade,
 player_id uuid not null references auth.users(id) on delete cascade,
 player_name text not null,
 avatar text not null default '🦸',
 ready boolean not null default false,
 connected boolean not null default true,
 last_seen timestamptz not null default now(),
 reconnect_state jsonb,
 primary key(room_id,player_id)
);

create index multiplayer_rooms_code_idx on public.multiplayer_rooms(code);
create index multiplayer_members_room_idx on public.multiplayer_members(room_id,connected);

alter table public.multiplayer_rooms enable row level security;
alter table public.multiplayer_members enable row level security;

create policy "authenticated can read active rooms" on public.multiplayer_rooms
 for select to authenticated using(status<>'closed');
create policy "authenticated can create own room" on public.multiplayer_rooms
 for insert to authenticated with check(auth.uid()=host_id);
create policy "host can update room" on public.multiplayer_rooms
 for update to authenticated using(auth.uid()=host_id) with check(auth.uid()=host_id);

create policy "members readable" on public.multiplayer_members
 for select to authenticated using(true);
create policy "update self" on public.multiplayer_members
 for update to authenticated using(auth.uid()=player_id) with check(auth.uid()=player_id);
create policy "delete self" on public.multiplayer_members
 for delete to authenticated using(auth.uid()=player_id);

create function public.can_join_multiplayer_room(p_room uuid,p_player uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from multiplayer_rooms r where r.id=p_room and r.status='lobby')
 and (exists(select 1 from multiplayer_members m where m.room_id=p_room and m.player_id=p_player)
      or (select count(*) from multiplayer_members m where m.room_id=p_room and m.connected)<3);
$$;
revoke all on function public.can_join_multiplayer_room(uuid,uuid) from public,anon;
grant execute on function public.can_join_multiplayer_room(uuid,uuid) to authenticated;

create policy "join as self" on public.multiplayer_members
 for insert to authenticated
 with check(auth.uid()=player_id and public.can_join_multiplayer_room(room_id,player_id));

create function public.leave_multiplayer_room(p_room uuid)
returns void language plpgsql security definer set search_path=public as $$
declare next_host uuid;
begin
 delete from multiplayer_members where room_id=p_room and player_id=auth.uid();
 if not exists(select 1 from multiplayer_members where room_id=p_room) then
  delete from multiplayer_rooms where id=p_room; return;
 end if;
 if exists(select 1 from multiplayer_rooms where id=p_room and host_id=auth.uid()) then
  select player_id into next_host from multiplayer_members where room_id=p_room order by last_seen desc limit 1;
  update multiplayer_rooms set host_id=next_host,last_active=now() where id=p_room;
 end if;
end $$;
grant execute on function public.leave_multiplayer_room(uuid) to authenticated;

create function public.cleanup_multiplayer_rooms()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 delete from multiplayer_rooms where last_active<now()-interval '30 minutes';
 get diagnostics n=row_count;return n;
end $$;
revoke all on function public.cleanup_multiplayer_rooms() from public,anon,authenticated;

-- Add the recreated tables to Supabase Realtime.
do $$ begin
 alter publication supabase_realtime add table public.multiplayer_rooms;
exception when duplicate_object then null; end $$;
do $$ begin
 alter publication supabase_realtime add table public.multiplayer_members;
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';

-- Verification output: player_id must appear in this result.
select column_name,data_type
from information_schema.columns
where table_schema='public' and table_name='multiplayer_members'
order by ordinal_position;
