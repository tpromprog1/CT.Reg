-- =====================================================================
-- 1) Turnos extra: un turno agregado a mano puede marcarse como "extra".
-- 2) Apariencia: colores elegidos por el usuario, guardados en su perfil.
-- =====================================================================

alter table public.ajustes_calendario
  add column extra boolean not null default false,
  add constraint extra_solo_agregar check (not extra or accion = 'agregar');

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
    insert into public.ajustes_calendario (usuario_id, fecha, tipo, accion, extra)
    values (v_uid, p_fecha, v_item ->> 'tipo', v_item ->> 'accion', coalesce((v_item ->> 'extra')::boolean, false));
  end loop;
end;
$$;

-- Colores: objeto pequeño {"dia":"#rrggbb", ...}. La app solo aplica valores hex válidos.
alter table public.perfiles
  add column apariencia jsonb
  check (apariencia is null or (jsonb_typeof(apariencia) = 'object' and octet_length(apariencia::text) <= 500));

grant update (apariencia) on public.perfiles to authenticated;
