-- Secure live-event administrators.
-- Run once, then add only your own authenticated user UUID.
create table if not exists public.developer_admins(
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 note text
);
alter table public.developer_admins enable row level security;
-- No browser read/write policies: only service-role Edge Functions can inspect it.

-- After registering your own game account, use ONE of these methods:
-- Method A: find your UUID in Authentication > Users, then run:
-- insert into public.developer_admins(user_id,note)
-- values ('YOUR-AUTH-USER-UUID','Francis live event administrator')
-- on conflict(user_id) do nothing;

-- Method B: add the account by its exact Nutrition Quest player name:
-- insert into public.developer_admins(user_id,note)
-- select id,'Francis live event administrator' from public.profiles
-- where normalized_name=lower(trim('Francis'))
-- on conflict(user_id) do nothing;

create table if not exists public.admin_event_log(
 id bigint generated always as identity primary key,
 admin_id uuid not null references auth.users(id) on delete cascade,
 event_type text not null,
 room_code text,
 scope text not null check(scope in('room','global')),
 created_at timestamptz not null default now()
);
alter table public.admin_event_log enable row level security;
-- No client policies. Edge Functions write logs with the service role.
create index if not exists admin_event_log_recent_idx on public.admin_event_log(created_at desc);
