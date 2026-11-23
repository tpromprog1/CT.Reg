import { describe, expect, it } from 'vitest';
import { calcularDia, calcularDias, fechasDelMes, semanasDelMes, turnosBase, type ConfigCalendario } from '../src/domain/calendario';
import { sumarDias } from '../src/domain/fechas';
import type { CambioTurno } from '../src/domain/tipos';

const cuarto: ConfigCalendario = { anio: 2026, sistema: 'cuarto', fecha_ancla: '2026-03-10' };
const tercero: ConfigCalendario = { anio: 2026, sistema: 'tercero', fecha_ancla: '2026-03-10' };

const letra = (c: ConfigCalendario, f: string) => turnosBase(c, f)[0] ?? 'L';

describe('patrones base', () => {
  it('cuarto turno: D-N-L-L desde la ancla', () => {
    const dias = Array.from({ length: 8 }, (_, i) => letra(cuarto, sumarDias('2026-03-10', i)));
    expect(dias.join('')).toBe('DNLLDNLL');
  });

  it('cuarto turno: correcto antes de la ancla', () => {
    const dias = Array.from({ length: 4 }, (_, i) => letra(cuarto, sumarDias('2026-03-06', i)));
    expect(dias.join('')).toBe('DNLL');
    expect(letra(cuarto, '2026-03-09')).toBe('L');
    expect(letra(cuarto, '2026-03-07')).toBe('N');
  });

  it('cuarto turno: el ciclo se mantiene todo el año, incluido el 31 de diciembre', () => {
    let dias = '';
    for (let f = '2026-01-01'; f <= '2026-12-31'; f = sumarDias(f, 1)) dias += letra(cuarto, f);
    expect(dias.length).toBe(365);
    // La ancla (10 de marzo) es el día de índice 68 del año: cada día i debe ser DNLL[(i - 68) mod 4].
    const esperado = Array.from({ length: 365 }, (_, i) => 'DNLL'[(((i - 68) % 4) + 4) % 4]).join('');
    expect(dias).toBe(esperado);
    expect(dias[68]).toBe('D');
  });

  it('tercer turno: D-D-N-N-L-L', () => {
    const dias = Array.from({ length: 12 }, (_, i) => letra(tercero, sumarDias('2026-03-10', i)));
    expect(dias.join('')).toBe('DDNNLLDDNNLL');
    expect(letra(tercero, '2026-03-09')).toBe('L');
    expect(letra(tercero, '2026-03-07')).toBe('N');
  });

  it('año bisiesto 2028: 366 días y el 29 de febrero en ciclo', () => {
    const c: ConfigCalendario = { anio: 2028, sistema: 'cuarto', fecha_ancla: '2028-02-27' };
    expect(letra(c, '2028-02-27')).toBe('D');
    expect(letra(c, '2028-02-28')).toBe('N');
    expect(letra(c, '2028-02-29')).toBe('L');
    expect(letra(c, '2028-03-01')).toBe('L');
    expect(letra(c, '2028-03-02')).toBe('D');
    let n = 0;
    for (let f = '2028-01-01'; f <= '2028-12-31'; f = sumarDias(f, 1)) n++;
    expect(n).toBe(366);
  });

  it('cruce de año: la ancla puede estar en el año anterior; fuera del año generado no hay turnos', () => {
    const c: ConfigCalendario = { anio: 2027, sistema: 'cuarto', fecha_ancla: '2026-12-30' };
    expect(letra(c, '2027-01-03')).toBe('D');
    expect(turnosBase(c, '2026-12-30')).toEqual([]);
  });

  it('cambios de horario de Chile no desplazan el patrón', () => {
    const c: ConfigCalendario = { anio: 2026, sistema: 'cuarto', fecha_ancla: '2026-04-03' };
    expect(['2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06', '2026-04-07'].map((f) => letra(c, f)).join('')).toBe('DNLLD');
    const s: ConfigCalendario = { anio: 2026, sistema: 'cuarto', fecha_ancla: '2026-09-04' };
    expect(['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08'].map((f) => letra(s, f)).join('')).toBe('DNLLD');
  });
});

describe('grilla mensual', () => {
  it('diciembre 2026 empieza martes y tiene 5 semanas', () => {
    const semanas = semanasDelMes(2026, 12);
    expect(semanas[0]![0]).toBeNull();
    expect(semanas[0]![1]).toBe('2026-12-01');
    expect(semanas.length).toBe(5);
    expect(fechasDelMes(2026, 12).length).toBe(31);
  });
});

// --- Superposición -------------------------------------------------------
const ANA = 'ana';
const BETO = 'beto';
const calAna: ConfigCalendario = { anio: 2026, sistema: 'cuarto', fecha_ancla: '2026-12-01' }; // D 1, N 2, L 3, L 4
const calBeto: ConfigCalendario = { anio: 2026, sistema: 'cuarto', fecha_ancla: '2026-12-03' }; // D 3, N 4, L 1, L 2

function cambio(p: Partial<CambioTurno>): CambioTurno {
  return {
    id: 'c1',
    solicitante_id: ANA,
    solicitante_nombre: 'Ana',
    cobertura_id: BETO,
    cobertura_nombre: 'Beto',
    cobertura_correo: null,
    cedido_fecha: '2026-12-01',
    cedido_tipo: 'D',
    devolucion_fecha: '2026-12-04',
    devolucion_tipo: 'N',
    estado: 'confirmado',
    correo_estado: 'enviado',
    correo_enviado_at: null,
    correo_jefatura_usado: null,
    created_at: '2026-11-20T12:00:00Z',
    confirmado_at: '2026-11-21T12:00:00Z',
    anulado_at: null,
    ...p,
  };
}

describe('superposición de cambios', () => {
  it('solicitante: pierde el turno cedido y gana el de devolución', () => {
    const c = [cambio({})];
    const d1 = calcularDia('2026-12-01', [calAna], c, ANA);
    expect(d1.turnos).toEqual([]);
    expect(d1.modificado).toBe(true);
    expect(d1.eventos[0]).toMatchObject({ tipo: 'cubierto_por', persona: 'Beto', turno: 'D' });
    const d4 = calcularDia('2026-12-04', [calAna], c, ANA);
    expect(d4.turnos).toEqual(['N']);
    expect(d4.eventos[0]).toMatchObject({ tipo: 'cubro_a', persona: 'Beto' });
  });

  it('cobertura: lo inverso', () => {
    const c = [cambio({})];
    const d1 = calcularDia('2026-12-01', [calBeto], c, BETO);
    expect(d1.turnos).toEqual(['D']);
    expect(d1.eventos[0]).toMatchObject({ tipo: 'cubro_a', persona: 'Ana' });
    const d4 = calcularDia('2026-12-04', [calBeto], c, BETO);
    expect(d4.turnos).toEqual([]);
    expect(d4.eventos[0]).toMatchObject({ tipo: 'cubierto_por', persona: 'Ana' });
  });

  it('D + N el mismo día (24 h)', () => {
    // Ana tiene D el 1; cubre la N del 1 de Beto (que no tiene N ese día, da igual para el cálculo).
    const c = [cambio({ cedido_fecha: '2026-12-02', cedido_tipo: 'N', devolucion_fecha: '2026-12-01', devolucion_tipo: 'N' })];
    expect(calcularDia('2026-12-01', [calAna], c, ANA).turnos).toEqual(['D', 'N']);
  });

  it('un pendiente solo marca, no modifica', () => {
    const c = [cambio({ estado: 'pendiente', confirmado_at: null })];
    const dias = calcularDias(['2026-12-01', '2026-12-04'], [calAna], c, ANA);
    expect(dias.get('2026-12-01')!.turnos).toEqual(['D']);
    expect(dias.get('2026-12-01')!.pendiente).toBe(true);
    expect(dias.get('2026-12-01')!.modificado).toBe(false);
    expect(dias.get('2026-12-04')!.turnos).toEqual([]);
    expect(dias.get('2026-12-04')!.pendiente).toBe(true);
  });

  it('un anulado no tiene efecto', () => {
    const c = [cambio({ estado: 'anulado', confirmado_at: null, anulado_at: '2026-11-22T00:00:00Z' })];
    const d = calcularDia('2026-12-01', [calAna], c, ANA);
    expect(d.turnos).toEqual(['D']);
    expect(d.pendiente).toBe(false);
  });

  it('cambios ajenos se ignoran', () => {
    const c = [cambio({ solicitante_id: 'otra', cobertura_id: 'otra2' })];
    expect(calcularDia('2026-12-01', [calAna], c, ANA).turnos).toEqual(['D']);
  });
});
