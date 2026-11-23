// Reglas de las ventanas de solicitud (2: turno por cubrir, 3: turno que cubrirá).
// Todas trabajan sobre el calendario EFECTIVO (base + cambios confirmados).

import { mismoMes, sumarDias, type FechaISO } from './fechas';
import { TURNOS, type TipoTurno } from './patterns';
import type { DiaCalendario } from './calendario';
import type { CambioTurno, TurnoEnFecha } from './tipos';

export type BuscarDia = (fecha: FechaISO) => DiaCalendario | undefined;

/** ¿Hay una solicitud pendiente mía que cede exactamente este turno? */
export function tienePendienteSobre(
  pendientesPropios: Pick<CambioTurno, 'cedido_fecha' | 'cedido_tipo' | 'estado'>[],
  turno: TurnoEnFecha,
): boolean {
  return pendientesPropios.some(
    (c) => c.estado === 'pendiente' && c.cedido_fecha === turno.fecha && c.cedido_tipo === turno.tipo,
  );
}

/** Tipos que puedo ceder en una fecha (los que tengo y sin solicitud pendiente sobre ellos). */
export function tiposCedibles(
  dia: DiaCalendario | undefined,
  pendientesPropios: Pick<CambioTurno, 'cedido_fecha' | 'cedido_tipo' | 'estado'>[],
): TipoTurno[] {
  if (!dia) return [];
  return dia.turnos.filter((tipo) => !tienePendienteSobre(pendientesPropios, { fecha: dia.fecha, tipo }));
}

/** Ventana 2: devuelve un mensaje de error o null. */
export function errorTurnoPorCubrir(
  sel: TurnoEnFecha | null,
  buscarDia: BuscarDia,
  pendientesPropios: Pick<CambioTurno, 'cedido_fecha' | 'cedido_tipo' | 'estado'>[],
): string | null {
  if (!sel) return 'Selecciona la fecha y el tipo de turno que quieres que te cubran.';
  const dia = buscarDia(sel.fecha);
  if (!dia || !dia.turnos.includes(sel.tipo)) {
    return `No tienes turno ${TURNOS[sel.tipo].nombre} ese día.`;
  }
  if (tienePendienteSobre(pendientesPropios, sel)) {
    return 'Ya tienes una solicitud pendiente sobre ese turno.';
  }
  return null;
}

export interface ResultadoValidacion {
  errores: string[];
  advertencias: string[];
}

/** ¿Hay jornada continua de 24 h? (D+N el mismo día, o N seguida de D al día siguiente). */
export function hayJornada24h(turnosEn: (f: FechaISO) => TipoTurno[], fecha: FechaISO): boolean {
  const hoy = turnosEn(fecha);
  if (hoy.includes('D') && hoy.includes('N')) return true;
  if (hoy.includes('N') && turnosEn(sumarDias(fecha, 1)).includes('D')) return true;
  if (hoy.includes('D') && turnosEn(sumarDias(fecha, -1)).includes('N')) return true;
  return false;
}

/** Ventana 3: bloqueos (errores) y advertencias que no bloquean. */
export function validarDevolucion(
  cedido: TurnoEnFecha,
  devolucion: TurnoEnFecha | null,
  buscarDia: BuscarDia,
  hoy: FechaISO,
): ResultadoValidacion {
  const errores: string[] = [];
  const advertencias: string[] = [];
  if (!devolucion) {
    errores.push('Selecciona la fecha y el tipo de turno que cubrirás.');
    return { errores, advertencias };
  }
  if (!mismoMes(cedido.fecha, devolucion.fecha)) {
    errores.push('Solo puedes intercambiar turnos del mismo mes.');
  }
  const diaDev = buscarDia(devolucion.fecha);
  if (diaDev?.turnos.includes(devolucion.tipo)) {
    errores.push(`Ya tienes turno ${TURNOS[devolucion.tipo].nombre} ese día.`);
  }
  if (errores.length > 0) return { errores, advertencias };

  // Simula el calendario después del intercambio.
  const turnosDespues = (f: FechaISO): TipoTurno[] => {
    const s = new Set(buscarDia(f)?.turnos ?? []);
    if (f === cedido.fecha) s.delete(cedido.tipo);
    if (f === devolucion.fecha) s.add(devolucion.tipo);
    return [...s];
  };
  if (hayJornada24h(turnosDespues, devolucion.fecha)) {
    advertencias.push('Quedarías con una jornada continua de 24 horas.');
  }
  if (devolucion.fecha < hoy || cedido.fecha < hoy) {
    advertencias.push('Una de las fechas ya pasó.');
  }
  return { errores, advertencias };
}
