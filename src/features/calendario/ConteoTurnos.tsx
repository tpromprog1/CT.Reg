import { useMemo } from 'react';
import { calcularDias, fechasDelMes, type AjusteCalendario, type DiaCalendario } from '../../domain/calendario';
import { contarTurnos, type ConteoTurnos as Conteo } from '../../domain/estadisticas';
import { MESES, type FechaISO } from '../../domain/fechas';
import type { CambioTurno, Calendario } from '../../domain/tipos';

interface Props {
  anio: number;
  mes: number;
  diasMes: Map<FechaISO, DiaCalendario>;
  calendarios: Calendario[];
  cambios: CambioTurno[];
  ajustes: AjusteCalendario[];
  uid: string;
}

function Linea({ titulo, c }: { titulo: string; c: Conteo }) {
  const fmt = (n: number) => n.toLocaleString('es-CL');
  return (
    <div>
      <p className="text-sm font-semibold capitalize">{titulo}</p>
      <dl className="mt-1 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-lg bg-dia px-1 py-1.5 text-dia-texto">
          <dt className="text-xs">Días</dt>
          <dd className="text-xl font-bold">{fmt(c.dias)}</dd>
        </div>
        <div className="rounded-lg bg-noche px-1 py-1.5 text-noche-texto">
          <dt className="text-xs">Noches</dt>
          <dd className="text-xl font-bold">{fmt(c.noches)}</dd>
        </div>
        <div className="rounded-lg bg-gray-100 px-1 py-1.5 text-gray-900">
          <dt className="text-xs">Horas</dt>
          <dd className="text-xl font-bold">{fmt(c.horas)}</dd>
        </div>
        <div className="rounded-lg bg-gray-100 px-1 py-1.5 text-gray-900">
          <dt className="text-xs">Extra</dt>
          <dd className="text-xl font-bold">{fmt(c.extras)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Conteo de turnos del mes visible y del año (patrón + ajustes + cambios confirmados). */
export function ConteoTurnos({ anio, mes, diasMes, calendarios, cambios, ajustes, uid }: Props) {
  const delMes = useMemo(() => {
    const prefijo = `${anio}-${String(mes).padStart(2, '0')}`;
    return contarTurnos([...diasMes.values()].filter((d) => d.fecha.startsWith(prefijo)));
  }, [anio, mes, diasMes]);

  const delAnio = useMemo(() => {
    const fechas = Array.from({ length: 12 }, (_, i) => fechasDelMes(anio, i + 1)).flat();
    return contarTurnos(calcularDias(fechas, calendarios, cambios, uid, ajustes).values());
  }, [anio, calendarios, cambios, ajustes, uid]);

  return (
    <section aria-label="Conteo de turnos" className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <Linea titulo={`${MESES[mes - 1]} ${anio}`} c={delMes} />
      <Linea titulo={`Año ${anio}`} c={delAnio} />
      <p className="text-xs text-gray-600">Incluye cambios confirmados, ajustes a mano y turnos extra. Los pendientes no se cuentan.</p>
    </section>
  );
}
