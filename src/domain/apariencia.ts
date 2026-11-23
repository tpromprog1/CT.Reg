// Colores personalizables (guardados en perfiles.apariencia).
// Solo se aceptan colores hex #rrggbb; el texto se elige automáticamente
// (oscuro o blanco) para mantener buen contraste.

export interface Apariencia {
  dia: string;
  noche: string;
  libre: string;
  fondo: string;
  /** Borde de los días feriados. */
  feriado: string;
}

export const APARIENCIA_POR_DEFECTO: Apariencia = {
  dia: '#facc15',
  noche: '#1e40af',
  libre: '#f3f4f6',
  fondo: '#f9fafb',
  feriado: '#dc2626',
};

export const PRESETS: { nombre: string; colores: Apariencia }[] = [
  { nombre: 'Clásico', colores: APARIENCIA_POR_DEFECTO },
  { nombre: 'Pastel', colores: { dia: '#fde68a', noche: '#a5b4fc', libre: '#f5f5f4', fondo: '#fdf2f8', feriado: '#e11d48' } },
  { nombre: 'Bosque', colores: { dia: '#86efac', noche: '#14532d', libre: '#ecfdf5', fondo: '#f0fdf4', feriado: '#dc2626' } },
  { nombre: 'Atardecer', colores: { dia: '#fb923c', noche: '#581c87', libre: '#fff7ed', fondo: '#fffbeb', feriado: '#0e7490' } },
  { nombre: 'Alto contraste', colores: { dia: '#ffff00', noche: '#000000', libre: '#ffffff', fondo: '#e5e7eb', feriado: '#ff0000' } },
];

const RE_HEX = /^#[0-9a-f]{6}$/i;
const CLAVES = ['dia', 'noche', 'libre', 'fondo', 'feriado'] as const;

export function esColorValido(v: unknown): v is string {
  return typeof v === 'string' && RE_HEX.test(v);
}

/** Toma lo válido de un objeto desconocido y completa con los colores por defecto. */
export function sanitizarApariencia(valor: unknown): Apariencia {
  const r = { ...APARIENCIA_POR_DEFECTO };
  if (valor && typeof valor === 'object') {
    for (const k of CLAVES) {
      const v = (valor as Record<string, unknown>)[k];
      if (esColorValido(v)) r[k] = v.toLowerCase();
    }
  }
  return r;
}

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}

// Negro puro: con negro o blanco siempre se logra contraste ≥ 4.5 (AA) sobre cualquier color.
const OSCURO = '#000000';
const BLANCO = '#ffffff';

/** Texto oscuro o blanco, el que tenga más contraste con el fondo dado. */
export function colorTexto(fondo: string): string {
  return contraste(fondo, OSCURO) >= contraste(fondo, BLANCO) ? OSCURO : BLANCO;
}

/** Variables CSS que usan Tailwind (tailwind.config.js) y la app. */
export function variablesCss(a: Apariencia): Record<string, string> {
  return {
    '--color-dia': a.dia,
    '--color-dia-texto': colorTexto(a.dia),
    '--color-noche': a.noche,
    '--color-noche-texto': colorTexto(a.noche),
    '--color-libre': a.libre,
    // Gris suave sobre Libre si se lee bien; si no, negro o blanco.
    '--color-libre-texto': contraste(a.libre, '#4b5563') >= 4.5 ? '#4b5563' : colorTexto(a.libre),
    '--color-fondo': a.fondo,
    '--color-fondo-texto': colorTexto(a.fondo),
    '--color-feriado': a.feriado,
  };
}

export function aplicarApariencia(a: Apariencia, raiz: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(variablesCss(a))) raiz.style.setProperty(k, v);
}
