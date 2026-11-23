// ==========================================================================
// FERIADOS DE CHILE · archivo editable
// Se usan para las horas "festivas" (sábados, domingos y feriados).
// Revisar cada año en el calendario oficial (p. ej. feriados.cl o el Diario
// Oficial): algunos feriados se trasladan a lunes y los feriados por
// elecciones o leyes especiales se agregan durante el año.
// ==========================================================================

import { diaSemana, type FechaISO } from './fechas';

export const FERIADOS: Record<FechaISO, string> = {
  // ---- 2026 ----
  '2026-01-01': 'Año Nuevo',
  '2026-04-03': 'Viernes Santo',
  '2026-04-04': 'Sábado Santo',
  '2026-05-01': 'Día Nacional del Trabajo',
  '2026-05-21': 'Día de las Glorias Navales',
  '2026-06-21': 'Día Nacional de los Pueblos Indígenas',
  '2026-06-29': 'San Pedro y San Pablo',
  '2026-07-16': 'Día de la Virgen del Carmen',
  '2026-08-15': 'Asunción de la Virgen',
  '2026-09-18': 'Independencia Nacional',
  '2026-09-19': 'Día de las Glorias del Ejército',
  '2026-10-12': 'Encuentro de Dos Mundos',
  '2026-10-31': 'Día de las Iglesias Evangélicas y Protestantes',
  '2026-11-01': 'Día de Todos los Santos',
  '2026-12-08': 'Inmaculada Concepción',
  '2026-12-25': 'Navidad',

  // ---- 2027 ----
  '2027-01-01': 'Año Nuevo',
  '2027-03-26': 'Viernes Santo',
  '2027-03-27': 'Sábado Santo',
  '2027-05-01': 'Día Nacional del Trabajo',
  '2027-05-21': 'Día de las Glorias Navales',
  '2027-06-21': 'Día Nacional de los Pueblos Indígenas',
  '2027-06-28': 'San Pedro y San Pablo (trasladado)',
  '2027-07-16': 'Día de la Virgen del Carmen',
  '2027-08-15': 'Asunción de la Virgen',
  '2027-09-18': 'Independencia Nacional',
  '2027-09-19': 'Día de las Glorias del Ejército',
  '2027-10-11': 'Encuentro de Dos Mundos (trasladado)',
  '2027-10-31': 'Día de las Iglesias Evangélicas y Protestantes',
  '2027-11-01': 'Día de Todos los Santos',
  '2027-12-08': 'Inmaculada Concepción',
  '2027-12-25': 'Navidad',
};

/** Nombre del feriado o null. */
export function nombreFeriado(fecha: FechaISO): string | null {
  return FERIADOS[fecha] ?? null;
}

/** Sábado, domingo o feriado. */
export function esFestivo(fecha: FechaISO): boolean {
  return diaSemana(fecha) >= 5 || fecha in FERIADOS;
}
