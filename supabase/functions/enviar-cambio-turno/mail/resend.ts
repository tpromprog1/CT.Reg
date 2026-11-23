import type { MailProvider, MensajeCorreo, ResultadoProveedor } from './provider.ts';

/** Proveedor Resend vía API HTTP (https://resend.com/docs/api-reference/emails/send-email). */
export function crearProveedorResend(apiKey: string, fetchFn: typeof fetch = fetch): MailProvider {
  return {
    async enviar(m: MensajeCorreo): Promise<ResultadoProveedor> {
      try {
        const res = await fetchFn('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': m.claveIdempotencia,
          },
          body: JSON.stringify({
            from: m.de,
            to: m.para,
            cc: m.cc.length ? m.cc : undefined,
            reply_to: m.responderA,
            subject: m.asunto,
            text: m.texto,
            html: m.html,
          }),
        });
        if (res.ok) return { ok: true };
        // Solo el código HTTP: el cuerpo podría contener direcciones de correo.
        return { ok: false, detalle: `resend_http_${res.status}` };
      } catch {
        return { ok: false, detalle: 'resend_red' };
      }
    },
  };
}

/** Solo para desarrollo local: no envía nada y responde OK. */
export function crearProveedorSimulado(): MailProvider {
  return { enviar: async () => ({ ok: true }) };
}
