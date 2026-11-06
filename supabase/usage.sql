-- Anonymous play tracking (design/track.js). Each browser gets a random device id; no name,
-- e-mail or IP is stored. The public key may only insert rows; reading needs the service role
-- (Supabase dashboard / SQL editor), where the two views below summarise usage.
create table if not exists public.events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  device text not null check (length(device) between 8 and 64),
  kind text not null check (kind in ('open', 'career', 'play', 'season')),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 2000)
);
create index if not exists events_device_idx on public.events (device, created_at);
create index if not exists events_created_idx on public.events (created_at);

alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;
grant insert (device, kind, data) on public.events to anon, authenticated;
grant usage on sequence public.events_id_seq to anon, authenticated;
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to anon, authenticated with check (true);

-- one row per day (Korea time): how many people played, and how much
create or replace view public.usage_daily with (security_invoker = true) as
select (created_at at time zone 'Asia/Seoul')::date as day,
       count(distinct device) as players,
       count(*) filter (where kind = 'open') as opens,
       count(distinct device) filter (where kind = 'career') as new_careers,
       count(*) filter (where kind = 'play') as play_pings,
       count(*) filter (where kind = 'season') as seasons_finished
from public.events group by 1 order by 1 desc;

-- one row per device: when they started, how many days they came back, how far they got
create or replace view public.usage_players with (security_invoker = true) as
select device,
       min(created_at) as first_seen,
       max(created_at) as last_seen,
       count(distinct (created_at at time zone 'Asia/Seoul')::date) as days_played,
       count(*) filter (where kind = 'open') as opens,
       max(case when jsonb_typeof(data->'gp') = 'number' then (data->>'gp')::numeric end) as most_games_in_a_season,
       max(case when jsonb_typeof(data->'year') = 'number' then (data->>'year')::numeric end) as latest_year,
       (array_agg(data->>'team' order by created_at desc) filter (where data ? 'team'))[1] as team
from public.events group by device order by last_seen desc;
revoke all on public.usage_daily, public.usage_players from anon, authenticated;
