import type { TipoTurno } from '../../domain/patterns';

// Colores desde variables CSS (personalizables). El texto tiene contraste automático.
export const CLASE_TURNO: Record<TipoTurno | 'L', string> = {
  D: 'bg-dia text-dia-texto',
  N: 'bg-noche text-noche-texto',
  L: 'bg-libre text-libre-texto',
};

export const CLASE_TEXTO_TURNO: Record<TipoTurno | 'L', string> = {
  D: 'text-dia-texto',
  N: 'text-noche-texto',
  L: 'text-libre-texto',
};

export const CLASE_BOTON_TURNO: Record<TipoTurno, { clase: string; claseActiva: string }> = {
  D: { clase: 'border-dia bg-white text-gray-900', claseActiva: 'border-gray-900 bg-dia text-dia-texto ring-2 ring-gray-900' },
  N: { clase: 'border-noche bg-white text-gray-900', claseActiva: 'border-gray-900 bg-noche text-noche-texto ring-2 ring-gray-900' },
};
