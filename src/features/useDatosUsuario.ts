import { useCallback, useEffect, useMemo, useState } from 'react';
import { cargarCalendarios, cargarCambios, cargarPerfil } from '../api/datos';
import { calcularDias, fechasDelMesConBordes } from '../domain/calendario';
import type { FechaISO } from '../domain/fechas';
import type { CambioTurno, Calendario, Perfil } from '../domain/tipos';
import { mensajeError } from '../lib/errores';

interface Estado {
  cargando: boolean;
  error: string | null;
  perfil: Perfil | null;
  calendarios: Calendario[];
  cambios: CambioTurno[];
}

export function useDatosUsuario(uid: string) {
  const [estado, setEstado] = useState<Estado>({ cargando: true, error: null, perfil: null, calendarios: [], cambios: [] });

  const recargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const [perfil, calendarios, cambios] = await Promise.all([cargarPerfil(uid), cargarCalendarios(), cargarCambios()]);
      setEstado({ cargando: false, error: null, perfil, calendarios, cambios });
    } catch (e) {
      setEstado((s) => ({ ...s, cargando: false, error: mensajeError(e) }));
    }
  }, [uid]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const setPerfil = useCallback((perfil: Perfil) => setEstado((e) => ({ ...e, perfil })), []);

  return { ...estado, recargar, setPerfil };
}

/** Días calculados (base + confirmados) de un mes, con un día extra en cada borde. */
export function useDiasMes(anio: number, mes: number, calendarios: Calendario[], cambios: CambioTurno[], uid: string) {
  return useMemo(
    () => calcularDias(fechasDelMesConBordes(anio, mes), calendarios, cambios, uid),
    [anio, mes, calendarios, cambios, uid],
  );
}

/** Buscador de días para un rango arbitrario (con caché por mes). */
export function crearBuscadorDias(calendarios: Calendario[], cambios: CambioTurno[], uid: string) {
  const cache = new Map<string, ReturnType<typeof calcularDias>>();
  return (fecha: FechaISO) => {
    const clave = fecha.slice(0, 7);
    let dias = cache.get(clave);
    if (!dias) {
      dias = calcularDias(fechasDelMesConBordes(Number(clave.slice(0, 4)), Number(clave.slice(5, 7))), calendarios, cambios, uid);
      cache.set(clave, dias);
    }
    return dias.get(fecha);
  };
}
