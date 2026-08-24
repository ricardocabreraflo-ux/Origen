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
  calendar_event_id text,

  -- cuándo se envió el recordatorio de WhatsApp (null = todavía no se manda)
  reminder_sent_at timestamptz,

  -- true si esta cita se agendó usando el descuento de la tarjeta de
  -- lealtad (la clienta ya completó su ciclo de visitas). Sirve para que
  -- se vea marcada en el panel de citas y la administradora la revise
  -- antes de confirmar el depósito.
  reward_redemption boolean not null default false
);

-- Preferencia de cada clienta sobre cómo quiere que le avisemos (WhatsApp,
-- correo, ambos o ninguno) cuando gana una recompensa de lealtad. La
-- llave es su teléfono (últimos 10 dígitos, sin importar el formato con
-- el que lo haya escrito).
-- Por si la tabla bookings ya existía de antes de agregar esta columna.
alter table bookings add column if not exists reward_redemption boolean not null default false;

-- Cómo se pagó el anticipo: por transferencia manual (confirmada a mano
-- por la administradora), con tarjeta a través de Mercado Pago
-- (confirmada automáticamente por el webhook de pago), o en efectivo
-- (citas agendadas manualmente por la administradora, ya cobradas en el
-- momento). mp_payment_id y mp_preference_id solo se llenan cuando el
-- pago fue con Mercado Pago.
alter table bookings add column if not exists payment_method text not null default 'bank_transfer';
alter table bookings drop constraint if exists bookings_payment_method_check;
alter table bookings
  add constraint bookings_payment_method_check
  check (payment_method in ('bank_transfer', 'mercado_pago', 'cash'));
alter table bookings add column if not exists mp_payment_id text;
alter table bookings add column if not exists mp_preference_id text;

-- Para citas que no generan ingreso real (ej. ganadoras de una rifa,
-- cortesías) aunque tengan un anticipo/precio de lista asociado. Sirve
-- para que la administradora pueda excluirlas de sus cuentas de ingresos.
alter table bookings add column if not exists revenue_exempt boolean not null default false;
alter table bookings add column if not exists revenue_exempt_reason text;

create table if not exists client_preferences (
  phone text primary key,
  email text,
  notify_channel text not null default 'whatsapp'
    check (notify_channel in ('whatsapp', 'email', 'both', 'none')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rango de tiempo que ocupa realmente la cita: desde que empieza hasta que
-- termina, más 30 minutos de colchón de limpieza. Como los servicios ya no
-- duran todos lo mismo (antes eran bloques fijos de 2 horas para
-- cualquier servicio), la protección contra traslapes ya no puede basarse
-- en que el horario de inicio sea idéntico — ahora se compara el rango
-- completo de cada cita. Postgres no permite cambiar la fórmula de una
-- columna generada in situ, así que si ya existía con otro colchón (antes
-- eran 15 minutos) hay que quitarla junto con lo que depende de ella y
-- recrearla con el valor nuevo.
alter table bookings drop constraint if exists bookings_no_overlap;
drop index if exists bookings_occupied_range_idx;
alter table bookings drop column if exists occupied_range;

alter table bookings
  add column occupied_range tsrange
  generated always as (
    tsrange(
      (booking_date + start_time)::timestamp,
      (booking_date + end_time)::timestamp + interval '30 minutes'
    )
  ) stored;

-- Ya no aplica: el índice único por horario exacto no tiene sentido con
-- duraciones variables (dos citas con distinta hora de inicio igual
-- podrían traslaparse).
drop index if exists bookings_active_slot_unique;

create index if not exists bookings_occupied_range_idx on bookings using gist (occupied_range);

-- Esta es la garantía real contra doble-reserva: Postgres rechaza
-- cualquier inserción o actualización cuyo rango de tiempo se traslape
-- con el de otra cita activa (pendiente o confirmada), sin importar que
-- dos personas intenten reservar horarios distintos que se encimen al
-- mismo tiempo.
alter table bookings drop constraint if exists bookings_no_overlap;
alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (occupied_range with &&)
  where (status in ('pending', 'confirmed'));

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

drop trigger if exists client_preferences_set_updated_at on client_preferences;
create trigger client_preferences_set_updated_at
  before update on client_preferences
  for each row
  execute function set_updated_at();

-- Seguridad: nadie puede leer ni escribir estas tablas directamente desde
-- el navegador. Todo el acceso pasa por las Netlify Functions, que usan
-- la Service Role Key (secreta, nunca expuesta al cliente) y por lo tanto
-- se saltan RLS. No se crean policies a propósito.
alter table bookings enable row level security;
alter table client_preferences enable row level security;

-- Monto real cobrado por la cita (no el anticipo). Para servicios de
-- precio fijo se llena solo al crear la cita; para "Valoración previa"
-- (Botox Capilar, Keratina Alisante, Servicio Especial) se llena a mano
-- después, cuando ya se sabe cuánto se cobró. Sirve para los reportes de
-- ingresos y el punto de equilibrio — sin este dato esas citas no se
-- pueden contar como ingreso real.
alter table bookings add column if not exists total_amount numeric;

-- Gastos del negocio, para llevar control financiero y calcular el punto
-- de equilibrio. Dos tipos:
--   variable: un gasto puntual, con su fecha exacta (ej. compra de
--     insumos el 12 de agosto).
--   fixed: un gasto que se repite cada mes (ej. renta, luz, tu sueldo).
--     Se captura una sola vez con su monto mensual y se cuenta
--     automáticamente cada mes desde start_date hasta end_date (o hasta
--     hoy si sigue activo) — no hay que volver a capturarlo.
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category text not null default 'otro'
    check (category in ('renta', 'insumos', 'servicios', 'sueldo', 'marketing', 'mantenimiento', 'otro')),
  amount numeric not null,
  kind text not null default 'variable'
    check (kind in ('variable', 'fixed')),

  -- Para gastos variables: la fecha exacta del gasto.
  expense_date date,

  -- Para gastos fijos: desde cuándo aplica cada mes y, si ya no aplica
  -- (lo editaste o lo diste de baja), hasta cuándo. active=false lo
  -- excluye de los meses futuros pero conserva su historial en los
  -- reportes de meses pasados.
  start_date date,
  end_date date,
  active boolean not null default true,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (kind = 'variable' and expense_date is not null and start_date is null and end_date is null)
    or
    (kind = 'fixed' and expense_date is null and start_date is not null)
  )
);

create index if not exists expenses_kind_idx on expenses (kind);
create index if not exists expenses_expense_date_idx on expenses (expense_date);

-- Correo opcional de la clienta (con el teléfono/WhatsApp basta para
-- agendar; el correo es solo para poder armar una base de datos y
-- mandar publicidad/promociones más adelante).
alter table bookings add column if not exists customer_email text;

-- Gasto tipo "inversión" (ej. remodelación del estudio): se captura el
-- monto TOTAL una sola vez y se reparte entre los meses que decida la
-- administradora (amortize_months), en vez de contarse completo en un
-- solo mes o repetirse indefinidamente como un gasto fijo normal.
alter table expenses add column if not exists amortize_months integer;

alter table expenses drop constraint if exists expenses_category_check;
alter table expenses add constraint expenses_category_check
  check (category in ('renta', 'insumos', 'servicios', 'sueldo', 'marketing', 'mantenimiento', 'inversion', 'otro'));

alter table expenses drop constraint if exists expenses_kind_check;
alter table expenses add constraint expenses_kind_check
  check (kind in ('variable', 'fixed', 'investment'));

alter table expenses drop constraint if exists expenses_check;
alter table expenses add constraint expenses_check
  check (
    (kind = 'variable' and expense_date is not null and start_date is null and end_date is null and amortize_months is null)
    or
    (kind = 'fixed' and expense_date is null and start_date is not null and amortize_months is null)
    or
    (kind = 'investment' and expense_date is null and start_date is not null and amortize_months is not null and amortize_months > 0)
  );

drop trigger if exists expenses_set_updated_at on expenses;
create trigger expenses_set_updated_at
  before update on expenses
  for each row
  execute function set_updated_at();

alter table expenses enable row level security;

-- Clientas que la administradora agrega a mano (ej. de su agenda física,
-- clientas de siempre que todavía no reservan por el sitio), para poder
-- incluirlas también en la lista de contactos y en futuras promociones.
-- No están ligadas a ninguna cita — para eso ya existe bookings.
create table if not exists manual_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists manual_clients_set_updated_at on manual_clients;
create trigger manual_clients_set_updated_at
  before update on manual_clients
  for each row
  execute function set_updated_at();

alter table manual_clients enable row level security;

-- ============================================================
-- Marketing y promociones: códigos de descuento, referidos,
-- sorteos y eventos de medición propios.
-- ============================================================

-- Campañas de descuento (temporada, combo, primera visita, etc.) y
-- también las recompensas de referido de un solo uso que se generan
-- automáticamente cuando el referido de una clienta confirma su primera
-- cita (ver referral_redemptions y _lib/confirmBooking.js).
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  -- para landing pages tipo /promo-:slug — null en recompensas de
  -- referido, que no tienen página propia
  slug text unique,
  campaign_name text not null,
  description text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  kind text not null default 'campaign' check (kind in ('campaign', 'referral_reward')),
  starts_at date,
  ends_at date,
  active boolean not null default true,
  max_redemptions integer, -- null = sin límite
  redemptions_count integer not null default 0,
  -- si esta promoción es la recompensa por un referido, aquí queda a
  -- quién avisarle cuando se use (no aplica a campañas normales)
  reward_owner_phone text,
  reward_owner_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promotions_code_idx on promotions (code);
create index if not exists promotions_slug_idx on promotions (slug);
create index if not exists promotions_active_idx on promotions (active);

drop trigger if exists promotions_set_updated_at on promotions;
create trigger promotions_set_updated_at
  before update on promotions
  for each row
  execute function set_updated_at();

alter table promotions enable row level security;

-- Un renglón por cada vez que un código de promoción se usó de verdad en
-- una cita (no solo se validó al escribirlo) — permite reportar cuántas
-- citas trajo cada campaña sin depender de contar bookings a mano.
create table if not exists promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  redeemed_at timestamptz not null default now()
);

create index if not exists promo_redemptions_promotion_idx on promo_redemptions (promotion_id);
alter table promo_redemptions enable row level security;

-- Código de referido de cada clienta (uno por teléfono). Se crea la
-- primera vez que lo pide desde /referidos.html — no requiere que ya
-- tenga citas confirmadas, para que lo pueda compartir desde el día uno.
create table if not exists referral_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_phone text not null unique, -- últimos 10 dígitos, ver _lib/loyalty.js:last10
  owner_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists referral_codes_code_idx on referral_codes (code);
alter table referral_codes enable row level security;

-- Se llena cuando alguien agenda usando el código de referido de otra
-- clienta. reward_status pasa a "granted" en cuanto se genera
-- automáticamente el código de recompensa de un solo uso para la
-- referidora (al confirmarse esta primera cita del referido).
create table if not exists referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references referral_codes(id) on delete cascade,
  referred_booking_id uuid not null unique references bookings(id) on delete cascade,
  reward_status text not null default 'pending' check (reward_status in ('pending', 'granted')),
  reward_promotion_id uuid references promotions(id),
  created_at timestamptz not null default now()
);

create index if not exists referral_redemptions_code_idx on referral_redemptions (referral_code_id);
alter table referral_redemptions enable row level security;

-- Participaciones de sorteos/dinámicas. giveaway_slug distingue entre
-- varios sorteos corriendo o pasados (ej. "sorteo-verano-2026").
create table if not exists giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  giveaway_slug text not null default 'general',
  name text not null,
  instagram_handle text,
  whatsapp_phone text not null,
  created_at timestamptz not null default now()
);

create index if not exists giveaway_entries_slug_idx on giveaway_entries (giveaway_slug);
alter table giveaway_entries enable row level security;

-- Eventos de medición propios (además de lo que registre Meta Pixel), para
-- saber qué campaña convierte sin depender solo del Ads Manager.
create table if not exists marketing_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('whatsapp_click', 'promo_code_used')),
  campaign text, -- slug de campaña o código, según el evento
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists marketing_events_type_idx on marketing_events (event_type);
create index if not exists marketing_events_created_idx on marketing_events (created_at);
alter table marketing_events enable row level security;

-- Código/descuento aplicado a una cita, si lo hubo. El anticipo se sigue
-- cobrando completo (ver create-booking.js) — este descuento se aplica a
-- mano al liquidar el total en el salón, y estas columnas son lo que le
-- muestra a la administradora en el panel de citas cuánto le corresponde
-- a esa clienta.
alter table bookings add column if not exists promo_code text;
alter table bookings add column if not exists discount_type text check (discount_type in ('percent', 'fixed'));
alter table bookings add column if not exists discount_value numeric;
