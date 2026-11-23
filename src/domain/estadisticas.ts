// Conteo de cambios de turno por año (según la fecha del turno cedido).

import type { CambioTurno, EstadoCambio } from './tipos';

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
