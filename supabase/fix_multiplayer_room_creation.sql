-- Run this once if room creation/joining was blocked by the original
-- recursive multiplayer_members insert policy.
create or replace function public.can_join_multiplayer_room(p_room uuid,p_player uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from multiplayer_rooms r where r.id=p_room and r.status='lobby')
 and (exists(select 1 from multiplayer_members m where m.room_id=p_room and m.player_id=p_player)
      or (select count(*) from multiplayer_members m where m.room_id=p_room and m.connected)<3);
$$;
revoke all on function public.can_join_multiplayer_room(uuid,uuid) from public,anon;
grant execute on function public.can_join_multiplayer_room(uuid,uuid) to authenticated;

drop policy if exists "join as self" on public.multiplayer_members;
create policy "join as self" on public.multiplayer_members
for insert to authenticated
with check(
 auth.uid()=player_id
 and public.can_join_multiplayer_room(room_id,player_id)
);
