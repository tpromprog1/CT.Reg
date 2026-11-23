import { describe, expect, it } from 'vitest';
import { ajustesParaDia, calcularDia, calcularDias, fechasDelMes, type ConfigCalendario } from '../src/domain/calendario';
import { contarTurnos } from '../src/domain/estadisticas';
import { duracionHoras } from '../src/domain/patterns';
import {
  APARIENCIA_POR_DEFECTO,
  PRESETS,
  colorTexto,
  contraste,
  sanitizarApariencia,
  variablesCss,
} from '../src/domain/apariencia';

const cal: ConfigCalendario = { anio: 2026, sistema: 'cuarto', fecha_ancla: '2026-12-01' }; // D 1, N 2, L 3, L 4

describe('turnos extra', () => {
  it('un turno agregado como extra queda marcado', () => {
    const d = calcularDia('2026-12-03', [cal], [], 'ana', [{ fecha: '2026-12-03', tipo: 'D', accion: 'agregar', extra: true }]);
    expect(d.turnos).toEqual(['D']);
    expect(d.extras).toEqual(['D']);
  });

  it('un turno agregado sin marcar no es extra', () => {
    const d = calcularDia('2026-12-03', [cal], [], 'ana', [{ fecha: '2026-12-03', tipo: 'N', accion: 'agregar' }]);
    expect(d.extras).toEqual([]);
  });

  it('ajustesParaDia incluye la marca de extra solo en los agregados', () => {
    expect(ajustesParaDia(['D'], ['D', 'N'], ['N'])).toEqual([{ tipo: 'N', accion: 'agregar', extra: true }]);
    expect(ajustesParaDia(['D'], ['N'], ['N'])).toEqual([
      { tipo: 'D', accion: 'quitar' },
      { tipo: 'N', accion: 'agregar', extra: true },
    ]);
    expect(ajustesParaDia([], ['D'], [])).toEqual([{ tipo: 'D', accion: 'agregar' }]);
  });
});

describe('conteo de días y noches', () => {
  it('duración de los turnos según patterns.ts', () => {
    expect(duracionHoras('D')).toBe(12);
    expect(duracionHoras('N')).toBe(12);
  });

  it('diciembre 2026 en cuarto turno desde el 1: 8 días, 8 noches, 192 h', () => {
    const c = contarTurnos(calcularDias(fechasDelMes(2026, 12), [cal], [], 'ana').values());
    expect(c).toMatchObject({ dias: 8, noches: 8, horas: 192, extras: 0 });
    expect(c.diurnas + c.nocturnas).toBe(192);
  });

  it('suma extras y 24 h', () => {
    const aj = [
      { fecha: '2026-12-03', tipo: 'D' as const, accion: 'agregar' as const, extra: true },
      { fecha: '2026-12-03', tipo: 'N' as const, accion: 'agregar' as const, extra: true },
    ];
    const dias = calcularDias(fechasDelMes(2026, 12), [cal], [], 'ana', aj);
    expect(contarTurnos(dias.values())).toMatchObject({ dias: 9, noches: 9, horas: 216, extras: 2 });
  });
});

describe('apariencia', () => {
  it('solo acepta colores hex y completa con los por defecto', () => {
    // Un perfil guardado antes de existir "feriado" toma el color por defecto.
    const a = sanitizarApariencia({ dia: '#ABCDEF', noche: 'red', libre: 'url(javascript:alert(1))', fondo: 42 });
    expect(a.feriado).toBe('#dc2626');
    expect(sanitizarApariencia({ feriado: '#0E7490' }).feriado).toBe('#0e7490');
    expect(a).toEqual({ ...APARIENCIA_POR_DEFECTO, dia: '#abcdef' });
    expect(sanitizarApariencia(null)).toEqual(APARIENCIA_POR_DEFECTO);
    expect(sanitizarApariencia('x')).toEqual(APARIENCIA_POR_DEFECTO);
  });

  it('texto oscuro sobre amarillo y blanco sobre azul', () => {
    expect(colorTexto('#facc15')).toBe('#000000');
    expect(colorTexto('#1e40af')).toBe('#ffffff');
  });

  it('el texto elegido cumple contraste AA (≥ 4.5) en las combinaciones prediseñadas', () => {
    for (const p of PRESETS) {
      for (const k of ['dia', 'noche'] as const) {
        expect(contraste(p.colores[k], colorTexto(p.colores[k])), `${p.nombre}/${k}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('el texto elegido siempre da al menos 4.5 de contraste para cualquier color', () => {
    for (let i = 0; i < 4096; i += 7) {
      const hex = `#${i.toString(16).padStart(3, '0').split('').map((c) => c + c).join('')}`;
      expect(contraste(hex, colorTexto(hex))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('genera las variables CSS', () => {
    expect(variablesCss(APARIENCIA_POR_DEFECTO)['--color-dia']).toBe('#facc15');
    expect(variablesCss(APARIENCIA_POR_DEFECTO)['--color-noche-texto']).toBe('#ffffff');
  });
});
