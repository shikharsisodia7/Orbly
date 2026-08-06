// One-off generator for the extension's toolbar icons — a simple filled
// circle in Orbly's brand violet, since no image-editing tool is available
// in this environment. Not imported by the app or the extension at runtime.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 1;
  // Orbly's gradient-instagram accent, simplified to one solid violet for a small toolbar icon.
  const [cr, cg, cb] = [150, 47, 191]; // matches --color-violet used across the app's gradient

  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    let offset = y * (1 + size * 4);
    raw[offset] = 0; // filter type 0 per scanline
    offset += 1;
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const inside = dx * dx + dy * dy <= r * r;
      const i = offset + x * 4;
      raw[i] = cr;
      raw[i + 1] = cg;
      raw[i + 2] = cb;
      raw[i + 3] = inside ? 255 : 0;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const idat = deflateSync(raw);

  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

for (const size of [16, 48, 128]) {
  writeFileSync(new URL(`../extension/icons/icon${size}.png`, import.meta.url), makePng(size));
  console.log(`wrote icon${size}.png`);
}
