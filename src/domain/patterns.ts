// ==========================================================================
// SISTEMAS DE TURNO Y HORARIOS · archivo editable
// Después de editarlo ejecuta `npm run sync:patterns` (copia este archivo a
// supabase/functions/_shared/patterns.ts para la Edge Function del correo).
// `npm test` falla si las dos copias no son idénticas.
// ==========================================================================

/** D = Día (Largo), N = Noche. La noche se registra en la fecha en que comienza. */
export type TipoTurno = 'D' | 'N';
/** L = Libre */
export type DiaPatron = TipoTurno | 'L';

export interface DefinicionTurno {
  nombre: string;
  nombreLargo: string;
  inicio: string;
  fin: string;
}

export const TURNOS: Record<TipoTurno, DefinicionTurno> = {
  D: { nombre: 'Día', nombreLargo: 'Día (Largo)', inicio: '08:00', fin: '20:00' },
  N: { nombre: 'Noche', nombreLargo: 'Noche', inicio: '20:00', fin: '08:00' },
};

export type SistemaId = 'cuarto' | 'tercero';

export interface DefinicionSistema {
  nombre: string;
  /** El ciclo comienza en el día ancla (posición 0, que debe ser 'D'). */
  ciclo: DiaPatron[];
  /** Texto de ayuda para elegir la fecha ancla en el generador. */
  ayudaAncla: string;
}

export const SISTEMAS: Record<SistemaId, DefinicionSistema> = {
  cuarto: {
    nombre: 'Cuarto turno',
    ciclo: ['D', 'N', 'L', 'L'],
    ayudaAncla: 'Elige un día en que te toque turno Día (Largo).',
  },
  tercero: {
    nombre: 'Tercer turno',
    ciclo: ['D', 'D', 'N', 'N', 'L', 'L'],
    ayudaAncla: 'Elige el primero de tus dos días de turno Día (Largo).',
  },
};

export const ORDEN_SISTEMAS: SistemaId[] = ['cuarto', 'tercero'];

/** "Día (08:00–20:00)" */
export function etiquetaTurno(tipo: TipoTurno): string {
  const t = TURNOS[tipo];
  return `${t.nombre} (${t.inicio}–${t.fin})`;
}

/** Duración en horas según inicio y fin (si el fin es menor o igual, cruza la medianoche). */
export function duracionHoras(tipo: TipoTurno): number {
  const min = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const t = TURNOS[tipo];
  const diff = min(t.fin) - min(t.inicio);
  return (diff <= 0 ? diff + 24 * 60 : diff) / 60;
}

/**
 * Horario diurno para el conteo de horas: de 08:00 a 17:00 son horas diurnas;
 * desde las 17:00 hasta las 08:00 son nocturnas. Las horas de sábado, domingo y
 * feriados se cuentan como "festivas" (y también como nocturnas).
 */
export const HORARIO_DIURNO = { inicio: '08:00', fin: '17:00' };
