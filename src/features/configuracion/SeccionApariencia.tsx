import { useEffect, useRef, useState } from 'react';
import { guardarApariencia } from '../../api/datos';
import {
  APARIENCIA_POR_DEFECTO,
  PRESETS,
  aplicarApariencia,
  colorTexto,
  sanitizarApariencia,
  type Apariencia,
} from '../../domain/apariencia';
import type { Perfil } from '../../domain/tipos';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton } from '../../ui/controles';

const CAMPOS: { clave: keyof Apariencia; etiqueta: string }[] = [
  { clave: 'dia', etiqueta: 'Día' },
  { clave: 'noche', etiqueta: 'Noche' },
  { clave: 'libre', etiqueta: 'Libre' },
  { clave: 'fondo', etiqueta: 'Fondo de la app' },
  { clave: 'feriado', etiqueta: 'Borde de feriado' },
];

/** Colores de turnos y fondo. Vista previa en vivo; al salir sin guardar se restauran. */
export function SeccionApariencia({ perfil, onGuardado }: { perfil: Perfil; onGuardado: (p: Perfil) => void }) {
  const guardada = sanitizarApariencia(perfil.apariencia);
  const [colores, setColores] = useState<Apariencia>(guardada);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Al cerrar la configuración, vuelve a los colores guardados (descarta la vista previa).
  const ref = useRef(guardada);
  useEffect(() => {
    ref.current = guardada;
  });
  useEffect(() => () => aplicarApariencia(ref.current), []);

  function cambiar(nuevos: Apariencia) {
    setColores(nuevos);
    setMensaje(null);
    aplicarApariencia(nuevos);
  }

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      const p = await guardarApariencia(perfil.id, colores);
      onGuardado(p);
      setMensaje({ tipo: 'exito', texto: 'Colores guardados.' });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeError(e) });
    } finally {
      setGuardando(false);
    }
  }

  const sinCambios = JSON.stringify(colores) === JSON.stringify(guardada);

  return (
    <section aria-labelledby="t-apariencia" className="space-y-4">
      <h3 id="t-apariencia" className="font-semibold">Apariencia</h3>

      <div>
        <p className="mb-2 text-sm text-gray-700">Combinaciones</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.nombre}
              type="button"
              onClick={() => cambiar(p.colores)}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <span className="flex overflow-hidden rounded" aria-hidden="true">
                {(['dia', 'noche', 'libre', 'feriado'] as const).map((k) => (
                  <span key={k} className="h-5 w-4" style={{ backgroundColor: p.colores[k] }} />
                ))}
              </span>
              {p.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CAMPOS.map(({ clave, etiqueta }) => (
          <label key={clave} className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
            <input
              type="color"
              value={colores[clave]}
              onChange={(e) => cambiar(sanitizarApariencia({ ...colores, [clave]: e.target.value }))}
              className="h-9 w-9 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
              aria-label={`Color de ${etiqueta}`}
            />
            <span className="text-sm">{etiqueta}</span>
          </label>
        ))}
      </div>

      <div className="rounded-xl p-3" style={{ backgroundColor: colores.fondo }} aria-label="Vista previa">
        <div className="flex gap-2">
          {([['dia', 'D'], ['noche', 'N'], ['libre', 'Libre']] as const).map(([k, letra]) => (
            <span
              key={k}
              className="flex h-12 flex-1 items-center justify-center rounded-lg text-sm font-bold"
              style={{ backgroundColor: colores[k], color: colorTexto(colores[k]) }}
            >
              {letra}
            </span>
          ))}
          <span
            className="flex h-12 flex-1 items-center justify-center rounded-lg border-[3px] text-xs font-bold"
            style={{ backgroundColor: colores.noche, color: colorTexto(colores.noche), borderColor: colores.feriado }}
          >
            Feriado
          </span>
        </div>
      </div>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      <div className="flex gap-2">
        <Boton variante="secundario" className="flex-1" onClick={() => cambiar(APARIENCIA_POR_DEFECTO)}>
          Restablecer
        </Boton>
        <Boton className="flex-1" cargando={guardando} disabled={sinCambios} onClick={guardar}>
          Guardar colores
        </Boton>
      </div>
      <p className="text-xs text-gray-600">El texto se ajusta solo para que se lea bien sobre cada color.</p>
    </section>
  );
}
