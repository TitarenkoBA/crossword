/**
 * Генерирует PNG-иконки приложения в public/icons/ без внешних зависимостей.
 * Запуск: `node scripts/make-icons.ts` (нужно только если хотите поменять рисунок).
 *
 * Рисунок: индиго-фон и фрагмент кроссворда — белые клетки, пересекающиеся крестом.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BLUE = [0x4b, 0x45, 0xd6];
const WHITE = [0xff, 0xff, 0xff];
const DARK = [0x1e, 0x23, 0x33];
const YELLOW = [0xfc, 0xc9, 0x3a];

// Сетка 5×5: 1 — белая клетка, 2 — выделенная (жёлтая), 0 — пусто.
const PATTERN = [
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
];

function crcTable(): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const CRC = crcTable();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size: number, padding: number): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const area = size - padding * 2;
  const cell = area / 5;
  const border = Math.max(2, Math.round(cell * 0.08));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // фильтр строки: none
    for (let x = 0; x < size; x++) {
      let color = BLUE;
      const gx = Math.floor((x - padding) / cell);
      const gy = Math.floor((y - padding) / cell);
      if (gx >= 0 && gx < 5 && gy >= 0 && gy < 5 && PATTERN[gy][gx]) {
        const lx = x - padding - gx * cell;
        const ly = y - padding - gy * cell;
        const edge = lx < border || ly < border || lx >= cell - border || ly >= cell - border;
        color = edge ? DARK : PATTERN[gy][gx] === 2 ? YELLOW : WHITE;
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = color[0];
      raw[o + 1] = color[1];
      raw[o + 2] = color[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // глубина цвета
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = join(import.meta.dirname, '..', 'public', 'icons');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'icon-192.png'), png(192, 16));
writeFileSync(join(dir, 'icon-512.png'), png(512, 40));
// Для maskable-иконки рисунок должен быть внутри «безопасной зоны» (80% по центру).
writeFileSync(join(dir, 'icon-maskable-512.png'), png(512, 110));
console.log('Иконки записаны в public/icons/');
