import { useMemo } from 'react';
import type { DiaCalendario } from '../../domain/calendario';
import { contarTurnos } from '../../domain/estadisticas';
import { MESES, type FechaISO } from '../../domain/fechas';
import { HORARIO_DIURNO } from '../../domain/patterns';

interface Props {
  anio: number;
  mes: number;
  diasMes: Map<FechaISO, DiaCalendario>;
}

const fmt = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 1 });

function Dato({ etiqueta, valor, clase }: { etiqueta: string; valor: number; clase: string }) {
  return (
    <div className={`rounded-lg px-1 py-1.5 text-center ${clase}`}>
      <dt className="text-xs">{etiqueta}</dt>
      <dd className="text-xl font-bold">{fmt(valor)}</dd>
    </div>
  );
}

/** Conteo del mes visible: turnos y horas (diurnas, nocturnas y festivas). */
export function ConteoTurnos({ anio, mes, diasMes }: Props) {
  const c = useMemo(() => {
    const prefijo = `${anio}-${String(mes).padStart(2, '0')}`;
    return contarTurnos([...diasMes.values()].filter((d) => d.fecha.startsWith(prefijo)));
  }, [anio, mes, diasMes]);

  return (
    <section aria-label={`Conteo de ${MESES[mes - 1]} ${anio}`} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="font-semibold capitalize">{`${MESES[mes - 1]} ${anio}`}</h3>

      <dl className="grid grid-cols-3 gap-2">
        <Dato etiqueta="Días" valor={c.dias} clase="bg-dia text-dia-texto" />
        <Dato etiqueta="Noches" valor={c.noches} clase="bg-noche text-noche-texto" />
        <Dato etiqueta="Extra" valor={c.extras} clase="bg-gray-100 text-gray-900" />
      </dl>

      <div>
        <p className="mb-1 text-sm font-medium text-gray-800">Horas ({fmt(c.horas)} en total)</p>
        <dl className="grid grid-cols-3 gap-2">
          <Dato etiqueta="Diurnas" valor={c.diurnas} clase="bg-gray-100 text-gray-900" />
          <Dato etiqueta="Nocturnas" valor={c.nocturnas} clase="bg-gray-100 text-gray-900" />
          <Dato etiqueta="Festivas" valor={c.festivas} clase="bg-gray-100 text-gray-900" />
        </dl>
      </div>

      <p className="text-xs text-gray-600">
        Diurnas: {HORARIO_DIURNO.inicio} a {HORARIO_DIURNO.fin} en días hábiles. Nocturnas: {HORARIO_DIURNO.fin} a{' '}
        {HORARIO_DIURNO.inicio}, más todas las festivas. Festivas: sábados, domingos y feriados (ya incluidas en nocturnas).
        Cada turno cuenta en el mes en que empieza. Incluye cambios confirmados, ajustes a mano y extras; los pendientes no se
        cuentan.
      </p>
    </section>
  );
}
