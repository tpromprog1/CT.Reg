// Validaciones de entrada compartidas (mismo criterio que los CHECK de la base).

export const LARGO_MAX_NOMBRE = 80;
export const LARGO_MAX_CORREO = 254;
export const LARGO_MIN_PASSWORD = 8;
export const LARGO_MAX_PASSWORD = 72;

const RE_CORREO = /^[^@\s\p{Cc}]+@[^@\s\p{Cc}]+\.[^@\s\p{Cc}]+$/u;
const RE_CONTROL = /\p{Cc}/u;

/** Devuelve un mensaje de error o null si es válido. */
export function errorNombre(valor: string): string | null {
  const v = valor.trim();
  if (v.length === 0) return 'Ingresa un nombre.';
  if (v.length > LARGO_MAX_NOMBRE) return `Máximo ${LARGO_MAX_NOMBRE} caracteres.`;
  if (RE_CONTROL.test(v)) return 'El nombre contiene caracteres no permitidos.';
  return null;
}

export function errorCorreo(valor: string): string | null {
  const v = valor.trim();
  if (v.length === 0) return 'Ingresa un correo.';
  if (v.length > LARGO_MAX_CORREO || !RE_CORREO.test(v)) return 'Revisa el formato del correo.';
  return null;
}

export function errorPassword(valor: string): string | null {
  if (valor.length < LARGO_MIN_PASSWORD) return `Usa al menos ${LARGO_MIN_PASSWORD} caracteres.`;
  if (valor.length > LARGO_MAX_PASSWORD) return `Máximo ${LARGO_MAX_PASSWORD} caracteres.`;
  return null;
}

export function normalizarCorreo(valor: string): string {
  return valor.trim().toLowerCase();
}
