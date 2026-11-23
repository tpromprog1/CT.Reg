import { useMemo, useState } from 'react';
import { aniosConCambios, resumirCambios, type ConteoEstados } from '../../domain/estadisticas';
import { hoyEnChile, partes } from '../../domain/fechas';
import type { CambioTurno } from '../../domain/tipos';

function Fila({ titulo, ayuda, conteo }: { titulo: string; ayuda: string; conteo: ConteoEstados }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="font-semibold">{titulo}</p>
      <p className="mb-2 text-xs text-gray-600">{ayuda}</p>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-xs text-gray-600">Confirmados</dt>
          <dd className="text-2xl font-bold text-gray-900">{conteo.confirmado}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-600">Pendientes</dt>
          <dd className="text-2xl font-bold text-orange-700">{conteo.pendiente}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-600">Anulados</dt>
          <dd className="text-2xl font-bold text-gray-500">{conteo.anulado}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Conteo anual: cambios que pedí y cambios que otras personas pidieron hacia mí. */
export function ResumenCambios({ uid, cambios }: { uid: string; cambios: CambioTurno[] }) {
  const anioActual = partes(hoyEnChile()).anio;
  const anios = useMemo(() => aniosConCambios(cambios, anioActual), [cambios, anioActual]);
  const [anio, setAnio] = useState(anioActual);
  const r = useMemo(() => resumirCambios(cambios, uid, anio), [cambios, uid, anio]);

  return (
    <section aria-labelledby="t-resumen" className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 id="t-resumen" className="text-lg font-semibold">Resumen</h2>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span className="sr-only">Año del resumen</span>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-base"
          >
            {anios.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      </div>
      <Fila titulo="Pedidos por mí" ayuda="Cambios que solicitaste (alguien cubre tu turno)." conteo={r.pedidosPorMi} />
      <Fila titulo="Hacia mí" ayuda="Cambios que otras personas pidieron y en que tú cubres." conteo={r.haciaMi} />
      {r.porPersona.length > 0 && (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-blue-900">
            Detalle por persona (confirmados)
          </summary>
          <table className="mt-1 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-600">
                <th className="py-1 font-medium">Persona</th>
                <th className="py-1 text-center font-medium">Me cubrió</th>
                <th className="py-1 text-center font-medium">La cubrí</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {r.porPersona.map((p) => (
                <tr key={p.nombre}>
                  <td className="py-2">{p.nombre}</td>
                  <td className="py-2 text-center font-semibold">{p.pedidosPorMi}</td>
                  <td className="py-2 text-center font-semibold">{p.haciaMi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
