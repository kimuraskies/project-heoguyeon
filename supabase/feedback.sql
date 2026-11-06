-- User feedback from the game's settings menu (design/feedback.js).
-- Anonymous visitors may only INSERT, within the limits below. Nobody can read rows through the
-- public API: read them in the Supabase dashboard (Table editor) or with the service role.
create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('bug','idea','praise','etc')),
  stars       smallint check (stars between 1 and 5),
  body        text not null check (char_length(body) between 5 and 1000),
  nickname    text check (char_length(nickname) <= 20),
  context     jsonb not null default '{}'::jsonb check (pg_column_size(context) < 2048),
  status      text not null default 'new' check (status in ('new','read','done'))
);

alter table public.feedback enable row level security;

drop policy if exists "anyone can send feedback" on public.feedback;
create policy "anyone can send feedback" on public.feedback
  for insert to anon, authenticated
  with check (status = 'new');

-- no select / update / delete policies: the public key can write feedback but never read it back
revoke select, update, delete on public.feedback from anon, authenticated;
grant insert on public.feedback to anon, authenticated;
