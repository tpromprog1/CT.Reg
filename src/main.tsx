import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { aplicarApariencia, sanitizarApariencia } from './domain/apariencia';

// Aplica los últimos colores usados en este dispositivo antes de cargar el perfil.
try {
  const guardada = localStorage.getItem('apariencia');
  if (guardada) aplicarApariencia(sanitizarApariencia(JSON.parse(guardada)));
} catch {
  // sin almacenamiento o valor inválido: se usan los colores por defecto
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
