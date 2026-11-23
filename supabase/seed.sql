-- Semilla SOLO para desarrollo local (`supabase db reset`). Datos 100 % sintéticos.
-- Cuentas de prueba (contraseña de las tres: DemoTurnos2026!):
--   demo.ana@example.test · demo.beto@example.test · demo.carla@example.test
-- El dominio example.test está reservado y nunca recibe correo real.

do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('11111111-1111-4111-8111-111111111111'::uuid, 'demo.ana@example.test',   'Ana Demo'),
      ('22222222-2222-4222-8222-222222222222'::uuid, 'demo.beto@example.test',  'Beto Demo'),
      ('33333333-3333-4333-8333-333333333333'::uuid, 'demo.carla@example.test', 'Carla Demo')
    ) as t(id, email, nombre)
  loop
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email,
      extensions.crypt('DemoTurnos2026!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', json_build_object('nombre', u.nombre), now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text, 'email',
            json_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now());
  end loop;

  update public.perfiles set correo_jefatura = 'jefatura.demo@example.test';

  insert into public.calendarios (usuario_id, anio, sistema, fecha_ancla) values
    ('11111111-1111-4111-8111-111111111111', 2026, 'cuarto',  '2026-01-01'),
    ('22222222-2222-4222-8222-222222222222', 2026, 'cuarto',  '2026-01-03'),
    ('33333333-3333-4333-8333-333333333333', 2026, 'tercero', '2026-01-02');
end $$;
