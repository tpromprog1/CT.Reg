/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dia: { DEFAULT: '#FACC15', texto: '#1F2937' },
        noche: { DEFAULT: '#1E40AF', texto: '#FFFFFF' },
        libre: { DEFAULT: '#F3F4F6', texto: '#4B5563' },
        pendiente: { DEFAULT: '#EA580C' },
      },
    },
  },
  plugins: [],
};
