import type { TipoTurno } from '../../domain/patterns';

// Paleta (contraste AA): Día amarillo con texto oscuro, Noche azul con texto blanco.
export const CLASE_TURNO: Record<TipoTurno | 'L', string> = {
  D: 'bg-dia text-dia-texto',
  N: 'bg-noche text-noche-texto',
  L: 'bg-libre text-libre-texto',
};

export const CLASE_BOTON_TURNO: Record<TipoTurno, { clase: string; claseActiva: string }> = {
  D: { clase: 'border-dia bg-white text-gray-900', claseActiva: 'border-yellow-600 bg-dia text-dia-texto ring-2 ring-yellow-600' },
  N: { clase: 'border-noche bg-white text-noche', claseActiva: 'border-noche bg-noche text-white ring-2 ring-blue-300' },
};
