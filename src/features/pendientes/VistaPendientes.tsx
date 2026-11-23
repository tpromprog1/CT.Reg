import { useState } from 'react';
import { anularCambio, confirmarCambio, enviarCorreoCambio } from '../../api/datos';
import { armarCorreo, armarMailto } from '../../domain/correo';
import { formatoLargo, formatoTimestamp } from '../../domain/fechas';
import { etiquetaTurno } from '../../domain/patterns';
import type { CambioTurno, Perfil } from '../../domain/tipos';
import { mensajeError } from '../../lib/errores';
import { Dialogo } from '../../ui/Dialogo';
import { Aviso, Boton, Cargando } from '../../ui/controles';

interface Props {
  uid: string;
  perfil: Perfil;
  correoPropio: string;
  cambios: CambioTurno[];
  cargando: boolean;
  onActualizado: () => Promise<void> | void;
}

type Accion = { tipo: 'confirmar' | 'anular'; cambio: CambioTurno };

export function VistaPendientes({ uid, perfil, correoPropio, cambios, cargando, onActualizado }: Props) {
  const [accion, setAccion] = useState<Accion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Record<string, string>>({});

  const mias = cambios.filter((c) => c.solicitante_id === uid && c.estado === 'pendiente');
  const dondeCubro = cambios.filter((c) => c.cobertura_id === uid && c.estado === 'pendiente');
  const historial = cambios.filter((c) => c.estado !== 'pendiente');

  async function ejecutar() {
    if (!accion) return;
    setProcesando(true);
    setErrorAccion(null);
    try {
      if (accion.tipo === 'confirmar') await confirmarCambio(accion.cambio.id);
      else await anularCambio(accion.cambio.id);
      setAccion(null);
      await onActualizado();
    } catch (e) {
      setErrorAccion(mensajeError(e));
    } finally {
      setProcesando(false);
    }
  }

  async function reenviar(c: CambioTurno) {
    setReenviando(c.id);
    const r = await enviarCorreoCambio(c.id);
    setMensajes((m) => ({ ...m, [c.id]: r.ok ? 'Correo enviado.' : r.mensaje }));
    setReenviando(null);
    await onActualizado();
  }

  function mailtoDe(c: CambioTurno): string {
    const correo = armarCorreo({
      solicitanteNombre: c.solicitante_nombre,
      coberturaNombre: c.cobertura_nombre,
      cedido: { fecha: c.cedido_fecha, tipo: c.cedido_tipo },
      devolucion: { fecha: c.devolucion_fecha, tipo: c.devolucion_tipo },
      solicitadoEn: c.created_at,
    });
    const cc = [correoPropio, c.cobertura_correo].filter((x): x is string => !!x);
    return armarMailto([perfil.correo_jefatura ?? ''], cc, correo);
  }

  if (cargando && cambios.length === 0) return <Cargando />;

  return (
    <div className="space-y-6">
      <section aria-labelledby="t-mias" className="space-y-3">
        <h2 id="t-mias" className="text-lg font-semibold">Mis solicitudes pendientes</h2>
        {mias.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-gray-600 shadow-sm">
            No tienes solicitudes pendientes. Toca un día con turno en el calendario para pedir un cambio.
          </p>
        ) : (
          mias.map((c) => (
            <article key={c.id} className="space-y-3 rounded-2xl border-l-4 border-pendiente bg-white p-4 shadow-sm">
              <Resumen c={c} rol="solicitante" />
              <p className="text-sm text-gray-600">Enviado el {formatoTimestamp(c.created_at)}</p>
              <EstadoCorreo c={c} />
              {c.correo_estado !== 'enviado' && (
                <div className="flex flex-wrap gap-2">
                  <Boton variante="secundario" cargando={reenviando === c.id} onClick={() => reenviar(c)}>
                    Reintentar envío
                  </Boton>
                  <a href={mailtoDe(c)}
                    className="inline-flex min-h-11 items-center rounded-xl px-4 py-2 font-medium text-blue-800 hover:bg-blue-50">
                    Abrir en mi correo
                  </a>
                </div>
              )}
              {mensajes[c.id] && <Aviso tipo={mensajes[c.id] === 'Correo enviado.' ? 'exito' : 'error'}>{mensajes[c.id]}</Aviso>}
              <div className="flex gap-2 border-t border-gray-100 pt-3">
                <Boton className="flex-1" onClick={() => { setErrorAccion(null); setAccion({ tipo: 'confirmar', cambio: c }); }}>
                  Cambio confirmado
                </Boton>
                <Boton variante="peligro" onClick={() => { setErrorAccion(null); setAccion({ tipo: 'anular', cambio: c }); }}>
                  Anular
                </Boton>
              </div>
            </article>
          ))
        )}
      </section>

      <section aria-labelledby="t-cubro" className="space-y-3">
        <h2 id="t-cubro" className="text-lg font-semibold">Donde cubro</h2>
        {dondeCubro.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-gray-600 shadow-sm">Nadie te ha registrado como cobertura en una solicitud pendiente.</p>
        ) : (
          dondeCubro.map((c) => (
            <article key={c.id} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
              <Resumen c={c} rol="cobertura" />
              <p className="text-sm text-gray-600">Solicitado el {formatoTimestamp(c.created_at)} · Pendiente de confirmar</p>
            </article>
          ))
        )}
      </section>

      <details className="rounded-2xl bg-white p-4 shadow-sm">
        <summary className="flex min-h-11 cursor-pointer items-center text-lg font-semibold">
          Historial ({historial.length})
        </summary>
        {historial.length === 0 ? (
          <p className="mt-2 text-gray-600">Aún no hay cambios confirmados ni anulados.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100">
            {historial.map((c) => (
              <li key={c.id} className="space-y-1 py-3">
                <Resumen c={c} rol={c.solicitante_id === uid ? 'solicitante' : 'cobertura'} />
                <p className="text-sm text-gray-600">
                  {c.estado === 'confirmado'
                    ? `Confirmado el ${formatoTimestamp(c.confirmado_at ?? c.created_at)}`
                    : `Anulado el ${formatoTimestamp(c.anulado_at ?? c.created_at)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </details>

      {accion && (
        <Dialogo
          titulo={accion.tipo === 'confirmar' ? 'Cambio confirmado' : 'Anular solicitud'}
          onCerrar={() => setAccion(null)}
          pie={
            <>
              <Boton variante="secundario" className="flex-1" onClick={() => setAccion(null)}>Cancelar</Boton>
              <Boton variante={accion.tipo === 'anular' ? 'peligro' : 'primario'} className="flex-1" cargando={procesando} onClick={ejecutar}>
                {accion.tipo === 'confirmar' ? 'Sí, confirmar' : 'Sí, anular'}
              </Boton>
            </>
          }
        >
          <p>
            {accion.tipo === 'confirmar'
              ? '¿Jefatura ya confirmó este cambio? Se modificará tu calendario.'
              : '¿Anular esta solicitud? No se enviará ningún correo; avisa a jefatura si ya la recibió.'}
          </p>
          <div className="mt-3 text-sm"><Resumen c={accion.cambio} rol="solicitante" /></div>
          {errorAccion && <div className="mt-3"><Aviso tipo="error">{errorAccion}</Aviso></div>}
        </Dialogo>
      )}
    </div>
  );
}

function Resumen({ c, rol }: { c: CambioTurno; rol: 'solicitante' | 'cobertura' }) {
  const cedido = `${formatoLargo(c.cedido_fecha)} · ${etiquetaTurno(c.cedido_tipo)}`;
  const devolucion = `${formatoLargo(c.devolucion_fecha)} · ${etiquetaTurno(c.devolucion_tipo)}`;
  return rol === 'solicitante' ? (
    <div className="space-y-1">
      <p><span className="text-gray-600">{c.cobertura_nombre} cubre tu turno:</span><br /><strong>{cedido}</strong></p>
      <p><span className="text-gray-600">Tú cubres a {c.cobertura_nombre}:</span><br /><strong>{devolucion}</strong></p>
    </div>
  ) : (
    <div className="space-y-1">
      <p><span className="text-gray-600">Cubres a {c.solicitante_nombre}:</span><br /><strong>{cedido}</strong></p>
      <p><span className="text-gray-600">{c.solicitante_nombre} te cubre:</span><br /><strong>{devolucion}</strong></p>
    </div>
  );
}

function EstadoCorreo({ c }: { c: CambioTurno }) {
  if (c.correo_estado === 'enviado') {
    return <p className="text-sm text-green-800">✓ Correo enviado{c.correo_enviado_at ? ` el ${formatoTimestamp(c.correo_enviado_at)}` : ''}</p>;
  }
  if (c.correo_estado === 'error') return <p className="text-sm font-medium text-red-700">✕ Error al enviar el correo</p>;
  return <p className="text-sm text-gray-700">Correo aún no enviado</p>;
}
