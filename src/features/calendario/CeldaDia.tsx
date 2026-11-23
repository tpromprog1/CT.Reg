import type { ReactNode } from 'react';
import { partes, formatoLargo } from '../../domain/fechas';
import { TURNOS } from '../../domain/patterns';
import type { DiaCalendario } from '../../domain/calendario';
import { CLASE_TEXTO_TURNO, CLASE_TURNO } from './estilos';

interface Props {
  dia: DiaCalendario;
  hoy: boolean;
  seleccionada?: boolean;
  deshabilitada?: boolean;
  compacta?: boolean;
  onClick?: () => void;
}

export function descripcionDia(dia: DiaCalendario): string {
  const turnos = dia.turnos.length ? dia.turnos.map((t) => TURNOS[t].nombre).join(' y ') : 'Libre';
  return [
    `${formatoLargo(dia.fecha)}: ${turnos}`,
    dia.pendiente ? 'solicitud pendiente' : '',
    dia.modificado ? 'modificado por un cambio' : '',
    dia.extras.length ? `turno extra: ${dia.extras.map((t) => TURNOS[t].nombre).join(' y ')}` : dia.editado ? 'editado a mano' : '',
  ]
    .filter(Boolean)
    .join(', ');
}

export function CeldaDia({ dia, hoy, seleccionada, deshabilitada, compacta, onClick }: Props) {
  const { dia: numero } = partes(dia.fecha);
  const alto = compacta ? 'h-11' : 'h-14 sm:h-20';
  const tipos = dia.turnos.length ? dia.turnos : (['L'] as const);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitada}
      aria-label={descripcionDia(dia)}
      aria-pressed={seleccionada === undefined ? undefined : seleccionada}
      aria-current={hoy ? 'date' : undefined}
      className={`relative flex w-full overflow-hidden rounded-lg ${alto} ${
        seleccionada ? 'ring-4 ring-gray-900' : hoy ? 'ring-2 ring-gray-900 ring-offset-1' : ''
      } ${deshabilitada ? 'cursor-not-allowed opacity-35' : 'hover:brightness-95'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
    >
      {/* Celda dividida si hay D y N el mismo día */}
      {tipos.map((t) => (
        <span key={t} className={`flex flex-1 items-end justify-center pb-1 text-sm font-bold ${CLASE_TURNO[t]}`}>
          {t === 'L' ? '' : t}
        </span>
      ))}
      <span
        className={`absolute left-1 top-0.5 text-xs font-semibold ${CLASE_TEXTO_TURNO[tipos[0] ?? 'L']}`}
        aria-hidden="true"
      >
        {numero}
        {dia.modificado && <span className="ml-0.5 font-bold">⇄</span>}
        {dia.editado && <span className="ml-0.5">{dia.extras.length > 0 ? '+' : '✎'}</span>}
      </span>
      {dia.pendiente && (
        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-pendiente ring-2 ring-white" aria-hidden="true" />
      )}
    </button>
  );
}

export function Leyenda() {
  const item = (muestra: ReactNode, texto: string) => (
    <li className="flex items-center gap-1.5">
      {muestra}
      <span>{texto}</span>
    </li>
  );
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-fondo-texto" aria-label="Leyenda">
      {item(<span className={`flex h-5 w-5 items-center justify-center rounded text-xs font-bold ${CLASE_TURNO.D}`}>D</span>, `Día ${TURNOS.D.inicio}–${TURNOS.D.fin}`)}
      {item(<span className={`flex h-5 w-5 items-center justify-center rounded text-xs font-bold ${CLASE_TURNO.N}`}>N</span>, `Noche ${TURNOS.N.inicio}–${TURNOS.N.fin}`)}
      {item(<span className={`h-5 w-5 rounded border border-gray-200 ${CLASE_TURNO.L}`} />, 'Libre')}
      {item(<span className="h-3 w-3 rounded-full bg-pendiente" />, 'Pendiente')}
      {item(<span className="font-bold">⇄</span>, 'Cambio confirmado')}
      {item(<span>✎</span>, 'Editado a mano')}
      {item(<span className="font-bold">+</span>, 'Turno extra')}
    </ul>
  );
}
