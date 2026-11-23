import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  aDiaEpoch,
  diaSemana,
  diasDelMes,
  diferenciaDias,
  esFechaISO,
  formatoLargo,
  formatoTimestamp,
  hoyEnChile,
  indiceCiclo,
  sumarDias,
} from '../src/domain/fechas';

describe('fechas sin hora', () => {
  it('valida el formato YYYY-MM-DD y los días del mes', () => {
    expect(esFechaISO('2026-12-01')).toBe(true);
    expect(esFechaISO('2026-02-29')).toBe(false);
    expect(esFechaISO('2028-02-29')).toBe(true);
    expect(esFechaISO('2026-13-01')).toBe(false);
    expect(esFechaISO('1-1-2026')).toBe(false);
  });

  it('suma días cruzando meses, años y bisiestos', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(sumarDias('2028-03-01', -1)).toBe('2028-02-29');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(diasDelMes(2028, 2)).toBe(29);
  });

  it('no se altera con los cambios de horario de Chile (abril y septiembre)', () => {
    // 2026: horario de invierno desde el 5 de abril; de verano desde el 6 de septiembre.
    expect(diferenciaDias('2026-04-04', '2026-04-05')).toBe(1);
    expect(diferenciaDias('2026-04-04', '2026-04-06')).toBe(2);
    expect(diferenciaDias('2026-09-05', '2026-09-07')).toBe(2);
    expect(sumarDias('2026-09-05', 1)).toBe('2026-09-06');
    expect(Number.isInteger(aDiaEpoch('2026-09-06'))).toBe(true);
  });

  it('calcula el índice de ciclo también antes de la ancla', () => {
    expect(indiceCiclo('2026-01-10', '2026-01-10', 4)).toBe(0);
    expect(indiceCiclo('2026-01-10', '2026-01-13', 4)).toBe(3);
    expect(indiceCiclo('2026-01-10', '2026-01-09', 4)).toBe(3);
    expect(indiceCiclo('2026-01-10', '2026-01-06', 4)).toBe(0);
  });

  it('día de la semana con lunes = 0', () => {
    expect(diaSemana('2026-12-01')).toBe(1); // martes
    expect(diaSemana('2026-11-23')).toBe(0); // lunes
    expect(diaSemana('2026-11-29')).toBe(6); // domingo
  });

  it('formatea en español de Chile sin desfase de zona horaria', () => {
    expect(formatoLargo('2026-12-01')).toBe('martes 1 de diciembre de 2026');
    expect(formatoLargo('2026-12-04')).toBe('viernes 4 de diciembre de 2026');
    expect(formatoLargo('2028-02-29')).toBe('martes 29 de febrero de 2028');
  });

  it('muestra timestamps y "hoy" en America/Santiago', () => {
    // 02:30 UTC del 1 de diciembre = 23:30 del 30 de noviembre en Chile (UTC-3 en verano).
    expect(hoyEnChile(new Date('2026-12-01T02:30:00Z'))).toBe('2026-11-30');
    expect(formatoTimestamp('2026-12-01T02:30:00Z')).toBe('lunes 30 de noviembre de 2026 a las 23:30');
    // Invierno (UTC-4).
    expect(formatoTimestamp('2026-07-15T12:00:00Z')).toBe('miércoles 15 de julio de 2026 a las 08:00');
  });
});

describe('patterns.ts', () => {
  it('la copia para la Edge Function es idéntica a src/domain/patterns.ts (npm run sync:patterns)', () => {
    const leer = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(leer('../supabase/functions/_shared/patterns.ts')).toBe(leer('../src/domain/patterns.ts'));
  });
});
