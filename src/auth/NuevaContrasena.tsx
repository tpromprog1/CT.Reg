import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Aviso, Boton, Campo } from '../ui/controles';
import { LARGO_MAX_PASSWORD, errorPassword } from '../domain/validaciones-basicas';
import { mensajeError } from '../lib/errores';

export function NuevaContrasena({ onListo }: { onListo: () => void }) {
  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const err = errorPassword(password) ?? (password !== repetir ? 'Las contraseñas no coinciden.' : null);
    setError(err);
    if (err) return;
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password });
    setCargando(false);
    if (error) setError(mensajeError(error));
    else onListo();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <form onSubmit={enviar} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm" noValidate>
        <h1 className="text-xl font-semibold">Define tu nueva contraseña</h1>
        <Campo etiqueta="Nueva contraseña" type="password" autoComplete="new-password" value={password}
          maxLength={LARGO_MAX_PASSWORD} onChange={(e) => setPassword(e.target.value)} ayuda="Mínimo 8 caracteres." />
        <Campo etiqueta="Repite la contraseña" type="password" autoComplete="new-password" value={repetir}
          maxLength={LARGO_MAX_PASSWORD} onChange={(e) => setRepetir(e.target.value)} />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={cargando} className="w-full">Guardar contraseña</Boton>
      </form>
    </main>
  );
}
