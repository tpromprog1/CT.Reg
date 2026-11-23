import { useEffect, useMemo, useState } from 'react';
import { crearCambio, enviarCorreoCambio, listarColegas, type ResultadoEnvio } from '../../api/datos';
import { calcularDias, fechasDelMesConBordes, type AjusteCalendario } from '../../domain/calendario';
import { armarCorreo, armarMailto } from '../../domain/correo';
import { formatoLargo, partes, type FechaISO } from '../../domain/fechas';
import { TURNOS, etiquetaTurno, type TipoTurno } from '../../domain/patterns';
import type { CambioTurno, Calendario, Colega, Perfil, TurnoEnFecha } from '../../domain/tipos';
import { errorTurnoPorCubrir, validarDevolucion } from '../../domain/validaciones';
import {
  LARGO_MAX_CORREO,
  LARGO_MAX_NOMBRE,
  errorCorreo,
  errorNombre,
  normalizarCorreo,
} from '../../domain/validaciones-basicas';
import { mensajeError } from '../../lib/errores';
import { Dialogo } from '../../ui/Dialogo';
import { Aviso, Boton, Campo, Segmentado, Spinner } from '../../ui/controles';
import { CLASE_BOTON_TURNO } from '../calendario/estilos';
import { GrillaMes } from '../calendario/MiniCalendario';
import { crearBuscadorDias } from '../useDatosUsuario';

interface Props {
  uid: string;
  perfil: Perfil;
  correoPropio: string;
  /** Turno que se cede: el día que se tocó en el calendario (fijo). */
  inicial: TurnoEnFecha;
  calendarios: Calendario[];
  cambios: CambioTurno[];
  ajustes: AjusteCalendario[];
  hoy: FechaISO;
  onCerrar: () => void;
  onCreada: () => void;
}

/** 1: a quién (cobertura) · 2: cuándo (turno que cubrirás en devolución). */
type Paso = 1 | 2 | 'resultado';
const OTRA = '__otra__';

export function AsistenteSolicitud({ uid, perfil, correoPropio, inicial, calendarios, cambios, ajustes, hoy, onCerrar, onCreada }: Props) {
  const [paso, setPaso] = useState<Paso>(1);
  const cedido = inicial;

  // Borrador (se conserva al ir y volver)
  const [coberturaSel, setCoberturaSel] = useState<string>('');
  const [otraNombre, setOtraNombre] = useState('');
  const [otraCorreo, setOtraCorreo] = useState('');
  const [devolucion, setDevolucion] = useState<{ fecha: FechaISO | null; tipo: TipoTurno }>({ fecha: null, tipo: inicial.tipo });

  const [colegas, setColegas] = useState<Colega[] | null>(null);
  const [errorColegas, setErrorColegas] = useState<string | null>(null);
  useEffect(() => {
    listarColegas()
      .then(setColegas)
      .catch((e) => setErrorColegas(mensajeError(e)));
  }, []);

  const pendientesPropios = useMemo(
    () => cambios.filter((c) => c.solicitante_id === uid && c.estado === 'pendiente'),
    [cambios, uid],
  );
  const buscarDia = useMemo(() => crearBuscadorDias(calendarios, cambios, uid, ajustes), [calendarios, cambios, uid, ajustes]);
  const errorCedido = errorTurnoPorCubrir(cedido, buscarDia, pendientesPropios);

  // ----- Paso 1: a quién -----
  const [erroresCob, setErroresCob] = useState<{ sel?: string | null; nombre?: string | null; correo?: string | null }>({});
  const esOtra = coberturaSel === OTRA;
  const colegaSel = colegas?.find((c) => c.id === coberturaSel);
  const nombreCobertura = esOtra ? otraNombre.trim() : (colegaSel?.nombre ?? '');

  function validarCobertura(): boolean {
    const errs: typeof erroresCob = {};
    if (!coberturaSel) errs.sel = 'Elige quién cubrirá tu turno.';
    if (esOtra) {
      errs.nombre = errorNombre(otraNombre);
      errs.correo = errorCorreo(otraCorreo);
      if (!errs.correo && normalizarCorreo(otraCorreo) === normalizarCorreo(correoPropio)) {
        errs.correo = 'La cobertura no puede ser la misma persona que solicita.';
      }
    } else if (coberturaSel && coberturaSel === uid) {
      errs.sel = 'La cobertura no puede ser la misma persona que solicita.';
    }
    setErroresCob(errs);
    return !Object.values(errs).some(Boolean);
  }

  // ----- Paso 2: cuándo -----
  const mes = { anio: partes(cedido.fecha).anio, mes: partes(cedido.fecha).mes };
  const dias = useMemo(
    () => calcularDias(fechasDelMesConBordes(mes.anio, mes.mes), calendarios, cambios, uid, ajustes),
    [mes.anio, mes.mes, calendarios, cambios, uid, ajustes],
  );
  const devolucionSel: TurnoEnFecha | null = devolucion.fecha ? { fecha: devolucion.fecha, tipo: devolucion.tipo } : null;
  const validacion = validarDevolucion(cedido, devolucionSel, buscarDia, hoy);
  const tiposQueTengo = devolucion.fecha ? (buscarDia(devolucion.fecha)?.turnos ?? []) : [];

  function elegirFecha(f: FechaISO) {
    const tengo = buscarDia(f)?.turnos ?? [];
    const libres = (['D', 'N'] as const).filter((t) => !tengo.includes(t));
    setDevolucion((d) => ({ fecha: f, tipo: libres.includes(d.tipo as 'D' | 'N') ? d.tipo : (libres[0] ?? d.tipo) }));
  }

  // ----- Envío -----
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [creado, setCreado] = useState<CambioTurno | null>(null);
  const [resultado, setResultado] = useState<ResultadoEnvio | null>(null);
  const [reintentando, setReintentando] = useState(false);

  async function confirmarFinal() {
    if (!devolucionSel || validacion.errores.length > 0 || errorCedido) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const cambio = await crearCambio({
        solicitante_id: uid,
        cobertura: esOtra
          ? { tipo: 'externa', nombre: otraNombre.trim(), correo: normalizarCorreo(otraCorreo) }
          : { tipo: 'colega', id: coberturaSel },
        cedido,
        devolucion: devolucionSel,
      });
      setCreado(cambio);
      onCreada();
      setResultado(await enviarCorreoCambio(cambio.id));
      onCreada();
      setPaso('resultado');
    } catch (e) {
      setErrorEnvio(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  async function reintentar() {
    if (!creado) return;
    setReintentando(true);
    setResultado(await enviarCorreoCambio(creado.id));
    setReintentando(false);
    onCreada();
  }

  const resumenCedido = `${formatoLargo(cedido.fecha)} · ${etiquetaTurno(cedido.tipo)}`;

  // ================= Render =================
  if (paso === 'resultado' && creado) {
    const ok = resultado?.ok === true;
    const correo = armarCorreo({
      solicitanteNombre: creado.solicitante_nombre,
      coberturaNombre: creado.cobertura_nombre,
      cedido: { fecha: creado.cedido_fecha, tipo: creado.cedido_tipo },
      devolucion: { fecha: creado.devolucion_fecha, tipo: creado.devolucion_tipo },
      solicitadoEn: creado.created_at,
    });
    // Por privacidad la app no conoce el correo de colegas registrados: solo el de "Otra persona".
    const cc = [correoPropio, creado.cobertura_correo].filter((c): c is string => !!c);
    const mailto = armarMailto([perfil.correo_jefatura ?? ''], cc, correo);
    return (
      <Dialogo titulo={ok ? 'Solicitud enviada' : 'Solicitud guardada'} onCerrar={onCerrar}
        pie={<Boton className="w-full" onClick={onCerrar}>Listo</Boton>}>
        {ok ? (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl" aria-hidden="true">✓</div>
            <p className="text-lg font-semibold">Solicitud enviada · Pendiente de confirmar</p>
            <p className="text-gray-700">
              Se envió el correo a jefatura con copia a ti y a {creado.cobertura_nombre}. Tu calendario cambiará cuando marques
              el cambio como confirmado en "Cambios por confirmar".
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Aviso tipo="advertencia">
              La solicitud quedó guardada, pero el correo no se pudo enviar.
              {resultado && !resultado.ok && <> {resultado.mensaje}</>}
            </Aviso>
            <Boton className="w-full" cargando={reintentando} onClick={reintentar}>Reintentar envío</Boton>
            <a href={mailto}
              className="flex min-h-11 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 hover:bg-gray-50">
              Abrir en mi correo
            </a>
            {creado.cobertura_id && (
              <p className="text-sm text-gray-600">
                Agrega a {creado.cobertura_nombre} en copia: por privacidad, la app no muestra los correos de tus colegas.
              </p>
            )}
          </div>
        )}
      </Dialogo>
    );
  }

  const tarjetaTurno = (
    <div className="rounded-xl border border-gray-200 p-3">
      <p className="text-sm text-gray-600">Turno que te cubrirán</p>
      <p className="font-medium">{resumenCedido}</p>
    </div>
  );

  if (paso === 1) {
    return (
      <Dialogo titulo="Cambiar turno" onCerrar={onCerrar}
        pie={
          <Boton className="w-full" disabled={!!errorCedido} onClick={() => validarCobertura() && setPaso(2)}>
            Siguiente: ¿cuándo lo devuelves?
          </Boton>
        }>
        <div className="space-y-4">
          {tarjetaTurno}
          {errorCedido && <Aviso tipo="error">{errorCedido}</Aviso>}
          <Campo etiqueta="Solicitante" value={perfil.nombre ?? ''} readOnly />
          <div className="space-y-1">
            <label htmlFor="cobertura" className="block text-sm font-medium text-gray-800">¿Quién te cubrirá?</label>
            {colegas === null && !errorColegas ? (
              <div className="flex items-center gap-2 py-2 text-gray-600"><Spinner /> Cargando colegas…</div>
            ) : (
              <select
                id="cobertura"
                data-autofocus
                value={coberturaSel}
                onChange={(e) => setCoberturaSel(e.target.value)}
                aria-invalid={erroresCob.sel ? true : undefined}
                className={`block min-h-11 w-full rounded-xl border bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-700 ${erroresCob.sel ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Elige quién te cubrirá…</option>
                {(colegas ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
                <option value={OTRA}>Otra persona (sin cuenta)</option>
              </select>
            )}
            {errorColegas && <p className="text-sm text-red-700">No se pudo cargar la lista de colegas. Puedes usar "Otra persona".</p>}
            {colegas?.length === 0 && <p className="text-sm text-gray-600">Aún no hay colegas registrados.</p>}
            {erroresCob.sel && <p className="text-sm text-red-700">{erroresCob.sel}</p>}
          </div>
          {esOtra && (
            <div className="space-y-3 rounded-xl bg-gray-50 p-3">
              <Campo etiqueta="Nombre de la cobertura" value={otraNombre} maxLength={LARGO_MAX_NOMBRE}
                onChange={(e) => setOtraNombre(e.target.value)} error={erroresCob.nombre} />
              <Campo etiqueta="Correo de la cobertura" type="email" inputMode="email" value={otraCorreo} maxLength={LARGO_MAX_CORREO}
                onChange={(e) => setOtraCorreo(e.target.value)} error={erroresCob.correo}
                ayuda="Recibirá el correo en copia." />
            </div>
          )}
        </div>
      </Dialogo>
    );
  }

  // Paso 2: cuándo
  return (
    <Dialogo titulo="¿Cuándo devuelves el turno?" onCerrar={onCerrar} onVolver={() => setPaso(1)}
      pie={
        <Boton className="w-full" disabled={!devolucionSel || validacion.errores.length > 0} cargando={enviando}
          onClick={confirmarFinal}>
          Confirmar y enviar
        </Boton>
      }>
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Elige el turno de <strong>{nombreCobertura}</strong> que cubrirás tú (del mismo mes). Los colores muestran tus turnos.
        </p>
        <GrillaMes
          anio={mes.anio}
          mes={mes.mes}
          dias={dias}
          hoy={hoy}
          compacta
          seleccion={devolucion.fecha}
          onSeleccionar={elegirFecha}
        />
        <Segmentado<TipoTurno>
          etiqueta="Tipo de turno que cubrirás"
          valor={devolucion.tipo}
          onCambio={(t) => setDevolucion((d) => ({ ...d, tipo: t }))}
          opciones={(['D', 'N'] as const).map((t) => ({
            valor: t,
            texto: TURNOS[t].nombre,
            ...CLASE_BOTON_TURNO[t],
            deshabilitado: tiposQueTengo.includes(t),
          }))}
        />
        {devolucionSel && validacion.errores.map((e) => <Aviso key={e} tipo="error">{e}</Aviso>)}
        {validacion.advertencias.map((a) => <Aviso key={a} tipo="advertencia">{a}</Aviso>)}

        <section aria-label="Resumen del intercambio" className="space-y-2 rounded-xl border border-gray-200 p-3 text-sm">
          <h3 className="font-semibold">Resumen</h3>
          <p>
            <span className="text-gray-600">{nombreCobertura} cubre tu turno:</span><br />
            <strong>{resumenCedido}</strong>
          </p>
          <p>
            <span className="text-gray-600">Tú cubres a {nombreCobertura}:</span><br />
            <strong>{devolucionSel ? `${formatoLargo(devolucionSel.fecha)} · ${etiquetaTurno(devolucionSel.tipo)}` : '— elige un día —'}</strong>
          </p>
          <p className="text-gray-600">Se enviará un correo a jefatura con copia a ti y a la cobertura.</p>
        </section>
        {errorEnvio && <Aviso tipo="error">{errorEnvio}</Aviso>}
      </div>
    </Dialogo>
  );
}
