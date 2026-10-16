// 町（版4・クォータービュー）の ドット絵。2026-10-16 パパ「カイロソフトを 再現して」→ 試作を 本番へ。
// ひし形の マスは 24×12 ドット。1ドット＝画面の 2ピクセル（PX）。絵の ファイルは 持たず、点を 打って 描く。
// 見かた：x は 右下へ、y は 左下へ。光は 左上から（左の かべは 明るく、右の かべは くらい）。
import { Pix, shade, mix, PX, GROUND } from "./pixel.js";

export const TW = 24, TH = 12;
const tone = (c, k) => (k >= 1 ? mix(shade(c, k), 0xfff0c8, Math.min(0.45, (k - 1) * 0.9)) : mix(shade(c, k), 0x2a2050, Math.min(0.5, (1 - k) * 0.6)));
const H2 = (a, b, s = 0) => ((((a + 31) * 73856093) ^ ((b + 17) * 19349663) ^ ((s + 7) * 83492791)) >>> 0);
const sprite = (scene, key, make) => { if (!scene.textures.exists(key)) { const s = make(); scene.textures.addCanvas(key, s.p.canvas(PX)); META[key] = { ax: s.ax, ay: s.ay }; } return { key, ...META[key] }; };
const META = {};

// ---- 立体の 部品 ----
// かべの 面：x0,y0 から よこへ len。dir=+1 は 右下へ（左の かべ）、-1 は 右上へ（右の かべ）。sh(u, v) の 色（null・-1 は 描かない）
function face(p, x0, y0, len, dir, h, sh) { for (let c = 0; c < len; c++) { const by = y0 + dir * Math.floor(c / 2); for (let v = 0; v < h; v++) { const k = sh(c, v); if (k !== -1 && k != null) p.set(x0 + c, by - v, k); } } }
export function fillPoly(p, pts, sh) {
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
    let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside; }
    if (inside) { const k = sh(x, y); if (k !== -1) p.set(x, y, k); }
  }
}
const inR = (u, v, u0, v0, w, h) => u >= u0 && u < u0 + w && v >= v0 && v < v0 + h;
const first = (...a) => a.find(x => x != null) ?? null;
// まど：わく・十字・空の うつりこみ（o.box 花の まどだい／o.curtain）
const WIN = (u, v, u0, v0, w, h, o = {}) => {
  if (o.box && inR(u, v, u0, v0 - 2, w, 2)) return v === v0 - 1 ? [0xff6a8a, 0x4f9a3a, 0xffd23a, 0x4f9a3a][(u - u0) % 4] : 0x9a5a32;
  if (!inR(u, v, u0 - 1, v0 - 1, w + 2, h + 2)) return null;
  if (!inR(u, v, u0, v0, w, h)) return v === v0 - 1 ? 0xfff8f0 : 0x8a7a6a;
  if (u === u0 + Math.floor(w / 2) || (h > 6 && v === v0 + Math.floor(h / 2))) return 0xf8f4ec;
  if (o.curtain && (u === u0 || u === u0 + w - 1)) return o.curtain;
  return v > v0 + h - 3 ? 0xd2f0ff : (u - v + 40) % 5 === 0 ? 0xeaf8ff : v < v0 + 2 ? 0x3a78c0 : 0x6aaee8;
};
const DOOR = (u, v, u0, w, h, c = 0x6b4a2a, glass) => { if (!inR(u, v, u0 - 1, 0, w + 2, h + 1)) return null; if (!inR(u, v, u0, 0, w, h)) return 0xf0e6d0; if (glass) return u === u0 + (w >> 1) ? 0x9aa4ae : (u - v + 40) % 6 === 0 ? 0xeaf8ff : v > h - 4 ? 0xbfe6ff : 0x6aaee8; return v === h - 1 ? tone(c, 0.7) : u === u0 + w - 2 && v === h >> 1 ? 0xffe08a : (u - u0) % 3 === 0 ? tone(c, 0.88) : c; };
const AWN = (u, v, v0, c, c2 = 0xffffff) => (v === v0 ? (Math.floor(u / 3) % 2 ? tone(c2, 0.85) : tone(c, 0.8)) : v > v0 && v <= v0 + 3 ? tone(Math.floor(u / 3) % 2 ? c2 : c, 1 + (v - v0) * 0.04) : null);
const SIGN = (u, v, u0, v0, w, h, c = 0xfff4dc, ink = 0x8a5a33) => (inR(u, v, u0, v0, w, h) ? (u === u0 || v === v0 || u === u0 + w - 1 || v === v0 + h - 1 ? 0x6a4a30 : v === v0 + (h >> 1) && (u - u0) % 3 !== 0 && u > u0 + 1 && u < u0 + w - 2 ? ink : c) : null);
const brick = (u, v, c) => (v % 3 === 0 || (u + (Math.floor(v / 3) % 2) * 3) % 6 === 0 ? mix(c, 0xe8dccb, 0.5) : (H2(u >> 2, v / 3 | 0, 2) % 4 === 0 ? tone(c, 0.92) : c));
const siding = (u, v, c) => (v % 3 === 0 ? tone(c, 0.88) : c);
const plank = (u, v, c) => (u % 4 === 0 ? tone(c, 0.82) : H2(u >> 2, 0, 3) % 3 === 0 ? tone(c, 0.94) : c);
const tileW = (u, v, c) => (u % 4 === 0 || v % 4 === 0 ? tone(c, 0.92) : c);
const stoneW = (u, v, c) => (v % 4 === 0 || (u + (v >> 2) * 2) % 5 === 0 ? tone(c, 0.82) : c);
const old = (pat, age) => (u, v, c) => { let k = pat(u, v, c); if (H2(u, v >> 1, 9) % (12 - age * 2) === 0) k = tone(k, 0.8); if (v < 3 && H2(u, 0, 10) % 3 === 0) k = mix(k, 0x5f8a3a, 0.6); return k; }; // ふるびた かべ（しみ・こけ）

// ---- 建物の 箱：w×d マスの 絵。かべの 高さ h、屋根 roofType: gable（きりづま）| hip（よせむね）| flat | dome ----
// o.box = [x0, y0, bw, bd]：絵の 中で 箱を 置く 所（ないときは ぜんぶ）。o.before／o.after で 足す
function building(o) {
  const { w, d, h } = o, [bx0, by0, bw, bd] = o.box || [0, 0, w, d];
  const rh = o.roofType === "gable" ? Math.round(bd * 7) : o.roofType === "hip" ? Math.round(bd * 5) : o.roofType === "dome" ? (o.domeH ?? 18) : 4, top = h + rh + (o.extraTop ?? 20);
  const W = (w + d) * 12 + 8, Hh = (w + d) * 6 + top + 3, ox = d * 12 + 4;
  const p = new Pix(W, Hh), P = (x, y, z = 0) => [ox + (x - y) * 12, top + (x + y) * 6 - z];
  o.before?.(p, P);
  const L = P(bx0, by0 + bd), B = P(bx0 + bw, by0 + bd), wallC = (u, v, c) => (o.wallPat?.(u, v, c) ?? c), base = o.base ?? 0xa8a090;
  face(p, L[0], L[1], bw * 12, 1, h, (u, v) => first(o.left?.(u, v), v === 0 ? tone(base, 0.9) : v === 1 ? base : v >= h - 2 ? tone(o.wall, 0.82) : wallC(u, v, o.wall)));
  face(p, B[0], B[1], bd * 12, -1, h, (u, v) => { const r = o.right?.(u, v); return r != null ? tone(r, 0.8) : v <= 1 ? tone(base, 0.72) : v >= h - 2 ? tone(o.wall, 0.6) : tone(wallC(u, v, o.wall), 0.74); });
  const R = o.roof;
  if (o.roofType === "gable" || o.roofType === "hip") {
    const hip = o.roofType === "hip" ? 0.6 : 0, Lr = P(bx0 + hip, by0 + bd / 2, h + rh), Br = P(bx0 + bw - hip, by0 + bd / 2, h + rh);
    const Lt = P(bx0, by0 + bd, h), Bt = P(bx0 + bw, by0 + bd, h), Rt = P(bx0 + bw, by0, h), Tt = P(bx0, by0, h);
    fillPoly(p, [Lr, Br, Rt, Tt], () => tone(R, 1.12));
    if (hip) fillPoly(p, [Bt, Rt, Br], (x, y) => ((x + y) % 4 === 0 ? tone(R, 0.62) : tone(R, 0.7)));
    else fillPoly(p, [Bt, Rt, Br], (x, y) => ((y - Br[1]) % 4 === 0 ? tone(o.wall, 0.6) : tone(o.wall, 0.7)));
    if (!hip && o.gableWin !== false) { const [gx, gy] = P(bx0 + bw, by0 + bd / 2, h + Math.round(rh * 0.4)); p.ell(gx + 1, gy, 2, 2, 0xfff0c0); p.set(gx, gy - 1, 0xffffff); }
    const rust = o.rust;
    fillPoly(p, [[Lt[0] - 2, Lt[1] + 1], [Bt[0] + 1, Bt[1] + 2], Br, Lr], (x, y) => {
      const ey = Lt[1] + 1 + (x - (Lt[0] - 2)) / 2, t = ey - y, row = Math.floor(t / 3), base2 = mix(tone(R, 0.85), tone(R, 1.12), Math.min(1, t / (rh + 6)));
      if (o.tin) { const k = t < 1.2 ? tone(R, 0.6) : x % 3 === 0 ? tone(base2, 1.12) : x % 3 === 2 ? tone(base2, 0.82) : base2; return rust && H2(x, y, 7) % 6 === 0 ? mix(k, 0xa0522d, 0.65) : k; }
      return t < 1.2 ? tone(R, 0.6) : t % 3 < 1 ? tone(base2, 0.74) : (x + row * 3) % 6 === 0 ? tone(base2, 0.86) : base2;
    });
    for (let x = Lr[0]; x <= Br[0]; x++) { const y = Math.round(Lr[1] + (x - Lr[0]) / 2); p.set(x, y, tone(R, 1.35)); p.set(x, y - 1, tone(R, 1.2)); }
    if (o.chimney) { const [cx, cy] = P(bx0 + bw * 0.75, by0 + bd * 0.3, h + rh); p.rect(cx, cy - 8, 4, 8, 0xb0604a); p.rect(cx + 3, cy - 8, 1, 8, 0x804030); p.rect(cx - 1, cy - 9, 6, 2, 0x5a4a48); }
  } else if (o.roofType === "flat") {
    fillPoly(p, [P(bx0, by0, h + 2), P(bx0 + bw, by0, h + 2), P(bx0 + bw, by0 + bd, h + 2), P(bx0, by0 + bd, h + 2)], (x, y) => (H2(x, y, 4) % 6 === 0 ? tone(R, 0.92) : R));
    face(p, ...P(bx0, by0 + bd, h), bw * 12, 1, 3, (u, v) => (v === 2 ? tone(R, 1.3) : tone(R, 1.1)));
    face(p, ...P(bx0 + bw, by0 + bd, h), bd * 12, -1, 3, (u, v) => (v === 2 ? tone(R, 1.1) : tone(R, 0.8)));
  } else if (o.roofType === "dome") {
    fillPoly(p, [P(bx0, by0, h), P(bx0 + bw, by0, h), P(bx0 + bw, by0 + bd, h), P(bx0, by0 + bd, h)], (x, y) => ((x + y) % 7 === 0 ? 0xd0dce4 : 0xe4eef4)); // 屋上（ドームの まわり）
    face(p, ...P(bx0, by0 + bd, h), bw * 12, 1, 2, () => 0xf4f8ff); face(p, ...P(bx0 + bw, by0 + bd, h), bd * 12, -1, 2, () => 0xc8d4dc);
    const [cx, cy] = P(bx0 + bw / 2, by0 + bd / 2, h), rx = Math.round((bw + bd) * (o.domeR ?? 5)), ry = rh + 4;
    p.ell(Math.round(cx), Math.round(cy), rx, ry, (x, y) => (y > 2 ? -1 : (x * 2 + 60) % 7 === 0 || (y + 40) % 5 === 0 ? 0x2a5a8a : x + y < -rx / 2 ? 0xbfe8ff : x > rx / 3 ? 0x2f78c0 : 0x5fb0ec));
    for (let k = 0; k < 6; k++) p.set(Math.round(cx) - 9 + k, Math.round(cy) - ry + 5 + (k >> 1), 0xffffff);
    o.domeTop = [Math.round(cx), Math.round(cy) - ry];
  }
  o.after?.(p, P, o);
  return { p: p.outline(), ax: ox, ay: top };
}
const pot = (p, x, y) => { p.rect(x, y - 3, 4, 3, 0xc0663a); p.rect(x, y - 3, 4, 1, 0xe08a5a); p.ell(x + 2, y - 5, 2, 2, 0x4f9a3a); p.set(x + 1, y - 6, 0xff6a8a); };
const flag = (p, x, y, c) => { p.rect(x, y - 12, 1, 12, 0x8a8f98); p.set(x, y - 13, 0xffd23a); for (let j = 0; j < 4; j++) p.rect(x + 1, y - 12 + j, 6 - j, 1, j ? c : tone(c, 1.2)); };
const balloon = (p, x, y, c) => { p.ell(x, y, 2, 3, (a, b) => (a + b < -1 ? tone(c, 1.3) : c)); p.set(x, y + 4, 0x8a8a8a); p.set(x, y + 5, 0x8a8a8a); };
const bushAt = (p, x, y, r = 4) => p.ell(x, y, r + 1, r, (a, b) => (a + b < -r / 2 ? 0x8ad86a : a + b > r / 2 ? 0x2f7a2f : (a * 3 + b) % 4 === 0 ? 0x3f8a3a : 0x4f9f42));

// ---- 建物ごと ----
const B = {
  shop: () => building({ w: 3, d: 3, h: 26, wall: 0xfbe6c8, roof: 0xe2483a, roofType: "gable", chimney: true,
    left: (u, v) => first(AWN(u, v, 15, 0xe2553d), WIN(u, v, 3, 3, 20, 10), DOOR(u, v, 28, 8, 13, 0x8a5a33), WIN(u, v, 5, 20, 8, 5, { curtain: 0xffa6c0 }), WIN(u, v, 23, 20, 8, 5, { curtain: 0xffa6c0 }), SIGN(u, v, 40, 4, 14, 8)),
    right: (u, v) => first(WIN(u, v, 8, 8, 10, 7, { box: true }), WIN(u, v, 8, 20, 8, 5, { curtain: 0xffa6c0 }), WIN(u, v, 22, 20, 8, 5)),
    after: (p, P) => { const [x, y] = P(0.4, 3); pot(p, x + 26, y + 13); pot(p, x + 40, y + 20); const [cx, cy] = P(0.15, 3, 12); for (const [a, b] of [[0, 0], [2, -1], [4, 0], [1, 2], [3, 2]]) p.set(cx + 7 + a, cy + 4 + b, 0x8a5a33); } }),
  market: () => building({ w: 3, d: 2, h: 16, wall: 0xc89a63, wallPat: siding, roof: 0x3f8fd8, roofType: "flat",
    left: (u, v) => { const k = Math.floor(u / 12); if (v >= 11 && v <= 14) return Math.floor(u / 3) % 2 ? 0xffffff : [0xe2553d, 0x3f8fd8, 0xf2a03a][k % 3]; if (v === 10) return u % 3 === 1 ? 0x5a3a20 : null;
      if (v >= 5 && v < 10) return u % 12 < 1 ? 0x6a4a30 : v === 5 ? 0xa8703a : [0x4a3020, 0x5a3a24][v % 2]; if (v >= 2 && v < 5) return u % 12 === 0 ? 0x6a4a30 : [[0xe2553d, 0x7cc46a, 0xffd23a, 0xff8a3a], [0xb8d8f0, 0x8aa8c8, 0xd8e4f0, 0xffffff], [0xf2a03a, 0xff6a4a, 0xffe28a, 0x9ad04a]][k % 3][(u + v * 3) % 4]; return null; },
    right: (u, v) => first(WIN(u, v, 6, 6, 8, 6), SIGN(u, v, 16, 4, 6, 6)),
    after: (p, P) => { for (let k = 0; k < 3; k++) { const [x, y] = P(0.5 + k, 2); p.rect(x - 3, y - 4, 6, 4, 0xb8864a); p.rect(x - 3, y - 4, 6, 1, 0xd8a66a); p.set(x - 2, y - 5, 0xe2553d); p.set(x, y - 5, 0x7cc46a); p.set(x + 2, y - 5, 0xffd23a); } } }),
  station: () => building({ w: 4, d: 2, h: 22, wall: 0xd88a6a, wallPat: brick, roof: 0x4a5f7a, roofType: "hip", extraTop: 34,
    left: (u, v) => first(WIN(u, v, 4, 8, 7, 10), WIN(u, v, 15, 8, 7, 10), WIN(u, v, 62, 8, 7, 10), WIN(u, v, 73, 8, 7, 10), DOOR(u, v, 34, 14, 15, 0, true), SIGN(u, v, 31, 17, 20, 4, 0x2a3a5a, 0xffffff)),
    right: (u, v) => WIN(u, v, 7, 8, 9, 9),
    after: (p, P) => { const [x, y] = P(2, 1, 36); p.rect(x - 6, y - 10, 12, 14, 0xe8dccb); p.rect(x + 4, y - 10, 2, 14, 0xb8a888); for (let i = 0; i < 14; i++) p.set(x - 7 + i, y - 11 - Math.max(0, 3 - Math.abs(i - 7)), 0x3a4f6a); p.rect(x - 7, y - 11, 14, 1, 0x3a4f6a);
      p.ell(x - 1, y - 4, 4, 4, (a, b) => (a * a + b * b > 10 ? 0x6a5040 : 0xffffff)); p.set(x - 1, y - 6, 0x222222); p.set(x - 1, y - 5, 0x222222); p.set(x, y - 4, 0x222222); p.rect(x - 1, y - 15, 1, 3, 0xd8b040); } }),
  vet: () => building({ w: 2, d: 2, h: 24, wall: 0xffffff, wallPat: (u, v, c) => (u % 4 === 0 || v % 4 === 0 ? 0xe4e8ec : c), roof: 0xc8ccd0, roofType: "flat", base: 0xb0b4b8, extraTop: 30,
    left: (u, v) => first(v >= 19 && v <= 20 ? 0x3fa37a : null, WIN(u, v, 3, 6, 8, 7), DOOR(u, v, 14, 8, 14, 0, true)),
    right: (u, v) => first(v >= 19 && v <= 20 ? 0x3fa37a : null, WIN(u, v, 4, 6, 7, 7), WIN(u, v, 14, 6, 7, 7)),
    after: (p, P) => { const [x, y] = P(1, 1, 34); p.rect(x - 5, y - 5, 11, 11, 0x2a2e36); p.rect(x - 4, y - 4, 9, 9, 0xffffff); p.rect(x - 1, y - 3, 3, 7, 0xe8453a); p.rect(x - 3, y - 1, 7, 3, 0xe8453a); const [ax, ay] = P(1.6, 0.4, 26); p.rect(ax, ay - 3, 6, 4, 0xe8ecf0); p.rect(ax, ay - 3, 6, 1, 0xffffff); p.set(ax + 2, ay - 1, 0x5a5f68); p.set(ax + 3, ay - 1, 0x5a5f68); } }),
  zukan: () => building({ w: 3, d: 2, h: 22, wall: 0xf0e6d0, wallPat: (u, v, c) => (v % 4 === 0 ? tone(c, 0.92) : c), roof: 0x8a4a9a, roofType: "gable", base: 0xd8d0c0,
    left: (u, v) => first(u % 9 < 3 && v > 2 && v < 19 && (u < 13 || u > 24) ? (u % 9 === 0 ? 0xffffff : u % 9 === 1 ? 0xf4ecdc : 0xc8bca4) : null, DOOR(u, v, 14, 9, 12, 0x6b4a2a), SIGN(u, v, 13, 14, 11, 5, 0xe8c040, 0x8a5a10), v >= 2 && v < 13 && u % 9 >= 4 && u % 9 < 7 && (u < 13 || u > 24) ? [0x8a4a9a, 0x3f8fd8, 0xe2553d][Math.floor(u / 9) % 3] : null),
    right: (u, v) => WIN(u, v, 7, 8, 8, 8) }),
  farm: () => building({ w: 3, d: 2, h: 20, wall: 0xc8402e, wallPat: plank, roof: 0x6a2a20, roofType: "gable", gableWin: false, extraTop: 36,
    left: (u, v) => (inR(u, v, 12, 0, 13, 15) ? (() => { const a = u - 12, b = v; return a === 0 || a === 12 || b === 14 || a === b || a === 12 - b || a === 6 ? 0xffffff : 0xa83020; })() : null),
    after: (p, P) => { const [x, y] = P(3, 0); p.rect(x - 2, y - 34, 9, 34, 0xc0c6cc); p.rect(x - 2, y - 34, 3, 34, 0xe0e4e8); p.rect(x + 5, y - 34, 2, 34, 0x8a929c); for (let k = 0; k < 34; k += 7) p.rect(x - 2, y - 34 + k, 9, 1, 0x7a828c); p.ell(x + 2, y - 34, 5, 3, (a, b) => (b > 0 ? -1 : a + b < -2 ? 0xb8c4d0 : 0x7a8a9a));
      const [hx, hy] = P(0.3, 2); p.ell(hx + 2, hy + 2, 4, 3, (a, b) => (b < -1 ? 0xf0d878 : (a + b) % 3 === 0 ? 0xc8a840 : 0xe0c060)); } }),
  // つりば：手前は 水と さんばし、おくに 木の 小屋（トタン屋根）・うきわ・つりざお・小舟
  fishing: () => building({ w: 3, d: 2, h: 16, box: [0, 0, 2, 1.2], wall: 0xc8a070, wallPat: plank, roof: 0x2f6f9f, roofType: "gable", tin: true, base: 0x8a6a48,
    before: (p, P) => { fillPoly(p, [P(0, 1.2), P(3, 1.2), P(3, 2), P(0, 2)], (x, y) => ((x * 2 + y * 5) % 13 === 0 ? 0x8fd0ff : (x + y) % 2 ? 0x3f8fd8 : 0x4f9ad8)); fillPoly(p, [P(2, 0), P(3, 0), P(3, 1.2), P(2, 1.2)], (x, y) => (x % 3 === 0 ? 0x8a5a33 : 0xb8864a)); fillPoly(p, [P(0.8, 1.2), P(1.6, 1.2), P(1.6, 2), P(0.8, 2)], (x, y) => (x % 3 === 0 ? 0x8a5a33 : 0xb8864a)); },
    left: (u, v) => first(DOOR(u, v, 4, 6, 11, 0x6b4a2a), WIN(u, v, 14, 6, 7, 5)),
    right: (u, v) => (inR(u, v, 3, 5, 6, 6) ? ((u - 6) ** 2 + (v - 8) ** 2 < 2 ? 0xc8a070 : (u + v) % 4 < 2 ? 0xe2553d : 0xffffff) : null),
    after: (p, P) => { const [rx, ry] = P(2.6, 0.6); for (let k = 0; k < 3; k++) for (let j = 0; j < 14; j++) p.set(rx + k * 2 + Math.floor(j / 5), ry - j, 0x5a3a20); const [bx, by] = P(2.3, 1.8); p.rect(bx - 6, by - 3, 12, 3, 0xe8e0d0); p.rect(bx - 5, by - 1, 10, 1, 0xa8703a); const [fx, fy] = P(1.9, 1.6); p.set(fx, fy, 0xe2553d); p.set(fx, fy - 1, 0xffffff); } }),
  // けいじばん：やねの ついた 木の いた・はり紙
  board: () => { const p = new Pix(56, 50), ox = 16, top = 34, P = (x, y, z = 0) => [ox + (x - y) * 12, top + (x + y) * 6 - z];
    const [lx, ly] = P(0.2, 0.7);
    for (const x of [0.25, 1.75]) { const [px, py] = P(x, 0.7); p.rect(px, py - 18, 2, 18, 0x7a5232); p.set(px, py - 18, 0x9a6a40); }
    face(p, lx, ly - 7, 24, 1, 14, (u, v) => (v === 0 || v === 13 || u === 0 || u === 23 ? 0x6a4020 : (inR(u, v, 3, 6, 6, 5) ? 0xfffbea : inR(u, v, 13, 4, 7, 6) ? 0xeaf6ff : inR(u, v, 6, 1, 6, 4) ? 0xfff0f4 : (u * 7 + v * 3) % 9 === 0 ? 0xc8a06a : 0xd8b07a)));
    face(p, lx - 1, ly - 21, 26, 1, 3, (u, v) => (v === 2 ? 0x7a9a4a : 0x5a6a3a));
    return { p: p.outline(), ax: ox, ay: top }; },
};

// ---- どうぶつえんの もん（だんかい 0〜5）。3×2 マス：おくに 木、手前に もん ----
function zooGate(lv) {
  const w = 3, d = 2, top = 52, W = (w + d) * 12 + 12, Hh = (w + d) * 6 + top + 4, ox = d * 12 + 6;
  const p = new Pix(W, Hh), P = (x, y, z = 0) => [ox + (x - y) * 12, top + (x + y) * 6 - z], fy = d;
  // おく：園の 中の 木
  for (const [x, y] of [[0.5, 0.4], [1.4, 0.3], [2.4, 0.5], [1.0, 0.9], [2.0, 1.0]]) { const [tx, ty] = P(x, y); p.rect(tx, ty - 6, 2, 6, 0x7a5230); bushAt(p, tx + 1, ty - 10, lv === 0 ? 4 : 5); }
  if (lv >= 2) { const [gx, gy] = P(2.3, 0.6); p.rect(gx, gy - 26, 3, 16, 0xf2c14e); for (let j = 0; j < 16; j += 3) p.set(gx + 1, gy - 24 + j, 0xb8702a); p.rect(gx - 4, gy - 29, 7, 3, 0xf2c14e); p.set(gx - 3, gy - 28, 0x2a1a10); p.set(gx, gy - 31, 0xa86a2a); p.set(gx + 2, gy - 31, 0xa86a2a); } // きりん
  const pc = lv >= 4 ? 0xe8dcc0 : lv >= 2 ? 0xc8785a : 0xa87a4a, pat = lv >= 4 ? stoneW : lv >= 2 ? brick : lv === 0 ? old(plank, 2) : plank, ph = lv === 0 ? 22 : lv >= 4 ? 30 : 28;
  const pillar = x => { const L = P(x, fy), Bq = P(x + 0.5, fy);
    face(p, L[0], L[1], 6, 1, ph, (u, v) => (v >= ph - 2 ? tone(pc, 1.15) : pat(u, v, pc)));
    face(p, Bq[0], Bq[1], 6, -1, ph, (u, v) => tone(pat(u, v, pc), 0.72));
    fillPoly(p, [P(x, fy - 0.5, ph), P(x + 0.5, fy - 0.5, ph), P(x + 0.5, fy, ph), P(x, fy, ph)], () => tone(pc, 1.25));
    if (lv >= 3) { const [lx, ly] = P(x + 0.25, fy, ph - 8); p.rect(lx - 1, ly, 3, 3, 0x2a2e36); p.set(lx, ly + 1, 0xffe68a); }
    if (lv >= 5) { const [hx, hy] = P(x + 0.25, fy - 0.25, ph); p.ell(hx, hy - 4, 4, 3, (a, b) => (a + b < -2 ? 0xffe070 : 0xd8a030)); p.set(hx - 1, hy - 4, 0x6a4a10); p.set(hx + 1, hy - 4, 0x6a4a10); }
    if (lv >= 2) { const [fx, fyy] = P(x + 0.25, fy - 0.25, ph + (lv >= 5 ? 7 : 0)); flag(p, fx, fyy, x < 1 ? 0xe2553d : 0x3f8fd8); } };
  const fc = lv >= 2 ? 0x3a3e46 : 0x8a5a33, [Lx, Ly] = P(0.5, fy); // さく
  for (let c = 0; c < 24; c++) { const y = Ly + Math.floor(c / 2); if (lv === 0 && H2(c, 1, 3) % 4 === 0) continue; if (c % 3 === 0) for (let v = 0; v < 10; v++) p.set(Lx + c, y - v, v === 9 && lv >= 2 ? 0xd8b040 : fc); if (c % 3 === 0 && lv >= 2) continue; p.set(Lx + c, y - 3, fc); p.set(Lx + c, y - 7, fc); }
  pillar(0); pillar(2.5);
  const bh = lv >= 3 ? 9 : 7, bz = ph + (lv >= 4 ? 4 : 0), [ax, ay] = P(0.25, fy, bz); // アーチの かんばん
  face(p, ax, ay, 30, 1, bh, (u, v) => { const tilt = lv === 0 ? Math.floor(u / 10) : 0; if (v - tilt < 0 || v - tilt >= bh) return null; const vv = v - tilt; return vv === 0 || vv === bh - 1 || u === 0 || u === 29 ? (lv >= 5 ? 0xb88a20 : lv >= 2 ? 0x2f5a2a : 0x6a4a30) : lv >= 5 ? 0xffe070 : lv === 0 ? (H2(u, v, 4) % 7 === 0 ? 0xb89a6a : 0xd8c098) : vv === bh >> 1 && u % 4 !== 0 && u > 3 && u < 26 ? 0x3a5a2a : 0xfff4dc; });
  if (lv >= 4) { // 大屋根・たれまく
    const hz = bz + bh + 2, Lr = P(-0.1, fy - 0.5, hz + 9), Br = P(w + 0.1, fy - 0.5, hz + 9), Lt = P(-0.2, fy + 0.2, hz), Bt = P(w + 0.2, fy + 0.2, hz), Rt = P(w + 0.2, fy - 1.2, hz), Tt = P(-0.2, fy - 1.2, hz), rc = 0x3f8f4a;
    fillPoly(p, [Lr, Br, Rt, Tt], () => tone(rc, 1.1)); fillPoly(p, [Bt, Rt, Br], () => tone(rc, 0.65));
    fillPoly(p, [Lt, Bt, Br, Lr], (x, y) => { const t = Lt[1] + (x - Lt[0]) / 2 - y; return t < 1.2 ? (lv >= 5 ? 0xf0c040 : tone(rc, 0.6)) : t % 3 < 1 ? tone(rc, 0.75) : rc; });
    for (let x = Lr[0]; x <= Br[0]; x++) p.set(x, Math.round(Lr[1] + (x - Lr[0]) / 2), lv >= 5 ? 0xffe070 : tone(rc, 1.3));
    for (const x of [0.25, 2.75]) { const [bx, by] = P(x, fy, ph - 6); for (let j = 0; j < 10; j++) for (let i = 0; i < 4; i++) p.set(bx - 2 + i, by - 12 + j + (i >> 1), j === 0 ? 0x6a4a30 : x < 1 ? 0xe2553d : 0x3f8fd8); }
  }
  if (lv === 1) for (const x of [0, 2.5]) { const [rx, ry] = P(x + 0.25, fy - 0.25, ph); for (let j = 0; j < 4; j++) p.rect(rx - 4 + j, ry - j, 8 - j * 2, 1, 0x6a8a3a); }
  if (lv >= 3) { const [kx, ky] = P(2.6, fy + 0.2); p.rect(kx - 5, ky - 12, 10, 12, 0xfaf0dc); for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) p.set(kx - 6 + i, ky - 15 + j, Math.floor(i / 2) % 2 ? 0xffffff : 0xe2553d); p.rect(kx - 3, ky - 9, 6, 4, 0x6aaee8); p.rect(kx - 5, ky - 3, 10, 1, 0xc8a070); } // きっぷうりば
  if (lv >= 5) { const [bx, by] = P(0, fy, ph + 14); for (const [a, b, c] of [[-4, 0, 0xff6a8a], [0, -5, 0xffd23a], [4, -1, 0x6ab4ff]]) balloon(p, bx + a, by + b, c); }
  if (lv === 0) { const [wx, wy] = P(1.5, fy); for (let k = 0; k < 8; k++) { p.set(wx - 12 + k * 3, wy + (k >> 1) - 1, 0x4f8a2f); p.set(wx - 12 + k * 3, wy + (k >> 1) - 2, 0x6aa83a); } }
  return { p: p.outline(), ax: ox, ay: top };
}

// ---- すいぞくかん（だんかい 0〜5）。3×3 マス ----
function aquaB(lv) {
  const tank = (u, v) => { if (!inR(u, v, 3, 2, 26, 10)) return null; if (v === 2 || v === 11 || u === 3 || u === 28) return 0x1f4f7a; const f = [[8, 6, 0xff8a3a], [15, 8, 0xffd23a], [21, 5, 0xff6a8a], [12, 4, 0xffffff]].find(([a, b]) => u >= a && u < a + 3 && v === b); if (f) return f[2]; if (v <= 4 && u % 5 === 0) return 0x3f9a3a; return v > 9 ? 0x8fe0ff : (u + v * 3) % 13 === 0 ? 0xbfe8ff : 0x3fa0e0; };
  const wave = (u, v, v0) => (v === v0 || v === v0 + 1 ? (u % 6 < 3 ? 0x3f8fd8 : 0x8fd0ff) : null);
  const port = (u, v, cu, cv) => { const r2 = (u - cu) ** 2 + (v - cv) ** 2; return r2 <= 4 ? ((u - cu) - (v - cv) === 0 ? 0xf0faff : v > cv ? 0x9fd8ff : 0x4a90d0) : r2 <= 8 ? 0xd8dde4 : null; };
  if (lv === 0) return building({ w: 3, d: 3, h: 14, box: [0.5, 0.5, 2.5, 2.5], wall: 0x7aa8c0, wallPat: old(plank, 3), roof: 0x9aa4ac, roofType: "gable", tin: true, rust: true, gableWin: false,
    left: (u, v) => first(DOOR(u, v, 20, 6, 10, 0x5a4a3a), SIGN(u, v, 3, 5, 14, 6, 0xf0ead8, 0x3f8fd8), port(u, v, 27, 7)),
    after: (p, P) => { const [x, y] = P(3, 2.2); p.rect(x - 8, y - 5, 4, 5, 0x8a8f98); p.rect(x - 8, y - 5, 4, 1, 0xb8c0c8); p.rect(x - 3, y - 4, 4, 4, 0x6a8aa8); } });
  const common = { w: 3, d: 3, base: 0x9ab0c0, extraTop: lv >= 5 ? 40 : 24,
    left: (u, v) => first(wave(u, v, lv >= 2 ? 14 : 13), lv >= 3 ? tank(u, v) : first(port(u, v, 8, 7), port(u, v, 20, 7)), DOOR(u, v, 30, 9, 12, 0, true)),
    right: (u, v) => first(wave(u, v, lv >= 2 ? 14 : 13), port(u, v, 12, 7), port(u, v, 26, 7)),
    after: (p, P, o) => {
      if (lv >= 4) { const [x, y] = P(0.1, 3); flag(p, x, y - 22, 0xe2553d); const [x2, y2] = P(3, 0.1); flag(p, x2 - 2, y2 - 22, 0x4fb38a); const [wx, wy] = P(3, 1.5, 12); p.ell(wx + 4, wy - 3, 6, 3, (a, b) => (b < 0 ? 0x3f78c0 : 0xeaf4ff)); p.set(wx + 8, wy - 4, 0x0a1a2a); p.rect(wx - 3, wy - 5, 2, 3, 0x3f78c0); } // くじらの かんばん
      if (lv >= 5) { const [cx, cy] = o.domeTop; p.rect(cx - 1, cy - 10, 3, 10, 0xf0c040); p.ell(cx, cy - 11, 2, 2, 0xffe070); flag(p, cx, cy - 13, 0x3f8fd8);
        const [dx, dy] = P(0.6, 3); p.rect(dx - 3, dy - 3, 8, 3, 0xd8d0c0); p.ell(dx + 1, dy - 7, 4, 2, (a, b) => (b < 0 ? 0x8ab8e0 : 0xdcecf8)); p.set(dx + 5, dy - 8, 0x8ab8e0); p.set(dx - 2, dy - 9, 0x8ab8e0); // イルカの ぞう
        for (let k = 0; k < 4; k++) balloon(p, dx - 6 + k * 4, dy - 30 - (k % 2) * 4, [0xff6a8a, 0xffd23a, 0x6ab4ff, 0x7cc46a][k]); }
      if (lv >= 3) { const [bx, by] = P(0.2, 3); bushAt(p, bx + 2, by - 2, 3); const [b2, c2] = P(3, 2.8); bushAt(p, b2 - 2, c2 - 2, 3); }
    } };
  if (lv === 1) return building({ ...common, h: 18, wall: 0xd6ecff, roof: 0x2f78c0, roofType: "gable" });
  return building({ ...common, h: lv >= 3 ? 22 : 18, wall: lv >= 3 ? 0xeaf4fc : 0xd6ecff, wallPat: lv >= 3 ? tileW : null, roof: 0x3f8fd8, roofType: "dome", domeH: lv >= 3 ? 20 : 12, domeR: lv >= 3 ? 5 : 3.6 });
}

// 建物の 絵（lv：どうぶつえん・すいぞくかんの だんかい）。{ key, ax, ay }（ax,ay は ドット。絵の 中の 「いちばん おくの かど」）
export function buildingSprite(scene, kind, lv = 0) {
  return sprite(scene, `iso_b_${kind}_${kind === "zoo" || kind === "aqua" ? lv : 0}`, () => (kind === "zoo" ? zooGate(lv) : kind === "aqua" ? aquaB(lv) : (B[kind] || B.shop)()));
}

// ---- 飾り（1マスは マスの まんなか が 足もと。2マス以上は 箱の 絵）----
function tree(leaf, fruit) { const p = new Pix(18, 26);
  p.rect(8, 17, 2, 7, 0x7a5230); p.set(8, 17, 0x9a6a40);
  p.ell(9, 11, 7, 7, (a, b) => (a + b < -5 ? tone(leaf, 1.3) : a + b > 4 ? tone(leaf, 0.72) : (a * 3 + b * 5) % 11 === 0 ? tone(leaf, 0.85) : leaf)); p.ell(5, 13, 3, 3, (a, b) => (a + b > 1 ? tone(leaf, 0.8) : leaf)); p.ell(13, 13, 3, 3, tone(leaf, 0.8));
  if (fruit) { p.set(6, 10, fruit); p.set(11, 8, fruit); p.set(12, 13, fruit); }
  return { p: p.outline(), ax: 9, ay: 23 }; }
const one = (w, h, ax, ay, f) => () => { const p = new Pix(w, h); f(p); return { p: p.outline(), ax, ay }; };
const DECOR = {
  tree: () => tree(0x3f9a3a, 0xff6a6a),
  momiji: () => tree(0xd0602a),
  flower: one(14, 9, 7, 6, p => { for (let i = 0; i < 12; i++) { p.set(1 + i, 1 + (i >> 1), 0x7a5232); p.set(1 + i, 2 + (i >> 1), 0x5a3a20); } for (let i = 0; i < 6; i++) { p.set(2 + i * 2, 0 + i, [0xff5a7a, 0xffd23a, 0xffffff, 0xff8ad8, 0xffa040, 0xff5a7a][i]); p.set(3 + i * 2, 1 + i, 0x3f8a32); } }),
  rock: one(16, 10, 8, 8, p => { p.ell(8, 6, 6, 4, (x, y) => (x + y < -1 ? 0xc8ccd2 : x + y > 2 ? 0x7a7f86 : 0x9aa0a8)); p.ell(4, 8, 3, 2, 0x8a9096); p.set(5, 3, 0xe8ecf0); }),
  lamp: one(8, 22, 4, 21, p => { p.rect(3, 6, 2, 15, 0x3a3e46); p.set(3, 6, 0x6a707a); p.rect(1, 1, 6, 5, 0x2a2e36); p.rect(2, 2, 4, 3, 0xffe68a); p.set(2, 2, 0xfffbd8); p.rect(2, 20, 4, 2, 0x2a2e36); }),
  bench: one(16, 12, 8, 9, p => { for (let i = 0; i < 12; i++) { p.set(2 + i, 4 + (i >> 1), 0xc8904a); p.set(2 + i, 5 + (i >> 1), 0xa8703a); p.set(2 + i, 2 + (i >> 1), 0xa8703a); p.set(2 + i, 1 + (i >> 1), 0xc8904a); } p.rect(3, 7, 1, 2, 0x3a3e46); p.rect(12, 11, 1, 1, 0x3a3e46); }),
  nobori: one(10, 26, 3, 25, p => { p.rect(2, 1, 1, 24, 0x8a8a8a); p.rect(3, 2, 6, 16, 0xe2553d); p.rect(3, 2, 6, 2, 0xffffff); for (const y of [6, 9, 12]) p.rect(4, y, 4, 1, 0xffffff); p.rect(1, 24, 3, 2, 0x5a5a5a); }),
  vending: one(10, 18, 5, 16, p => { p.rect(1, 1, 8, 16, 0xe2553d); p.rect(1, 1, 8, 1, 0xff7a5a); p.rect(2, 3, 5, 6, 0xdff4ff); for (let k = 0; k < 4; k++) p.rect(2 + (k % 2) * 3, 4 + (k >> 1) * 3, 2, 2, [0x3f8fd8, 0xffd23a, 0x7cc46a, 0xff8ab4][k]); p.rect(2, 11, 5, 2, 0x3a3a3a); p.rect(8, 1, 1, 16, 0xa83a2a); }),
  trash: one(10, 12, 5, 10, p => { p.rect(2, 3, 6, 8, 0x4fb38a); p.rect(2, 3, 6, 1, 0x7fd3aa); p.rect(1, 2, 8, 2, 0x3a8a6a); p.rect(4, 5, 1, 5, 0x3a8a6a); p.rect(7, 4, 1, 7, 0x2a6a4a); }),
  planter: one(12, 16, 6, 14, p => { p.rect(2, 9, 8, 6, 0xc06a3a); p.rect(2, 9, 8, 1, 0xe08a5a); p.rect(9, 9, 1, 6, 0x8a4228); p.ell(6, 5, 5, 5, (x, y) => (x + y < -2 ? 0x7ccc5a : x + y > 3 ? 0x2f7a2f : 0x3f9a3a)); p.set(4, 3, 0xff6a8a); p.set(8, 6, 0xffd23a); }),
  fountain: () => { const p = new Pix(52, 40), P = (x, y, z = 0) => [26 + (x - y) * 12, 10 + (x + y) * 6 - z];
    fillPoly(p, [P(0.15, 0.15), P(1.85, 0.15), P(1.85, 1.85), P(0.15, 1.85)], () => 0xd0d6dc);
    fillPoly(p, [P(0.35, 0.35), P(1.65, 0.35), P(1.65, 1.65), P(0.35, 1.65)], (x, y) => ((x * 3 + y * 5) % 11 === 0 ? 0xbfe8ff : 0x5fb4ef));
    face(p, ...P(0.15, 1.85), 20, 1, 3, (u, v) => (v === 2 ? 0xe8ecf0 : 0xb0b6be)); face(p, ...P(1.85, 1.85), 20, -1, 3, (u, v) => (v === 2 ? 0xd0d6dc : 0x9aa0a8));
    const [cx, cy] = P(1, 1); p.rect(cx - 1, cy - 12, 3, 12, 0xc0c6ce); p.rect(cx - 1, cy - 12, 1, 12, 0xe0e6ec); p.ell(cx, cy - 13, 4, 2, 0xd0d6dc); for (const [a, b] of [[0, -18], [-2, -16], [2, -16], [-4, -14], [4, -14]]) p.set(cx + a, cy + b, 0xdff4ff);
    return { p: p.outline(), ax: 26, ay: 10 }; },
  park: () => { const p = new Pix(52, 44), P = (x, y, z = 0) => [26 + (x - y) * 12, 14 + (x + y) * 6 - z];
    fillPoly(p, [P(0, 0), P(2, 0), P(2, 2), P(0, 2)], (x, y) => ((x + y) % 2 ? 0x8ad05a : 0x84c854));
    const [sx, sy] = P(0.5, 1.4); for (let k = 0; k < 10; k++) p.rect(sx + k, sy - 14 + k, 2, 1, 0xe2553d); p.rect(sx, sy - 14, 1, 14, 0xb0b6be); p.rect(sx - 3, sy - 15, 4, 2, 0xe2553d); // すべりだい
    const [bx, by] = P(1.4, 0.4); p.rect(bx - 8, by - 16, 16, 2, 0x8a5a33); p.rect(bx - 8, by - 16, 2, 16, 0x8a5a33); p.rect(bx + 6, by - 16, 2, 16, 0x8a5a33); p.rect(bx - 4, by - 14, 1, 9, 0x5a5a5a); p.rect(bx + 3, by - 14, 1, 9, 0x5a5a5a); p.rect(bx - 5, by - 5, 3, 1, 0x5fb3dd); p.rect(bx + 2, by - 5, 3, 1, 0xf2c14e); // ブランコ
    const [qx, qy] = P(1.4, 1.5); p.ell(qx, qy, 5, 2, 0xe8d8a8);
    return { p: p.outline(), ax: 26, ay: 14 }; },
};
// ごほうびの 飾り：石の 台（アイコンは 画面の側で のせる）
function pedestal(w, d) { const W = (w + d) * 12 + 6, p = new Pix(W, (w + d) * 6 + 18), ox = d * 12 + 3, P = (x, y, z = 0) => [ox + (x - y) * 12, 14 + (x + y) * 6 - z];
  fillPoly(p, [P(0.2, 0.2, 6), P(w - 0.2, 0.2, 6), P(w - 0.2, d - 0.2, 6), P(0.2, d - 0.2, 6)], (x, y) => ((x + y) % 5 === 0 ? 0xd8dce2 : 0xe8ecf0));
  face(p, ...P(0.2, d - 0.2), Math.round((w - 0.4) * 12), 1, 6, (u, v) => (v === 5 ? 0xd0d6dc : 0xb8bec6)); face(p, ...P(w - 0.2, d - 0.2), Math.round((d - 0.4) * 12), -1, 6, (u, v) => (v === 5 ? 0xb0b6be : 0x9aa0a8));
  return { p: p.outline(), ax: ox, ay: 14 }; }
export function decorSprite(scene, kind, w = 1, d = 1) {
  if (DECOR[kind]) return sprite(scene, "iso_d_" + kind, DECOR[kind]);
  if (kind.startsWith("p_")) return sprite(scene, `iso_ped_${w}x${d}`, () => pedestal(w, d));
  return null;
}
export const decorOne = kind => !["fountain", "park"].includes(kind); // 1マスの 絵（マスの まんなかが 足もと）

// ---- 展示の 手前の さく（おくの さくと 床は 地面に 描く）----
export const WATER_EX = new Set(["fresh", "sea", "cold"]);
export function fenceSprite(scene, type, w, d) {
  return sprite(scene, `iso_f_${type}_${w}x${d}`, () => {
    const W = (w + d) * 12 + 6, p = new Pix(W, (w + d) * 6 + 16), ox = d * 12 + 3, P = (x, y) => [ox + (x - y) * 12, 14 + (x + y) * 6];
    const water = WATER_EX.has(type), rim = type === "cold" ? 0xf4faff : 0xc8c0aa;
    const [Lx, Ly] = P(0, d), [Bx, By] = P(w, d), [Rx] = P(w, 0);
    const rail = (x, y, c) => { if (water) { p.set(x, y - 2, tone(rim, 1.1)); p.set(x, y - 1, rim); p.set(x, y, tone(rim, 0.75)); } else { p.set(x, y - 7, c); p.set(x, y - 3, c); } };
    const post = (x, y) => { if (!water) { p.rect(x, y - 9, 2, 10, 0xa87240); p.set(x, y - 9, 0xd0a060); } };
    for (let c = 0; c <= Bx - Lx; c++) { const y = Ly + Math.floor(c / 2); rail(Lx + c, y, 0x8a5a33); if (c % 6 === 0) post(Lx + c, y); }
    for (let c = 0; c <= Rx - Bx; c++) { const y = By - Math.floor(c / 2); rail(Bx + c, y, 0x6a4020); if (c % 6 === 0) post(Bx + c, y); }
    return { p: p.outline(), ax: ox, ay: 14 };
  });
}
// 手前の さくを 1マスぶんずつ（人や 動物と 前後を 正しく かさねるため）。side L＝左手前の へり（右下へ）、R＝右手前の へり（右上へ）
export function fenceSeg(scene, type, side) {
  const kind = WATER_EX.has(type) ? (type === "cold" ? "ice" : "rim") : "wood";
  return sprite(scene, `iso_fs_${kind}_${side}`, () => {
    const p = new Pix(16, 24), rim = kind === "ice" ? 0xf4faff : 0xc8c0aa, y0 = side === "L" ? 15 : 21;
    for (let c = 0; c <= 12; c++) { const x = 1 + c, y = side === "L" ? y0 + (c >> 1) : y0 - (c >> 1);
      if (kind !== "wood") { p.set(x, y - 2, tone(rim, 1.1)); p.set(x, y - 1, rim); p.set(x, y, tone(rim, 0.75)); continue; }
      p.set(x, y - 7, side === "L" ? 0x8a5a33 : 0x6a4020); p.set(x, y - 3, side === "L" ? 0x8a5a33 : 0x6a4020);
      if (c % 6 === 0) { p.rect(x, y - 9, 2, 10, 0xa87240); p.set(x, y - 9, 0xd0a060); } }
    return { p: p.outline(), ax: 1, ay: y0 };
  });
}
// 展示の 床（地面の 絵に 描く）。p は 地面、P は マス→ドット
export function paintExhibit(p, P, type, x0, y0, w, d, open) {
  const water = WATER_EX.has(type);
  const col = { land: [0xc8aa78, 0xb89a68, 0xd8bc88], big: [0x84c854, 0x74b848, 0x9ad86a], fresh: [0x58b49a, 0x48a48a, 0x8fd8c0], sea: [0x2f86d6, 0x2a78c4, 0x8fd0ff], cold: [0x6cc0e6, 0x5cb0d6, 0xdff4ff] }[type];
  fillPoly(p, [P(x0, y0), P(x0 + w, y0), P(x0 + w, y0 + d), P(x0, y0 + d)], (x, y) => { const q = H2(x, y, 3); return water ? (q % 13 === 0 ? col[2] : (x + y * 2) % 7 === 0 ? col[1] : col[0]) : q % 9 === 0 ? col[1] : q % 11 === 0 ? col[2] : col[0]; });
  const at = (fx, fy) => P(x0 + fx * w, y0 + fy * d);
  if (type === "land") { const [rx, ry] = at(0.7, 0.25); p.ell(rx, ry, 6, 3, (a, b) => (a + b < -2 ? 0xc8ccd2 : 0x8a9096)); const [hx, hy] = at(0.2, 0.3); fillPoly(p, [[hx - 6, hy], [hx, hy - 3], [hx + 6, hy], [hx, hy + 3]], () => 0x8a6a48); }
  if (type === "big") { const [px, py] = at(0.7, 0.3); p.ell(px, py, 7, 3, (a, b) => (b < 0 ? 0x8fd0ff : 0x4fa0e0)); }
  if (type === "cold") for (const [fx, fy] of [[0.25, 0.7], [0.7, 0.4]]) { const [ix, iy] = at(fx, fy); p.ell(ix, iy, 7, 3, (a, b) => (b < 0 ? 0xffffff : 0xd8eefa)); }
  if (type === "fresh") for (let k = 0; k < 4; k++) { const [rx, ry] = at(0.1 + k * 0.25, 0.05); p.rect(rx, ry - 3, 1, 3, 0x3f8f3a); p.set(rx + 1, ry - 4, 0x7cc46a); }
  // おくの さく・ふち
  const fc = water ? (type === "cold" ? 0xf4faff : 0xc8c0aa) : 0x8a5a33, [sx, sy] = P(x0, y0);
  for (let k = 0; k <= w * 12; k++) { p.set(sx + k, sy + (k >> 1) - 1, fc); if (!water) { p.set(sx + k, sy + (k >> 1) - 6, fc); p.set(sx + k, sy + (k >> 1) - 3, fc); if (k % 6 === 0) p.rect(sx + k, sy + (k >> 1) - 8, 2, 8, 0xa87240); } }
  for (let k = 0; k <= d * 12; k++) { p.set(sx - k, sy + (k >> 1) - 1, fc); if (!water) { p.set(sx - k, sy + (k >> 1) - 6, fc); p.set(sx - k, sy + (k >> 1) - 3, fc); if (k % 6 === 0) p.rect(sx - k, sy + (k >> 1) - 8, 2, 8, 0xa87240); } }
  void open;
}
// 展示の 見本（小窓の カード用）：床と さく だけの 小さな 絵
export function exhibitIcon(scene, type, w, d) {
  return sprite(scene, `iso_ei_${type}_${w}x${d}`, () => {
    const W = (w + d) * 12 + 6, p = new Pix(W, (w + d) * 6 + 18), ox = d * 12 + 3, P = (x, y) => [ox + (x - y) * 12, 14 + (x + y) * 6];
    paintExhibit(p, P, type, 0, 0, w, d);
    const f = fenceSprite(scene, type, w, d), src = scene.textures.get(f.key).getSourceImage();
    const c = document.createElement("canvas"); c.width = src.width / PX; c.height = src.height / PX; const cx = c.getContext("2d"); cx.imageSmoothingEnabled = false; cx.drawImage(src, 0, 0, c.width, c.height);
    const dd = cx.getImageData(0, 0, c.width, c.height).data;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (dd[i + 3] > 128) p.set(x, y, (dd[i] << 16) | (dd[i + 1] << 8) | dd[i + 2]); }
    return { p, ax: ox, ay: 14 };
  });
}

// ---- 地面 ----
// cell(x, y) が かえす 種類：g 草 / road / dirt / gravel / rail / water（つりば）
export function paintGround(p, P, N, cell, sea) {
  const G = GROUND[sea];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = cell(x, y), [sx, sy] = P(x, y), same = (dx, dy) => { const n = cell(x + dx, y + dy); return n === k || (k !== "rail" && ["road", "dirt", "gravel"].includes(n) && ["road", "dirt", "gravel"].includes(k)); };
    for (let j = 0; j < TH; j++) { const hw = j < TH / 2 ? (j + 1) * 2 : (TH - j) * 2; for (let i = -hw; i < hw; i++) {
      const q = H2(x * 24 + i, y * 12 + j, 1), I = i + 12; let c;
      if (k === "road") { c = (I + j * 2) % 8 === 0 || (I - j * 2 + 64) % 8 === 0 ? 0xb8b0a0 : q % 9 === 0 ? 0xe8e2d4 : 0xd8d0c0;
        if (!same(0, 1) && j >= TH / 2 && i < -hw + 2) c = 0x9a927f; if (!same(1, 0) && j >= TH / 2 && i >= hw - 2) c = 0x9a927f; if (!same(0, -1) && j < TH / 2 && i < -hw + 2) c = 0xf0eadc; if (!same(-1, 0) && j < TH / 2 && i >= hw - 2) c = 0xf0eadc; }
      else if (k === "dirt") c = q % 5 === 0 ? 0xb89a68 : q % 7 === 0 ? 0xd8bc88 : 0xc8aa78;
      else if (k === "gravel") c = q % 3 === 0 ? 0x8a8a84 : q % 4 === 0 ? 0xc8c8c0 : 0xaaaaa2;
      else if (k === "water") c = q % 11 === 0 ? 0x8fd0ff : 0x4f9ad8;
      else if (k === "rail") { const h1 = cell(x - 1, y) === "rail" || cell(x + 1, y) === "rail", sl = h1 ? (I - j * 2 + 64) % 6 : (I + j * 2) % 6; c = q % 3 === 0 ? 0x8a8478 : 0xa8a296; if (sl < 2) c = 0x8a5a33; const r = h1 ? j * 2 - I + 12 : j * 2 + I - 12; if (Math.abs(r - 3) < 1 || Math.abs(r + 3) < 1) c = 0xc8ced6; }
      else { c = (x + y) % 2 ? G.a : G.b; if (q % 17 === 0) c = G.t; else if (q % 23 === 0) c = G.l; if (H2(x, y, 5) % 6 === 0 && j === 6 && (i === -2 || i === 3)) c = G.f[H2(x, y, 6) % 3]; }
      p.set(sx + i, sy + j, c);
    } }
  }
  // 町の ふち（土の だんめん）
  for (let k = 0; k < N; k++) {
    const [ax, ay] = P(k, N - 1);
    for (let c = 0; c < 12; c++) for (let v = 0; v < 10; v++) p.set(ax - 12 + c, ay + 6 + Math.floor(c / 2) + v, v < 1 ? tone(G.a, 0.8) : (v + (c >> 2)) % 4 === 0 ? 0x8a6040 : 0xa87850);
    const [bx, by] = P(N - 1, k);
    for (let c = 0; c < 12; c++) for (let v = 0; v < 10; v++) p.set(bx + c, by + 11 - Math.floor(c / 2) + v, v < 1 ? tone(G.a, 0.7) : (v + (c >> 2)) % 4 === 0 ? 0x6a4428 : 0x8a6040);
  }
}
// たてものの かげ（右下に うすく）
export function paintShadow(p, P, x, y, w, d, len = 12) {
  const [Rx, Ry] = P(x + w, y), [Bx, By] = P(x + w, y + d), [Lx, Ly] = P(x, y + d);
  fillPoly(p, [[Rx, Ry], [Rx + len, Ry + len / 2 - 2], [Bx + len, By + len / 2 - 2], [Lx + len * 0.6, Ly + len * 0.3], [Lx, Ly], [Bx, By]], (px, py) => { const c = p.get(px, py); return c < 0 ? -1 : tone(c, 0.8); });
}

// ---- お客さん：2頭身（v＝見た目、f＝あし、back＝うしろむき）----
const SKIN = [0xffdcc0, 0xf2c4a0, 0xdca478], HAIR = [0x3a2a1a, 0x7a4a2a, 0xe0b050, 0x2a2a2a, 0xc85a3a, 0xb0b0b0], CL = [0xe2553d, 0x3f8fd8, 0xf2c14e, 0x4fb38a, 0xa47ae8, 0xff8ab4, 0xffffff];
export function personSprite(scene, v, f, back) {
  return sprite(scene, `iso_p_${v}_${f}_${+back}`, () => { const p = new Pix(12, 16), sk = SKIN[v % 3], hr = HAIR[v % 6], cl = CL[v % 7], kid = v % 3 === 0, oy = kid ? 2 : 0;
    p.ell(6, 5 + oy, 4, 4, sk); p.rect(2, 1 + oy, 8, 3, hr); p.rect(2, 4 + oy, 1, 2, hr); p.rect(9, 4 + oy, 1, 2, hr);
    if (v % 4 === 1) { p.rect(1, 3 + oy, 2, 4, hr); p.rect(9, 3 + oy, 2, 4, hr); } if (v % 5 === 2) { p.rect(1, 1 + oy, 10, 1, CL[(v + 2) % 7]); p.rect(3, 0 + oy, 6, 1, CL[(v + 2) % 7]); }
    if (back) p.rect(3, 4 + oy, 6, 3, hr); else { p.set(4, 6 + oy, 0x2a1a10); p.set(7, 6 + oy, 0x2a1a10); p.set(3, 7 + oy, 0xff9a9a); p.set(8, 7 + oy, 0xff9a9a); }
    const by = 9 + oy, bh = kid ? 2 : 3; p.rect(4, by, 4, bh, cl); p.rect(4, by, 4, 1, tone(cl, 1.2)); p.set(3, by + 1, sk); p.set(8, by + 1, sk);
    p.rect(4, by + bh, 1, f ? 2 : 1, 0x3a4a6a); p.rect(7, by + bh, 1, f ? 1 : 2, 0x3a4a6a);
    return { p: p.outline(), ax: 6, ay: by + bh + 2 }; });
}
