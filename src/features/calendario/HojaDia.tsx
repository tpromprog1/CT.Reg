import { useState } from 'react';
import { guardarAjustesDia } from '../../api/datos';
import { formatoLargo } from '../../domain/fechas';
import { TURNOS, etiquetaTurno, type TipoTurno } from '../../domain/patterns';
import { ajustesParaDia, type DiaCalendario, type EventoDia } from '../../domain/calendario';
import { tiposCedibles } from '../../domain/validaciones';
import type { CambioTurno } from '../../domain/tipos';
import { mensajeError } from '../../lib/errores';
import { nombreFeriado } from '../../domain/feriados';
import { Dialogo } from '../../ui/Dialogo';
import { Aviso, Boton } from '../../ui/controles';
import { CLASE_BOTON_TURNO, CLASE_TURNO } from './estilos';

interface Props {
  dia: DiaCalendario;
  pendientesPropios: CambioTurno[];
  onCerrar: () => void;
  onCambiarTurno: (tipo: TipoTurno) => void;
  /** Se llama después de guardar ajustes manuales (para recargar datos). */
  onAjustado: () => Promise<void> | void;
}

function textoEvento(e: EventoDia): string {
  const turno = TURNOS[e.turno].nombre;
  switch (e.tipo) {
    case 'cubierto_por':
      return `${turno}: cubierto por ${e.persona}`;
    case 'cubro_a':
      return `${turno}: cubro a ${e.persona}`;
    case 'pendiente':
      return `${turno}: pendiente de confirmar (con ${e.persona})`;
  }
}

const nombres = (t: TipoTurno[]) => (t.length ? t.map((x) => TURNOS[x].nombre).join(' y ') : 'Libre');

export function HojaDia({ dia, pendientesPropios, onCerrar, onCambiarTurno, onAjustado }: Props) {
  const [editando, setEditando] = useState(false);
  const [deseados, setDeseados] = useState<TipoTurno[]>(dia.propios);
  // Turnos agregados que NO son extra (por defecto, todo turno agregado es extra).
  const [noExtra, setNoExtra] = useState<TipoTurno[]>(
    dia.propios.filter((t) => !dia.base.includes(t) && !dia.extras.includes(t)),
  );
  const agregados = deseados.filter((t) => !dia.base.includes(t));
  const extrasDeseados = agregados.filter((t) => !noExtra.includes(t));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cedibles = tiposCedibles(dia, pendientesPropios);
  const conPendiente = dia.turnos.filter((t) => !cedibles.includes(t));

  async function guardar(lista: TipoTurno[], extras: TipoTurno[]) {
    setGuardando(true);
    setError(null);
    try {
      await guardarAjustesDia(dia.fecha, ajustesParaDia(dia.base, lista, extras));
      await onAjustado();
      setEditando(false);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  }

  const alternar = (t: TipoTurno) =>
    setDeseados((d) => (d.includes(t) ? d.filter((x) => x !== t) : (['D', 'N'] as const).filter((x) => x === t || d.includes(x))));

  if (editando) {
    const sinCambios =
      JSON.stringify(ajustesParaDia(dia.base, deseados, extrasDeseados)) ===
      JSON.stringify(ajustesParaDia(dia.base, dia.propios, dia.extras));
    return (
      <Dialogo
        titulo="Editar turnos del día"
        onCerrar={onCerrar}
        onVolver={() => setEditando(false)}
        pie={
          <Boton className="w-full" cargando={guardando} disabled={sinCambios} onClick={() => guardar(deseados, extrasDeseados)}>
            Guardar
          </Boton>
        }
      >
        <div className="space-y-4">
          <p className="font-medium">{formatoLargo(dia.fecha)}</p>
          <div role="group" aria-label="Turnos de este día" className="flex gap-2">
            {(['D', 'N'] as const).map((t) => {
              const activo = deseados.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => alternar(t)}
                  className={`min-h-14 flex-1 rounded-xl border-2 px-3 py-2 font-semibold ${
                    activo ? CLASE_BOTON_TURNO[t].claseActiva : CLASE_BOTON_TURNO[t].clase
                  }`}
                >
                  {activo ? '✓ ' : ''}
                  {etiquetaTurno(t)}
                </button>
              );
            })}
          </div>
          {agregados.map((t) => (
            <label key={t} className="flex min-h-11 items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={!noExtra.includes(t)}
                onChange={(e) =>
                  setNoExtra((n) => (e.target.checked ? n.filter((x) => x !== t) : [...n, t]))
                }
              />
              <span>
                <span className="font-medium">{TURNOS[t].nombre}: turno extra</span>
                <span className="block text-xs text-gray-600">Se marca con + y se cuenta aparte.</span>
              </span>
            </label>
          ))}
          <p className="text-sm text-gray-700">
            Quedará: <strong>{deseados.length === 2 ? 'Día y Noche (24 h)' : nombres(deseados)}</strong>
          </p>
          <p className="text-sm text-gray-600">
            Según tu sistema este día es: {nombres(dia.base)}. Usa esta opción para turnos que no pasaron por la app
            (por ejemplo, un 24 h acordado directamente).
          </p>
          {dia.modificado && (
            <Aviso tipo="info">Los cambios confirmados de este día se siguen aplicando encima.</Aviso>
          )}
          {dia.editado && (
            <Boton variante="secundario" className="w-full" cargando={guardando} onClick={() => guardar(dia.base, [])}>
              Volver al patrón ({nombres(dia.base)})
            </Boton>
          )}
          {error && <Aviso tipo="error">{error}</Aviso>}
        </div>
      </Dialogo>
    );
  }

  return (
    <Dialogo
      titulo={formatoLargo(dia.fecha)}
      onCerrar={onCerrar}
      pie={
        <div className="flex w-full flex-col gap-2">
          {cedibles.map((t) => (
            <Boton key={t} className="w-full" onClick={() => onCambiarTurno(t)}>
              Cambiar turno{cedibles.length > 1 || dia.turnos.length > 1 ? ` ${TURNOS[t].nombre}` : ''}
            </Boton>
          ))}
          <Boton
            variante="secundario"
            className="w-full"
            onClick={() => {
              setDeseados(dia.propios);
              setNoExtra(dia.propios.filter((t) => !dia.base.includes(t) && !dia.extras.includes(t)));
              setEditando(true);
            }}
          >
            ✎ Editar turnos del día
          </Boton>
        </div>
      }
    >
      <div className="space-y-4">
        {nombreFeriado(dia.fecha) && (
          <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <span className="h-4 w-4 rounded border-[3px] border-feriado" aria-hidden="true" />
            Feriado: {nombreFeriado(dia.fecha)}
          </p>
        )}
        <ul className="space-y-2">
          {dia.turnos.length === 0 && <li className={`rounded-xl px-3 py-3 ${CLASE_TURNO.L}`}>Libre</li>}
          {dia.turnos.map((t) => (
            <li key={t} className={`flex items-center gap-3 rounded-xl px-3 py-3 font-medium ${CLASE_TURNO[t]}`}>
              <span className="text-lg font-bold">{t}</span>
              <span>{etiquetaTurno(t)}</span>
            </li>
          ))}
        </ul>
        {dia.turnos.length === 2 && <p className="text-sm font-medium text-gray-700">Jornada de 24 horas.</p>}
        {dia.extras.length > 0 && (
          <p className="text-sm font-medium text-gray-700">+ Turno extra: {nombres(dia.extras)}.</p>
        )}
        {dia.editado && (
          <p className="text-sm text-gray-600">✎ Editado a mano (según tu sistema: {nombres(dia.base)}).</p>
        )}
        {dia.eventos.length > 0 && (
          <section>
            <h3 className="mb-1 text-sm font-semibold text-gray-700">Cambios</h3>
            <ul className="space-y-1">
              {dia.eventos.map((e, i) => (
                <li key={`${e.cambioId}-${i}`} className="flex items-start gap-2 text-sm">
                  <span aria-hidden="true" className={e.tipo === 'pendiente' ? 'text-orange-700' : 'text-gray-700'}>
                    {e.tipo === 'pendiente' ? '●' : '⇄'}
                  </span>
                  <span>{textoEvento(e)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {conPendiente.length > 0 && (
          <p className="text-sm text-gray-600">
            Ya hay una solicitud pendiente sobre tu turno {conPendiente.map((t) => TURNOS[t].nombre).join(' y ')}.
          </p>
        )}
      </div>
    </Dialogo>
  );
}
