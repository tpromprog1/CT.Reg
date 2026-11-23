import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configuracionFaltante, supabase } from './lib/supabase';
import { PantallaAuth } from './auth/PantallaAuth';
import { NuevaContrasena } from './auth/NuevaContrasena';
import { Home } from './Home';
import { Aviso, Cargando } from './ui/controles';

function vieneDeRecuperar(): boolean {
  return new URLSearchParams(window.location.search).has('recuperar');
}

export function App() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined);
  const [recuperando, setRecuperando] = useState(vieneDeRecuperar);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true);
      setSesion(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (configuracionFaltante) {
    return (
      <main className="mx-auto max-w-md p-6">
        <Aviso tipo="error">
          Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (ver .env.example y README).
        </Aviso>
      </main>
    );
  }
  if (sesion === undefined) return <Cargando />;
  if (sesion && recuperando) {
    return (
      <NuevaContrasena
        onListo={() => {
          setRecuperando(false);
          window.history.replaceState(null, '', import.meta.env.BASE_URL);
        }}
      />
    );
  }
  if (!sesion) return <PantallaAuth />;
  return <Home sesion={sesion} />;
}
