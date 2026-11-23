// Conteo de cambios de turno por año (según la fecha del turno cedido).

import type { CambioTurno, EstadoCambio } from './tipos';
import { HORARIO_DIURNO, TURNOS, duracionHoras, type TipoTurno } from './patterns';
import { sumarDias, type FechaISO } from './fechas';
import { esFestivo } from './feriados';

export type ConteoEstados = Record<EstadoCambio, number>;

export interface ResumenPersona {
  nombre: string;
  /** Cambios confirmados que pedí y en que esta persona me cubrió. */
  pedidosPorMi: number;
  /** Cambios confirmados que esta persona pidió y en que yo la cubrí. */
  haciaMi: number;
}

export interface ResumenCambios {
  anio: number;
  /** Solicitudes que hice yo. */
  pedidosPorMi: ConteoEstados;
  /** Solicitudes de otras personas en que soy la cobertura. */
  haciaMi: ConteoEstados;
  /** Solo cambios confirmados, ordenado por total descendente. */
  porPersona: ResumenPersona[];
}

const vacio = (): ConteoEstados => ({ pendiente: 0, confirmado: 0, anulado: 0 });

type CambioConteo = Pick<
  CambioTurno,
  'solicitante_id' | 'solicitante_nombre' | 'cobertura_id' | 'cobertura_nombre' | 'cedido_fecha' | 'estado'
>;

export function resumirCambios(cambios: CambioConteo[], usuarioId: string, anio: number): ResumenCambios {
  const pedidosPorMi = vacio();
  const haciaMi = vacio();
  const personas = new Map<string, ResumenPersona>();

  const persona = (nombre: string) => {
    const clave = nombre.trim().toLocaleLowerCase('es-CL');
    let p = personas.get(clave);
    if (!p) {
      p = { nombre: nombre.trim(), pedidosPorMi: 0, haciaMi: 0 };
      personas.set(clave, p);
    }
    return p;
  };

  for (const c of cambios) {
    if (Number(c.cedido_fecha.slice(0, 4)) !== anio) continue;
    if (c.solicitante_id === usuarioId) {
      pedidosPorMi[c.estado]++;
      if (c.estado === 'confirmado') persona(c.cobertura_nombre).pedidosPorMi++;
    } else if (c.cobertura_id === usuarioId) {
      haciaMi[c.estado]++;
      if (c.estado === 'confirmado') persona(c.solicitante_nombre).haciaMi++;
    }
  }

  const porPersona = [...personas.values()].sort(
    (a, b) => b.pedidosPorMi + b.haciaMi - (a.pedidosPorMi + a.haciaMi) || a.nombre.localeCompare(b.nombre, 'es-CL'),
  );
  return { anio, pedidosPorMi, haciaMi, porPersona };
}

/** Años con al menos un cambio, más el año dado; orden descendente. */
export function aniosConCambios(cambios: Pick<CambioTurno, 'cedido_fecha'>[], anioActual: number): number[] {
  const set = new Set<number>([anioActual, ...cambios.map((c) => Number(c.cedido_fecha.slice(0, 4)))]);
  return [...set].sort((a, b) => b - a);
}

// ---------------------------------------------------------------------
// Conteo de turnos y horas del mes (calendario efectivo: patrón + ajustes + cambios)
// ---------------------------------------------------------------------

export interface ConteoTurnos {
  dias: number;
  noches: number;
  /** Cuántos de esos turnos son extra. */
  extras: number;
  horas: number;
  /** Entre HORARIO_DIURNO.inicio y .fin, en días hábiles. */
  diurnas: number;
  /** Fuera del horario diurno, más todas las horas festivas. */
  nocturnas: number;
  /** Horas de sábado, domingo o feriado (también incluidas en nocturnas). */
  festivas: number;
}

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * Clasifica cada minuto del turno según su hora y su fecha real
 * (la noche cruza la medianoche: sus horas de madrugada son del día siguiente).
 */
export function horasDeTurno(fecha: FechaISO, tipo: TipoTurno): { diurnas: number; nocturnas: number; festivas: number } {
  const inicio = aMinutos(TURNOS[tipo].inicio);
  const duracion = duracionHoras(tipo) * 60;
  const dIni = aMinutos(HORARIO_DIURNO.inicio);
  const dFin = aMinutos(HORARIO_DIURNO.fin);
  const festivoHoy = esFestivo(fecha);
  const festivoManana = esFestivo(sumarDias(fecha, 1));
  let diurnas = 0;
  let nocturnas = 0;
  let festivas = 0;
  for (let m = 0; m < duracion; m++) {
    const abs = inicio + m;
    const minutoDelDia = abs % 1440;
    const festivo = abs < 1440 ? festivoHoy : festivoManana;
    if (festivo) {
      festivas++;
      nocturnas++;
    } else if (minutoDelDia >= dIni && minutoDelDia < dFin) diurnas++;
    else nocturnas++;
  }
  return { diurnas: diurnas / 60, nocturnas: nocturnas / 60, festivas: festivas / 60 };
}

/** Las horas se asignan al mes en que empieza el turno. */
export function contarTurnos(
  dias: Iterable<{ fecha: FechaISO; turnos: TipoTurno[]; extras: TipoTurno[] }>,
): ConteoTurnos {
  const r: ConteoTurnos = { dias: 0, noches: 0, extras: 0, horas: 0, diurnas: 0, nocturnas: 0, festivas: 0 };
  for (const d of dias) {
    for (const t of d.turnos) {
      if (t === 'D') r.dias++;
      else r.noches++;
      const h = horasDeTurno(d.fecha, t);
      r.diurnas += h.diurnas;
      r.nocturnas += h.nocturnas;
      r.festivas += h.festivas;
      r.horas += duracionHoras(t);
    }
    r.extras += d.extras.length;
  }
  return r;
}
