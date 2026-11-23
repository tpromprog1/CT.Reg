import { useState, type FormEvent } from 'react';
import { guardarPerfil } from '../../api/datos';
import type { Perfil } from '../../domain/tipos';
import {
  LARGO_MAX_CORREO,
  LARGO_MAX_NOMBRE,
  errorCorreo,
  errorNombre,
  normalizarCorreo,
} from '../../domain/validaciones-basicas';
import { mensajeError } from '../../lib/errores';
import { Dialogo } from '../../ui/Dialogo';
import { Aviso, Boton, Campo } from '../../ui/controles';
import { SeccionApariencia } from './SeccionApariencia';

interface Props {
  perfil: Perfil;
  obligatorio: boolean;
  onGuardado: (p: Perfil) => void;
  onCerrar: () => void;
  onAbrirGenerador: () => void;
}

export function DialogoConfiguracion({ perfil, obligatorio, onGuardado, onCerrar, onAbrirGenerador }: Props) {
  const [nombre, setNombre] = useState(perfil.nombre ?? '');
  const [jefatura, setJefatura] = useState(perfil.correo_jefatura ?? '');
  const [errores, setErrores] = useState<{ nombre?: string | null; jefatura?: string | null }>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    const errs = { nombre: errorNombre(nombre), jefatura: errorCorreo(jefatura) };
    setErrores(errs);
    if (errs.nombre || errs.jefatura) return;
    setGuardando(true);
    try {
      const p = await guardarPerfil(perfil.id, { nombre: nombre.trim(), correo_jefatura: normalizarCorreo(jefatura) });
      onGuardado(p);
      setGuardado(true);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialogo titulo="Configuración" onCerrar={onCerrar} cerrable={!obligatorio}>
      <form id="form-config" onSubmit={guardar} className="space-y-4" noValidate>
        {obligatorio && (
          <Aviso tipo="info">Antes de empezar, completa tu nombre y el correo de tu jefatura.</Aviso>
        )}
        <Campo etiqueta="Tu nombre" value={nombre} maxLength={LARGO_MAX_NOMBRE} autoComplete="name"
          onChange={(e) => setNombre(e.target.value)} error={errores.nombre} data-autofocus />
        <Campo etiqueta="Correo de jefatura" type="email" inputMode="email" value={jefatura} maxLength={LARGO_MAX_CORREO}
          onChange={(e) => setJefatura(e.target.value)} error={errores.jefatura}
          ayuda="Las solicitudes de cambio se envían a este correo." />
        {error && <Aviso tipo="error">{error}</Aviso>}
        {guardado && <Aviso tipo="exito">Datos guardados.</Aviso>}
        <Boton type="submit" cargando={guardando} className="w-full">Guardar</Boton>
      </form>
      {!obligatorio && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <h3 className="mb-2 font-semibold">Calendario</h3>
          <Boton variante="secundario" className="w-full" onClick={onAbrirGenerador}>
            Generar / regenerar calendario
          </Boton>
        </div>
      )}
      {!obligatorio && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <SeccionApariencia perfil={perfil} onGuardado={onGuardado} />
        </div>
      )}
    </Dialogo>
  );
}
