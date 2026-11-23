import type { FechaISO } from './fechas';
import type { SistemaId, TipoTurno } from './patterns';

export interface Perfil {
  id: string;
  nombre: string | null;
  correo_jefatura: string | null;
}

export interface Calendario {
  id: string;
  usuario_id: string;
  anio: number;
  sistema: SistemaId;
  fecha_ancla: FechaISO;
}

export type EstadoCambio = 'pendiente' | 'confirmado' | 'anulado';
export type EstadoCorreo = 'no_enviado' | 'enviado' | 'error';

export interface CambioTurno {
  id: string;
  solicitante_id: string;
  solicitante_nombre: string;
  cobertura_id: string | null;
  cobertura_nombre: string;
  cobertura_correo: string | null;
  cedido_fecha: FechaISO;
  cedido_tipo: TipoTurno;
  devolucion_fecha: FechaISO;
  devolucion_tipo: TipoTurno;
  estado: EstadoCambio;
  correo_estado: EstadoCorreo;
  correo_enviado_at: string | null;
  correo_jefatura_usado: string | null;
  created_at: string;
  confirmado_at: string | null;
  anulado_at: string | null;
}

export interface Colega {
  id: string;
  nombre: string;
}

/** Un turno concreto: fecha + tipo. */
export interface TurnoEnFecha {
  fecha: FechaISO;
  tipo: TipoTurno;
}
