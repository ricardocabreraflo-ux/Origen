-- Esquema del sistema de rastreo de competencia en Instagram (ver PRD
-- "Sistema de Rastreo de Competencia y Recreación de Contenido Viral").
-- Cópialo y pégalo completo en Supabase → SQL Editor → New query → Run,
-- después de haber corrido schema.sql (usa la misma extensión pgcrypto).

create extension if not exists pgcrypto;

-- Cuentas de Instagram que se monitorean. "active = false" se usa tanto
-- para competidores desactivados a mano como para candidatos que el
-- descubrimiento automático propuso y todavía nadie aprobó (RF1/RF2).
create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text,
  active boolean not null default true,
  source text not null default 'manual'
    check (source in ('manual', 'discovered')),
  followers_count integer,
  avg_engagement_rate numeric,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competitors_active_idx on competitors (active);

-- Posts recolectados por competidor. engagement_rate y is_viral se
-- recalculan cada vez que corre el pipeline (RF3/RF4/RF5).
create table if not exists competitor_posts (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references competitors(id) on delete cascade,

  ig_post_id text not null,
  permalink text not null,
  format text not null default 'unknown'
    check (format in ('reel', 'carousel', 'image', 'unknown')),
  caption text,
  hashtags text[] default '{}',

  posted_at timestamptz not null,
  likes_count integer not null default 0,
  comments_count integer not null default 0,

  engagement_rate numeric,
  baseline_engagement_rate numeric,
  is_viral boolean not null default false,
  viral_reason text,

  raw_data jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (competitor_id, ig_post_id)
);

create index if not exists competitor_posts_competitor_idx on competitor_posts (competitor_id, posted_at desc);
create index if not exists competitor_posts_viral_idx on competitor_posts (is_viral);

-- Una alerta por cada post marcado como viral, con el borrador de
-- recreación generado por IA y el estado de seguimiento de Ricardo (RF6,
-- RF8, RF9).
create table if not exists viral_alerts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references competitor_posts(id) on delete cascade unique,

  -- pending: recién detectada, sin revisar
  -- saved: guardada para después
  -- used: se usó como inspiración para publicar algo
  -- dismissed: descartada
  status text not null default 'pending'
    check (status in ('pending', 'saved', 'used', 'dismissed')),

  analysis jsonb,
  recreation jsonb,

  telegram_sent_at timestamptz,
  telegram_error text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists viral_alerts_status_idx on viral_alerts (status);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists competitors_set_updated_at on competitors;
create trigger competitors_set_updated_at
  before update on competitors
  for each row
  execute function set_updated_at();

drop trigger if exists competitor_posts_set_updated_at on competitor_posts;
create trigger competitor_posts_set_updated_at
  before update on competitor_posts
  for each row
  execute function set_updated_at();

drop trigger if exists viral_alerts_set_updated_at on viral_alerts;
create trigger viral_alerts_set_updated_at
  before update on viral_alerts
  for each row
  execute function set_updated_at();

-- Igual que con bookings: solo las Netlify Functions (Service Role Key)
-- pueden leer/escribir estas tablas, nunca el navegador directamente.
alter table competitors enable row level security;
alter table competitor_posts enable row level security;
alter table viral_alerts enable row level security;
