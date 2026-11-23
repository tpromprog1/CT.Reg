# Cambios de Turno

App web (PWA, mobile-first) para gestionar solicitudes de cambio de turno de enfermería.
Vite + React + TypeScript + Tailwind en el frontend; Supabase (Auth, Postgres con RLS y
una Edge Function) en el backend; Resend para el correo.

- **Calendario anual** calculado en el cliente a partir de *año + sistema + fecha ancla*.
- **Solicitud en 3 ventanas** → un único correo «Cambio de turno» a jefatura (CC: solicitante y cobertura).
- **El calendario solo cambia** cuando la persona marca «Cambio confirmado» (la confirmación de jefatura ocurre en persona o en el hilo de correo).

## Estructura

```
src/
  domain/          lógica pura (fechas, patrones, calendario, validaciones, correo)
    patterns.ts    ← sistemas de turno y horarios (ARCHIVO EDITABLE)
  api/datos.ts     acceso a Supabase (tablas, RPC, Edge Function)
  auth/            login, registro, recuperar y nueva contraseña
  features/        configuración ⚙️, generador, calendario, solicitud, pendientes
  ui/              diálogo (hoja inferior / modal), controles
supabase/
  migrations/      esquema, RLS/privilegios, RPC
  functions/
    _shared/       fechas, plantilla de correo y copia de patterns.ts (compartidos con la app)
    enviar-cambio-turno/  handler.ts (lógica) + index.ts (Deno) + mail/ (MailProvider, Resend)
  tests/rls.test.sql  pruebas pgTAP de RLS
  seed.sql         datos sintéticos (solo local)
tests/             Vitest (patrones, superposición, validaciones, correo, Edge Function)
```

## Editar sistemas de turno u horarios

Edita `src/domain/patterns.ts` y luego:

```bash
npm run sync:patterns   # copia el archivo a supabase/functions/_shared/ (lo usa el correo)
npm test                # falla si las dos copias difieren
npx supabase functions deploy enviar-cambio-turno   # para que el correo use los nuevos horarios
```

- Cuarto turno: `[Día, Noche, Libre, Libre]`.
- Tercer turno: `[Día, Día, Noche, Noche, Libre, Libre]`.
- La posición 0 del ciclo es la **fecha ancla** (siempre un Día; en tercer turno, el primero de los dos Días).

## Reglas implementadas (resumen)

- La Noche (20:00–08:00) se registra en la fecha en que comienza.
- Solo se intercambian turnos **del mismo mes** (validado en la app y con un `CHECK` en la base).
- Ventana 3: bloquea si ya tienes ese turno; advierte (sin bloquear) jornadas de 24 h y fechas pasadas.
- Límite: 10 correos **enviados con éxito** por usuario por hora.
- Por privacidad, la app nunca recibe los correos de los colegas. Si el envío falla y usas
  «Abrir en mi correo», debes agregar a mano en copia al colega registrado (el correo de una
  «Otra persona» sí se incluye, porque lo escribiste tú).

## Desarrollo local

Requisitos: Node 20+, Docker Desktop (para Supabase local). La CLI de Supabase viene como
dependencia de desarrollo (`npx supabase ...`).

```bash
npm install
npx supabase start                      # levanta Postgres, Auth, Edge Runtime y Mailpit
cp .env.example .env.local              # completa con la API URL y la anon key que muestra `supabase status`
cp supabase/functions/.env.example supabase/functions/.env   # MAIL_PROVIDER=simulado para no enviar nada
npx supabase functions serve enviar-cambio-turno --env-file supabase/functions/.env
npm run dev                             # http://localhost:5173
```

- `npx supabase db reset` aplica las migraciones y carga `seed.sql` (cuentas sintéticas
  `demo.ana@example.test`, `demo.beto@example.test`, `demo.carla@example.test`; la contraseña está en el archivo).
- Los correos de Auth (confirmación, recuperación) se ven en Mailpit: http://localhost:54324.

### Comandos de verificación

```bash
npm run lint
npm run typecheck
npm test          # Vitest
npm run test:db   # pgTAP (RLS), requiere `supabase start`
npm run build
```

## Despliegue

### 1. Proyecto Supabase

1. Crea un proyecto en https://supabase.com/dashboard (región cercana, p. ej. São Paulo).
2. Enlaza y aplica las migraciones:

   ```bash
   npx supabase login
   npx supabase link --project-ref TU_PROJECT_REF
   npx supabase db push
   ```

   (`db push` **no** carga `seed.sql`: la base de producción queda vacía.)

3. Despliega la Edge Function y configura sus secretos:

   ```bash
   npx supabase functions deploy enviar-cambio-turno
   npx supabase secrets set RESEND_API_KEY=re_xxx \
     MAIL_FROM="Cambios de Turno <turnos@tu-dominio.cl>" \
     ALLOWED_ORIGIN=https://tu-usuario.github.io
   ```

   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente.
   La service role key **solo** vive ahí; nunca en el frontend ni en las variables de GitHub.

### 2. Auth (Dashboard → Authentication)

- **URL Configuration → Site URL**: `https://tu-usuario.github.io/CT.Reg/`
- **Redirect URLs**: `https://tu-usuario.github.io/CT.Reg/**` (y `http://localhost:5173/**` para desarrollo).
- **Providers → Email**: deja activado *Confirm email*. Largo mínimo de contraseña: 8.
- **SMTP**: el SMTP integrado de Supabase tiene un límite muy bajo y es solo para pruebas.
  Para producción configura un SMTP propio (Authentication → Emails → SMTP Settings); puedes
  usar el SMTP de Resend (`smtp.resend.com`, puerto 465, usuario `resend`, contraseña = API key).
- Opcional: traduce las plantillas de correo de Auth al español en *Email Templates*.

#### Desactivar el registro público (opcional)

Si prefieres que solo jefatura o un administrador cree las cuentas:

1. Authentication → Sign In / Providers → desactiva **Allow new users to sign up**.
2. Crea cada usuario en Authentication → Users → **Add user → Create new user**
   (correo + contraseña temporal; marca *Auto Confirm User*) o usa **Send invitation**.
3. La persona entra, y la app le pide completar su nombre y el correo de jefatura en ⚙️.

La pantalla «Crear cuenta» mostrará un aviso si el registro está desactivado.

### 3. GitHub Pages

El workflow `.github/workflows/deploy.yml` corre lint, typecheck y pruebas, compila con la
subruta `/<repositorio>/` y publica en `https://<usuario>.github.io/<repositorio>/` en cada push a `main`.

1. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables** (son valores públicos):
   - `VITE_SUPABASE_URL` = `https://TU_PROJECT_REF.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = anon key (o la *publishable key*) del proyecto
3. Ejecuta el workflow (pestaña Actions → *Desplegar en GitHub Pages* → Run workflow) o haz push a `main`.
4. En Supabase usa:
   - *Site URL*: `https://<usuario>.github.io/<repositorio>/`
   - *Redirect URLs*: `https://<usuario>.github.io/<repositorio>/**`
   - Secreto `ALLOWED_ORIGIN=https://<usuario>.github.io` (el origen, sin la subruta).

GitHub Pages no permite cabeceras HTTP propias: la Content-Security-Policy va como `<meta>`
(se inyecta en el build desde `vite.config.ts`).

### 4. Resend

> ⚠️ **Resend necesita un dominio verificado (SPF/DKIM) para enviar a cualquier destinatario.**
> Sin dominio verificado solo envía a la dirección de tu propia cuenta de Resend (sirve para pruebas).

1. Crea una cuenta en https://resend.com, agrega tu dominio y publica los registros DNS (SPF, DKIM).
2. Crea una API key con permiso *Sending access* y guárdala con `supabase secrets set`.
3. `MAIL_FROM` debe usar una dirección de ese dominio.

#### Cambiar a SMTP

El envío pasa por la interfaz `MailProvider` (`supabase/functions/enviar-cambio-turno/mail/provider.ts`).
Para usar SMTP, implementa otro proveedor con la misma interfaz y elígelo en `index.ts`.
Usa el **puerto 465 (TLS)**: las Edge Functions bloquean los puertos 25 y 587.

## Seguridad y datos personales

- RLS activado en todas las tablas y privilegios revocados por defecto; columnas concedidas una a una.
- `perfiles`: cada persona solo ve y edita el suyo. Los colegas se listan por RPC (`listar_colegas`) con **solo id y nombre**.
- `cambios_turno`: visible para solicitante y cobertura; sin update/delete directos.
  Confirmar o anular va por RPC (`confirmar_cambio`, `anular_cambio`) y solo el solicitante puede hacerlo.
  `correo_estado` solo lo modifica la Edge Function.
- Edge Function: valida el JWT, carga el cambio con service role, resuelve los correos en el servidor,
  usa `Idempotency-Key` = id del cambio, CORS restringido a `ALLOWED_ORIGIN` y logs sin datos personales.
- Minimización: no se guarda RUT, datos de salud ni datos de pacientes; solo nombre, correo
  (en Auth), correo de jefatura y turnos.
- Datos de prueba y semilla 100 % sintéticos (dominio reservado `example.test`).

## Fuera de alcance

Confirmación automática por jefatura o por correo, roles de jefatura, edición manual de días,
feriados, múltiples unidades y notificaciones push.
