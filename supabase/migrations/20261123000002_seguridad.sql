-- =====================================================================
-- Cambios de Turno · Seguridad (RLS + privilegios). Todo denegado por defecto.
-- =====================================================================

alter table public.perfiles      enable row level security;
alter table public.calendarios   enable row level security;
alter table public.cambios_turno enable row level security;

-- Supabase concede privilegios amplios a anon/authenticated sobre public.
-- Los quitamos y concedemos solo lo necesario (defensa en profundidad además de RLS).
revoke all on public.perfiles, public.calendarios, public.cambios_turno from anon, authenticated;

-- Las funciones auxiliares de trigger no deben ser invocables por la API.
revoke execute on function public.crear_perfil_nuevo_usuario() from public, anon, authenticated;
revoke execute on function public.preparar_cambio_turno() from public, anon, authenticated;
revoke execute on function public.tocar_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- perfiles: leer y editar solo el propio (nombre, correo_jefatura).
-- El insert lo hace únicamente el trigger de auth.users.
-- ---------------------------------------------------------------------
grant select on public.perfiles to authenticated;
grant update (nombre, correo_jefatura) on public.perfiles to authenticated;

create policy perfiles_select_propio on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy perfiles_update_propio on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- calendarios: CRUD solo sobre los propios.
-- ---------------------------------------------------------------------
grant select, delete on public.calendarios to authenticated;
grant insert (usuario_id, anio, sistema, fecha_ancla) on public.calendarios to authenticated;
grant update (sistema, fecha_ancla) on public.calendarios to authenticated;

create policy calendarios_select_propio on public.calendarios
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy calendarios_insert_propio on public.calendarios
  for insert to authenticated with check (usuario_id = (select auth.uid()));
create policy calendarios_update_propio on public.calendarios
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));
create policy calendarios_delete_propio on public.calendarios
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- cambios_turno: ver si soy solicitante o cobertura; insertar solo como
-- solicitante y en estado inicial. Sin update/delete directo:
-- las transiciones van por RPC y correo_estado lo cambia la Edge Function.
-- ---------------------------------------------------------------------
grant select on public.cambios_turno to authenticated;
grant insert (solicitante_id, cobertura_id, cobertura_nombre, cobertura_correo,
              cedido_fecha, cedido_tipo, devolucion_fecha, devolucion_tipo)
  on public.cambios_turno to authenticated;

create policy cambios_select_participante on public.cambios_turno
  for select to authenticated
  using (solicitante_id = (select auth.uid()) or cobertura_id = (select auth.uid()));

create policy cambios_insert_solicitante on public.cambios_turno
  for insert to authenticated
  with check (
    solicitante_id = (select auth.uid())
    and estado = 'pendiente'
    and correo_estado = 'no_enviado'
  );
