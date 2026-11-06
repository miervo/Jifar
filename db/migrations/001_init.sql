-- Схема для приглашения на день рождения Лены.
-- Миграция идемпотентна: её можно безопасно запускать повторно.

create extension if not exists pgcrypto;

-- Анкеты гостей -------------------------------------------------------------
create table if not exists public.guest_answers (
  id                          uuid primary key default gen_random_uuid(),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  -- Ключ идемпотентности: повтор одного и того же запроса не создаёт новую строку.
  idempotency_key             uuid not null unique,
  nickname                    text not null check (char_length(nickname) between 1 and 120),
  alcohol_preferences_text    text not null check (char_length(alcohol_preferences_text) between 1 and 1000),
  allergy_text                text not null check (char_length(allergy_text) between 1 and 1500),
  favorite_animal             text not null check (char_length(favorite_animal) between 1 and 120),
  favorite_cartoon_character  text not null check (char_length(favorite_cartoon_character) between 1 and 200),
  attendance_confirmed        boolean not null default false
);

create index if not exists guest_answers_created_at_idx on public.guest_answers (created_at desc);

-- Сессии организатора: в базе лежит только SHA-256 от токена из cookie ------
create table if not exists public.admin_sessions (
  token_hash  text primary key,
  csrf_token  text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index if not exists admin_sessions_expires_idx on public.admin_sessions (expires_at);

-- Счётчики попыток (вход, отправка анкет). IP хранится только в виде HMAC ----
create table if not exists public.rate_limits (
  key          text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now()
);

-- Защита данных ------------------------------------------------------------
-- RLS включён, политик нет: через публичный API Supabase (anon / authenticated)
-- прочитать или изменить эти таблицы нельзя. Сайт работает только через
-- серверное подключение DATABASE_URL под ролью владельца таблиц.
alter table public.guest_answers  enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.rate_limits    enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.guest_answers, public.admin_sessions, public.rate_limits from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on public.guest_answers, public.admin_sessions, public.rate_limits from authenticated';
  end if;
end
$$;
