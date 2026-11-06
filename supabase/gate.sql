-- Invite gate for design/gate.js (applied to Project-KBOMANAGER as migration "invite_gate").
-- The tables are closed to the public API (RLS on, no policies, no grants); visitors only reach
-- the four SECURITY DEFINER functions below. Passwords are bcrypt-hashed (pgcrypto); the browser
-- keeps a random 48-hex session token. The invite code itself is created by hand and is not in
-- this file:  insert into public.invite_codes(code, max_uses) values ('KBO-XXXXXX', 30);
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.invite_codes (
  code       text primary key,
  max_uses   int  not null default 30,
  used       int  not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.players (
  id          bigint generated always as identity primary key,
  login_id    text not null unique check (login_id ~ '^[a-z0-9_]{4,16}$'),
  pw_hash     text not null,
  invite_code text references public.invite_codes(code),
  created_at  timestamptz not null default now(),
  last_login  timestamptz,
  fail_count  int not null default 0,
  locked_until timestamptz
);
create table if not exists public.sessions (
  token      text primary key,
  player_id  bigint not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.invite_codes enable row level security;
alter table public.players enable row level security;
alter table public.sessions enable row level security;
revoke all on public.invite_codes, public.players, public.sessions from anon, authenticated;

-- sign up: valid ID and password, an active code with room left, an unused ID
create or replace function public.gate_register(p_id text, p_pw text, p_code text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id text := lower(trim(coalesce(p_id,''))); v_code text := upper(trim(coalesce(p_code,''))); v_pid bigint; v_tok text; c invite_codes;
begin
  if v_id !~ '^[a-z0-9_]{4,16}$' then return json_build_object('ok',false,'err','ID는 영문 소문자·숫자·밑줄 4~16자예요.'); end if;
  if length(coalesce(p_pw,'')) < 6 or length(p_pw) > 72 then return json_build_object('ok',false,'err','비밀번호는 6~72자예요.'); end if;
  select * into c from invite_codes where code = v_code for update;
  if not found or not c.active then return json_build_object('ok',false,'err','초대코드가 맞지 않아요.'); end if;
  if c.used >= c.max_uses then return json_build_object('ok',false,'err','초대 인원이 모두 찼어요.'); end if;
  if exists(select 1 from players where login_id = v_id) then return json_build_object('ok',false,'err','이미 있는 ID예요.'); end if;
  insert into players(login_id, pw_hash, invite_code, last_login) values (v_id, crypt(p_pw, gen_salt('bf', 10)), v_code, now()) returning id into v_pid;
  update invite_codes set used = used + 1 where code = v_code;
  v_tok := encode(gen_random_bytes(24), 'hex');
  insert into sessions(token, player_id, expires_at) values (v_tok, v_pid, now() + interval '30 days');
  return json_build_object('ok',true,'token',v_tok,'id',v_id);
end $$;

-- log in: 10 wrong passwords lock the ID for 10 minutes
create or replace function public.gate_login(p_id text, p_pw text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id text := lower(trim(coalesce(p_id,''))); p players; v_tok text;
begin
  select * into p from players where login_id = v_id for update;
  if not found then return json_build_object('ok',false,'err','ID 또는 비밀번호가 맞지 않아요.'); end if;
  if p.locked_until is not null and p.locked_until > now() then
    return json_build_object('ok',false,'err','비밀번호를 여러 번 틀려 잠시 잠겼어요. 10분 뒤에 다시 시도해 주세요.'); end if;
  if p.locked_until is not null then update players set fail_count = 0, locked_until = null where id = p.id; p.fail_count := 0; end if;
  if p.pw_hash <> crypt(coalesce(p_pw,''), p.pw_hash) then
    update players set fail_count = p.fail_count + 1,
      locked_until = case when p.fail_count + 1 >= 10 then now() + interval '10 minutes' else null end
    where id = p.id;
    return json_build_object('ok',false,'err','ID 또는 비밀번호가 맞지 않아요.');
  end if;
  update players set fail_count = 0, locked_until = null, last_login = now() where id = p.id;
  delete from sessions where player_id = p.id and expires_at < now();
  v_tok := encode(gen_random_bytes(24), 'hex');
  insert into sessions(token, player_id, expires_at) values (v_tok, p.id, now() + interval '30 days');
  return json_build_object('ok',true,'token',v_tok,'id',p.login_id);
end $$;

create or replace function public.gate_check(p_token text)
returns json language sql security definer set search_path = public as $$
  select coalesce((select json_build_object('ok',true,'id',p.login_id) from sessions s join players p on p.id = s.player_id
    where s.token = p_token and s.expires_at > now()), json_build_object('ok',false));
$$;

create or replace function public.gate_logout(p_token text)
returns void language sql security definer set search_path = public as $$ delete from sessions where token = p_token; $$;

revoke all on function public.gate_register(text,text,text), public.gate_login(text,text), public.gate_check(text), public.gate_logout(text) from public;
grant execute on function public.gate_register(text,text,text), public.gate_login(text,text), public.gate_check(text), public.gate_logout(text) to anon, authenticated;

-- ---- migration "invite_code_entry": enter with the invite code alone (current mode) ----
-- Sessions can belong to a code instead of an account; deactivating the code ends those sessions.
alter table public.sessions alter column player_id drop not null;
alter table public.sessions add column if not exists invite_code text references public.invite_codes(code);
alter table public.invite_codes add column if not exists entries int not null default 0;

create or replace function public.gate_enter(p_code text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_code text := upper(trim(coalesce(p_code,''))); c invite_codes; v_tok text;
begin
  select * into c from invite_codes where code = v_code for update;
  if not found or not c.active then
    perform pg_sleep(0.4); -- slows down guessing
    return json_build_object('ok',false,'err','초대코드가 맞지 않아요.');
  end if;
  update invite_codes set entries = entries + 1 where code = v_code;
  v_tok := encode(gen_random_bytes(24), 'hex');
  insert into sessions(token, invite_code, expires_at) values (v_tok, v_code, now() + interval '10 years');
  return json_build_object('ok',true,'token',v_tok,'id',null);
end $$;

create or replace function public.gate_check(p_token text)
returns json language sql security definer set search_path = public as $$
  select coalesce((select json_build_object('ok',true,'id',p.login_id) from sessions s left join players p on p.id = s.player_id
    left join invite_codes c on c.code = s.invite_code
    where s.token = p_token and s.expires_at > now() and (s.invite_code is null or c.active)), json_build_object('ok',false));
$$;

revoke all on function public.gate_enter(text) from public;
grant execute on function public.gate_enter(text) to anon, authenticated;

-- ---- migration "long_code_sessions": a device that entered stays in ----
-- gate_enter now issues 10-year sessions, and existing code sessions were extended to match.
-- The client no longer re-checks a stored session, so deactivating a code only stops new entries.
-- (function body as above, with interval '10 years')
update public.sessions set expires_at = created_at + interval '10 years' where invite_code is not null;
