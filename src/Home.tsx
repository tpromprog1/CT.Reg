import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { hoyEnChile, partes, type FechaISO } from './domain/fechas';
import type { TipoTurno } from './domain/patterns';
import { calcularDia } from './domain/calendario';
import { aplicarApariencia, sanitizarApariencia } from './domain/apariencia';
import { Aviso, Boton, Cargando } from './ui/controles';
import { useDatosUsuario } from './features/useDatosUsuario';
import { DialogoConfiguracion } from './features/configuracion/DialogoConfiguracion';
import { DialogoGenerador } from './features/generador/DialogoGenerador';
import { VistaCalendario } from './features/calendario/VistaCalendario';
import { HojaDia } from './features/calendario/HojaDia';
import { AsistenteSolicitud } from './features/solicitud/AsistenteSolicitud';
import { VistaPendientes } from './features/pendientes/VistaPendientes';

type Pestana = 'calendario' | 'pendientes';

export function Home({ sesion }: { sesion: Session }) {
  const uid = sesion.user.id;
  const correoPropio = sesion.user.email ?? '';
  const datos = useDatosUsuario(uid);
  const { perfil, calendarios, cambios, ajustes } = datos;
  const hoy = hoyEnChile();
  const anioActual = partes(hoy).anio;

  const [pestana, setPestana] = useState<Pestana>('calendario');
  const [verConfig, setVerConfig] = useState(false);
  const [verGenerador, setVerGenerador] = useState(false);
  const [generadorDescartado, setGeneradorDescartado] = useState(false);
  const [diaAbierto, setDiaAbierto] = useState<FechaISO | null>(null);
  const [solicitud, setSolicitud] = useState<{ fecha: FechaISO; tipo: TipoTurno } | null>(null);

  // Colores del perfil (también se recuerdan en este dispositivo para evitar parpadeo al abrir).
  const aparienciaPerfil = perfil?.apariencia;
  const hayPerfil = !!perfil;
  useEffect(() => {
    if (!hayPerfil) return;
    const a = sanitizarApariencia(aparienciaPerfil);
    aplicarApariencia(a);
    try {
      localStorage.setItem('apariencia', JSON.stringify(a));
    } catch {
      // almacenamiento no disponible: no es necesario
    }
  }, [hayPerfil, aparienciaPerfil]);

  const pendientesPropios = useMemo(
    () => cambios.filter((c) => c.solicitante_id === uid && c.estado === 'pendiente'),
    [cambios, uid],
  );

  if (datos.cargando && !perfil) return <Cargando texto="Cargando tus datos…" />;
  if (!perfil) {
    return (
      <main className="mx-auto max-w-md space-y-3 p-6">
        <Aviso tipo="error">{datos.error ?? 'No se pudo cargar tu perfil.'}</Aviso>
        <Boton onClick={datos.recargar}>Reintentar</Boton>
        <Boton variante="secundario" onClick={() => supabase.auth.signOut()}>Cerrar sesión</Boton>
      </main>
    );
  }

  // Primer ingreso: configuración obligatoria y luego el generador.
  const perfilIncompleto = !perfil.nombre || !perfil.correo_jefatura;
  const sinCalendarioActual = !calendarios.some((c) => c.anio === anioActual);
  const mostrarConfig = perfilIncompleto || verConfig;
  const mostrarGenerador = !mostrarConfig && (verGenerador || (sinCalendarioActual && !generadorDescartado && !datos.cargando));

  const dia = diaAbierto ? calcularDia(diaAbierto, calendarios, cambios, uid, ajustes) : null;

  return (
    <div className="min-h-dvh pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-1 px-3 py-2">
          <span className="flex-1 truncate font-semibold" title={perfil.nombre ?? correoPropio}>
            {perfil.nombre ?? correoPropio}
          </span>
          <button
            type="button"
            onClick={() => setVerConfig(true)}
            aria-label="Configuración"
            className="flex h-11 w-11 items-center justify-center rounded-full text-xl hover:bg-gray-100"
          >
            ⚙️
          </button>
          <Boton variante="texto" onClick={() => supabase.auth.signOut()}>Cerrar sesión</Boton>
        </div>
        <nav className="mx-auto flex max-w-3xl px-3" role="tablist" aria-label="Secciones">
          {(
            [
              ['calendario', 'Calendario', null],
              ['pendientes', 'Cambios por confirmar', pendientesPropios.length],
            ] as const
          ).map(([id, texto, n]) => (
            <button
              key={id}
              role="tab"
              type="button"
              id={`tab-${id}`}
              aria-selected={pestana === id}
              aria-controls={`panel-${id}`}
              onClick={() => setPestana(id)}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 border-b-2 px-2 text-sm font-medium sm:text-base ${
                pestana === id ? 'border-blue-800 text-blue-900' : 'border-transparent text-gray-600'
              }`}
            >
              {texto}
              {n !== null && n > 0 && (
                <span className="rounded-full bg-pendiente px-2 py-0.5 text-xs font-bold text-white" aria-label={`${n} pendientes`}>
                  {n}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-4 text-fondo-texto">
        {datos.error && (
          <div className="mb-3">
            <Aviso tipo="error">
              {datos.error} <Boton variante="texto" onClick={datos.recargar}>Reintentar</Boton>
            </Aviso>
          </div>
        )}
        <div role="tabpanel" id="panel-calendario" aria-labelledby="tab-calendario" hidden={pestana !== 'calendario'}>
          {calendarios.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="mb-4 text-gray-700">Aún no tienes un calendario generado.</p>
              <Boton onClick={() => setVerGenerador(true)}>Generar calendario</Boton>
            </div>
          ) : (
            <VistaCalendario
              uid={uid}
              hoy={hoy}
              calendarios={calendarios}
              cambios={cambios}
              ajustes={ajustes}
              onTocarDia={setDiaAbierto}
              onAbrirGenerador={() => setVerGenerador(true)}
            />
          )}
        </div>
        <div role="tabpanel" id="panel-pendientes" aria-labelledby="tab-pendientes" hidden={pestana !== 'pendientes'}>
          <VistaPendientes
            uid={uid}
            perfil={perfil}
            correoPropio={correoPropio}
            cambios={cambios}
            cargando={datos.cargando}
            onActualizado={datos.recargar}
          />
        </div>
      </main>

      {mostrarConfig && (
        <DialogoConfiguracion
          perfil={perfil}
          obligatorio={perfilIncompleto}
          onGuardado={datos.setPerfil}
          onCerrar={() => setVerConfig(false)}
          onAbrirGenerador={() => {
            setVerConfig(false);
            setVerGenerador(true);
          }}
        />
      )}
      {mostrarGenerador && (
        <DialogoGenerador
          uid={uid}
          calendarios={calendarios}
          onCerrar={() => {
            setVerGenerador(false);
            setGeneradorDescartado(true);
          }}
          onGuardado={() => {
            setVerGenerador(false);
            setGeneradorDescartado(true);
            void datos.recargar();
          }}
        />
      )}
      {dia && !solicitud && (
        <HojaDia
          dia={dia}
          pendientesPropios={pendientesPropios}
          onCerrar={() => setDiaAbierto(null)}
          onCambiarTurno={(tipo) => setSolicitud({ fecha: dia.fecha, tipo })}
          onAjustado={datos.recargar}
        />
      )}
      {solicitud && (
        <AsistenteSolicitud
          uid={uid}
          perfil={perfil}
          correoPropio={correoPropio}
          inicial={solicitud}
          calendarios={calendarios}
          cambios={cambios}
          ajustes={ajustes}
          hoy={hoy}
          onCerrar={() => {
            setSolicitud(null);
            setDiaAbierto(null);
          }}
          onCreada={() => void datos.recargar()}
        />
      )}
    </div>
  );
}
