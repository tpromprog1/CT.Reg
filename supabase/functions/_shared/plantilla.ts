// Plantilla del correo "Cambio de turno". Módulo puro: lo usan la Edge Function
// (envío real) y la app (enlace mailto: de respaldo y pruebas).
// No incluye ids internos ni enlaces con datos personales.

import { formatoLargo, formatoTimestamp, type FechaISO } from './fechas.ts';
import { etiquetaTurno, type TipoTurno } from './patterns.ts';

export const ASUNTO = 'Cambio de turno';
export const PREFIJO = 'PENDIENTE DE CONFIRMAR';

export interface DatosCorreo {
  solicitanteNombre: string;
  coberturaNombre: string;
  cedido: { fecha: FechaISO; tipo: TipoTurno };
  devolucion: { fecha: FechaISO; tipo: TipoTurno };
  /** Momento de la solicitud (timestamptz ISO); se muestra en America/Santiago. */
  solicitadoEn: string | Date;
}

export interface Correo {
  asunto: string;
  texto: string;
  html: string;
}

export function escaparHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Quita caracteres de control (defensa extra: los nombres ya se validan en la base). */
function limpiar(s: string): string {
  return s.replace(/\p{Cc}/gu, ' ').trim();
}

function lineas(d: DatosCorreo) {
  const sol = limpiar(d.solicitanteNombre);
  const cob = limpiar(d.coberturaNombre);
  return {
    sol,
    cob,
    cedido: `${formatoLargo(d.cedido.fecha)} · ${etiquetaTurno(d.cedido.tipo)}`,
    devolucion: `${formatoLargo(d.devolucion.fecha)} · ${etiquetaTurno(d.devolucion.tipo)}`,
    solicitado: formatoTimestamp(d.solicitadoEn),
  };
}

export function armarTexto(d: DatosCorreo): string {
  const l = lineas(d);
  return [
    PREFIJO,
    '',
    'Solicitud de cambio de turno',
    `Solicitante: ${l.sol}`,
    `Cobertura: ${l.cob}`,
    '',
    `Turno de ${l.sol} que cubrirá ${l.cob}:`,
    `  ${l.cedido}`,
    '',
    `Turno que ${l.sol} cubrirá en devolución:`,
    `  ${l.devolucion}`,
    '',
    `Solicitado el ${l.solicitado}.`,
    'Este cambio no es válido hasta ser confirmado por jefatura.',
  ].join('\n');
}

export function armarHtml(d: DatosCorreo): string {
  const l = lineas(d);
  const e = escaparHtml;
  return `<!doctype html>
<html lang="es-CL"><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111827;line-height:1.5">
<p style="font-weight:bold;color:#9A3412;font-size:17px;margin:0 0 12px">${PREFIJO}</p>
<p style="margin:0 0 12px"><strong>Solicitud de cambio de turno</strong><br>
Solicitante: ${e(l.sol)}<br>
Cobertura: ${e(l.cob)}</p>
<p style="margin:0 0 12px">Turno de ${e(l.sol)} que cubrirá ${e(l.cob)}:<br>
&nbsp;&nbsp;<strong>${e(l.cedido)}</strong></p>
<p style="margin:0 0 12px">Turno que ${e(l.sol)} cubrirá en devolución:<br>
&nbsp;&nbsp;<strong>${e(l.devolucion)}</strong></p>
<p style="margin:0;color:#374151">Solicitado el ${e(l.solicitado)}.<br>
Este cambio no es válido hasta ser confirmado por jefatura.</p>
</body></html>`;
}

export function armarCorreo(d: DatosCorreo): Correo {
  return { asunto: ASUNTO, texto: armarTexto(d), html: armarHtml(d) };
}

/** Enlace mailto: con los mismos destinatarios, asunto y cuerpo (respaldo si falla el envío). */
export function armarMailto(para: string[], cc: string[], correo: Pick<Correo, 'asunto' | 'texto'>): string {
  const enc = encodeURIComponent;
  const params = [
    cc.length ? `cc=${cc.map(enc).join(',')}` : null,
    `subject=${enc(correo.asunto)}`,
    `body=${enc(correo.texto.replace(/\n/g, '\r\n'))}`,
  ].filter(Boolean);
  return `mailto:${para.map(enc).join(',')}?${params.join('&')}`;
}
