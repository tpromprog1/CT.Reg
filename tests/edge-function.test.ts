import { describe, expect, it, vi } from 'vitest';
import { manejar, type CambioServidor, type Dependencias } from '../supabase/functions/enviar-cambio-turno/handler';
import { crearProveedorResend } from '../supabase/functions/enviar-cambio-turno/mail/resend';
import type { MensajeCorreo } from '../supabase/functions/enviar-cambio-turno/mail/provider';

const ORIGEN = 'https://turnos.example.test';
const ID = '6f1c1b1e-1111-4111-8111-111111111111';
const ANA = 'a0000000-0000-4000-8000-00000000000a';
const BETO = 'b0000000-0000-4000-8000-00000000000b';

function cambioBase(p: Partial<CambioServidor> = {}): CambioServidor {
  return {
    id: ID,
    solicitante_id: ANA,
    solicitante_nombre: 'Ana Demo',
    cobertura_id: BETO,
    cobertura_nombre: 'Beto Demo',
    cobertura_correo: null,
    cedido_fecha: '2026-12-01',
    cedido_tipo: 'D',
    devolucion_fecha: '2026-12-04',
    devolucion_tipo: 'N',
    estado: 'pendiente',
    correo_estado: 'no_enviado',
    created_at: '2026-11-23T17:05:00Z',
    ...p,
  };
}

function deps(over: Partial<Dependencias> = {}, cambio: CambioServidor | null = cambioBase()) {
  const enviados: MensajeCorreo[] = [];
  const marcas: { id: string; estado: string; jefatura: string }[] = [];
  const logs: unknown[] = [];
  const d: Dependencias = {
    allowedOrigin: ORIGEN,
    mailFrom: 'Turnos <turnos@example.test>',
    mail: { enviar: async (m) => { enviados.push(m); return { ok: true }; } },
    obtenerUsuario: async (jwt) => (jwt === 'jwt-ana' ? { id: ANA, email: 'ana@example.test' } : jwt === 'jwt-beto' ? { id: BETO, email: 'beto@example.test' } : null),
    cargarCambio: async () => cambio,
    cargarCorreoJefatura: async () => 'jefatura@example.test',
    correoDeUsuario: async (id) => (id === BETO ? 'beto@example.test' : null),
    contarEnviosUltimaHora: async () => 0,
    marcarCorreo: async (id, m) => { marcas.push({ id, ...m }); },
    log: (e) => logs.push(e),
    ...over,
  };
  return { d, enviados, marcas, logs };
}

const pedir = (jwt: string | null, body: unknown = { id: ID }, origen: string | null = ORIGEN, method = 'POST') =>
  new Request('https://x.supabase.co/functions/v1/enviar-cambio-turno', {
    method,
    headers: {
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...(origen ? { Origin: origen } : {}),
      'Content-Type': 'application/json',
    },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });

describe('Edge Function enviar-cambio-turno', () => {
  it('envía un único correo: Para jefatura, CC solicitante y cobertura, Reply-To solicitante', async () => {
    const { d, enviados, marcas } = deps();
    const res = await manejar(pedir('jwt-ana'), d);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGEN);
    expect(enviados).toHaveLength(1);
    const m = enviados[0]!;
    expect(m.para).toEqual(['jefatura@example.test']);
    expect(m.cc).toEqual(['ana@example.test', 'beto@example.test']);
    expect(m.responderA).toBe('ana@example.test');
    expect(m.asunto).toBe('Cambio de turno');
    expect(m.texto.startsWith('PENDIENTE DE CONFIRMAR')).toBe(true);
    expect(m.claveIdempotencia).toBe(ID);
    expect(marcas).toEqual([{ id: ID, estado: 'enviado', jefatura: 'jefatura@example.test' }]);
  });

  it('usa cobertura_correo cuando la cobertura es "Otra persona"', async () => {
    const { d, enviados } = deps({}, cambioBase({ cobertura_id: null, cobertura_correo: 'externa@example.test', cobertura_nombre: 'Externa' }));
    await manejar(pedir('jwt-ana'), d);
    expect(enviados[0]!.cc).toEqual(['ana@example.test', 'externa@example.test']);
  });

  it('401 sin JWT válido', async () => {
    const { d, enviados } = deps();
    expect((await manejar(pedir(null), d)).status).toBe(401);
    expect((await manejar(pedir('jwt-falso'), d)).status).toBe(401);
    expect(enviados).toHaveLength(0);
  });

  it('404 si el usuario no es el solicitante (la cobertura no puede disparar el envío)', async () => {
    const { d, enviados } = deps();
    expect((await manejar(pedir('jwt-beto'), d)).status).toBe(404);
    expect(enviados).toHaveLength(0);
  });

  it('400 con id inválido', async () => {
    const { d } = deps();
    expect((await manejar(pedir('jwt-ana', { id: "1; drop table" }), d)).status).toBe(400);
  });

  it('409 si no está pendiente o si ya se envió', async () => {
    expect((await manejar(pedir('jwt-ana'), deps({}, cambioBase({ estado: 'confirmado' })).d)).status).toBe(409);
    expect((await manejar(pedir('jwt-ana'), deps({}, cambioBase({ correo_estado: 'enviado' })).d)).status).toBe(409);
  });

  it('permite reintentar tras un error', async () => {
    const { d, enviados } = deps({}, cambioBase({ correo_estado: 'error' }));
    expect((await manejar(pedir('jwt-ana'), d)).status).toBe(200);
    expect(enviados).toHaveLength(1);
  });

  it('429 al superar 10 envíos por hora', async () => {
    const { d, enviados } = deps({ contarEnviosUltimaHora: async () => 10 });
    const res = await manejar(pedir('jwt-ana'), d);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ codigo: 'limite' });
    expect(enviados).toHaveLength(0);
  });

  it('si el proveedor falla marca error y responde 502', async () => {
    const { d, marcas } = deps({ mail: { enviar: async () => ({ ok: false, detalle: 'resend_http_500' }) } });
    const res = await manejar(pedir('jwt-ana'), d);
    expect(res.status).toBe(502);
    expect(marcas[0]!.estado).toBe('error');
  });

  it('CORS: rechaza otros orígenes y responde el preflight permitido', async () => {
    const { d } = deps();
    expect((await manejar(pedir('jwt-ana', { id: ID }, 'https://malicioso.example'), d)).status).toBe(403);
    const pre = await manejar(pedir(null, null, ORIGEN, 'OPTIONS'), d);
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('un error de base no se confunde con "no encontrado": 500 con solo el código', async () => {
    const { d, enviados, logs } = deps({
      cargarCambio: async () => { throw new Error('bd:42501'); },
    });
    const res = await manejar(pedir('jwt-ana'), d);
    expect(res.status).toBe(500);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGEN);
    expect(await res.json()).toEqual({ ok: false, codigo: 'error_interno', detalle: 'bd:42501' });
    expect(enviados).toHaveLength(0);
    expect(logs).toEqual([{ cambio_id: null, resultado: 'error_interno:bd:42501' }]);
  });

  it('una excepción inesperada no filtra su mensaje', async () => {
    const { d } = deps({ cargarCambio: async () => { throw new Error('fallo con ana@example.test'); } });
    const res = await manejar(pedir('jwt-ana'), d);
    expect(await res.json()).toEqual({ ok: false, codigo: 'error_interno', detalle: 'excepcion' });
  });

  it('los logs no contienen datos personales', async () => {
    const { d, logs } = deps();
    await manejar(pedir('jwt-ana'), d);
    const texto = JSON.stringify(logs);
    expect(texto).not.toMatch(/@|Ana|Beto/);
    expect(logs).toEqual([{ cambio_id: ID, resultado: 'enviado' }]);
  });
});

describe('proveedor Resend', () => {
  it('envía Idempotency-Key, from, to, cc y reply_to', async () => {
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }));
    const p = crearProveedorResend('re_prueba', fetchFn as unknown as typeof fetch);
    const r = await p.enviar({
      de: 'T <t@example.test>', para: ['j@example.test'], cc: ['a@example.test'], responderA: 'a@example.test',
      asunto: 'Cambio de turno', texto: 'x', html: '<p>x</p>', claveIdempotencia: ID,
    });
    expect(r).toEqual({ ok: true });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe(ID);
    expect(JSON.parse(init.body as string)).toMatchObject({ to: ['j@example.test'], cc: ['a@example.test'], reply_to: 'a@example.test', subject: 'Cambio de turno' });
  });

  it('error HTTP sin exponer el cuerpo de la respuesta', async () => {
    const p = crearProveedorResend('re_prueba', (async () => new Response('{"message":"x@y.z invalid"}', { status: 422 })) as typeof fetch);
    const r = await p.enviar({ de: '', para: [], cc: [], responderA: '', asunto: '', texto: '', html: '', claveIdempotencia: ID });
    expect(r).toEqual({ ok: false, detalle: 'resend_http_422' });
  });
});
