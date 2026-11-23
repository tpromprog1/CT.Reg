/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Content-Security-Policy como <meta> (GitHub Pages no permite cabeceras propias).
 * Solo en el build: en desarrollo Vite inyecta estilos en línea.
 */
function csp(supabaseUrl: string): Plugin {
  let origenSupabase = 'https://*.supabase.co';
  try {
    if (supabaseUrl) origenSupabase = new URL(supabaseUrl).origin;
  } catch {
    // URL inválida: se mantiene el comodín de Supabase
  }
  const politica = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${origenSupabase}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: politica }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // En GitHub Pages el sitio vive en /<repositorio>/ (el workflow define BASE_PATH).
  const base = env.BASE_PATH || '/';

  return {
    base,
    plugins: [
      react(),
      csp(env.VITE_SUPABASE_URL ?? ''),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Cambios de Turno',
          short_name: 'Turnos',
          description: 'Solicitudes de cambio de turno de enfermería',
          lang: 'es-CL',
          start_url: base,
          scope: base,
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#1E40AF',
          // Rutas relativas al manifest: funcionan con cualquier base.
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Solo assets estáticos de la app. Nada de Supabase ni escrituras offline.
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          runtimeCaching: [],
        },
      }),
    ],
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
