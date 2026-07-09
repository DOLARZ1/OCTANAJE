/* Genera los iconos PNG de la PWA (sin librerías externas, solo zlib de Node).
   Diseño futurista: nodo "nexus" holográfico — hexágono neón con radios y
   nodos brillantes, glow real y fondo tipo HUD. */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/* ---------- PNG (CRC32 + chunks) ---------- */
const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4); }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

/* ---------- utilidades geométricas ---------- */
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = clamp(t, 0, 1);
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function hexPts(cx, cy, R) {
  const p = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 90); p.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
  return p;
}
// distancia al contorno del hexágono (mín. de las 6 aristas)
function distHexEdge(px, py, pts) {
  let d = 1e9;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) d = Math.min(d, distSeg(px, py, pts[j][0], pts[j][1], pts[i][0], pts[i][1]));
  return d;
}
// SDF de rect redondeado (para el "tile" HUD)
function sdfRoundRect(px, py, cx, cy, half, r) {
  const qx = Math.abs(px - cx) - (half - r);
  const qy = Math.abs(py - cy) - (half - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

// paleta neón cíclica (cian -> violeta -> magenta -> cian)
const STOPS = [[0, 229, 255], [124, 92, 255], [255, 47, 176], [0, 229, 255]];
function neon(t) {
  t = (t % 1 + 1) % 1;
  const seg = t * 3, i = Math.floor(seg), f = seg - i;
  const a = STOPS[i], b = STOPS[i + 1];
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
}

function render(S, maskable) {
  const buf = Buffer.alloc(S * S * 4);
  const cx = S / 2, cy = S / 2;
  const R = (maskable ? 0.30 : 0.345) * S;          // radio del hexágono
  const strokeHW = S * 0.021;                        // grosor del trazo del anillo
  const spokeHW = S * 0.008;                          // grosor de los radios
  const vR = S * 0.030;                               // radio de los nodos exteriores
  const cR = S * 0.058;                               // radio del nodo central
  const glowR = S * 0.05;                             // alcance del halo
  const verts = hexPts(cx, cy, R);
  const framePad = S * 0.085, frameR = S * 0.24, frameHW = S * 0.006;

  // color de un elemento según su ángulo respecto al centro
  function angColor(px, py) { return neon((Math.atan2(py - cy, px - cx) + Math.PI) / (2 * Math.PI) + 0.08); }

  // distancia a los elementos neón (para glow) y cobertura sólida por supersampling
  function neonDist(px, py) {
    let d = distHexEdge(px, py, verts) - strokeHW;       // anillo
    for (let k = 0; k < 6; k++) d = Math.min(d, distSeg(px, py, cx, cy, verts[k][0], verts[k][1]) - spokeHW); // radios
    for (let k = 0; k < 6; k++) d = Math.min(d, Math.hypot(px - verts[k][0], py - verts[k][1]) - vR);          // nodos
    d = Math.min(d, Math.hypot(px - cx, py - cy) - cR);  // nodo central
    return d;
  }

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;

      /* ---- fondo tipo HUD (degradado diagonal + brillo radial) ---- */
      const diag = (x + y) / (2 * S);
      let r = lerp(6, 13, diag), g = lerp(8, 11, diag), b = lerp(20, 34, diag);
      const gd = Math.hypot(x - cx, y - cy) / (S * 0.5);
      const halo = Math.max(0, 1 - gd);
      r += halo * halo * 26; g += halo * halo * 20; b += halo * halo * 70;

      /* ---- marco HUD sutil (solo iconos "any") ---- */
      if (!maskable) {
        const fd = Math.abs(sdfRoundRect(x, y, cx, cy, S / 2 - framePad, frameR));
        const fc = clamp(1 - fd / frameHW, 0, 1) * 0.5;
        if (fc > 0) { const c = neon(diag + 0.5); r = lerp(r, c[0], fc); g = lerp(g, c[1], fc); b = lerp(b, c[2], fc); }
      }

      /* ---- glow neón (halo luminoso, aditivo) ---- */
      const dN = neonDist(x, y);
      if (dN < glowR * 3) {
        const gI = Math.exp(-Math.max(0, dN) / glowR);
        const gc = angColor(x, y);
        r += gc[0] / 255 * gI * 120; g += gc[1] / 255 * gI * 120; b += gc[2] / 255 * gI * 120;
      }

      /* ---- trazos sólidos con supersampling 3x3 ---- */
      let cov = 0, nodeCov = 0;
      for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
        const px = x + (sx + 0.5) / 3, py = y + (sy + 0.5) / 3;
        const ring = distHexEdge(px, py, verts) <= strokeHW;
        let spoke = false, node = false;
        for (let k = 0; k < 6 && !spoke; k++) if (distSeg(px, py, cx, cy, verts[k][0], verts[k][1]) <= spokeHW) spoke = true;
        for (let k = 0; k < 6 && !node; k++) if (Math.hypot(px - verts[k][0], py - verts[k][1]) <= vR) node = true;
        if (Math.hypot(px - cx, py - cy) <= cR) node = true;
        if (ring || spoke) cov++;
        if (node) { cov++; nodeCov++; }
      }
      cov = Math.min(1, cov / 9); nodeCov /= 9;

      if (cov > 0) {
        let sc = angColor(x, y);
        // los nodos brillan casi blancos para dar profundidad
        if (nodeCov > 0) { const w = Math.min(1, nodeCov * 1.2); sc = [lerp(sc[0], 236, w), lerp(sc[1], 244, w), lerp(sc[2], 255, w)]; }
        r = lerp(r, sc[0], cov); g = lerp(g, sc[1], cov); b = lerp(b, sc[2], cov);
      }

      buf[i] = clamp(Math.round(r), 0, 255);
      buf[i + 1] = clamp(Math.round(g), 0, 255);
      buf[i + 2] = clamp(Math.round(b), 0, 255);
      buf[i + 3] = 255;
    }
  }
  return buf;
}

const outDir = path.resolve(__dirname, "..", "assets", "icons");
fs.mkdirSync(outDir, { recursive: true });
[
  { file: "icon-192.png", size: 192, mask: false },
  { file: "icon-512.png", size: 512, mask: false },
  { file: "icon-maskable-512.png", size: 512, mask: true }
].forEach((t) => {
  const data = png(t.size, t.size, render(t.size, t.mask));
  fs.writeFileSync(path.join(outDir, t.file), data);
  console.log("✔ " + t.file + " (" + t.size + "x" + t.size + ", " + data.length + " bytes)");
});
console.log("Iconos futuristas generados en assets/icons/");
