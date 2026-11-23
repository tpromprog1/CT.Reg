import { useMemo, useState } from 'react';
import { guardarCalendario } from '../../api/datos';
import { calcularDias, fechasDelMes } from '../../domain/calendario';
import { esFechaISO, formatoLargo, hoyEnChile, partes, type FechaISO } from '../../domain/fechas';
import { ORDEN_SISTEMAS, SISTEMAS, type SistemaId } from '../../domain/patterns';
import type { Calendario } from '../../domain/tipos';
import { mensajeError } from '../../lib/errores';
import { Dialogo } from '../../ui/Dialogo';
import { Aviso, Boton, Campo, Segmentado } from '../../ui/controles';
import { GrillaMes } from '../calendario/MiniCalendario';

interface Props {
  uid: string;
  calendarios: Calendario[];
  onGuardado: (anio: number) => void;
  onCerrar: () => void;
}

export function DialogoGenerador({ uid, calendarios, onGuardado, onCerrar }: Props) {
  const hoy = hoyEnChile();
  const anioActual = partes(hoy).anio;
  const [anio, setAnio] = useState(anioActual);
  const existente = calendarios.find((c) => c.anio === anio);
  const [sistema, setSistema] = useState<SistemaId>(existente?.sistema ?? 'cuarto');
  const [ancla, setAncla] = useState<FechaISO | ''>(existente?.fecha_ancla ?? '');
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const min = `${anio - 1}-01-01`;
  const max = `${anio}-12-31`;
  const anclaValida = esFechaISO(ancla) && ancla >= min && ancla <= max;

  const vistaPrevia = useMemo(() => {
    if (!anclaValida) return null;
    return calcularDias(fechasDelMes(anio, 1), [{ anio, sistema, fecha_ancla: ancla }], [], uid);
  }, [anclaValida, anio, sistema, ancla, uid]);

  function cambiarAnio(a: number) {
    setAnio(a);
    const ex = calendarios.find((c) => c.anio === a);
    if (ex) {
      setSistema(ex.sistema);
      setAncla(ex.fecha_ancla);
    }
  }

  async function guardar() {
    if (!anclaValida) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarCalendario(uid, existente, { anio, sistema, fecha_ancla: ancla });
      onGuardado(anio);
    } catch (e) {
      setError(mensajeError(e));
      setConfirmando(false);
    } finally {
      setGuardando(false);
    }
  }

  if (confirmando) {
    return (
      <Dialogo
        titulo={`¿Regenerar ${anio}?`}
        onCerrar={() => setConfirmando(false)}
        pie={
          <>
            <Boton variante="secundario" className="flex-1" onClick={() => setConfirmando(false)}>Cancelar</Boton>
            <Boton className="flex-1" cargando={guardando} onClick={guardar}>Sí, regenerar</Boton>
          </>
        }
      >
        <p>
          Se reemplazará tu calendario base de {anio} ({SISTEMAS[sistema].nombre}, ancla el {formatoLargo(ancla as FechaISO)}).
        </p>
        <p className="mt-2 text-gray-700">Los cambios ya confirmados se mantienen y se superponen por fecha.</p>
        {error && <div className="mt-3"><Aviso tipo="error">{error}</Aviso></div>}
      </Dialogo>
    );
  }

  return (
    <Dialogo
      titulo="Generar calendario anual"
      onCerrar={onCerrar}
      pie={
        <Boton
          className="w-full"
          disabled={!anclaValida}
          cargando={guardando}
          onClick={() => (existente ? setConfirmando(true) : guardar())}
        >
          {existente ? `Regenerar ${anio}` : 'Generar año'}
        </Boton>
      }
    >
      <div className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-800">Año</legend>
          <Segmentado
            etiqueta="Año"
            valor={String(anio)}
            onCambio={(v) => cambiarAnio(Number(v))}
            opciones={[anioActual, anioActual + 1].map((a) => ({ valor: String(a), texto: String(a) }))}
          />
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-800">Sistema</legend>
          <Segmentado
            etiqueta="Sistema de turnos"
            valor={sistema}
            onCambio={setSistema}
            opciones={ORDEN_SISTEMAS.map((s) => ({ valor: s, texto: SISTEMAS[s].nombre }))}
          />
          <p className="text-sm text-gray-600">
            Ciclo: {SISTEMAS[sistema].ciclo.map((d) => (d === 'D' ? 'Día' : d === 'N' ? 'Noche' : 'Libre')).join(' · ')}
          </p>
        </fieldset>
        <Campo
          etiqueta="Fecha ancla"
          type="date"
          value={ancla}
          min={min}
          max={max}
          onChange={(e) => setAncla(e.target.value)}
          ayuda={SISTEMAS[sistema].ayudaAncla}
          error={ancla && !anclaValida ? `Elige una fecha entre ${min.slice(0, 4)} y ${anio}.` : null}
        />
        {existente && <Aviso tipo="info">Ya tienes un calendario para {anio}. Si lo regeneras, se conservan los cambios confirmados.</Aviso>}
        <section aria-label="Vista previa">
          <h3 className="mb-1 text-sm font-medium text-gray-800">Vista previa</h3>
          {vistaPrevia ? (
            <GrillaMes anio={anio} mes={1} dias={vistaPrevia} hoy={hoy} compacta />
          ) : (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">Elige la fecha ancla para ver enero de {anio}.</p>
          )}
        </section>
        {error && <Aviso tipo="error">{error}</Aviso>}
      </div>
    </Dialogo>
  );
}
