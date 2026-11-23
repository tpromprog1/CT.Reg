// Interfaz de proveedor de correo: permite cambiar Resend por SMTP sin tocar el resto.
// Si implementas SMTP: usa el puerto 465 (TLS). Las Edge Functions bloquean 25 y 587.

export interface MensajeCorreo {
  de: string;
  para: string[];
  cc: string[];
  responderA: string;
  asunto: string;
  texto: string;
  html: string;
  /** Evita duplicados si se reintenta el mismo envío. */
  claveIdempotencia: string;
}

export type ResultadoProveedor = { ok: true } | { ok: false; detalle: string };

export interface MailProvider {
  enviar(m: MensajeCorreo): Promise<ResultadoProveedor>;
}
