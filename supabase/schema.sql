-- Esquema de base de datos para el sistema de citas de Origen Brows & Hair Studio.
-- Cópialo y pégalo completo en Supabase → SQL Editor → New query → Run.

create extension if not exists pgcrypto;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null unique,

  service_id text not null,
  service_name text not null,
  price_label text not null,
  deposit_amount numeric not null,

  customer_name text not null,
  customer_phone text not null,
  notes text,

  booking_date date not null,
  start_time time not null,
  end_time time not null,

  -- pending: horario apartado, esperando confirmación del depósito (expira solo)
  -- confirmed: depósito confirmado por la administradora, horario bloqueado en definitiva
  -- cancelled: cancelada manualmente (por la administradora o por no-show)
  -- expired: pasaron los 30 minutos sin confirmarse el depósito
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'expired')),

  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),

  -- id del evento en Google Calendar, para poder borrarlo si se cancela la cita
  calendar_event_id text
);

-- Evita que dos citas activas (pendientes o confirmadas) ocupen el mismo
-- horario. Esta es la garantía real contra doble-reserva: aunque dos
-- personas intenten reservar el mismo bloque al mismo tiempo, la segunda
-- inserción falla por violar este índice único.
create unique index if not exists bookings_active_slot_unique
  on bookings (booking_date, start_time)
  where status in ('pending', 'confirmed');

create index if not exists bookings_date_idx on bookings (booking_date);
create index if not exists bookings_status_idx on bookings (status);

-- Mantiene updated_at al día en cada cambio.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bookings_set_updated_at on bookings;
create trigger bookings_set_updated_at
  before update on bookings
  for each row
  execute function set_updated_at();

-- Seguridad: nadie puede leer ni escribir esta tabla directamente desde el
-- navegador. Todo el acceso pasa por las Netlify Functions, que usan la
-- Service Role Key (secreta, nunca expuesta al cliente) y por lo tanto se
-- saltan RLS. No se crean policies a propósito.
alter table bookings enable row level security;
