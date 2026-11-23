-- Privilegios explícitos para la Edge Function (rol service_role).
-- Los proyectos nuevos de Supabase ya no conceden privilegios automáticos sobre
-- las tablas de public; sin esto la función no puede leer el cambio ni marcar el correo.
-- Se concede solo lo que usa enviar-cambio-turno.

grant usage on schema public to service_role;

grant select on public.perfiles to service_role;
grant select on public.cambios_turno to service_role;
grant update (correo_estado, correo_enviado_at, correo_jefatura_usado) on public.cambios_turno to service_role;
