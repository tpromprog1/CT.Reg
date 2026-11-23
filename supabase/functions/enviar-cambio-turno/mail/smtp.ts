import type { MailProvider, MensajeCorreo, ResultadoProveedor } from './provider.ts';

/**
 * Proveedor SMTP (p. ej. Gmail con "contraseña de aplicación").
 * El transporte (nodemailer) se inyecta desde index.ts para que este archivo
 * no dependa de Deno ni de npm y se pueda probar con Vitest.
 *
 * IMPORTANTE: usar el puerto 465 (TLS). Las Edge Functions bloquean 25 y 587.
 * SMTP no tiene clave de idempotencia: los duplicados se evitan porque la función
 * rechaza reenviar un cambio con correo_estado = 'enviado'.
 */
export interface TransporteSmtp {
  sendMail(opciones: {
    from: string;
    to: string[];
    cc?: string[];
    replyTo: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
}

export function crearProveedorSmtp(transporte: TransporteSmtp): MailProvider {
  return {
    async enviar(m: MensajeCorreo): Promise<ResultadoProveedor> {
      try {
        await transporte.sendMail({
          from: m.de,
          to: m.para,
          cc: m.cc.length ? m.cc : undefined,
          replyTo: m.responderA,
          subject: m.asunto,
          text: m.texto,
          html: m.html,
        });
        return { ok: true };
      } catch (e) {
        // Solo el código SMTP/nodemailer (p. ej. EAUTH): el mensaje puede incluir direcciones.
        const codigo = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : 'error';
        return { ok: false, detalle: `smtp_${codigo.replace(/[^\w-]/g, '').slice(0, 30)}` };
      }
    },
  };
}
