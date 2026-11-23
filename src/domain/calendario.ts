// calendario(fecha) = patrón base del año + superposición de los cambios CONFIRMADOS.
// Nada de esto se guarda: se calcula en el cliente a partir de la configuración.

import {
  crearFecha,
  diaSemana,
  diasDelMes,
  indiceCiclo,
  partes,
  sumarDias,
  type FechaISO,
} from './fechas';
import { SISTEMAS, type SistemaId, type TipoTurno } from './patterns';
import type { CambioTurno } from './tipos';

export interface ConfigCalendario {
  anio: number;
  sistema: SistemaId;
  fecha_ancla: FechaISO;
}

const ORDEN: TipoTurno[] = ['D', 'N'];
const ordenar = (s: Set<TipoTurno>): TipoTurno[] => ORDEN.filter((t) => s.has(t));

/** Turnos del patrón base en una fecha (vacío si es libre o si la fecha está fuera del año). */
export function turnosBase(config: ConfigCalendario | undefined, fecha: FechaISO): TipoTurno[] {
  if (!config || partes(fecha).anio !== config.anio) return [];
  const ciclo = SISTEMAS[config.sistema].ciclo;
  const dia = ciclo[indiceCiclo(config.fecha_ancla, fecha, ciclo.length)];
  return dia === 'D' || dia === 'N' ? [dia] : [];
}

export type TipoEvento = 'cubierto_por' | 'cubro_a' | 'pendiente';

export interface EventoDia {
  tipo: TipoEvento;
  turno: TipoTurno;
  /** Nombre de la otra persona. */
  persona: string;
  cambioId: string;
  /** Solo para pendientes: si yo soy quien solicita. */
  soySolicitante?: boolean;
}

export interface DiaCalendario {
  fecha: FechaISO;
  base: TipoTurno[];
  turnos: TipoTurno[];
  eventos: EventoDia[];
  /** Hay una solicitud pendiente que involucra esta fecha. */
  pendiente: boolean;
  /** Un cambio confirmado modificó esta fecha. */
  modificado: boolean;
}

/** Busca la configuración del año de la fecha. */
export function configDelAnio(calendarios: ConfigCalendario[], anio: number): ConfigCalendario | undefined {
  return calendarios.find((c) => c.anio === anio);
}

type CambioMinimo = Pick<
  CambioTurno,
  | 'id' | 'solicitante_id' | 'solicitante_nombre' | 'cobertura_id' | 'cobertura_nombre'
  | 'cedido_fecha' | 'cedido_tipo' | 'devolucion_fecha' | 'devolucion_tipo'
  | 'estado' | 'confirmado_at' | 'created_at'
>;

/**
 * Calcula un rango de días con superposición. Los cambios confirmados se aplican
 * en orden de confirmación (por si se encadenan sobre el mismo turno).
 */
export function calcularDias(
  fechas: FechaISO[],
  calendarios: ConfigCalendario[],
  cambios: CambioMinimo[],
  usuarioId: string,
): Map<FechaISO, DiaCalendario> {
  const mapa = new Map<FechaISO, DiaCalendario & { set: Set<TipoTurno> }>();
  for (const fecha of fechas) {
    const base = turnosBase(configDelAnio(calendarios, partes(fecha).anio), fecha);
    mapa.set(fecha, { fecha, base, turnos: [], set: new Set(base), eventos: [], pendiente: false, modificado: false });
  }

  const confirmados = cambios
    .filter((c) => c.estado === 'confirmado')
    .sort((a, b) => (a.confirmado_at ?? a.created_at).localeCompare(b.confirmado_at ?? b.created_at));

  for (const c of confirmados) {
    const soySolicitante = c.solicitante_id === usuarioId;
    const soyCobertura = c.cobertura_id === usuarioId;
    if (!soySolicitante && !soyCobertura) continue;
    const cedido = mapa.get(c.cedido_fecha);
    const devolucion = mapa.get(c.devolucion_fecha);
    if (soySolicitante) {
      // Cedo mi turno a la cobertura y cubro su turno en la fecha de devolución.
      if (cedido) {
        cedido.set.delete(c.cedido_tipo);
        cedido.eventos.push({ tipo: 'cubierto_por', turno: c.cedido_tipo, persona: c.cobertura_nombre, cambioId: c.id });
        cedido.modificado = true;
      }
      if (devolucion) {
        devolucion.set.add(c.devolucion_tipo);
        devolucion.eventos.push({ tipo: 'cubro_a', turno: c.devolucion_tipo, persona: c.cobertura_nombre, cambioId: c.id });
        devolucion.modificado = true;
      }
    } else {
      // Soy la cobertura: tomo el turno cedido y entrego el de devolución.
      if (cedido) {
        cedido.set.add(c.cedido_tipo);
        cedido.eventos.push({ tipo: 'cubro_a', turno: c.cedido_tipo, persona: c.solicitante_nombre, cambioId: c.id });
        cedido.modificado = true;
      }
      if (devolucion) {
        devolucion.set.delete(c.devolucion_tipo);
        devolucion.eventos.push({ tipo: 'cubierto_por', turno: c.devolucion_tipo, persona: c.solicitante_nombre, cambioId: c.id });
        devolucion.modificado = true;
      }
    }
  }

  // Los pendientes solo marcan; no modifican turnos.
  for (const c of cambios) {
    if (c.estado !== 'pendiente') continue;
    const soySolicitante = c.solicitante_id === usuarioId;
    if (!soySolicitante && c.cobertura_id !== usuarioId) continue;
    const persona = soySolicitante ? c.cobertura_nombre : c.solicitante_nombre;
    for (const [fecha, turno] of [
      [c.cedido_fecha, c.cedido_tipo],
      [c.devolucion_fecha, c.devolucion_tipo],
    ] as const) {
      const dia = mapa.get(fecha);
      if (!dia) continue;
      dia.pendiente = true;
      dia.eventos.push({ tipo: 'pendiente', turno, persona, cambioId: c.id, soySolicitante });
    }
  }

  const resultado = new Map<FechaISO, DiaCalendario>();
  for (const [fecha, { set, ...dia }] of mapa) resultado.set(fecha, { ...dia, turnos: ordenar(set) });
  return resultado;
}

export function calcularDia(
  fecha: FechaISO,
  calendarios: ConfigCalendario[],
  cambios: CambioMinimo[],
  usuarioId: string,
): DiaCalendario {
  return calcularDias([fecha], calendarios, cambios, usuarioId).get(fecha)!;
}

/** Fechas del mes, en orden. */
export function fechasDelMes(anio: number, mes: number): FechaISO[] {
  return Array.from({ length: diasDelMes(anio, mes) }, (_, i) => crearFecha(anio, mes, i + 1));
}

/** Semanas (lunes a domingo) del mes; null en los huecos de inicio y fin. */
export function semanasDelMes(anio: number, mes: number): (FechaISO | null)[][] {
  const dias = fechasDelMes(anio, mes);
  const celdas: (FechaISO | null)[] = [...Array<null>(diaSemana(dias[0]!)).fill(null), ...dias];
  while (celdas.length % 7 !== 0) celdas.push(null);
  const semanas: (FechaISO | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}

/** Fechas de mes ± 1 día (para validar jornadas de 24 h en los bordes del mes). */
export function fechasDelMesConBordes(anio: number, mes: number): FechaISO[] {
  const dias = fechasDelMes(anio, mes);
  return [sumarDias(dias[0]!, -1), ...dias, sumarDias(dias[dias.length - 1]!, 1)];
}
