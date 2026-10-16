// 町のドット絵の 道具（ドットの 画用紙 Pix・色）。2026-10-16 版4から 町の 絵そのものは isoart.js（クォータービュー）。
// 1ドット＝画面の2ピクセル（PX）。
// カイロソフト風に するための きまり：①かたちの まわりを こい色で ふちどる ②光は 左上から（上と左は明るく、下と右は暗く）
// ③屋根は 上から見た面、かべは 正面（ななめ上から見下ろす）④色は 1つの物に 3〜4段（明・中・暗・ふち）
export const PX = 2;

// ---- 色 ----
const ch = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
export const shade = (c, k) => { const [r, g, b] = ch(c), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return (f(r) << 16) | (f(g) << 8) | f(b); };
export const mix = (a, b, t) => { const A = ch(a), B = ch(b); return (Math.round(A[0] + (B[0] - A[0]) * t) << 16) | (Math.round(A[1] + (B[1] - A[1]) * t) << 8) | Math.round(A[2] + (B[2] - A[2]) * t); };
const OUT = c => mix(shade(c, 0.42), 0x2a1a10, 0.35); // ふちの色：その物の色を こく して 茶色に よせる

// ---- ドットの 画用紙 ----
export class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.c = new Int32Array(w * h).fill(-1); }
  set(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = c; }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : this.c[y * this.w + x]; }
  // 色を かえす 関数が -1 を かえした 点は 描かない（下の絵を のこす）
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = typeof c === "function" ? c(i, j) : c; if (v !== -1) this.set(x + i, y + j, v); } return this; }
  ell(cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3) <= 1) { const v = typeof c === "function" ? c(x, y) : c; if (v !== -1) this.set(cx + x, cy + y, v); } return this; }
  // かたちの そとがわ 1ドットを ふちどる（となりの色を こくした色）
  outline(only = null) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y) !== -1) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = this.get(x + dx, y + dy); if (n !== -1 && n !== -2 && (!only || only(n))) { add.push([x, y, OUT(n)]); break; } }
    }
    for (const [x, y, c] of add) this.set(x, y, c);
    return this;
  }
  // 立体：右の 側面を つける（2026-10-16「立体感」）。右はしの色を 暗くして、右へ いくほど 上に ずらす
  extrude(depth = 6) {
    const off = Math.ceil(depth / 2), q = new Pix(this.w + depth, this.h + off);
    for (let y = 0; y < this.h; y++) {
      let xr = -1;
      for (let x = this.w - 1; x >= 0; x--) if (this.get(x, y) !== -1) { xr = x; break; }
      if (xr < 0) continue;
      const c = this.get(xr, y), top = y < this.h * 0.45;
      for (let d = 1; d <= depth; d++) q.set(xr + d, y + off - Math.floor(d / 2), shade(c, top ? 0.74 : 0.62));
    }
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const c = this.get(x, y); if (c !== -1) q.set(x, y + off, c); }
    q.off = off;
    return q;
  }
  tex(scene, key) { scene.textures.addCanvas(key, this.canvas()); return key; }
  canvas(scale = PX) {
    const small = document.createElement("canvas"); small.width = this.w; small.height = this.h;
    const cx = small.getContext("2d"), img = cx.createImageData(this.w, this.h);
    for (let i = 0; i < this.c.length; i++) { const v = this.c[i]; if (v < 0) continue; img.data[i * 4] = (v >> 16) & 255; img.data[i * 4 + 1] = (v >> 8) & 255; img.data[i * 4 + 2] = v & 255; img.data[i * 4 + 3] = 255; }
    cx.putImageData(img, 0, 0);
    const big = document.createElement("canvas"); big.width = this.w * scale; big.height = this.h * scale;
    const bc = big.getContext("2d"); bc.imageSmoothingEnabled = false; bc.drawImage(small, 0, 0, big.width, big.height);
    return big;
  }
}

// ---- 地面の 色（季節。0春 1夏 2秋 3冬）。a,b＝草の 市松、t＝こい草、l＝明るい草、f＝花 ----
export const GROUND = [
  { a: 0x8ad05a, b: 0x7cc24e, t: 0x5ea43a, l: 0xb4e486, f: [0xffc4d8, 0xffffff, 0xff9fbf] },
  { a: 0x78c448, b: 0x6cb63e, t: 0x4e9630, l: 0xa2d872, f: [0xffffff, 0xfff38a, 0xffb347] },
  { a: 0xc9b25c, b: 0xbca452, t: 0x9a8440, l: 0xe0cc80, f: [0xd9542a, 0xe8902a, 0xb8401e] },
  { a: 0xf2f6fa, b: 0xe6edf4, t: 0xc4d2e0, l: 0xffffff, f: [0xd6e6f6, 0xffffff, 0xbcd0e6] },
];

// ---- 生き物：写実の絵を 小さく ちぢめて 角ばったまま 大きく。まわりを こい色で ふちどる ----
export function pixelCreature(scene, srcKey, size = 20) {
  const key = `pxa_${srcKey}_${size}`;
  if (scene.textures.exists(key)) return key;
  if (!scene.textures.exists(srcKey)) return null;
  const src = scene.textures.get(srcKey).getSourceImage();
  const r = Math.min(size / src.width, size / src.height), w = Math.max(1, Math.round(src.width * r)) + 2, h = Math.max(1, Math.round(src.height * r)) + 2;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const cx = c.getContext("2d"); cx.drawImage(src, 1, 1, w - 2, h - 2);
  const d = cx.getImageData(0, 0, w, h), p = new Pix(w, h);
  for (let i = 0; i < w * h; i++) if (d.data[i * 4 + 3] > 110) p.c[i] = (d.data[i * 4] << 16) | (d.data[i * 4 + 1] << 8) | d.data[i * 4 + 2];
  return p.outline().tex(scene, key);
}

