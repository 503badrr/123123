import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";

const OUT = "public";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const payload = Buffer.concat([name, data]);
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(payload), 8 + data.length);
  return output;
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const target = y * (width * 4 + 1);
    rows[target] = 0;
    rgba.copy(rows, target + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function canvas(width, height) {
  return { width, height, data: Buffer.alloc(width * height * 4) };
}

function pixel(c, x, y, color, alpha = 1) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= c.width || y >= c.height) return;
  const i = (y * c.width + x) * 4;
  const a = Math.max(0, Math.min(1, alpha));
  c.data[i] = Math.round(c.data[i] * (1 - a) + color[0] * a);
  c.data[i + 1] = Math.round(c.data[i + 1] * (1 - a) + color[1] * a);
  c.data[i + 2] = Math.round(c.data[i + 2] * (1 - a) + color[2] * a);
  c.data[i + 3] = 255;
}

function fillGradient(c, a, b, d = null) {
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) {
      const t = (x / Math.max(1, c.width - 1) + y / Math.max(1, c.height - 1)) / 2;
      const u = d ? Math.min(1, t * 2) : t;
      const left = d && t > 0.5 ? b : a;
      const right = d && t > 0.5 ? d : b;
      const local = d ? (t > 0.5 ? (t - 0.5) * 2 : t * 2) : t;
      pixel(c, x, y, left.map((v, i) => Math.round(v + (right[i] - v) * local)));
    }
  }
}

function circle(c, cx, cy, radius, color, alpha = 1) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) pixel(c, x, y, color, alpha);
    }
  }
}

function roundedRect(c, x, y, w, h, r, color, alpha = 1) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const dx = Math.max(x + r - px, 0, px - (x + w - r - 1));
      const dy = Math.max(y + r - py, 0, py - (y + h - r - 1));
      if (dx * dx + dy * dy <= r * r) pixel(c, px, py, color, alpha);
    }
  }
}

function line(c, x0, y0, x1, y1, width, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i += 1) {
    const t = steps ? i / steps : 0;
    circle(c, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width / 2, color);
  }
}

function drawMark(c, x, y, size) {
  const cyan = [112, 239, 255];
  const blue = [79, 134, 255];
  const violet = [164, 92, 255];
  const dark = [7, 18, 41];
  const r = Math.round(size * 0.28);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const dx = Math.max(r - px, 0, px - (size - r - 1));
      const dy = Math.max(r - py, 0, py - (size - r - 1));
      if (dx * dx + dy * dy > r * r) continue;
      const t = (px + py) / (size * 2);
      const left = t < 0.55 ? cyan : blue;
      const right = t < 0.55 ? blue : violet;
      const local = t < 0.55 ? t / 0.55 : (t - 0.55) / 0.45;
      pixel(c, x + px, y + py, left.map((v, i) => Math.round(v + (right[i] - v) * local)));
    }
  }
  const w = size * 0.095;
  line(c, x + size * 0.25, y + size * 0.32, x + size * 0.68, y + size * 0.32, w, dark);
  line(c, x + size * 0.68, y + size * 0.32, x + size * 0.58, y + size * 0.22, w, dark);
  line(c, x + size * 0.75, y + size * 0.68, x + size * 0.32, y + size * 0.68, w, dark);
  line(c, x + size * 0.32, y + size * 0.68, x + size * 0.42, y + size * 0.78, w, dark);
  circle(c, x + size * 0.23, y + size * 0.68, size * 0.055, dark);
  circle(c, x + size * 0.77, y + size * 0.32, size * 0.055, dark);
}

const FONT = {
  A:["01110","10001","10001","11111","10001","10001","10001"], B:["11110","10001","10001","11110","10001","10001","11110"],
  C:["01111","10000","10000","10000","10000","10000","01111"], D:["11110","10001","10001","10001","10001","10001","11110"],
  E:["11111","10000","10000","11110","10000","10000","11111"], G:["01111","10000","10000","10111","10001","10001","01111"],
  H:["10001","10001","10001","11111","10001","10001","10001"], I:["11111","00100","00100","00100","00100","00100","11111"],
  L:["10000","10000","10000","10000","10000","10000","11111"], M:["10001","11011","10101","10101","10001","10001","10001"],
  O:["01110","10001","10001","10001","10001","10001","01110"], R:["11110","10001","10001","11110","10100","10010","10001"],
  S:["01111","10000","10000","01110","00001","00001","11110"], T:["11111","00100","00100","00100","00100","00100","00100"],
  W:["10001","10001","10001","10101","10101","11011","10001"],
  ".":["00000","00000","00000","00000","00000","00110","00110"],
};

function text(c, value, x, y, scale, color) {
  let cursor = x;
  for (const raw of value.toUpperCase()) {
    if (raw === " ") { cursor += scale * 4; continue; }
    const glyph = FONT[raw];
    if (!glyph) { cursor += scale * 6; continue; }
    for (let row = 0; row < glyph.length; row += 1) for (let col = 0; col < glyph[row].length; col += 1) {
      if (glyph[row][col] === "1") roundedRect(c, cursor + col * scale, y + row * scale, scale, scale, Math.max(1, scale * 0.16), color);
    }
    cursor += scale * 6;
  }
}

async function save(name, c) {
  const path = join(OUT, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, encodePng(c.width, c.height, c.data));
}

for (const [size, name] of [[180,"apple-touch-icon.png"],[192,"icons/icon-192.png"],[512,"icons/icon-512.png"]]) {
  const c = canvas(size, size);
  fillGradient(c, [7,18,41], [16,35,79], [53,20,93]);
  drawMark(c, Math.round(size * 0.09), Math.round(size * 0.09), Math.round(size * 0.82));
  await save(name, c);
}

const og = canvas(1200, 630);
fillGradient(og, [7,18,41], [16,35,79], [53,20,93]);
for (let x = 0; x < 1200; x += 48) line(og, x, 0, x, 630, 1, [25,45,80]);
for (let y = 0; y < 630; y += 48) line(og, 0, y, 1200, y, 1, [25,45,80]);
circle(og, 1030, 70, 260, [55,170,220], 0.12);
circle(og, 85, 600, 230, [135,60,210], 0.14);
drawMark(og, 790, 120, 300);
text(og, "SWITCH", 90, 150, 18, [255,255,255]);
text(og, "DIGITAL STORE", 90, 315, 7, [112,239,255]);
text(og, "SWWIITCH.COM", 90, 485, 6, [7,18,41]);
roundedRect(og, 78, 462, 360, 78, 30, [112,239,255]);
text(og, "SWWIITCH.COM", 102, 480, 6, [7,18,41]);
await save("og-switch.png", og);

console.log("Generated Switch PNG assets");
