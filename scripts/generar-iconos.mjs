// Genera los íconos PWA (PNG) sin dependencias: cuadrado dividido en diagonal
// (amarillo = Día, azul = Noche) con flechas de intercambio blancas.
// Uso: node scripts/generar-iconos.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const AMARILLO = [0xfa, 0xcc, 0x15];
const AZUL = [0x1e, 0x40, 0xaf];
const BLANCO = [0xff, 0xff, 0xff];

const crcTabla = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTabla[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const td = Buffer.concat([Buffer.from(tipo), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([largo, td, crc]);
}
function png(tam, pixel) {
  const filas = [];
  for (let y = 0; y < tam; y++) {
    const fila = Buffer.alloc(1 + tam * 4);
    for (let x = 0; x < tam; x++) {
      const [r, g, b, a] = pixel(x / tam, y / tam);
      fila.set([r, g, b, a], 1 + x * 4);
    }
    filas.push(fila);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tam, 0);
  ihdr.writeUInt32BE(tam, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(filas))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Flechas ⇄: dos barras horizontales con puntas triangulares. Coordenadas normalizadas [0,1]. */
function enFlechas(x, y, escala) {
  const c = (v) => 0.5 + (v - 0.5) / escala; // contrae al centro
  const u = c(x);
  const v = c(y);
  const grosor = 0.07;
  // Flecha superior → (y≈0.38)
  const sup = Math.abs(v - 0.38) < grosor / 2 && u > 0.22 && u < 0.66;
  const puntaSup = u >= 0.62 && u <= 0.8 && Math.abs(v - 0.38) <= (0.8 - u) * 0.75;
  // Flecha inferior ← (y≈0.62)
  const inf = Math.abs(v - 0.62) < grosor / 2 && u > 0.34 && u < 0.78;
  const puntaInf = u >= 0.2 && u <= 0.38 && Math.abs(v - 0.62) <= (u - 0.2) * 0.75;
  return sup || puntaSup || inf || puntaInf;
}

function icono(tam, { maskable }) {
  const radio = maskable ? 0 : 0.18;
  const escala = maskable ? 1.35 : 1; // zona segura del ícono maskable
  return png(tam, (x, y) => {
    // Esquinas redondeadas (transparentes) para el ícono normal
    if (radio > 0) {
      const dx = Math.max(radio - x, 0, x - (1 - radio));
      const dy = Math.max(radio - y, 0, y - (1 - radio));
      if (dx * dx + dy * dy > radio * radio) return [0, 0, 0, 0];
    }
    if (enFlechas(x, y, escala)) return [...BLANCO, 255];
    return [...(x + y < 1 ? AMARILLO : AZUL), 255];
  });
}

const dir = (f) => fileURLToPath(new URL(`../public/icons/${f}`, import.meta.url));
writeFileSync(dir('icon-192.png'), icono(192, { maskable: false }));
writeFileSync(dir('icon-512.png'), icono(512, { maskable: false }));
writeFileSync(dir('icon-512-maskable.png'), icono(512, { maskable: true }));
writeFileSync(dir('apple-touch-icon.png'), icono(180, { maskable: true }));
writeFileSync(
  dir('favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="r"><rect width="64" height="64" rx="12"/></clipPath></defs><g clip-path="url(#r)"><path d="M0 0H64L0 64Z" fill="#FACC15"/><path d="M64 0V64H0Z" fill="#1E40AF"/></g><path d="M14 24H40M34 16L44 24L34 32M50 40H24M30 32L20 40L30 48" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`,
);
console.log('Íconos generados en public/icons/');
