import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro' | 'texto';

const ESTILOS: Record<Variante, string> = {
  primario: 'bg-blue-800 text-white hover:bg-blue-900 disabled:bg-gray-300 disabled:text-gray-600',
  secundario: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:text-gray-400',
  peligro: 'border border-red-300 bg-white text-red-700 hover:bg-red-50 disabled:text-gray-400',
  texto: 'text-blue-800 hover:bg-blue-50 disabled:text-gray-400',
};

export function Boton({
  variante = 'primario',
  cargando = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${ESTILOS[variante]} ${className}`}
    >
      {cargando && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ etiqueta }: { etiqueta?: string }) {
  return (
    <span
      role={etiqueta ? 'status' : undefined}
      aria-label={etiqueta}
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-gray-600" role="status">
      <Spinner />
      <span>{texto}</span>
    </div>
  );
}

export function Campo({
  etiqueta,
  error,
  ayuda,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; error?: string | null; ayuda?: ReactNode }) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-800">
        {etiqueta}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={[ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(' ') || undefined}
        className={`block min-h-11 w-full rounded-xl border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-700 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${props.readOnly ? 'bg-gray-100 text-gray-700' : 'bg-white'}`}
      />
      {ayuda && (
        <p id={idAyuda} className="text-sm text-gray-600">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

type TipoAviso = 'error' | 'info' | 'exito' | 'advertencia';
const ESTILO_AVISO: Record<TipoAviso, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  exito: 'border-green-200 bg-green-50 text-green-800',
  advertencia: 'border-orange-200 bg-orange-50 text-orange-900',
};

export function Aviso({ tipo = 'info', children }: { tipo?: TipoAviso; children: ReactNode }) {
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-3 py-2 text-sm ${ESTILO_AVISO[tipo]}`}>
      {children}
    </div>
  );
}

/** Control segmentado accesible (radiogroup). */
export function Segmentado<T extends string>({
  etiqueta,
  opciones,
  valor,
  onCambio,
}: {
  etiqueta: string;
  opciones: { valor: T; texto: string; clase?: string; claseActiva?: string; deshabilitado?: boolean }[];
  valor: T | null;
  onCambio: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex gap-2">
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            disabled={o.deshabilitado}
            onClick={() => onCambio(o.valor)}
            className={`min-h-11 flex-1 rounded-xl border-2 px-3 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
              activo
                ? (o.claseActiva ?? 'border-blue-800 bg-blue-800 text-white')
                : (o.clase ?? 'border-gray-300 bg-white text-gray-800')
            }`}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}
