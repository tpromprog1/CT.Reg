-- =====================================================================
-- Cambios de Turno · Esquema
-- Minimización: solo nombre, correo de jefatura y turnos.
-- Sin RUT, sin datos de salud, sin datos de pacientes.
-- =====================================================================

-- Formato de correo simple (el mismo criterio que usa el cliente).
create or replace function public.es_correo_valido(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p is not null
     and char_length(p) between 3 and 254
     and p ~ '^[^@[:space:][:cntrl:]]+@[^@[:space:][:cntrl:]]+\.[^@[:space:][:cntrl:]]+$';
$$;

-- Nombre visible: 1–80 caracteres, sin caracteres de control ni espacios en los extremos.
create or replace function public.es_nombre_valido(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p is not null
     and char_length(p) between 1 and 80
     and p = btrim(p)
     and p !~ '[[:cntrl:]]';
$$;

create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- perfiles
-- ---------------------------------------------------------------------
create table public.perfiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  -- Nulo solo mientras el usuario no lo completa (p. ej. creado desde el dashboard).
  nombre           text check (nombre is null or public.es_nombre_valido(nombre)),
  correo_jefatura  text check (correo_jefatura is null or public.es_correo_valido(correo_jefatura)),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger perfiles_updated_at
  before update on public.perfiles
  for each row execute function public.tocar_updated_at();

-- Crea el perfil al registrarse. El nombre viene de raw_user_meta_data.nombre
-- (si no es válido queda nulo y la app lo pide en ⚙️).
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text := btrim(left(coalesce(new.raw_user_meta_data ->> 'nombre', ''), 80));
begin
  insert into public.perfiles (id, nombre)
  values (new.id, case when public.es_nombre_valido(v_nombre) then v_nombre else null end);
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- ---------------------------------------------------------------------
-- calendarios: solo la configuración; los días se calculan en el cliente.
-- ---------------------------------------------------------------------
create table public.calendarios (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references public.perfiles (id) on delete cascade,
  anio         int  not null check (anio between 2000 and 2100),
  sistema      text not null check (sistema in ('cuarto', 'tercero')),
  fecha_ancla  date not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (usuario_id, anio),
  -- La ancla debe estar razonablemente cerca del año generado.
  check (fecha_ancla between make_date(anio - 1, 1, 1) and make_date(anio + 1, 12, 31))
);

create trigger calendarios_updated_at
  before update on public.calendarios
  for each row execute function public.tocar_updated_at();

-- ---------------------------------------------------------------------
-- cambios_turno
-- ---------------------------------------------------------------------
create table public.cambios_turno (
  id                     uuid primary key default gen_random_uuid(),
  solicitante_id         uuid not null references public.perfiles (id) on delete cascade,
  solicitante_nombre     text not null check (public.es_nombre_valido(solicitante_nombre)),
  cobertura_id           uuid references public.perfiles (id) on delete set null,
  cobertura_nombre       text not null check (public.es_nombre_valido(cobertura_nombre)),
  cobertura_correo       text check (cobertura_correo is null or public.es_correo_valido(cobertura_correo)),
  cedido_fecha           date not null,
  cedido_tipo            text not null check (cedido_tipo in ('D', 'N')),
  devolucion_fecha       date not null,
  devolucion_tipo        text not null check (devolucion_tipo in ('D', 'N')),
  estado                 text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'anulado')),
  correo_estado          text not null default 'no_enviado' check (correo_estado in ('no_enviado', 'enviado', 'error')),
  correo_enviado_at      timestamptz,
  correo_jefatura_usado  text check (correo_jefatura_usado is null or public.es_correo_valido(correo_jefatura_usado)),
  created_at             timestamptz not null default now(),
  confirmado_at          timestamptz,
  anulado_at             timestamptz,

  -- cobertura_correo solo para "Otra persona" (sin cuenta).
  constraint cobertura_correo_solo_externa check (cobertura_id is null or cobertura_correo is null),
  constraint cobertura_distinta check (cobertura_id is null or cobertura_id <> solicitante_id),
  -- Regla del servicio: solo se intercambian turnos del mismo mes.
  constraint mismo_mes check (date_trunc('month', cedido_fecha) = date_trunc('month', devolucion_fecha)),
  constraint turnos_distintos check (not (cedido_fecha = devolucion_fecha and cedido_tipo = devolucion_tipo)),
  constraint confirmado_coherente check ((estado = 'confirmado') = (confirmado_at is not null)),
  constraint anulado_coherente check ((estado = 'anulado') = (anulado_at is not null))
  -- "Debe existir cobertura_id o cobertura_correo" se valida al insertar (trigger),
  -- porque si la cobertura borra su cuenta, cobertura_id pasa a null (on delete set null)
  -- y un CHECK de tabla impediría ese borrado.
);

create unique index cambios_turno_un_pendiente_por_turno
  on public.cambios_turno (solicitante_id, cedido_fecha, cedido_tipo)
  where estado = 'pendiente';

create index cambios_turno_solicitante_idx on public.cambios_turno (solicitante_id);
create index cambios_turno_cobertura_idx on public.cambios_turno (cobertura_id);

-- Fija los nombres (copias) y los valores iniciales. El cliente nunca manda
-- solicitante_nombre, y cobertura_nombre solo cuando es "Otra persona".
create or replace function public.preparar_cambio_turno()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text;
begin
  select p.nombre into v_nombre from public.perfiles p where p.id = new.solicitante_id;
  if v_nombre is null then
    raise exception 'Completa tu nombre en Configuración antes de solicitar un cambio'
      using errcode = 'P0001';
  end if;
  new.solicitante_nombre := v_nombre;

  if new.cobertura_id is not null then
    select p.nombre into v_nombre from public.perfiles p where p.id = new.cobertura_id;
    if v_nombre is null then
      raise exception 'La persona seleccionada no está disponible' using errcode = 'P0001';
    end if;
    new.cobertura_nombre := v_nombre;
    new.cobertura_correo := null;
  elsif new.cobertura_correo is null then
    raise exception 'Falta la cobertura (colega registrado o correo)' using errcode = 'P0001';
  else
    new.cobertura_correo := lower(btrim(new.cobertura_correo));
    new.cobertura_nombre := btrim(new.cobertura_nombre);
  end if;

  new.created_at := now();
  new.correo_enviado_at := null;
  new.correo_jefatura_usado := null;
  new.confirmado_at := null;
  new.anulado_at := null;
  return new;
end;
$$;

create trigger cambios_turno_preparar
  before insert on public.cambios_turno
  for each row execute function public.preparar_cambio_turno();
