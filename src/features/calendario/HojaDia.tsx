import { formatoLargo } from '../../domain/fechas';
import { TURNOS, etiquetaTurno, type TipoTurno } from '../../domain/patterns';
import type { DiaCalendario, EventoDia } from '../../domain/calendario';
import { tiposCedibles } from '../../domain/validaciones';
import type { CambioTurno } from '../../domain/tipos';
import { Dialogo } from '../../ui/Dialogo';
import { Boton } from '../../ui/controles';
import { CLASE_TURNO } from './estilos';

interface Props {
  dia: DiaCalendario;
  pendientesPropios: CambioTurno[];
  onCerrar: () => void;
  onCambiarTurno: (tipo: TipoTurno) => void;
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

export function HojaDia({ dia, pendientesPropios, onCerrar, onCambiarTurno }: Props) {
  const cedibles = tiposCedibles(dia, pendientesPropios);
  const conPendiente = dia.turnos.filter((t) => !cedibles.includes(t));

  return (
    <Dialogo
      titulo={formatoLargo(dia.fecha)}
      onCerrar={onCerrar}
      pie={
        cedibles.length > 0 ? (
          <div className="flex w-full flex-col gap-2">
            {cedibles.map((t) => (
              <Boton key={t} className="w-full" onClick={() => onCambiarTurno(t)}>
                Cambiar turno{cedibles.length > 1 || dia.turnos.length > 1 ? ` ${TURNOS[t].nombre}` : ''}
              </Boton>
            ))}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <ul className="space-y-2">
          {dia.turnos.length === 0 && (
            <li className={`rounded-xl px-3 py-3 ${CLASE_TURNO.L}`}>Libre</li>
          )}
          {dia.turnos.map((t) => (
            <li key={t} className={`flex items-center gap-3 rounded-xl px-3 py-3 font-medium ${CLASE_TURNO[t]}`}>
              <span className="text-lg font-bold">{t}</span>
              <span>{etiquetaTurno(t)}</span>
            </li>
          ))}
        </ul>
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
