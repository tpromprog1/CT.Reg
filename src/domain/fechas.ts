// Las utilidades de fecha viven en supabase/functions/_shared para que la
// Edge Function (correo) y la app usen exactamente el mismo código.
export * from '../../supabase/functions/_shared/fechas.ts';
