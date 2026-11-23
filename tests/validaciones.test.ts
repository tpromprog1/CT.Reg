import { describe, expect, it } from 'vitest';
import { calcularDias, fechasDelMesConBordes, type ConfigCalendario } from '../src/domain/calendario';
import type { FechaISO } from '../src/domain/fechas';
import { errorTurnoPorCubrir, tiposCedibles, validarDevolucion } from '../src/domain/validaciones';
import { errorCorreo, errorNombre, errorPassword } from '../src/domain/validaciones-basicas';

// Ana, cuarto turno con ancla el 1 de diciembre: D 1, N 2, L 3, L 4, D 5, N 6, ...
const cal: ConfigCalendario = { anio: 2026, sistema: 'cuarto', fecha_ancla: '2026-12-01' };
const dias = calcularDias(fechasDelMesConBordes(2026, 12), [cal], [], 'ana');
const buscar = (f: FechaISO) => dias.get(f);
const HOY = '2026-11-23';

describe('ventana 2 · turno por cubrir', () => {
  it('acepta un turno que tengo', () => {
    expect(errorTurnoPorCubrir({ fecha: '2026-12-01', tipo: 'D' }, buscar, [])).toBeNull();
  });
  it('rechaza un tipo que no tengo ese día', () => {
    expect(errorTurnoPorCubrir({ fecha: '2026-12-01', tipo: 'N' }, buscar, [])).toMatch(/No tienes turno Noche/);
    expect(errorTurnoPorCubrir({ fecha: '2026-12-03', tipo: 'D' }, buscar, [])).toMatch(/No tienes turno Día/);
  });
  it('rechaza si ya hay una solicitud pendiente sobre ese turno', () => {
    const pend = [{ cedido_fecha: '2026-12-01', cedido_tipo: 'D' as const, estado: 'pendiente' as const }];
    expect(errorTurnoPorCubrir({ fecha: '2026-12-01', tipo: 'D' }, buscar, pend)).toMatch(/pendiente/);
    expect(tiposCedibles(buscar('2026-12-01'), pend)).toEqual([]);
  });
  it('un anulado no bloquea', () => {
    const pend = [{ cedido_fecha: '2026-12-01', cedido_tipo: 'D' as const, estado: 'anulado' as const }];
    expect(tiposCedibles(buscar('2026-12-01'), pend)).toEqual(['D']);
  });
  it('sin selección pide elegir', () => {
    expect(errorTurnoPorCubrir(null, buscar, [])).toMatch(/Selecciona/);
  });
});

describe('ventana 3 · turno que cubrirá', () => {
  const cedido = { fecha: '2026-12-01', tipo: 'D' as const };

  it('bloquea si ya tengo ese mismo turno en esa fecha', () => {
    const r = validarDevolucion(cedido, { fecha: '2026-12-05', tipo: 'D' }, buscar, HOY);
    expect(r.errores[0]).toMatch(/Ya tienes turno Día/);
  });

  it('bloquea fechas de otro mes', () => {
    const r = validarDevolucion(cedido, { fecha: '2027-01-03', tipo: 'D' }, buscar, HOY);
    expect(r.errores).toContain('Solo puedes intercambiar turnos del mismo mes.');
  });

  it('acepta un turno libre sin advertencias', () => {
    const r = validarDevolucion(cedido, { fecha: '2026-12-04', tipo: 'D' }, buscar, HOY);
    expect(r).toEqual({ errores: [], advertencias: [] });
  });

  it('advierte (sin bloquear) D + N el mismo día', () => {
    // Tengo D el 5; cubro la N del 5.
    const r = validarDevolucion(cedido, { fecha: '2026-12-05', tipo: 'N' }, buscar, HOY);
    expect(r.errores).toEqual([]);
    expect(r.advertencias.join()).toMatch(/24 horas/);
  });

  it('advierte N seguida de D al día siguiente', () => {
    // Cubro la N del 4; el 5 tengo D.
    const r = validarDevolucion(cedido, { fecha: '2026-12-04', tipo: 'N' }, buscar, HOY);
    expect(r.advertencias.join()).toMatch(/24 horas/);
  });

  it('advierte si tomo D el día después de mi N', () => {
    // Tengo N el 2; cubro D del 3.
    const r = validarDevolucion(cedido, { fecha: '2026-12-03', tipo: 'D' }, buscar, HOY);
    expect(r.advertencias.join()).toMatch(/24 horas/);
  });

  it('ceder el turno elimina el riesgo de 24 h que causaba', () => {
    // Cedo la N del 2 y cubro la D del 3: ya no hay N antes, no hay 24 h.
    const r = validarDevolucion({ fecha: '2026-12-02', tipo: 'N' }, { fecha: '2026-12-03', tipo: 'D' }, buscar, HOY);
    expect(r.advertencias).toEqual([]);
  });

  it('advierte si la fecha ya pasó', () => {
    const r = validarDevolucion(cedido, { fecha: '2026-12-04', tipo: 'D' }, buscar, '2026-12-10');
    expect(r.errores).toEqual([]);
    expect(r.advertencias).toContain('Una de las fechas ya pasó.');
  });
});

describe('validaciones de entrada', () => {
  it('nombre 1–80 sin caracteres de control', () => {
    expect(errorNombre('  ')).not.toBeNull();
    expect(errorNombre('a'.repeat(81))).not.toBeNull();
    expect(errorNombre('Ana\nBcc: x')).not.toBeNull();
    expect(errorNombre('María José')).toBeNull();
  });
  it('correo', () => {
    expect(errorCorreo('jefatura@example.test')).toBeNull();
    expect(errorCorreo('sin-arroba')).not.toBeNull();
    expect(errorCorreo('a@b')).not.toBeNull();
    expect(errorCorreo(`${'a'.repeat(250)}@x.cl`)).not.toBeNull();
  });
  it('contraseña ≥ 8', () => {
    expect(errorPassword('1234567')).not.toBeNull();
    expect(errorPassword('12345678')).toBeNull();
  });
});
