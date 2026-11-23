-- Pruebas de RLS y RPC (pgTAP). Ejecutar con: npx supabase test db
-- Todos los datos son sintéticos.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(27);

-- Usuarios sintéticos ------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ana.prueba@example.test', '{"nombre":"Ana Prueba"}', now(), now()),
  ('00000000-0000-4000-a000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'beto.prueba@example.test', '{"nombre":"Beto Prueba"}', now(), now()),
  ('00000000-0000-4000-a000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carla.prueba@example.test', '{"nombre":"  "}', now(), now());

select is((select nombre from perfiles where id = '00000000-0000-4000-a000-00000000000a'), 'Ana Prueba',
  'el trigger crea el perfil con el nombre de raw_user_meta_data');
select is((select nombre from perfiles where id = '00000000-0000-4000-a000-00000000000c'), null,
  'un nombre inválido queda nulo (se pedirá en Configuración)');

-- Helper para actuar como un usuario
create or replace function pg_temp.como(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

-- ===== Ana (A) =====
select pg_temp.como('00000000-0000-4000-a000-00000000000a');

select lives_ok($$ update perfiles set correo_jefatura = 'jefatura.prueba@example.test'
                   where id = '00000000-0000-4000-a000-00000000000a' $$,
  'A edita su propio perfil');
select is((select count(*)::int from perfiles), 1, 'A solo ve su propio perfil');

select throws_ok($$ insert into perfiles (id, nombre) values (gen_random_uuid(), 'X') $$,
  '42501', null, 'no se insertan perfiles desde la API');

select lives_ok($$ insert into calendarios (usuario_id, anio, sistema, fecha_ancla)
                   values ('00000000-0000-4000-a000-00000000000a', 2026, 'cuarto', '2026-01-03') $$,
  'A crea su calendario');

select throws_ok($$ insert into calendarios (usuario_id, anio, sistema, fecha_ancla)
                    values ('00000000-0000-4000-a000-00000000000b', 2026, 'cuarto', '2026-01-03') $$,
  '42501', null, 'A no puede crear un calendario a nombre de B');

select lives_ok($$ insert into cambios_turno (solicitante_id, cobertura_id, cedido_fecha, cedido_tipo, devolucion_fecha, devolucion_tipo)
                   values ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000b',
                           '2026-12-01', 'D', '2026-12-04', 'N') $$,
  'A crea una solicitud con B como cobertura');

select is((select solicitante_nombre || '|' || cobertura_nombre || '|' || estado || '|' || correo_estado from cambios_turno),
  'Ana Prueba|Beto Prueba|pendiente|no_enviado', 'el trigger fija los nombres y el estado inicial');

select throws_ok($$ insert into cambios_turno (solicitante_id, cobertura_id, cedido_fecha, cedido_tipo, devolucion_fecha, devolucion_tipo)
                    values ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000b',
                            '2026-12-01', 'D', '2026-12-05', 'N') $$,
  '23505', null, 'no puede haber dos pendientes sobre el mismo turno cedido');

select throws_ok($$ insert into cambios_turno (solicitante_id, cobertura_id, cedido_fecha, cedido_tipo, devolucion_fecha, devolucion_tipo)
                    values ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000b',
                            '2026-11-30', 'D', '2026-12-04', 'N') $$,
  '23514', null, 'solo se intercambian turnos del mismo mes');

select throws_ok($$ insert into cambios_turno (solicitante_id, cobertura_id, cedido_fecha, cedido_tipo, devolucion_fecha, devolucion_tipo, estado)
                    values ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000b',
                            '2026-12-09', 'D', '2026-12-10', 'N', 'confirmado') $$,
  '42501', null, 'no se puede insertar directamente como confirmado');

select throws_ok($$ insert into cambios_turno (solicitante_id, cobertura_id, cedido_fecha, cedido_tipo, devolucion_fecha, devolucion_tipo)
                    values ('00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000c',
                            '2026-12-09', 'D', '2026-12-10', 'N') $$,
  '42501', null, 'A no puede crear solicitudes a nombre de B');

select throws_ok($$ insert into cambios_turno (solicitante_id, cobertura_id, cedido_fecha, cedido_tipo, devolucion_fecha, devolucion_tipo)
                    values ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a',
                            '2026-12-09', 'D', '2026-12-10', 'N') $$,
  '23514', null, 'la cobertura no puede ser el mismo solicitante');

select throws_ok($$ update cambios_turno set estado = 'confirmado', confirmado_at = now() $$,
  '42501', null, 'sin update directo de cambios_turno');
select throws_ok($$ update cambios_turno set correo_estado = 'enviado' $$,
  '42501', null, 'el cliente no modifica correo_estado');
select throws_ok($$ delete from cambios_turno $$,
  '42501', null, 'sin delete directo de cambios_turno');

select is((select count(*)::int from listar_colegas() where id = '00000000-0000-4000-a000-00000000000a'), 0,
  'listar_colegas no incluye al propio usuario');
select is((select count(*)::int from listar_colegas()), 1,
  'listar_colegas solo lista colegas con nombre');

-- ===== Beto (B), cobertura =====
select pg_temp.como('00000000-0000-4000-a000-00000000000b');

select is((select count(*)::int from cambios_turno), 1, 'B (cobertura) ve la solicitud');
select is((select count(*)::int from calendarios), 0, 'B no ve el calendario de A');
select is((select count(*)::int from perfiles where id = '00000000-0000-4000-a000-00000000000a'), 0,
  'B no ve el perfil (ni el correo de jefatura) de A');

update calendarios set sistema = 'tercero';  -- sin efecto: RLS lo filtra

select throws_ok($$ select confirmar_cambio((select id from cambios_turno limit 1)) $$,
  'P0002', null, 'B no puede confirmar un cambio en el que solo es cobertura');
select throws_ok($$ select anular_cambio((select id from cambios_turno limit 1)) $$,
  'P0002', null, 'B no puede anular un cambio en el que solo es cobertura');

-- ===== Carla (C), ajena =====
select pg_temp.como('00000000-0000-4000-a000-00000000000c');
select is((select count(*)::int from cambios_turno), 0, 'C no ve cambios ajenos');

-- ===== Ana confirma =====
select pg_temp.como('00000000-0000-4000-a000-00000000000a');
select is((select sistema from calendarios), 'cuarto', 'el update de B no alteró el calendario de A');
select pg_temp.como('00000000-0000-4000-a000-00000000000a');
select lives_ok($$ select confirmar_cambio((select id from cambios_turno limit 1)) $$,
  'A (solicitante) confirma su cambio');

select * from finish();
rollback;
