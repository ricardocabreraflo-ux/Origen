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

-- Bloqueos de calendario que la dueña arma desde el panel de Citas: un día
-- completo (start_time/end_time en null) o solo un rango de horas dentro
-- de un día que por lo demás está abierto (ej. "cerrado de 2 a 4pm").
create table if not exists schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  block_date date not null,
  start_time time,
  end_time time,
  label text,
  created_at timestamptz not null default now(),
  -- id del evento en Google Calendar, para poder borrarlo si se elimina el bloqueo
  calendar_event_id text,
  constraint schedule_blocks_range_check check (
    (start_time is null and end_time is null) or (start_time is not null and end_time is not null and start_time < end_time)
  )
);

-- Por si la tabla ya existía sin esta columna (migración incremental).
alter table schedule_blocks add column if not exists calendar_event_id text;

create index if not exists schedule_blocks_date_idx on schedule_blocks (block_date);

alter table schedule_blocks enable row level security;

-- Aperturas especiales de horario que la dueña arma desde el panel de
-- Citas: permite abrir un día que normalmente está cerrado (ej. domingo, o
-- un feriado) o cambiar el horario de un día ya abierto, para un rango de
-- horas específico fuera de lo normal. Es lo contrario de schedule_blocks.
-- Solo puede haber una apertura especial por fecha (si ya existe, se
-- reemplaza al guardar una nueva para la misma fecha).
create table if not exists schedule_openings (
  id uuid primary key default gen_random_uuid(),
  opening_date date not null unique,
  start_time time not null,
  end_time time not null,
  label text,
  created_at timestamptz not null default now(),
  constraint schedule_openings_range_check check (start_time < end_time)
);

create index if not exists schedule_openings_date_idx on schedule_openings (opening_date);

alter table schedule_openings enable row level security;

-- Lista de espera: clientas que quieren una fecha que salió sin horarios
-- (día lleno o cerrado) y piden que se les avise si se libera un espacio.
-- "waiting" = todavía no se le avisa; "notified" = ya se le mandó WhatsApp
-- de que hay lugar. La administradora la elimina de la lista una vez que
-- agenda o decide que ya no aplica.
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  service_id text,
  service_name text,
  preferred_date date not null,
  notes text,
  status text not null default 'waiting' check (status in ('waiting', 'notified')),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_date_idx on waitlist (preferred_date);

alter table waitlist enable row level security;

-- Marca manual de "ya se cobró el total" (anticipo + el resto que se paga
-- en el estudio) — la administradora la marca ella misma, no se calcula
-- sola a partir del estado ni del monto capturado.
alter table bookings add column if not exists paid boolean not null default false;

-- Presencia de administradoras en el panel: cada pestaña abierta manda un
-- "heartbeat" cada 30s; se considera "conectada" a quien mandó uno en los
-- últimos 90s (ver ACTIVE_WINDOW_SECONDS en heartbeat.js).
create table if not exists admin_presence (
  email text primary key,
  full_name text,
  last_seen timestamptz not null default now()
);

alter table admin_presence enable row level security;
