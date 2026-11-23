import { useRef, useState, type TouchEvent } from 'react';
import { partes, type FechaISO } from '../../domain/fechas';
import type { CambioTurno, Calendario } from '../../domain/tipos';
import type { AjusteCalendario } from '../../domain/calendario';
import { Boton } from '../../ui/controles';
import { useDiasMes } from '../useDatosUsuario';
import { Leyenda } from './CeldaDia';
import { GrillaMes } from './MiniCalendario';

interface Props {
  uid: string;
  hoy: FechaISO;
  calendarios: Calendario[];
  cambios: CambioTurno[];
  ajustes: AjusteCalendario[];
  onTocarDia: (f: FechaISO) => void;
  onAbrirGenerador: () => void;
}

type Mes = { anio: number; mes: number };
const indice = (m: Mes) => m.anio * 12 + (m.mes - 1);
const desdeIndice = (i: number): Mes => ({ anio: Math.floor(i / 12), mes: (i % 12) + 1 });

export function VistaCalendario({ uid, hoy, calendarios, cambios, ajustes, onTocarDia, onAbrirGenerador }: Props) {
  const anios = calendarios.map((c) => c.anio);
  const hoyP = partes(hoy);
  const minIdx = Math.min(...anios) * 12;
  const maxIdx = Math.max(...anios) * 12 + 11;
  const idxHoy = indice({ anio: hoyP.anio, mes: hoyP.mes });
  const hoyEnRango = idxHoy >= minIdx && idxHoy <= maxIdx;

  const [idx, setIdx] = useState(() => (hoyEnRango ? idxHoy : minIdx));
  const actual = desdeIndice(Math.min(Math.max(idx, minIdx), maxIdx));
  const dias = useDiasMes(actual.anio, actual.mes, calendarios, cambios, uid, ajustes);
  const tieneAnio = anios.includes(actual.anio);

  const mover = (d: number) => setIdx((i) => Math.min(Math.max(i + d, minIdx), maxIdx));

  // Gesto de deslizar horizontal
  const toque = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    if (t) toque.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: TouchEvent) {
    const ini = toque.current;
    const t = e.changedTouches[0];
    toque.current = null;
    if (!ini || !t) return;
    const dx = t.clientX - ini.x;
    const dy = t.clientY - ini.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) mover(dx < 0 ? 1 : -1);
  }

  return (
    <section aria-label="Calendario" className="space-y-4">
      <div className="flex justify-end">
        <Boton variante="secundario" onClick={() => setIdx(idxHoy)} disabled={!hoyEnRango || idx === idxHoy}>
          Hoy
        </Boton>
      </div>
      <div className="rounded-2xl bg-white p-2 shadow-sm sm:p-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <GrillaMes
          anio={actual.anio}
          mes={actual.mes}
          dias={dias}
          hoy={hoy}
          onSeleccionar={onTocarDia}
          onMesAnterior={indice(actual) > minIdx ? () => mover(-1) : undefined}
          onMesSiguiente={indice(actual) < maxIdx ? () => mover(1) : undefined}
        />
        {!tieneAnio && (
          <div className="mt-3 text-center text-sm text-gray-600">
            No hay calendario para {actual.anio}.{' '}
            <Boton variante="texto" onClick={onAbrirGenerador}>Generar</Boton>
          </div>
        )}
      </div>
      <Leyenda />
    </section>
  );
}
