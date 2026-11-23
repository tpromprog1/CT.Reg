import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configuracionFaltante = !url || !anonKey;

// Solo URL + anon/publishable key (públicas). La service role key nunca va al frontend.
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'falta-configurar', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** URL raíz de la app (respeta la subruta de GitHub Pages, p. ej. /CT.Reg/). */
export function urlApp(consulta = ''): string {
  return new URL(`${import.meta.env.BASE_URL}${consulta}`, window.location.origin).href;
}
