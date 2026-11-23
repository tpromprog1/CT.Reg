import { describe, expect, it } from 'vitest';
import { ASUNTO, armarCorreo, armarMailto, escaparHtml } from '../src/domain/correo';

const datos = {
  solicitanteNombre: 'Ana Demo',
  coberturaNombre: 'Beto Demo',
  cedido: { fecha: '2026-12-01', tipo: 'D' as const },
  devolucion: { fecha: '2026-12-04', tipo: 'N' as const },
  solicitadoEn: '2026-11-23T17:05:00Z',
};

describe('plantilla de correo', () => {
  it('asunto exacto y cuerpo que empieza con PENDIENTE DE CONFIRMAR', () => {
    const c = armarCorreo(datos);
    expect(c.asunto).toBe('Cambio de turno');
    expect(ASUNTO).toBe('Cambio de turno');
    expect(c.texto.startsWith('PENDIENTE DE CONFIRMAR\n')).toBe(true);
    expect(c.html).toContain('PENDIENTE DE CONFIRMAR');
  });

  it('texto plano con el formato acordado', () => {
    expect(armarCorreo(datos).texto).toBe(
      [
        'PENDIENTE DE CONFIRMAR',
        '',
        'Solicitud de cambio de turno',
        'Solicitante: Ana Demo',
        'Cobertura: Beto Demo',
        '',
        'Turno de Ana Demo que cubrirá Beto Demo:',
        '  martes 1 de diciembre de 2026 · Día (08:00–20:00)',
        '',
        'Turno que Ana Demo cubrirá en devolución:',
        '  viernes 4 de diciembre de 2026 · Noche (20:00–08:00)',
        '',
        'Solicitado el lunes 23 de noviembre de 2026 a las 14:05.',
        'Este cambio no es válido hasta ser confirmado por jefatura.',
      ].join('\n'),
    );
  });

  it('escapa el HTML de los nombres ingresados por usuarios', () => {
    const c = armarCorreo({ ...datos, coberturaNombre: '<img src=x onerror=alert(1)>', solicitanteNombre: 'Ana "&" Co' });
    expect(c.html).not.toContain('<img');
    expect(c.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(c.html).toContain('Ana &quot;&amp;&quot; Co');
    expect(escaparHtml(`'`)).toBe('&#39;');
  });

  it('no incluye ids internos ni enlaces', () => {
    const c = armarCorreo(datos);
    expect(c.html).not.toMatch(/href=|https?:\/\//);
    expect(c.texto).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it('mailto con destinatarios, asunto y cuerpo codificados', () => {
    const c = armarCorreo(datos);
    const url = armarMailto(['jefatura@example.test'], ['ana@example.test', 'otra@example.test'], c);
    expect(url.startsWith('mailto:jefatura%40example.test?cc=ana%40example.test,otra%40example.test&subject=Cambio%20de%20turno&body=PENDIENTE%20DE%20CONFIRMAR%0D%0A')).toBe(true);
  });
});
