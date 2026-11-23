// Copia src/domain/patterns.ts a la carpeta compartida de las Edge Functions.
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const origen = fileURLToPath(new URL('../src/domain/patterns.ts', import.meta.url));
const destino = fileURLToPath(new URL('../supabase/functions/_shared/patterns.ts', import.meta.url));
copyFileSync(origen, destino);
console.log('patterns.ts sincronizado con supabase/functions/_shared/');
