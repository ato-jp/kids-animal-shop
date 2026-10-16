// 町のドット絵（版3。2026-10-16 パパ決定「町だけ ドット絵」「カイロソフトを見習って」）。絵のファイルを持たず、プログラムで点を打って描く。
// 1ドット＝画面の2ピクセル（PX）。1マス（32）＝16ドット。
// カイロソフト風に するための きまり：①かたちの まわりを こい色で ふちどる ②光は 左上から（上と左は明るく、下と右は暗く）
// ③屋根は 上から見た面、かべは 正面（ななめ上から見下ろす）④色は 1つの物に 3〜4段（明・中・暗・ふち）
export const PX = 2;

// ---- 色 ----
const ch = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
export const shade = (c, k) => { const [r, g, b] = ch(c), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return (f(r) << 16) | (f(g) << 8) | f(b); };
const mix = (a, b, t) => { const A = ch(a), B = ch(b); return (Math.round(A[0] + (B[0] - A[0]) * t) << 16) | (Math.round(A[1] + (B[1] - A[1]) * t) << 8) | Math.round(A[2] + (B[2] - A[2]) * t); };
const OUT = c => mix(shade(c, 0.42), 0x2a1a10, 0.35); // ふちの色：その物の色を こく して 茶色に よせる

// ---- ドットの 画用紙 ----
class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.c = new Int32Array(w * h).fill(-1); }
  set(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = c; }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : this.c[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, typeof c === "function" ? c(i, j) : c); return this; }
  ell(cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3) <= 1) this.set(cx + x, cy + y, typeof c === "function" ? c(x, y) : c); return this; }
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
  tex(scene, key) {
    const small = document.createElement("canvas"); small.width = this.w; small.height = this.h;
    const cx = small.getContext("2d"), img = cx.createImageData(this.w, this.h);
    for (let i = 0; i < this.c.length; i++) { const v = this.c[i]; if (v < 0) continue; img.data[i * 4] = (v >> 16) & 255; img.data[i * 4 + 1] = (v >> 8) & 255; img.data[i * 4 + 2] = v & 255; img.data[i * 4 + 3] = 255; }
    cx.putImageData(img, 0, 0);
    const big = document.createElement("canvas"); big.width = this.w * PX; big.height = this.h * PX;
    const bc = big.getContext("2d"); bc.imageSmoothingEnabled = false; bc.drawImage(small, 0, 0, big.width, big.height);
    scene.textures.addCanvas(key, big);
    return key;
  }
}
const once = (scene, key, w, h, draw) => (scene.textures.exists(key) ? key : draw(new Pix(w, h)).tex(scene, key));
const rnd = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;

// ---- 地面（季節。0春 1夏 2秋 3冬）----
const GROUND = [
  { a: 0x8ad05a, b: 0x7cc24e, t: 0x5ea43a, l: 0xb4e486, f: [0xffc4d8, 0xffffff, 0xff9fbf] },
  { a: 0x78c448, b: 0x6cb63e, t: 0x4e9630, l: 0xa2d872, f: [0xffffff, 0xfff38a, 0xffb347] },
  { a: 0xc9b25c, b: 0xbca452, t: 0x9a8440, l: 0xe0cc80, f: [0xd9542a, 0xe8902a, 0xb8401e] },
  { a: 0xf2f6fa, b: 0xe6edf4, t: 0xc4d2e0, l: 0xffffff, f: [0xd6e6f6, 0xffffff, 0xbcd0e6] },
];
export function groundTile(scene, sea, v) {
  return once(scene, `pxg_${sea}_${v}`, 16, 16, p => {
    const G = GROUND[sea];
    p.rect(0, 0, 16, 16, (i, j) => ((i + j) % 2 && rnd(i + v * 3, j) % 5 === 0 ? G.b : G.a)); // こまかい むら
    for (let k = 0; k < 4; k++) { // 草の ふさ（＾の形。上が明るく 下が こい）
      const x = 1 + (rnd(k, v) % 13), y = 2 + (rnd(v, k * 7) % 12);
      p.set(x, y, G.t); p.set(x + 2, y, G.t); p.set(x + 1, y - 1, G.t); p.set(x + 1, y - 2, G.l);
    }
    if (rnd(v, sea) % 3 === 0) { const x = 3 + v * 2 % 10, y = 4 + v * 3 % 9, f = G.f[v % 3]; p.set(x, y, f); p.set(x - 1, y, f); p.set(x + 1, y, f); p.set(x, y - 1, f); p.set(x, y, 0xfff6a0); }
    return p;
  });
}
// みち：れんがの石だたみ。ふちは 縁石と 草の かげ
export function roadTile(scene, n) {
  return once(scene, `pxr_${+n.up}${+n.right}${+n.down}${+n.left}`, 16, 16, p => {
    const base = 0xe2d2a8, mortar = 0xb8a47a;
    p.rect(0, 0, 16, 16, mortar);
    for (let row = 0; row < 4; row++) for (let col = -1; col < 4; col++) {
      const x = col * 5 + (row % 2 ? 2 : 0), y = row * 4, c = [base, 0xeadcb6, 0xd8c69a][(row * 3 + col + 9) % 3];
      p.rect(x, y, 4, 3, c); p.rect(x, y, 4, 1, shade(c, 1.07)); p.set(x + 3, y + 2, shade(c, 0.9));
    }
    const curb = 0xa89470, sh = 0x000000;
    if (!n.up) { p.rect(0, 0, 16, 1, curb); p.rect(0, 1, 16, 1, shade(curb, 1.15)); }
    if (!n.down) { p.rect(0, 15, 16, 1, shade(curb, 0.75)); p.rect(0, 14, 16, 1, curb); }
    if (!n.left) { p.rect(0, 0, 1, 16, curb); }
    if (!n.right) { p.rect(15, 0, 1, 16, shade(curb, 0.8)); }
    void sh;
    return p;
  });
}
export function railTile(scene, horiz) {
  return once(scene, `pxl_${+horiz}`, 16, 16, p => {
    p.rect(0, 0, 16, 16, (i, j) => ((i * 3 + j * 5) % 7 === 0 ? 0x8a8478 : (i + j) % 3 ? 0xa8a296 : 0x9c9689)); // じゃり
    for (let k = 0; k < 4; k++) {
      if (horiz) { p.rect(1 + k * 4, 2, 3, 12, 0x8a5a33); p.rect(1 + k * 4, 2, 3, 1, 0xa87240); p.rect(1 + k * 4, 13, 3, 1, 0x5a3a1e); }
      else { p.rect(2, 1 + k * 4, 12, 3, 0x8a5a33); p.rect(2, 1 + k * 4, 12, 1, 0xa87240); p.rect(2, 3 + k * 4, 12, 1, 0x5a3a1e); }
    }
    const rail = (a, b, w, h) => { p.rect(a, b, w, h, 0xc8ced6); horiz ? p.rect(a, b + 1, w, 1, 0x6e747c) : p.rect(a + 1, b, 1, h, 0x6e747c); };
    horiz ? (rail(0, 4, 16, 2), rail(0, 10, 16, 2)) : (rail(4, 0, 2, 16), rail(10, 0, 2, 16));
    return p;
  });
}

// ---- 飾り。絵は 下ぞろえ（はみ出して 上に のびてよい）。かえすのは テクスチャの名前 ----
function tree(p, cx, by, leaf, hi) {
  p.rect(cx - 1, by - 6, 3, 6, 0x7a5230); p.rect(cx - 1, by - 6, 1, 6, 0x9a6a40); p.rect(cx + 1, by - 6, 1, 6, 0x5a3a20);
  const r = 6, cy = by - 6 - r + 1;
  p.ell(cx, cy, r + 1, r, (x, y) => (x + y > 3 ? shade(leaf, 0.78) : leaf));
  p.ell(cx - 2, cy - 2, 3, 3, (x, y) => (x + y < -1 ? hi : leaf));
  p.ell(cx + 3, cy + 1, 2, 2, shade(leaf, 0.85));
  p.set(cx - 3, cy - 4, shade(hi, 1.1)); p.set(cx - 4, cy - 3, shade(hi, 1.1)); p.set(cx + 1, cy - 4, hi);
}
const DECOR = {
  tree: [16, 24, p => tree(p, 8, 23, 0x3f9a3a, 0x7ccc5a)],
  momiji: [16, 24, p => tree(p, 8, 23, 0xd0482a, 0xf49a4a)],
  flower: [16, 16, p => { // 花だん：ふちの 木わく・葉っぱ・大きめの 花
    p.rect(1, 7, 14, 8, 0x7a5232); p.rect(1, 7, 14, 1, 0x9a6a40);
    p.rect(2, 8, 12, 6, (i, j) => ((i + j) % 3 ? 0x4f9a3a : 0x3f8a32));
    for (let k = 0; k < 5; k++) { const x = 3 + k * 2 + (k % 2), y = 7 + (k % 2) * 3, c = [0xff5a7a, 0xffd23a, 0xffffff, 0xff8ad8, 0xffa040][k];
      p.set(x, y - 1, c); p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y + 1, c); p.set(x, y, 0xfff0a0); }
  }],
  rock: [16, 16, p => { p.ell(8, 10, 6, 4, (x, y) => (x + y < -1 ? 0xb8bcc2 : x + y > 2 ? 0x7a7f86 : 0x9aa0a8)); p.ell(5, 12, 3, 2, 0x8a9096); p.set(5, 8, 0xdfe3e8); p.set(6, 7, 0xdfe3e8); }],
  lamp: [16, 26, p => {
    p.rect(7, 8, 2, 16, 0x3a3e46); p.rect(7, 8, 1, 16, 0x5a606a); p.rect(5, 23, 6, 2, 0x2a2e36);
    p.rect(4, 2, 8, 6, 0x2a2e36); p.rect(5, 3, 6, 4, 0xffe68a); p.rect(5, 3, 2, 2, 0xfffbd8); p.rect(3, 1, 10, 1, 0x2a2e36);
  }],
  bench: [32, 16, p => {
    for (const y of [5, 8]) { p.rect(2, y, 28, 2, 0xa8703a); p.rect(2, y, 28, 1, 0xc8904a); }
    p.rect(2, 10, 28, 1, 0x6a4420); for (const x of [4, 26]) p.rect(x, 10, 2, 5, 0x3a3e46);
  }],
  fountain: [32, 32, p => {
    p.ell(16, 20, 14, 9, 0xb0b6be); p.ell(16, 19, 12, 7, 0xd0d6dc); p.ell(16, 20, 11, 6, (x, y) => (y < -2 ? 0x8fd0ff : 0x5fb4ef));
    p.rect(15, 8, 3, 12, 0xc0c6ce); p.rect(15, 8, 1, 12, 0xe0e6ec);
    p.ell(16, 7, 4, 2, 0xd0d6dc); p.set(16, 3, 0xdff4ff); p.set(15, 4, 0xbfe6ff); p.set(17, 4, 0xbfe6ff); p.set(13, 5, 0x9fd8ff); p.set(19, 5, 0x9fd8ff);
    for (const [x, y] of [[9, 19], [22, 21], [14, 23]]) p.set(x, y, 0xffffff);
  }],
  nobori: [16, 30, p => { p.rect(4, 2, 1, 27, 0x8a8a8a); p.rect(5, 3, 7, 18, (i, j) => (j < 2 ? 0xffffff : 0xe2553d)); p.rect(6, 7, 5, 1, 0xffffff); p.rect(6, 10, 5, 1, 0xffffff); p.rect(6, 13, 4, 1, 0xffffff); p.rect(3, 28, 3, 2, 0x5a5a5a); }],
  vending: [16, 26, p => { p.rect(2, 3, 12, 22, 0xe2553d); p.rect(2, 3, 12, 2, 0xff7a5a); p.rect(4, 6, 8, 8, 0xdff4ff); for (let k = 0; k < 4; k++) p.rect(5 + (k % 2) * 4, 7 + Math.floor(k / 2) * 3, 2, 2, [0x3f8fd8, 0xffd23a, 0x7cc46a, 0xff8ab4][k]); p.rect(4, 17, 8, 3, 0x3a3a3a); p.rect(9, 15, 2, 1, 0xffe28a); p.rect(13, 3, 1, 22, 0xa83a2a); }],
  trash: [16, 16, p => { p.rect(5, 5, 7, 10, 0x4fb38a); p.rect(5, 5, 7, 1, 0x7fd3aa); p.rect(4, 4, 9, 2, 0x3a8a6a); p.rect(6, 7, 1, 7, 0x3a8a6a); p.rect(9, 7, 1, 7, 0x3a8a6a); }],
  planter: [16, 22, p => { p.rect(3, 15, 10, 6, 0xc06a3a); p.rect(3, 15, 10, 1, 0xe08a5a); p.ell(8, 10, 5, 5, (x, y) => (x + y < -2 ? 0x7ccc5a : 0x3f9a3a)); p.set(6, 8, 0xff6a8a); p.set(10, 11, 0xffd23a); }],
  dirt: [16, 16, p => { p.rect(0, 0, 16, 16, (i, j) => ((i * 7 + j * 3) % 11 === 0 ? 0xa88a5a : (i + j) % 5 === 0 ? 0xc8aa78 : 0xbc9e6a)); }],
  gravel: [16, 16, p => { p.rect(0, 0, 16, 16, (i, j) => ((i * 5 + j * 7) % 6 === 0 ? 0x8a8a84 : (i + j * 3) % 4 === 0 ? 0xc8c8c0 : 0xaaaaa2)); }],
  park: [48, 32, p => {
    p.rect(0, 2, 48, 30, (i, j) => ((i + j) % 2 ? 0x8ad05a : 0x84c854));
    p.rect(3, 6, 18, 3, 0xe2553d); p.rect(3, 6, 18, 1, 0xff7a5a); // すべりだい
    for (let k = 0; k < 8; k++) p.rect(5 + k * 2, 9 + k * 2, 3, 2, 0xe2553d);
    p.rect(18, 6, 2, 20, 0xb0b6be); p.rect(3, 9, 2, 17, 0xb0b6be);
    p.rect(26, 4, 18, 2, 0x8a5a33); p.rect(26, 4, 2, 24, 0x8a5a33); p.rect(42, 4, 2, 24, 0x8a5a33); // ブランコ
    p.rect(30, 6, 1, 14, 0x5a5a5a); p.rect(39, 6, 1, 14, 0x5a5a5a); p.rect(29, 20, 4, 2, 0x5fb3dd); p.rect(38, 20, 4, 2, 0xf2c14e);
    p.ell(24, 28, 4, 2, 0xe8d8a8);
  }],
};
export function decorTex(scene, kind) {
  const d = DECOR[kind];
  if (!d) return null;
  const flat = kind === "dirt" || kind === "gravel";
  return once(scene, "pxd_" + kind, d[0], d[1], p => { d[2](p); return flat ? p : p.outline(); });
}

// ---- 建物（ななめ上から：上から見た 屋根 ＋ 正面の かべ）。絵の高さは マスより 10ドット 高い（屋根が 上に はみ出す）----
export const BUILDING_LOOK = {
  shop: { wall: 0xfbead0, roof: 0xe2553d, trim: 0x8a5a33, awning: 0xe2553d, prop: "pots" },
  market: { wall: 0xf6ead6, roof: 0x3f8fd8, trim: 0x6b4a2a, awning: 0x3f8fd8, prop: "crates" },
  station: { wall: 0xece6dc, roof: 0x4a5f7a, trim: 0x3a3a3a, prop: "clock" },
  vet: { wall: 0xffffff, roof: 0x4fb38a, trim: 0x4fb38a, prop: "cross" },
  fishing: { wall: 0xdcc49a, roof: 0x2f6f9f, trim: 0x6b4a2a, prop: "rods", wood: true },
  zukan: { wall: 0xf3ead8, roof: 0x8a4a9a, trim: 0x6b4a2a, prop: "pots" },
  board: { wall: 0xc89a63, roof: 0x6b4a2a, trim: 0x6b4a2a, wood: true },
  farm: { wall: 0xc8402e, roof: 0x6a2a20, trim: 0xffffff, wood: true, barn: true },
  zoo: { wall: 0xe8d3a0, roof: 0x4f8f3a, trim: 0x8a5a33, prop: "pots", wood: true },
  aqua: { wall: 0xd6ecff, roof: 0x1f6fb2, trim: 0x1f4f7a, prop: "wave" },
};
export const BUILDING_RISE = 10; // 屋根が マスより 上に はみ出す ドット
export function buildingTex(scene, key, w, h, o) {
  const W = w * 16, H = h * 16 + BUILDING_RISE;
  return once(scene, "pxb_" + key, W, H, p => { // （できた絵は 側面ぶん 大きい）
    const roofH = Math.round(H * 0.5), wallTop = roofH, wallH = H - wallTop - 2;
    const R = o.roof, Rl = shade(R, 1.18), Rd = shade(R, 0.78), Rdd = shade(R, 0.6);
    // かべ（正面）
    p.rect(2, wallTop, W - 4, wallH, (i, j) => (o.wood ? (i % 5 === 0 ? shade(o.wall, 0.86) : o.wall) : j % 6 === 5 ? shade(o.wall, 0.93) : o.wall));
    p.rect(2, wallTop, 2, wallH, shade(o.wall, 1.06)); p.rect(W - 4, wallTop, 2, wallH, shade(o.wall, 0.8)); // かどの 明・暗
    p.rect(2, wallTop, W - 4, 2, shade(o.wall, 0.7)); // のきの かげ
    p.rect(1, H - 3, W - 2, 2, 0xa0947e); p.rect(1, H - 3, W - 2, 1, 0xc4b89e); // どだい
    // 屋根（上から見た面）：おくが 明るく 手前が こい。かわらの すじ と つぎめ
    for (let y = 0; y < roofH; y++) {
      const inset = Math.max(0, 3 - Math.floor(y / 2)), t = y / roofH;
      const c = y === 0 ? Rl : mix(Rl, Rd, t);
      p.rect(inset, y, W - inset * 2, 1, (i) => (y % 4 === 3 ? shade(c, 0.86) : (i + (Math.floor(y / 4) % 2) * 3) % 6 === 0 && y % 4 !== 0 ? shade(c, 0.92) : c));
    }
    if (o.barn) { p.rect(Math.round(W / 2) - 1, 1, 2, roofH - 2, Rl); } else p.rect(4, 2, W - 8, 1, shade(Rl, 1.12)); // むね
    p.rect(0, roofH - 2, W, 2, Rdd); p.rect(0, roofH - 2, W, 1, Rd); // のきさき
    p.rect(W - 12, 1, 4, 6, 0x9a8a80); p.rect(W - 12, 1, 4, 1, 0xc0b0a6); p.rect(W - 11, 0, 2, 1, 0x6a6a6a); // えんとつ
    // ひさし（しま）
    if (o.awning) for (let x = 3; x < W - 3; x++) {
      const st = Math.floor((x - 3) / 3) % 2 === 0, c = st ? o.awning : 0xffffff;
      p.set(x, wallTop + 2, shade(c, 1.05)); p.set(x, wallTop + 3, c); p.set(x, wallTop + 4, shade(c, 0.85));
      if ((x - 3) % 3 === 1) p.set(x, wallTop + 5, shade(c, 0.85));
    }
    // まど（わく・ガラス・光）
    const winY = wallTop + (o.awning ? 7 : 4), doorW = 7, dx = Math.round(W / 2 - doorW / 2);
    const win = x => { p.rect(x, winY, 9, 7, 0xf6f2ea); p.rect(x + 1, winY + 1, 7, 5, (i, j) => (j < 2 ? 0xbfe6ff : 0x7cc0ee)); p.rect(x + 4, winY + 1, 1, 5, 0xf6f2ea); p.set(x + 1, winY + 1, 0xffffff); p.set(x + 2, winY + 1, 0xffffff); p.rect(x, winY + 7, 9, 1, shade(o.wall, 0.7)); };
    for (const x of [5, W - 14]) if (x + 9 <= dx - 1 || x >= dx + doorW + 1) win(x);
    // とびら（わく・とって・ステップ）
    const dy = H - 3 - 11;
    p.rect(dx - 1, dy - 1, doorW + 2, 12, o.trim); p.rect(dx, dy, doorW, 11, shade(o.trim, 0.72)); p.rect(dx, dy, doorW, 1, shade(o.trim, 0.55));
    p.rect(dx + 1, dy + 2, doorW - 2, 3, shade(o.trim, 0.85)); p.set(dx + doorW - 2, dy + 6, 0xffe28a);
    p.rect(dx - 2, H - 2, doorW + 4, 2, 0xd8d0c0);
    // かんばん（アイコンは 画面の側で 上に のせる）
    p.rect(Math.round(W / 2) - 8, roofH - 9, 16, 8, 0xfff6e0); p.rect(Math.round(W / 2) - 8, roofH - 2, 16, 1, 0x8a6a48);
    // こもの
    if (o.prop === "pots") for (const x of [dx - 6, dx + doorW + 3]) { p.rect(x, H - 6, 4, 3, 0xc06a3a); p.ell(x + 2, H - 8, 2, 2, 0x4f9a3a); p.set(x + 1, H - 9, 0xff6a8a); }
    if (o.prop === "crates") for (const x of [3, W - 9]) { p.rect(x, H - 8, 6, 5, 0xb8864a); p.rect(x, H - 8, 6, 1, 0xd8a66a); p.set(x + 1, H - 9, 0xe2553d); p.set(x + 3, H - 9, 0x7cc46a); p.set(x + 4, H - 9, 0xffd23a); }
    if (o.prop === "clock") { p.ell(Math.round(W / 2), roofH - 14, 3, 3, 0xffffff); p.set(Math.round(W / 2), roofH - 15, 0x2a2a2a); p.set(Math.round(W / 2) + 1, roofH - 14, 0x2a2a2a); }
    if (o.prop === "cross") { const cx = W - 8, cy = wallTop + 5; p.rect(cx - 1, cy - 3, 3, 7, 0xe2553d); p.rect(cx - 3, cy - 1, 7, 3, 0xe2553d); }
    if (o.prop === "rods") for (let k = 0; k < 3; k++) for (let j = 0; j < 9; j++) p.set(3 + k * 2 + Math.floor(j / 3), H - 4 - j, 0x6b4a2a);
    if (o.prop === "wave") for (let x = 3; x < W - 3; x++) p.set(x, wallTop + 3 + (Math.floor(x / 3) % 2), 0x8fd0ff);
    return p.extrude(DEPTH).outline();
  });
}

// ---- 展示：さく（陸）と 池・プール（水）----
export function exhibitTex(scene, type, w, h) {
  const W = w * 16, H = h * 16;
  return once(scene, `pxe_${type}_${w}x${h}`, W, H + 6, p => {
    if (type === "fresh" || type === "sea" || type === "cold") {
      const water = { fresh: 0x58b49a, sea: 0x2f86d6, cold: 0x6cc0e6 }[type], rim = type === "cold" ? 0xf4faff : 0xc0b6a0;
      p.rect(0, 6, W, H, rim);
      for (let x = 0; x < W; x += 4) { p.rect(x, 6, 3, 2, shade(rim, 1.08)); p.rect(x + 2, H + 4, 3, 2, shade(rim, 0.78)); } // ふちの 石
      p.rect(2, 8, W - 4, H - 4, shade(water, 0.7)); // 手前の かべ（ふかさ）
      p.rect(3, 9, W - 6, H - 7, (i, j) => mix(shade(water, 1.15), shade(water, 0.85), j / (H - 7))); // 水：おくほど 明るい
      for (let k = 0; k < (W * H) / 160; k++) { const x = 5 + (rnd(k, W) % (W - 12)), y = 11 + (rnd(H, k) % (H - 12)); p.rect(x, y, 3, 1, shade(water, 1.28)); if (k % 3 === 0) p.set(x + 1, y - 1, 0xeaf8ff); } // なみ（ひかえめ）
      if (type === "cold") for (let k = 0; k < Math.max(2, w); k++) { const x = 6 + (k * 11) % (W - 12), y = H - 2 - (k % 2) * 6; p.ell(x, y, 4, 2, (i, j) => (j < 0 ? 0xffffff : 0xd8eefa)); }
      if (type === "fresh") for (let k = 0; k < 3; k++) { const x = 6 + k * (W / 3 - 2), y = H - 1; p.rect(x, y - 5, 1, 5, 0x3f8f3a); p.rect(x + 2, y - 7, 1, 7, 0x4f9f42); p.set(x + 2, y - 8, 0x7cc46a); }
      return p.outline();
    }
    const base = type === "big" ? 0x8ccc5c : 0xdcc490;
    p.rect(0, 6, W, H, (i, j) => (rnd(i, j) % 9 === 0 ? shade(base, 0.9) : rnd(j, i) % 13 === 0 ? shade(base, 1.08) : base));
    if (type === "big") { tree(p, W - 12, 26, 0x3f9a3a, 0x7ccc5a); p.ell(12, H - 4, 6, 3, (x, y) => (y < 0 ? 0xb0b6be : 0x8a9096)); p.ell(W / 2, H / 2 + 6, 7, 3, 0x6fbfd8); }
    else { // 小屋
      p.rect(4, 12, 14, 9, 0xb8864a); p.rect(4, 12, 14, 1, 0xd8a66a); p.rect(9, 16, 4, 5, 0x5a3a1e);
      for (let y = 0; y < 5; y++) p.rect(3 + Math.max(0, 2 - y), 7 + y, 16 - Math.max(0, 2 - y) * 2, 1, y < 2 ? 0xd06a3a : 0xa84a2a);
      p.ell(W - 10, H - 2, 5, 2, 0xc8b078); // えさ箱
    }
    // さく：おくは ひくく、手前は 高く 見える（くい と よこぎ）
    for (let x = 0; x < W; x += 4) { p.rect(x, 3, 2, 5, 0xa87240); p.set(x, 3, 0xc8904a); p.rect(x, H + 1, 2, 5, 0x9a6638); p.set(x, H + 1, 0xc8904a); }
    p.rect(0, 4, W, 1, 0x8a5a33); p.rect(0, 6, W, 1, 0x8a5a33); p.rect(0, H + 2, W, 1, 0x7a4e2c); p.rect(0, H + 4, W, 1, 0x7a4e2c);
    for (let y = 4; y < H + 4; y += 4) { p.rect(0, y, 2, 3, 0xa87240); p.rect(W - 2, y, 2, 3, 0x8a5a33); }
    return p.outline();
  });
}

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

// ---- お客さん：頭の大きい ちびキャラ（カイロソフト風）。f＝あし 0/1 ----
const SKIN = [0xffdcc0, 0xf2c4a0, 0xdca478], HAIR = [0x3a2a1a, 0x7a4a2a, 0x2a2a2a, 0xe0b050, 0xb0b0b0, 0xc85a3a], CLOTH = [0xe2553d, 0x3f8fd8, 0xf2c14e, 0x4fb38a, 0xa47ae8, 0xff8ab4, 0xffffff];
export function personTex(scene, v, f = 0) {
  return once(scene, `pxp_${v}_${f}`, 12, 18, p => {
    const sk = SKIN[v % 3], hr = HAIR[v % 6], cl = CLOTH[v % 7], pants = [0x3a4a6a, 0x5a4a3a, 0x2a2a2a][v % 3];
    p.ell(6, 5, 4, 4, sk); // かお
    p.rect(2, 1, 8, 3, hr); p.rect(3, 0, 6, 1, hr); p.rect(2, 4, 1, 3, hr); p.rect(9, 4, 1, 2, hr); if (v % 4 === 1) p.rect(1, 4, 2, 5, hr); // かみ
    p.set(4, 6, 0x2a1a10); p.set(7, 6, 0x2a1a10); p.set(3, 7, 0xff9a9a); p.set(8, 7, 0xff9a9a); // め・ほっぺ
    p.rect(3, 10, 6, 4, cl); p.rect(3, 10, 6, 1, shade(cl, 1.15)); p.set(2, 11, sk); p.set(9, 11, sk); // ふく・て
    if (f) { p.rect(3, 14, 2, 3, pants); p.rect(7, 14, 2, 2, pants); } else { p.rect(3, 14, 2, 2, pants); p.rect(7, 14, 2, 3, pants); } // あし
    return p.outline();
  });
}

// ---- 建物ごとの 形（2026-10-16「建物ごとに 形を かえて」）。絵だけで 何の建物か 分かるように。
// sign は かんばんの アイコンを のせる 位置（絵の ドット。なければ null）。絵の高さは マス＋rise ドット
const RISE = { market: 8, station: 18, shop: 12, vet: 12, fishing: 6, zukan: 14, board: 6, farm: 22, zoo: 20, aqua: 22 };
export const riseOf = kind => RISE[kind] ?? BUILDING_RISE;
function roofTiles(p, x, y, w, h, R) { // 上から見た かわら屋根（おくが明るい）
  for (let j = 0; j < h; j++) { const c = mix(shade(R, 1.2), shade(R, 0.8), j / h); p.rect(x, y + j, w, 1, i => (j % 3 === 2 ? shade(c, 0.85) : (i + (Math.floor(j / 3) % 2) * 2) % 5 === 0 ? shade(c, 0.93) : c)); }
  p.rect(x - 1, y + h, w + 2, 2, shade(R, 0.58)); p.rect(x - 1, y + h, w + 2, 1, shade(R, 0.75));
}
function wall(p, x, y, w, h, c, kind = "plain") {
  p.rect(x, y, w, h, (i, j) => (kind === "wood" ? (i % 4 === 0 ? shade(c, 0.86) : c) : kind === "brick" ? ((j % 3 === 2) || ((i + (Math.floor(j / 3) % 2) * 3) % 6 === 0) ? shade(c, 0.85) : c) : c));
  p.rect(x, y, 1, h, shade(c, 1.08)); p.rect(x + w - 1, y, 1, h, shade(c, 0.78)); p.rect(x, y, w, 1, shade(c, 0.7));
}
function windowAt(p, x, y, w = 7, h = 6, frame = 0xf6f2ea) {
  p.rect(x, y, w, h, frame); p.rect(x + 1, y + 1, w - 2, h - 2, (i, j) => (j < (h - 2) / 2 ? 0xbfe6ff : 0x7cc0ee)); p.set(x + 1, y + 1, 0xffffff); p.set(x + 2, y + 1, 0xffffff);
}
function door(p, x, y, c, w = 6, h = 9) { p.rect(x - 1, y - 1, w + 2, h + 1, shade(c, 1.1)); p.rect(x, y, w, h, shade(c, 0.7)); p.rect(x + 1, y + 1, w - 2, 3, shade(c, 0.85)); p.set(x + w - 2, y + 5, 0xffe28a); }
function stripes(p, x, y, w, c, rows = 4) { for (let i = 0; i < w; i++) { const k = Math.floor(i / 3) % 2 ? 0xffffff : c; for (let j = 0; j < rows; j++) p.set(x + i, y + j, shade(k, 1.08 - j * 0.07)); if (i % 3 === 1) p.set(x + i, y + rows, shade(k, 0.8)); } }

const SHAPES = {
  // いちば：屋台が 3つ ならぶ（しまの テント・木の台・やさいと さかな）
  market(p, W, H) {
    p.rect(0, H - 14, W, 12, (i, j) => ((i + j) % 4 ? 0xd8ccb0 : 0xccc0a2));
    const cols = [0xe2553d, 0x3f8fd8, 0xf2a03a];
    for (let k = 0; k < 3; k++) {
      const sw = Math.floor((W - 4) / 3), x = 2 + k * sw;
      p.rect(x + 1, 10, 1, H - 16, 0x8a6a48); p.rect(x + sw - 3, 10, 1, H - 16, 0x8a6a48);
      for (let j = 0; j < 9; j++) stripes(p, x + Math.max(0, 3 - j), 2 + j, sw - 2 - Math.max(0, 3 - j) * 2, cols[k], 1);
      stripes(p, x, 11, sw - 1, cols[k], 3);
      p.rect(x + 1, H - 14, sw - 3, 5, 0xb8864a); p.rect(x + 1, H - 14, sw - 3, 1, 0xd8a66a);
      const goods = [[0xe2553d, 0x7cc46a, 0xffd23a], [0x9fd0ff, 0xc8d0d8, 0x6a8aa8], [0xf2a03a, 0x8a5a33, 0xffe28a]][k];
      for (let g = 0; g < sw - 5; g += 2) { p.set(x + 2 + g, H - 15, goods[g % 3]); p.set(x + 3 + g, H - 16, goods[(g + 1) % 3]); }
    }
    return null;
  },
  // えき：ながい たてもの・まんなかに 時計台
  station(p, W, H) {
    const top = 22;
    wall(p, 2, top + 6, W - 4, H - top - 9, 0xece6dc, "brick"); roofTiles(p, 2, top - 2, W - 4, 8, 0x4a5f7a);
    const tx = Math.round(W / 2) - 6; wall(p, tx, 6, 12, top, 0xe0d6c6); roofTiles(p, tx - 1, 1, 14, 5, 0x3a4f6a);
    p.ell(tx + 6, 12, 4, 4, 0xffffff); p.rect(tx + 6, 9, 1, 4, 0x2a2a2a); p.rect(tx + 6, 12, 3, 1, 0x2a2a2a);
    for (const x of [6, W - 13]) windowAt(p, x, top + 10);
    door(p, Math.round(W / 2) - 4, H - 12, 0x3a3a3a, 8, 9);
    p.rect(1, H - 3, W - 2, 2, 0xb0a890); p.rect(1, H - 3, W - 2, 1, 0xd0c8b0);
    return { y: top + 8 };
  },
  // ペットショップ：大きな ショーウィンドウ（足あと）・ひさし
  shop(p, W, H) {
    const top = 26; wall(p, 2, top, W - 4, H - top - 3, 0xfbead0); roofTiles(p, 2, 4, W - 4, top - 6, 0xe2553d);
    stripes(p, 3, top + 2, W - 6, 0xe2553d, 4);
    const ww = Math.round(W * 0.42); p.rect(4, top + 9, ww, 14, 0xf6f2ea); p.rect(5, top + 10, ww - 2, 12, (i, j) => (j < 5 ? 0xcfeeff : 0x9ad4f4));
    const px = 4 + Math.round(ww / 2), py = top + 16; p.ell(px, py + 2, 3, 2, 0x8a5a33); for (const [a, b] of [[-3, -2], [-1, -4], [1, -4], [3, -2]]) p.set(px + a, py + b, 0x8a5a33);
    door(p, W - 16, H - 13, 0x8a5a33, 8, 10);
    for (const x of [ww + 6, W - 6]) { p.rect(x - 2, H - 7, 4, 4, 0xc06a3a); p.ell(x, H - 9, 2, 2, 0x4f9a3a); p.set(x, H - 11, 0xff6a8a); }
    p.rect(1, H - 3, W - 2, 2, 0xa0947e);
    return { y: 9 };
  },
  // じゅういさん：白い 病院・みどりの すじ・十字
  vet(p, W, H) {
    const top = 24; wall(p, 2, top, W - 4, H - top - 3, 0xffffff); p.rect(2, top + 4, W - 4, 2, 0x4fb38a);
    roofTiles(p, 2, 4, W - 4, top - 6, 0x4fb38a);
    const cx = Math.round(W / 2), cy = 11; p.rect(cx - 6, cy - 6, 12, 12, 0xffffff); p.rect(cx - 2, cy - 5, 4, 10, 0xe2553d); p.rect(cx - 5, cy - 2, 10, 4, 0xe2553d);
    for (const x of [5, W - 12]) windowAt(p, x, top + 9);
    p.rect(cx - 5, H - 13, 10, 10, 0xd0e8f4); p.rect(cx, H - 13, 1, 10, 0x9ab8c8); p.rect(cx - 5, H - 13, 10, 1, 0x4fb38a);
    p.rect(1, H - 3, W - 2, 2, 0xb8b8b8);
    return null;
  },
  // つりば：さんばしの 上の 小屋・水・つりざお・うき
  fishing(p, W, H) {
    p.rect(0, H - 22, W, 20, (i, j) => (j < 2 ? 0x8fd0ff : (i + j * 3) % 9 === 0 ? 0x6ab4e8 : 0x4f9ad8));
    for (let x = 0; x < W; x += 3) { p.rect(x, H - 14, 2, 12, 0xa87240); p.set(x, H - 14, 0xc8904a); }
    p.rect(0, H - 14, W, 1, 0x8a5a33);
    wall(p, 5, 12, W - 18, H - 28, 0xdcc49a, "wood"); roofTiles(p, 4, 3, W - 16, 8, 0x2f6f9f);
    door(p, 9, H - 24, 0x6b4a2a, 6, 8); windowAt(p, W - 22, 15, 6, 5);
    for (let k = 0; k < 3; k++) for (let j = 0; j < 12; j++) p.set(W - 11 + k * 2 + Math.floor(j / 4), H - 16 - j, 0x6b4a2a);
    p.ell(W - 4, H - 8, 1, 1, 0xe2553d); p.set(W - 4, H - 9, 0xffffff);
    return { y: 6 };
  },
  // ずかん：はしらの ある 図書館（三角の やね・かいだん）
  zukan(p, W, H) {
    const top = 18; p.rect(2, top, W - 4, H - top - 6, 0xf3ead8);
    for (let j = 0; j < 12; j++) { const inset = Math.round((12 - j) * (W / 2 - 3) / 12); p.rect(inset + 1, 4 + j, W - inset * 2 - 2, 1, mix(0xe8e0d0, 0xb8a888, j / 12)); }
    p.rect(1, top - 2, W - 2, 3, 0xd8ccb4); p.rect(1, top - 2, W - 2, 1, 0xf0e6d0);
    for (let x = 5; x < W - 5; x += 7) { p.rect(x, top + 1, 3, H - top - 8, 0xffffff); p.rect(x + 2, top + 1, 1, H - top - 8, 0xd0c8b8); }
    door(p, Math.round(W / 2) - 4, H - 15, 0x6b4a2a, 8, 9);
    for (let k = 0; k < 3; k++) p.rect(3 + k, H - 6 + k * 2, W - 6 - k * 2, 2, shade(0xd8d0c0, 1 - k * 0.08));
    return { y: 9 };
  },
  // けいじばん：木の いたに かみが はってある
  board(p, W, H) {
    for (const x of [5, W - 7]) p.rect(x, 10, 2, H - 12, 0x7a5232);
    p.rect(2, 6, W - 4, H - 16, 0xb8864a); p.rect(3, 7, W - 6, H - 18, 0xc89a63); p.rect(2, 4, W - 4, 2, 0x8a5a33);
    for (let k = 0; k < 4; k++) { const x = 5 + (k % 2) * Math.round((W - 14) / 2), y = 9 + Math.floor(k / 2) * 9; p.rect(x, y, 8, 7, 0xfffbea); p.rect(x + 1, y + 2, 5, 1, 0xb0a890); p.rect(x + 1, y + 4, 4, 1, 0xb0a890); p.set(x + 4, y, 0xe2553d); }
    return null;
  },
  // ぼくじょう：赤い なや（とびらに ×）・サイロ・ほしくさ
  farm(p, W, H) {
    const bw = Math.round(W * 0.66), top = 24;
    wall(p, 2, top, bw, H - top - 3, 0xc8402e, "wood");
    for (let j = 0; j < 14; j++) { const inset = j < 5 ? 5 - j : 0; p.rect(1 + inset, 8 + j, bw + 2 - inset * 2, 1, mix(0x8a3a2a, 0x5a2018, j / 14)); }
    p.rect(1, top - 2, bw + 2, 2, 0x4a1a12);
    const dx = 2 + Math.round(bw / 2) - 7; p.rect(dx, H - 18, 14, 15, 0xffffff); p.rect(dx + 1, H - 17, 12, 13, 0xa83020);
    for (let k = 0; k < 12; k++) { p.set(dx + 1 + k, H - 17 + k, 0xffffff); p.set(dx + 12 - k, H - 17 + k, 0xffffff); }
    const sx = bw + 6; p.rect(sx, 6, 10, H - 9, (i) => (i < 3 ? 0xd8dce0 : i > 7 ? 0x9aa0a8 : 0xc0c6cc)); p.ell(sx + 5, 6, 5, 3, 0x8a9aa8);
    p.ell(sx + 3, H - 4, 3, 2, 0xe8c860); p.ell(sx + 9, H - 3, 3, 2, 0xd8b850);
    return null;
  },
  // どうぶつえん：大きな もん（左右の はしら・アーチ・はた）
  zoo(p, W, H) {
    const top = 14;
    for (const x of [2, W - 12]) { wall(p, x, top, 10, H - top - 3, 0xd8c08a, "brick"); p.rect(x - 1, top - 3, 12, 3, 0x8a6a48); p.rect(x + 4, 2, 1, top - 4, 0x6b4a2a); for (let j = 0; j < 4; j++) p.rect(x + 5, 3 + j, 5 - j, 1, x < 10 ? 0xe2553d : 0x3f8fd8); }
    for (let i = 12; i < W - 12; i++) { const a = Math.round(6 * Math.sin(Math.PI * (i - 12) / (W - 24))); p.rect(i, top - a, 1, 6, i % 4 === 0 ? 0x6b4a2a : 0x8a5a33); }
    p.rect(Math.round(W / 2) - 9, top - 9, 18, 9, 0xfff6e0); p.rect(Math.round(W / 2) - 9, top, 18, 1, 0x6b4a2a);
    for (let x = 13; x < W - 13; x += 3) p.rect(x, H - 16, 1, 13, 0x6b4a2a);
    p.rect(12, H - 16, W - 24, 1, 0x8a5a33); p.rect(12, H - 10, W - 24, 1, 0x8a5a33);
    return { y: top - 5 };
  },
  // すいぞくかん：まるい ガラスの ドーム・なみの かざり
  aqua(p, W, H) {
    const top = 26; wall(p, 2, top, W - 4, H - top - 3, 0xd6ecff);
    const cx = Math.round(W / 2), r = Math.round(W / 2) - 3;
    p.ell(cx, top, r, top - 3, (x, y) => (y > 0 ? -1 : (x * x + y * y) % 7 === 0 ? 0xffffff : x + y < -r / 2 ? 0x9fd8ff : 0x3f8fd8));
    for (let k = -2; k <= 2; k++) for (let j = 0; j < top - 4; j++) p.set(Math.round(cx + k * Math.round(r / 3) * (1 - j / (top * 1.4))), top - j, 0x2f6fa8);
    for (let x = 3; x < W - 3; x++) p.set(x, top + 3 + (Math.floor(x / 3) % 2), 0x3f8fd8);
    for (const x of [6, W - 13]) { p.ell(x + 3, top + 10, 3, 3, 0xffffff); p.ell(x + 3, top + 10, 2, 2, 0x7cc0ee); }
    p.rect(cx - 5, H - 13, 10, 10, 0xd0e8f4); p.rect(cx, H - 13, 1, 10, 0x9ab8c8);
    p.rect(1, H - 3, W - 2, 2, 0xb0c0d0);
    return { y: top + 7 };
  },
};
// 建物の絵（形の 決まっていない 建物は ふつうの家）。{ key, sign, rise }
export function buildingArt(scene, kind, w, h) {
  const shape = SHAPES[kind];
  if (!shape) return { key: buildingTex(scene, kind, w, h, BUILDING_LOOK[kind] || BUILDING_LOOK.shop), sign: { y: Math.round((h * 16 + BUILDING_RISE) * 0.5) - 5 + Math.ceil(DEPTH / 2) }, rise: BUILDING_RISE + Math.ceil(DEPTH / 2) };
  const W = w * 16, H = h * 16 + riseOf(kind), key = `pxs_${kind}_${w}x${h}`;
  if (!scene.textures.exists(key)) { const p = new Pix(W, H), sg = shape(p, W, H), q = p.extrude(DEPTH); SIGNS[key] = sg ? { y: sg.y + q.off } : null; q.outline().tex(scene, key); }
  return { key, sign: SIGNS[key] || null, rise: riseOf(kind) + Math.ceil(DEPTH / 2) };
}
const SIGNS = {};
export const DEPTH = 6; // 建物の 側面の あつみ（ドット）
