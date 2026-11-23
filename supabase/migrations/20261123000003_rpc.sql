-- =====================================================================
-- Cambios de Turno · RPC (security definer, search_path vacío)
-- =====================================================================

-- Colegas: solo (id, nombre) de los demás usuarios. Nunca correos.
create or replace function public.listar_colegas()
returns table (id uuid, nombre text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nombre
  from public.perfiles p
  where (select auth.uid()) is not null
    and p.id <> (select auth.uid())
    and p.nombre is not null
  order by p.nombre;
$$;

-- Confirmar: solo el solicitante y solo desde 'pendiente'.
create or replace function public.confirmar_cambio(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cambios_turno
     set estado = 'confirmado', confirmado_at = now()
   where id = p_id
     and solicitante_id = (select auth.uid())
     and estado = 'pendiente';
  if not found then
    raise exception 'No se puede confirmar este cambio' using errcode = 'P0002';
  end if;
end;
$$;

-- Anular: solo el solicitante y solo desde 'pendiente'. No envía correo.
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
     and estado = 'pendiente';
  if not found then
    raise exception 'No se puede anular este cambio' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.listar_colegas()       from public, anon;
revoke execute on function public.confirmar_cambio(uuid) from public, anon;
revoke execute on function public.anular_cambio(uuid)    from public, anon;
grant  execute on function public.listar_colegas()       to authenticated;
grant  execute on function public.confirmar_cambio(uuid) to authenticated;
grant  execute on function public.anular_cambio(uuid)    to authenticated;
