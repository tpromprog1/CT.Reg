/** @type {import('tailwindcss').Config} */
// Los colores de turnos y fondo son variables CSS (ver src/index.css y src/domain/apariencia.ts)
// para que cada persona pueda personalizarlos en ⚙️ → Apariencia.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dia: { DEFAULT: 'var(--color-dia)', texto: 'var(--color-dia-texto)' },
        noche: { DEFAULT: 'var(--color-noche)', texto: 'var(--color-noche-texto)' },
        libre: { DEFAULT: 'var(--color-libre)', texto: 'var(--color-libre-texto)' },
        fondo: { DEFAULT: 'var(--color-fondo)', texto: 'var(--color-fondo-texto)' },
        pendiente: { DEFAULT: '#EA580C' },
      },
    },
  },
  plugins: [],
};
