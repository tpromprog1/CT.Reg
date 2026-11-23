// Lógica de la Edge Function `enviar-cambio-turno`, sin dependencias de Deno
// (las dependencias se inyectan; así se prueba con Vitest).

import { armarCorreo } from '../_shared/plantilla.ts';
import type { TipoTurno } from '../_shared/patterns.ts';
import type { MailProvider } from './mail/provider.ts';

export const LIMITE_POR_HORA = 10;

export interface CambioServidor {
  id: string;
  solicitante_id: string;
  solicitante_nombre: string;
  cobertura_id: string | null;
  cobertura_nombre: string;
  cobertura_correo: string | null;
  cedido_fecha: string;
  cedido_tipo: TipoTurno;
  devolucion_fecha: string;
  devolucion_tipo: TipoTurno;
  estado: 'pendiente' | 'confirmado' | 'anulado';
  correo_estado: 'no_enviado' | 'enviado' | 'error';
  created_at: string;
}

export interface Dependencias {
  allowedOrigin: string;
  mailFrom: string;
  mail: MailProvider;
  /** Valida el JWT y devuelve el usuario (o null). */
  obtenerUsuario(jwt: string): Promise<{ id: string; email: string | null } | null>;
  cargarCambio(id: string): Promise<CambioServidor | null>;
  cargarCorreoJefatura(usuarioId: string): Promise<string | null>;
  correoDeUsuario(usuarioId: string): Promise<string | null>;
  /** Correos enviados con éxito por el usuario en la última hora. */
  contarEnviosUltimaHora(usuarioId: string): Promise<number>;
  marcarCorreo(id: string, datos: { estado: 'enviado' | 'error'; jefatura: string }): Promise<void>;
  log(evento: { cambio_id: string | null; resultado: string }): void;
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cabecerasCors(origen: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function manejar(req: Request, deps: Dependencias): Promise<Response> {
  try {
    return await manejarSolicitud(req, deps);
  } catch (e) {
    // Solo el código del error (p. ej. "bd:42501"); nunca datos personales.
    const codigo = e instanceof Error && /^bd:[\w-]+$/.test(e.message) ? e.message : 'excepcion';
    deps.log({ cambio_id: null, resultado: `error_interno:${codigo}` });
    return new Response(JSON.stringify({ ok: false, codigo: 'error_interno', detalle: codigo }), {
      status: 500,
      headers: { ...cabecerasCors(deps.allowedOrigin), 'Content-Type': 'application/json' },
    });
  }
}

async function manejarSolicitud(req: Request, deps: Dependencias): Promise<Response> {
  const cors = cabecerasCors(deps.allowedOrigin);
  const responder = (status: number, cuerpo: Record<string, unknown>) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  const origen = req.headers.get('Origin');
  if (origen !== null && origen !== deps.allowedOrigin) {
    return new Response(null, { status: 403, headers: { Vary: 'Origin' } });
  }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return responder(405, { ok: false, codigo: 'metodo' });

  // 1. Usuario desde el JWT
  const auth = req.headers.get('Authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const usuario = jwt ? await deps.obtenerUsuario(jwt) : null;
  if (!usuario) return responder(401, { ok: false, codigo: 'no_autenticado' });

  // 2. Cuerpo
  let id: unknown;
  try {
    const cuerpo = (await req.json()) as { id?: unknown };
    id = cuerpo?.id;
  } catch {
    id = null;
  }
  if (typeof id !== 'string' || !RE_UUID.test(id)) return responder(400, { ok: false, codigo: 'id_invalido' });

  // 3. Cambio (cargado con service role) y reglas
  const cambio = await deps.cargarCambio(id);
  if (!cambio || cambio.solicitante_id !== usuario.id) {
    deps.log({ cambio_id: id, resultado: 'no_encontrado' });
    return responder(404, { ok: false, codigo: 'no_encontrado' });
  }
  if (cambio.estado !== 'pendiente') return responder(409, { ok: false, codigo: 'no_pendiente' });
  if (cambio.correo_estado === 'enviado') return responder(409, { ok: false, codigo: 'ya_enviado' });

  if ((await deps.contarEnviosUltimaHora(usuario.id)) >= LIMITE_POR_HORA) {
    deps.log({ cambio_id: id, resultado: 'limite' });
    return responder(429, { ok: false, codigo: 'limite' });
  }

  // 4. Destinatarios resueltos en el servidor
  const jefatura = await deps.cargarCorreoJefatura(usuario.id);
  const correoSolicitante = usuario.email;
  if (!jefatura || !correoSolicitante) return responder(422, { ok: false, codigo: 'perfil_incompleto' });
  const correoCobertura = cambio.cobertura_id
    ? await deps.correoDeUsuario(cambio.cobertura_id)
    : cambio.cobertura_correo;

  const cc = [...new Set([correoSolicitante, correoCobertura].filter((c): c is string => !!c).map((c) => c.toLowerCase()))]
    .filter((c) => c !== jefatura.toLowerCase());

  const correo = armarCorreo({
    solicitanteNombre: cambio.solicitante_nombre,
    coberturaNombre: cambio.cobertura_nombre,
    cedido: { fecha: cambio.cedido_fecha, tipo: cambio.cedido_tipo },
    devolucion: { fecha: cambio.devolucion_fecha, tipo: cambio.devolucion_tipo },
    solicitadoEn: cambio.created_at,
  });

  const r = await deps.mail.enviar({
    de: deps.mailFrom,
    para: [jefatura],
    cc,
    responderA: correoSolicitante,
    asunto: correo.asunto,
    texto: correo.texto,
    html: correo.html,
    claveIdempotencia: cambio.id,
  });

  await deps.marcarCorreo(cambio.id, { estado: r.ok ? 'enviado' : 'error', jefatura });
  deps.log({ cambio_id: cambio.id, resultado: r.ok ? 'enviado' : `error:${r.detalle}` });
  return r.ok ? responder(200, { ok: true }) : responder(502, { ok: false, codigo: 'envio_fallido' });
}
