import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Aviso, Boton, Campo } from '../ui/controles';
import {
  LARGO_MAX_CORREO,
  LARGO_MAX_NOMBRE,
  LARGO_MAX_PASSWORD,
  errorCorreo,
  errorNombre,
  errorPassword,
  normalizarCorreo,
} from '../domain/validaciones-basicas';
import { mensajeError } from '../lib/errores';

type Modo = 'login' | 'registro' | 'recuperar';

export function PantallaAuth() {
  const [modo, setModo] = useState<Modo>('login');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-800 text-2xl text-white" aria-hidden="true">
          ⇄
        </div>
        <h1 className="text-2xl font-bold">Cambios de Turno</h1>
        <p className="text-gray-600">Solicitudes de cambio de turno de enfermería</p>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        {modo === 'login' && <Login onModo={setModo} />}
        {modo === 'registro' && <Registro onModo={setModo} />}
        {modo === 'recuperar' && <Recuperar onModo={setModo} />}
      </div>
    </main>
  );
}

function Login({ onModo }: { onModo: (m: Modo) => void }) {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (errorCorreo(correo) || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: normalizarCorreo(correo), password });
    setCargando(false);
    if (error) setError(mensajeError(error));
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <h2 className="text-lg font-semibold">Iniciar sesión</h2>
      <Campo etiqueta="Correo" type="email" autoComplete="email" inputMode="email" value={correo}
        maxLength={LARGO_MAX_CORREO} onChange={(e) => setCorreo(e.target.value)} required />
      <Campo etiqueta="Contraseña" type="password" autoComplete="current-password" value={password}
        maxLength={LARGO_MAX_PASSWORD} onChange={(e) => setPassword(e.target.value)} required />
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="submit" cargando={cargando} className="w-full">Entrar</Boton>
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
        <Boton variante="texto" onClick={() => onModo('recuperar')}>¿Olvidaste tu contraseña?</Boton>
        <Boton variante="texto" onClick={() => onModo('registro')}>Crear cuenta</Boton>
      </div>
    </form>
  );
}

function Registro({ onModo }: { onModo: (m: Modo) => void }) {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const errs = { nombre: errorNombre(nombre), correo: errorCorreo(correo), password: errorPassword(password) };
    setErrores(errs);
    if (Object.values(errs).some(Boolean)) return;
    setCargando(true);
    const { error } = await supabase.auth.signUp({
      email: normalizarCorreo(correo),
      password,
      options: { data: { nombre: nombre.trim() }, emailRedirectTo: window.location.origin },
    });
    setCargando(false);
    if (error) setError(mensajeError(error));
    else setListo(true);
  }

  if (listo) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Revisa tu correo</h2>
        <Aviso tipo="exito">
          Si el correo es válido, te enviamos un enlace para confirmar tu cuenta. Ábrelo y luego inicia sesión.
        </Aviso>
        <Boton className="w-full" onClick={() => onModo('login')}>Ir a iniciar sesión</Boton>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <h2 className="text-lg font-semibold">Crear cuenta</h2>
      <Campo etiqueta="Nombre" autoComplete="name" value={nombre} maxLength={LARGO_MAX_NOMBRE}
        onChange={(e) => setNombre(e.target.value)} error={errores.nombre} ayuda="Es el nombre que verán tus colegas." />
      <Campo etiqueta="Correo" type="email" autoComplete="email" inputMode="email" value={correo}
        maxLength={LARGO_MAX_CORREO} onChange={(e) => setCorreo(e.target.value)} error={errores.correo} />
      <Campo etiqueta="Contraseña" type="password" autoComplete="new-password" value={password}
        maxLength={LARGO_MAX_PASSWORD} onChange={(e) => setPassword(e.target.value)} error={errores.password}
        ayuda="Mínimo 8 caracteres." />
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="submit" cargando={cargando} className="w-full">Crear cuenta</Boton>
      <Boton variante="texto" className="w-full" onClick={() => onModo('login')}>Ya tengo cuenta</Boton>
    </form>
  );
}

function Recuperar({ onModo }: { onModo: (m: Modo) => void }) {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const err = errorCorreo(correo);
    setError(err);
    if (err) return;
    setCargando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizarCorreo(correo), {
      redirectTo: `${window.location.origin}/?recuperar=1`,
    });
    setCargando(false);
    if (error) setError(mensajeError(error));
    else setListo(true);
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <h2 className="text-lg font-semibold">Recuperar contraseña</h2>
      {listo ? (
        <Aviso tipo="exito">Si existe una cuenta con ese correo, te enviamos un enlace para definir una nueva contraseña.</Aviso>
      ) : (
        <>
          <Campo etiqueta="Correo" type="email" autoComplete="email" inputMode="email" value={correo}
            maxLength={LARGO_MAX_CORREO} onChange={(e) => setCorreo(e.target.value)} error={error} />
          <Boton type="submit" cargando={cargando} className="w-full">Enviar enlace</Boton>
        </>
      )}
      <Boton variante="texto" className="w-full" onClick={() => onModo('login')}>Volver a iniciar sesión</Boton>
    </form>
  );
}
