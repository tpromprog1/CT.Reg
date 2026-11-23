// Edge Function (Deno): cablea Supabase + proveedor de correo y delega en handler.ts.
// Secretos comunes: MAIL_FROM, ALLOWED_ORIGIN y MAIL_PROVIDER (resend | smtp | simulado).
//   resend: RESEND_API_KEY
//   smtp:   SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASS
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';
import { manejar, type CambioServidor } from './handler.ts';
import { crearProveedorResend, crearProveedorSimulado } from './mail/resend.ts';
import { crearProveedorSmtp } from './mail/smtp.ts';
import type { MailProvider } from './mail/provider.ts';

const env = (k: string) => Deno.env.get(k) ?? '';

/** Error de base de datos con solo su código (sin datos personales en logs). */
function errorBd(error: { code?: string } | null): never {
  throw new Error(`bd:${error?.code ?? 'desconocido'}`);
}

const SUPABASE_URL = env('SUPABASE_URL');
const admin = createClient(SUPABASE_URL, env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

function crearProveedor(): MailProvider {
  switch (env('MAIL_PROVIDER')) {
    case 'simulado':
      return crearProveedorSimulado();
    case 'smtp': {
      const puerto = Number(env('SMTP_PORT') || '465');
      return crearProveedorSmtp(
        nodemailer.createTransport({
          host: env('SMTP_HOST') || 'smtp.gmail.com',
          port: puerto,
          secure: puerto === 465, // TLS directo; 25 y 587 están bloqueados en Edge Functions
          auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
        }),
      );
    }
    default:
      return crearProveedorResend(env('RESEND_API_KEY'));
  }
}

const mail = crearProveedor();

Deno.serve((req) =>
  manejar(req, {
    allowedOrigin: env('ALLOWED_ORIGIN'),
    mailFrom: env('MAIL_FROM'),
    mail,

    async obtenerUsuario(jwt) {
      const { data, error } = await admin.auth.getUser(jwt);
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email ?? null };
    },

    async cargarCambio(id) {
      const { data, error } = await admin
        .from('cambios_turno')
        .select('id, solicitante_id, solicitante_nombre, cobertura_id, cobertura_nombre, cobertura_correo, cedido_fecha, cedido_tipo, devolucion_fecha, devolucion_tipo, estado, correo_estado, created_at')
        .eq('id', id)
        .maybeSingle();
      if (error) errorBd(error);
      return (data as CambioServidor | null) ?? null;
    },

    async cargarCorreoJefatura(usuarioId) {
      const { data, error } = await admin.from('perfiles').select('correo_jefatura').eq('id', usuarioId).maybeSingle();
      if (error) errorBd(error);
      return (data?.correo_jefatura as string | null) ?? null;
    },

    async correoDeUsuario(usuarioId) {
      const { data, error } = await admin.auth.admin.getUserById(usuarioId);
      return error ? null : (data.user?.email ?? null);
    },

    async contarEnviosUltimaHora(usuarioId) {
      const desde = new Date(Date.now() - 3_600_000).toISOString();
      const { count, error } = await admin
        .from('cambios_turno')
        .select('id', { count: 'exact', head: true })
        .eq('solicitante_id', usuarioId)
        .gte('correo_enviado_at', desde);
      if (error) errorBd(error);
      return count ?? 0;
    },

    async marcarCorreo(id, { estado, jefatura }) {
      const { error } = await admin
        .from('cambios_turno')
        .update({
          correo_estado: estado,
          correo_jefatura_usado: jefatura,
          ...(estado === 'enviado' ? { correo_enviado_at: new Date().toISOString() } : {}),
        })
        .eq('id', id);
      if (error) errorBd(error);
    },

    // Logs sin datos personales: solo el id del cambio y el resultado.
    log: (e) => console.log(JSON.stringify({ fn: 'enviar-cambio-turno', ...e })),
  }),
);
