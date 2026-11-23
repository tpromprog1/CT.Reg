import { DIAS_SEMANA, DIAS_SEMANA_CORTOS, nombreMes, type FechaISO } from '../../domain/fechas';
import { semanasDelMes, type DiaCalendario } from '../../domain/calendario';
import { CeldaDia } from './CeldaDia';

interface Props {
  anio: number;
  mes: number;
  dias: Map<FechaISO, DiaCalendario>;
  hoy: FechaISO;
  seleccion?: FechaISO | null;
  onSeleccionar?: (f: FechaISO) => void;
  habilitada?: (f: FechaISO) => boolean;
  /** Navegación opcional entre meses. */
  onMesAnterior?: () => void;
  onMesSiguiente?: () => void;
  compacta?: boolean;
}

/** Grilla mensual lunes–domingo (se usa en el calendario, el generador y las ventanas). */
export function GrillaMes({ anio, mes, dias, hoy, seleccion, onSeleccionar, habilitada, onMesAnterior, onMesSiguiente, compacta }: Props) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        {onMesAnterior !== undefined ? (
          <button type="button" onClick={onMesAnterior} aria-label="Mes anterior"
            className="flex h-11 w-11 items-center justify-center rounded-full text-2xl hover:bg-gray-100 disabled:opacity-30">‹</button>
        ) : <span className="w-11" />}
        <h3 className="text-base font-semibold capitalize" aria-live="polite">{nombreMes(anio, mes)}</h3>
        {onMesSiguiente !== undefined ? (
          <button type="button" onClick={onMesSiguiente} aria-label="Mes siguiente"
            className="flex h-11 w-11 items-center justify-center rounded-full text-2xl hover:bg-gray-100">›</button>
        ) : <span className="w-11" />}
      </div>
      <div role="grid" aria-label={nombreMes(anio, mes)} className="space-y-1">
        <div role="row" className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
          {DIAS_SEMANA_CORTOS.map((d, i) => (
            <span role="columnheader" key={d} aria-label={DIAS_SEMANA[i]}>{d}</span>
          ))}
        </div>
        {semanasDelMes(anio, mes).map((semana, i) => (
          <div role="row" key={i} className="grid grid-cols-7 gap-1">
            {semana.map((fecha, j) => {
              const dia = fecha ? dias.get(fecha) : undefined;
              return (
                <div role="gridcell" key={fecha ?? `v${j}`}>
                  {dia && (
                    <CeldaDia
                      dia={dia}
                      hoy={dia.fecha === hoy}
                      compacta={compacta}
                      seleccionada={seleccion === undefined ? undefined : seleccion === dia.fecha}
                      deshabilitada={habilitada ? !habilitada(dia.fecha) : false}
                      onClick={onSeleccionar ? () => onSeleccionar(dia.fecha) : undefined}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
