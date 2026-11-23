// Traduce errores de Supabase a mensajes claros en español (sin filtrar detalles internos).

const MENSAJES: [RegExp, string][] = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/email not confirmed/i, 'Debes confirmar tu correo. Revisa tu bandeja de entrada (y spam).'],
  [/user already registered/i, 'No se pudo crear la cuenta. Si ya tienes una, inicia sesión o recupera tu contraseña.'],
  [/password should be at least/i, 'La contraseña debe tener al menos 8 caracteres.'],
  [/same.*password|different from the old/i, 'La nueva contraseña debe ser distinta de la anterior.'],
  [/rate limit|too many requests|over_email_send_rate_limit/i, 'Demasiados intentos. Espera unos minutos y vuelve a intentar.'],
  [/signups not allowed|signup is disabled/i, 'El registro está desactivado. Pide a tu jefatura que te cree una cuenta.'],
  [/failed to fetch|network/i, 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'],
  [/jwt expired|session.*missing|not authenticated/i, 'Tu sesión expiró. Vuelve a iniciar sesión.'],
  [/duplicate key.*un_pendiente|cambios_turno_un_pendiente/i, 'Ya tienes una solicitud pendiente sobre ese turno.'],
  [/mismo_mes/i, 'Solo puedes intercambiar turnos del mismo mes.'],
];

export function mensajeError(error: unknown): string {
  const texto =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error ?? '');
  for (const [re, msj] of MENSAJES) if (re.test(texto)) return msj;
  // Mensajes propios de la base (RAISE en español) se muestran tal cual si son cortos.
  if (/^[A-ZÁÉÍÓÚÑ¿].{0,120}$/.test(texto) && /[áéíóúñ]|turno|cambio|nombre|cobertura/i.test(texto)) return texto;
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}
