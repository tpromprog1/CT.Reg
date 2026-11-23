import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { CambioTurno, Calendario, Colega, Perfil } from '../domain/tipos';
import type { SistemaId, TipoTurno } from '../domain/patterns';
import type { FechaISO } from '../domain/fechas';

const COLUMNAS_CAMBIO =
  'id, solicitante_id, solicitante_nombre, cobertura_id, cobertura_nombre, cobertura_correo, cedido_fecha, cedido_tipo, devolucion_fecha, devolucion_tipo, estado, correo_estado, correo_enviado_at, correo_jefatura_usado, created_at, confirmado_at, anulado_at';

export async function cargarPerfil(uid: string): Promise<Perfil> {
  const { data, error } = await supabase.from('perfiles').select('id, nombre, correo_jefatura').eq('id', uid).single();
  if (error) throw error;
  return data as Perfil;
}

export async function guardarPerfil(uid: string, datos: { nombre: string; correo_jefatura: string }): Promise<Perfil> {
  const { data, error } = await supabase
    .from('perfiles')
    .update(datos)
    .eq('id', uid)
    .select('id, nombre, correo_jefatura')
    .single();
  if (error) throw error;
  return data as Perfil;
}

export async function cargarCalendarios(): Promise<Calendario[]> {
  const { data, error } = await supabase
    .from('calendarios')
    .select('id, usuario_id, anio, sistema, fecha_ancla')
    .order('anio');
  if (error) throw error;
  return (data ?? []) as Calendario[];
}

/** Crea o reemplaza la configuración del año (los cambios confirmados se conservan aparte). */
export async function guardarCalendario(
  uid: string,
  existente: Calendario | undefined,
  datos: { anio: number; sistema: SistemaId; fecha_ancla: FechaISO },
): Promise<void> {
  const consulta = existente
    ? supabase.from('calendarios').update({ sistema: datos.sistema, fecha_ancla: datos.fecha_ancla }).eq('id', existente.id)
    : supabase.from('calendarios').insert({ usuario_id: uid, ...datos });
  const { error } = await consulta;
  if (error) throw error;
}

export async function cargarCambios(): Promise<CambioTurno[]> {
  const { data, error } = await supabase.from('cambios_turno').select(COLUMNAS_CAMBIO).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CambioTurno[];
}

export interface NuevoCambio {
  solicitante_id: string;
  cobertura: { tipo: 'colega'; id: string } | { tipo: 'externa'; nombre: string; correo: string };
  cedido: { fecha: FechaISO; tipo: TipoTurno };
  devolucion: { fecha: FechaISO; tipo: TipoTurno };
}

export async function crearCambio(n: NuevoCambio): Promise<CambioTurno> {
  const fila: Record<string, string> = {
    solicitante_id: n.solicitante_id,
    cedido_fecha: n.cedido.fecha,
    cedido_tipo: n.cedido.tipo,
    devolucion_fecha: n.devolucion.fecha,
    devolucion_tipo: n.devolucion.tipo,
    ...(n.cobertura.tipo === 'colega'
      ? { cobertura_id: n.cobertura.id }
      : { cobertura_nombre: n.cobertura.nombre, cobertura_correo: n.cobertura.correo }),
  };
  const { data, error } = await supabase.from('cambios_turno').insert(fila).select(COLUMNAS_CAMBIO).single();
  if (error) throw error;
  return data as CambioTurno;
}

export async function confirmarCambio(id: string): Promise<void> {
  const { error } = await supabase.rpc('confirmar_cambio', { p_id: id });
  if (error) throw error;
}

export async function anularCambio(id: string): Promise<void> {
  const { error } = await supabase.rpc('anular_cambio', { p_id: id });
  if (error) throw error;
}

export async function listarColegas(): Promise<Colega[]> {
  const { data, error } = await supabase.rpc('listar_colegas');
  if (error) throw error;
  return (data ?? []) as Colega[];
}

export type ResultadoEnvio = { ok: true } | { ok: false; codigo: string; mensaje: string };

const MENSAJES_ENVIO: Record<string, string> = {
  limite: 'Alcanzaste el límite de 10 correos por hora. Inténtalo más tarde.',
  ya_enviado: 'Este correo ya fue enviado.',
  no_pendiente: 'La solicitud ya no está pendiente.',
  perfil_incompleto: 'Completa tu nombre y el correo de jefatura en Configuración.',
  envio_fallido: 'El proveedor de correo no pudo enviar el mensaje.',
  no_autenticado: 'Tu sesión no es válida. Cierra sesión y vuelve a entrar.',
  no_encontrado: 'No se encontró la solicitud.',
  servicio: 'No se pudo contactar el servicio de correo.',
  error_interno: 'Error interno del servicio de correo.',
};

/** Invoca la Edge Function. Nunca lanza: devuelve un resultado para la UI. */
export async function enviarCorreoCambio(id: string): Promise<ResultadoEnvio> {
  try {
    const { error } = await supabase.functions.invoke('enviar-cambio-turno', { body: { id } });
    if (!error) return { ok: true };
    // Sin respuesta legible (p. ej. CORS o el gateway rechazó la llamada): "servicio".
    let codigo = 'servicio';
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      const cuerpo = (await res.json().catch(() => null)) as { codigo?: string; detalle?: string } | null;
      codigo = cuerpo?.codigo ?? (res.status === 401 ? 'no_autenticado' : codigo);
      // Código técnico corto (p. ej. "bd:42501") para poder diagnosticar.
      if (cuerpo?.detalle) {
        return { ok: false, codigo, mensaje: `${MENSAJES_ENVIO[codigo] ?? 'No se pudo enviar el correo.'} (${cuerpo.detalle})` };
      }
    }
    return { ok: false, codigo, mensaje: MENSAJES_ENVIO[codigo] ?? 'No se pudo enviar el correo.' };
  } catch {
    return { ok: false, codigo: 'red', mensaje: 'Sin conexión. No se pudo enviar el correo.' };
  }
}
