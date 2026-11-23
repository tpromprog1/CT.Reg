-- =====================================================================
-- 1) Ajustes manuales del calendario (p. ej. agregar un 24 h o quitar un turno
--    sin pasar por una solicitud). Se superponen al patrón base, por fecha y tipo.
-- 2) Anular también cambios confirmados, conservando el historial.
-- =====================================================================

create table public.ajustes_calendario (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  fecha       date not null check (fecha between date '2000-01-01' and date '2100-12-31'),
  tipo        text not null check (tipo in ('D', 'N')),
  accion      text not null check (accion in ('agregar', 'quitar')),
  created_at  timestamptz not null default now(),
  unique (usuario_id, fecha, tipo)
);

alter table public.ajustes_calendario enable row level security;
revoke all on public.ajustes_calendario from anon, authenticated;
grant select on public.ajustes_calendario to authenticated;

create policy ajustes_select_propio on public.ajustes_calendario
  for select to authenticated using (usuario_id = (select auth.uid()));

-- Reemplaza (de forma atómica) los ajustes de un día del usuario actual.
-- p_ajustes: [{"tipo":"D","accion":"agregar"}, ...]; [] vuelve al patrón.
create or replace function public.guardar_ajustes_dia(p_fecha date, p_ajustes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_item jsonb;
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_ajustes) <> 'array' or jsonb_array_length(p_ajustes) > 2 then
    raise exception 'Ajustes inválidos' using errcode = '22023';
  end if;

  delete from public.ajustes_calendario where usuario_id = v_uid and fecha = p_fecha;

  for v_item in select * from jsonb_array_elements(p_ajustes) loop
    insert into public.ajustes_calendario (usuario_id, fecha, tipo, accion)
    values (v_uid, p_fecha, v_item ->> 'tipo', v_item ->> 'accion');
  end loop;
end;
$$;

revoke execute on function public.guardar_ajustes_dia(date, jsonb) from public, anon;
grant execute on function public.guardar_ajustes_dia(date, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Anular confirmados: un cambio anulado puede conservar confirmado_at
-- (queda en el historial "confirmado el … · anulado el …").
-- ---------------------------------------------------------------------
alter table public.cambios_turno drop constraint confirmado_coherente;
alter table public.cambios_turno
  add constraint confirmado_coherente check (estado <> 'confirmado' or confirmado_at is not null),
  add constraint pendiente_sin_confirmar check (estado <> 'pendiente' or confirmado_at is null);

create or replace function public.anular_cambio(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cambios_turno
     set estado = 'anulado', anulado_at = now()
   where id = p_id
     and solicitante_id = (select auth.uid())
     and estado in ('pendiente', 'confirmado');
  if not found then
    raise exception 'No se puede anular este cambio' using errcode = 'P0002';
  end if;
end;
$$;
