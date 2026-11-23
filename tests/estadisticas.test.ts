import { describe, expect, it } from 'vitest';
import { aniosConCambios, resumirCambios } from '../src/domain/estadisticas';

const c = (p: Partial<{ solicitante_id: string; solicitante_nombre: string; cobertura_id: string | null; cobertura_nombre: string; cedido_fecha: string; estado: 'pendiente' | 'confirmado' | 'anulado' }>) => ({
  solicitante_id: 'ana', solicitante_nombre: 'Ana', cobertura_id: 'beto', cobertura_nombre: 'Beto',
  cedido_fecha: '2026-12-01', estado: 'confirmado' as const, ...p,
});

describe('conteo de cambios', () => {
  const cambios = [
    c({}),
    c({ estado: 'pendiente' }),
    c({ estado: 'anulado' }),
    c({ cobertura_id: null, cobertura_nombre: 'Externa' }),
    c({ solicitante_id: 'beto', solicitante_nombre: 'Beto', cobertura_id: 'ana', cobertura_nombre: 'Ana' }),
    c({ solicitante_id: 'carla', solicitante_nombre: 'Carla', cobertura_id: 'ana', cobertura_nombre: 'Ana', estado: 'pendiente' }),
    c({ cedido_fecha: '2025-12-01' }),
    c({ solicitante_id: 'x', cobertura_id: 'y' }),
  ];

  it('separa mis solicitudes de las que otras personas hicieron hacia mí, por año', () => {
    const r = resumirCambios(cambios, 'ana', 2026);
    expect(r.pedidosPorMi).toEqual({ confirmado: 2, pendiente: 1, anulado: 1 });
    expect(r.haciaMi).toEqual({ confirmado: 1, pendiente: 1, anulado: 0 });
  });

  it('detalle por persona solo con confirmados', () => {
    const r = resumirCambios(cambios, 'ana', 2026);
    expect(r.porPersona).toEqual([
      { nombre: 'Beto', pedidosPorMi: 1, haciaMi: 1 },
      { nombre: 'Externa', pedidosPorMi: 1, haciaMi: 0 },
    ]);
  });

  it('años disponibles', () => {
    expect(aniosConCambios(cambios, 2026)).toEqual([2026, 2025]);
  });
});
