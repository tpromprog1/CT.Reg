// Fechas "sin hora" como strings YYYY-MM-DD.
// Regla: NUNCA usar new Date('YYYY-MM-DD') para mostrar (se interpreta como UTC
// y en Chile muestra el día anterior). Toda la aritmética usa "días epoch"
// calculados con Date.UTC, inmunes a cambios de horario y años bisiestos.
// Este módulo es puro (sin APIs de Node ni Deno): lo usan la app y la Edge Function.

export type FechaISO = string;

const MS_DIA = 86_400_000;
const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export const DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;
export const DIAS_SEMANA_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;
export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

export interface PartesFecha {
  anio: number;
  mes: number; // 1–12
  dia: number; // 1–31
}

export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

export function diasDelMes(anio: number, mes: number): number {
  return [31, esBisiesto(anio) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1] ?? 0;
}

export function esFechaISO(valor: unknown): valor is FechaISO {
  if (typeof valor !== 'string') return false;
  const m = RE_FECHA.exec(valor);
  if (!m) return false;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasDelMes(anio, mes);
}

export function partes(fecha: FechaISO): PartesFecha {
  const m = RE_FECHA.exec(fecha);
  if (!m || !esFechaISO(fecha)) throw new Error(`Fecha inválida: ${fecha}`);
  return { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

const dos = (n: number) => String(n).padStart(2, '0');

export function crearFecha(anio: number, mes: number, dia: number): FechaISO {
  const f = `${String(anio).padStart(4, '0')}-${dos(mes)}-${dos(dia)}`;
  if (!esFechaISO(f)) throw new Error(`Fecha inválida: ${f}`);
  return f;
}

/** Días transcurridos desde 1970-01-01 (entero, sin horas). */
export function aDiaEpoch(fecha: FechaISO): number {
  const { anio, mes, dia } = partes(fecha);
  return Math.round(Date.UTC(anio, mes - 1, dia) / MS_DIA);
}

export function desdeDiaEpoch(n: number): FechaISO {
  const d = new Date(n * MS_DIA);
  return crearFecha(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function sumarDias(fecha: FechaISO, n: number): FechaISO {
  return desdeDiaEpoch(aDiaEpoch(fecha) + n);
}

/** b - a, en días. */
export function diferenciaDias(a: FechaISO, b: FechaISO): number {
  return aDiaEpoch(b) - aDiaEpoch(a);
}

/** Índice en un ciclo de largo n; funciona también con fechas anteriores a la ancla. */
export function indiceCiclo(ancla: FechaISO, fecha: FechaISO, n: number): number {
  const diff = diferenciaDias(ancla, fecha);
  return ((diff % n) + n) % n;
}

/** 0 = lunes … 6 = domingo. 1970-01-01 fue jueves (3). */
export function diaSemana(fecha: FechaISO): number {
  return (((aDiaEpoch(fecha) + 3) % 7) + 7) % 7;
}

export function mismoMes(a: FechaISO, b: FechaISO): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function primerDiaMes(anio: number, mes: number): FechaISO {
  return crearFecha(anio, mes, 1);
}

/** "lunes 1 de diciembre de 2026" */
export function formatoLargo(fecha: FechaISO): string {
  const { anio, mes, dia } = partes(fecha);
  return `${DIAS_SEMANA[diaSemana(fecha)]} ${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/** "lun 1 dic" */
export function formatoCorto(fecha: FechaISO): string {
  const { mes, dia } = partes(fecha);
  return `${DIAS_SEMANA[diaSemana(fecha)]!.slice(0, 3)} ${dia} ${MESES[mes - 1]!.slice(0, 3)}`;
}

/** "diciembre 2026" */
export function nombreMes(anio: number, mes: number): string {
  return `${MESES[mes - 1]} ${anio}`;
}

export const ZONA_CHILE = 'America/Santiago';

function partesEnZona(instante: Date, zona: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const p: Record<string, string> = {};
  for (const { type, value } of fmt.formatToParts(instante)) p[type] = value;
  return {
    anio: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: p.hour === '24' ? '00' : (p.hour ?? '00'),
    minuto: p.minute ?? '00',
  };
}

/** Fecha de hoy en Chile como YYYY-MM-DD. */
export function hoyEnChile(ahora: Date = new Date()): FechaISO {
  const p = partesEnZona(ahora, ZONA_CHILE);
  return crearFecha(p.anio, p.mes, p.dia);
}

/** Timestamp (ISO / timestamptz) → "lunes 23 de noviembre de 2026 a las 14:05", hora de Chile. */
export function formatoTimestamp(instante: string | Date): string {
  const d = typeof instante === 'string' ? new Date(instante) : instante;
  if (Number.isNaN(d.getTime())) return '';
  const p = partesEnZona(d, ZONA_CHILE);
  return `${formatoLargo(crearFecha(p.anio, p.mes, p.dia))} a las ${p.hora}:${p.minuto}`;
}
