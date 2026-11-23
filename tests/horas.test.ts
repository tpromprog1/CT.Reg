import { describe, expect, it } from 'vitest';
import { contarTurnos, horasDeTurno } from '../src/domain/estadisticas';
import { FERIADOS, esFestivo, nombreFeriado } from '../src/domain/feriados';
import { diaSemana } from '../src/domain/fechas';

describe('horas diurnas, nocturnas y festivas', () => {
  it('Día en día hábil: 9 diurnas (08–17) y 3 nocturnas (17–20)', () => {
    expect(horasDeTurno('2026-12-01', 'D')).toEqual({ diurnas: 9, nocturnas: 3, festivas: 0 }); // martes
  });

  it('Noche de miércoles a jueves: 12 nocturnas', () => {
    expect(horasDeTurno('2026-12-02', 'N')).toEqual({ diurnas: 0, nocturnas: 12, festivas: 0 });
  });

  it('Noche de viernes a sábado: la madrugada del sábado es festiva', () => {
    expect(horasDeTurno('2026-12-04', 'N')).toEqual({ diurnas: 0, nocturnas: 12, festivas: 8 });
  });

  it('Día en sábado: todo festivo (y nocturno)', () => {
    expect(horasDeTurno('2026-12-05', 'D')).toEqual({ diurnas: 0, nocturnas: 12, festivas: 12 });
  });

  it('Noche de domingo a lunes: 4 festivas (domingo 20–24)', () => {
    expect(horasDeTurno('2026-12-06', 'N')).toEqual({ diurnas: 0, nocturnas: 12, festivas: 4 });
  });

  it('Día en feriado hábil (8 de diciembre, martes): todo festivo', () => {
    expect(horasDeTurno('2026-12-08', 'D')).toEqual({ diurnas: 0, nocturnas: 12, festivas: 12 });
  });

  it('Noche víspera de feriado (7 al 8 de diciembre): 8 festivas', () => {
    expect(horasDeTurno('2026-12-07', 'N')).toEqual({ diurnas: 0, nocturnas: 12, festivas: 8 });
  });

  it('24 h en día hábil: 9 diurnas y 15 nocturnas', () => {
    const c = contarTurnos([{ fecha: '2026-12-01', turnos: ['D', 'N'], extras: [] }]);
    expect(c).toMatchObject({ horas: 24, diurnas: 9, nocturnas: 15, festivas: 0 });
  });
});

describe('feriados', () => {
  it('fines de semana y feriados son festivos', () => {
    expect(esFestivo('2026-12-05')).toBe(true); // sábado
    expect(esFestivo('2026-12-06')).toBe(true); // domingo
    expect(esFestivo('2026-12-25')).toBe(true); // Navidad, viernes
    expect(esFestivo('2026-12-01')).toBe(false); // martes
    expect(nombreFeriado('2026-09-18')).toBe('Independencia Nacional');
  });

  it('los feriados trasladables caen en lunes', () => {
    for (const f of ['2026-06-29', '2026-10-12', '2027-06-28', '2027-10-11']) expect(diaSemana(f), f).toBe(0);
  });

  it('Viernes y Sábado Santo caen en viernes y sábado', () => {
    for (const [v, s] of [['2026-04-03', '2026-04-04'], ['2027-03-26', '2027-03-27']]) {
      expect(diaSemana(v!)).toBe(4);
      expect(diaSemana(s!)).toBe(5);
    }
  });

  it('todas las claves son fechas válidas', () => {
    for (const f of Object.keys(FERIADOS)) expect(f).toMatch(/^20\d\d-\d\d-\d\d$/);
  });
});
