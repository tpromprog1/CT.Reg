import { useEffect, useId, useRef, type ReactNode, type KeyboardEvent } from 'react';

const SELECTOR_FOCO =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  /** Botones fijos al pie (p. ej. Volver / Confirmar). */
  pie?: ReactNode;
  /** Botón "atrás" en el encabezado (asistente de varios pasos). */
  onVolver?: () => void;
  /** Si es false, no se puede cerrar con Esc ni tocando fuera (p. ej. configuración obligatoria). */
  cerrable?: boolean;
}

/**
 * Hoja inferior en el celular y diálogo centrado en desktop.
 * Foco atrapado, cierre con Esc, devuelve el foco al cerrar.
 */
export function Dialogo({ titulo, onCerrar, children, pie, onVolver, cerrable = true }: Props) {
  const idTitulo = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    const el = panel.current;
    const primero = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>(SELECTOR_FOCO);
    (primero ?? el)?.focus();
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowPrevio;
      previo?.focus?.();
    };
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (cerrable) onCerrar();
      return;
    }
    if (e.key !== 'Tab' || !panel.current) return;
    const focos = Array.from(panel.current.querySelectorAll<HTMLElement>(SELECTOR_FOCO)).filter(
      (n) => n.offsetParent !== null || n === document.activeElement,
    );
    if (focos.length === 0) return;
    const primero = focos[0]!;
    const ultimo = focos[focos.length - 1]!;
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" onKeyDown={onKeyDown}>
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={() => cerrable && onCerrar()}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl outline-none sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-gray-300 sm:hidden" aria-hidden="true" />
        <header className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
          {onVolver && (
            <button
              type="button"
              onClick={onVolver}
              aria-label="Volver al paso anterior"
              className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-gray-700 hover:bg-gray-100"
            >
              ‹
            </button>
          )}
          <h2 id={idTitulo} className="flex-1 px-1 text-lg font-semibold">
            {titulo}
          </h2>
          {cerrable && (
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-gray-500 hover:bg-gray-100"
            >
              ×
            </button>
          )}
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {pie && (
          <footer className="flex gap-2 border-t border-gray-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {pie}
          </footer>
        )}
      </div>
    </div>
  );
}
