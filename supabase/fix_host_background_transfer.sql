-- Run once on an existing multiplayer database.
create or replace function public.claim_multiplayer_host(p_room uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare r multiplayer_rooms;
begin
 if not exists(select 1 from multiplayer_members where room_id=p_room and player_id=auth.uid() and connected) then return false;end if;
 select * into r from multiplayer_rooms where id=p_room for update;
 if not found then return false;end if;
 if r.host_id=auth.uid() then update multiplayer_rooms set last_active=now() where id=p_room;return true;end if;
 if r.last_active>now()-interval '10 seconds' then return false;end if;
 update multiplayer_rooms set host_id=auth.uid(),last_active=now() where id=p_room;return true;
end $$;
revoke all on function public.claim_multiplayer_host(uuid) from public,anon;
grant execute on function public.claim_multiplayer_host(uuid) to authenticated;
notify pgrst,'reload schema';
