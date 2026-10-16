// 自分の町（箱庭）のルール。版3（docs/town-v3.md）。画面から切りはなした純粋な計算（記録は shop.town と shop.zoo/aqua の exhibits）。
// 置いてある物は { id, kind, x, y }。kind は TOWN_BUILDINGS か TOWN_DECOR の名前、展示は "ex_<種類>"。重なる所・はみ出す所には置けない。
import { TOWN_COLS, TOWN_BUILDINGS, TOWN_DECOR, TOWN_DEFAULT, TOWN_APPEAL_MAX, TOWN_VERSION, EXHIBIT_SIZE } from "../data/town.js";

const clone = o => JSON.parse(JSON.stringify(o));
export const townSpec = kind => TOWN_BUILDINGS[kind] || TOWN_DECOR[kind] || (kind.startsWith("ex_") && EXHIBIT_SIZE[kind.slice(3)] ? { w: EXHIBIT_SIZE[kind.slice(3)][0], h: EXHIBIT_SIZE[kind.slice(3)][1], exhibit: true } : null);
export const isBuilding = kind => !!TOWN_BUILDINGS[kind];

// 町の 大きさ（正方形の 1辺）：園の だんかいで ひろがる（2026-10-16 パパ決定「だんかいで 町の 広さが 増える」）。
// 版4（クォータービュー）から たて・よこ とも 2つの だんかいの 合計×2マス、44マスまで
export const townCols = shop => Math.min(44, TOWN_COLS + 2 * ((shop.zoo?.level || 0) + (shop.aqua?.level || 0)));
export const colsOf = town => town.cols || TOWN_COLS;

export function defaultTown() {
  return { version: TOWN_VERSION, items: TOWN_DEFAULT.map(([kind, x, y], i) => ({ id: "t" + (i + 1), kind, x, y })), nextId: TOWN_DEFAULT.length + 1 };
}
// 前の版の町は はじめの ならびに もどす（版3・版4は 2026-10-16。前の町は 1日ほどしか 使っていない）。
// あとから ふえた建物は 前の ならびを こわさず あいている所に足す
export const townOf = shop => {
  let t = shop.town && shop.town.version === TOWN_VERSION ? shop.town : defaultTown();
  t = { ...t, cols: townCols(shop), items: t.items.filter(i => townSpec(i.kind) && !i.kind.startsWith("ex_")) };
  for (const kind of Object.keys(TOWN_BUILDINGS)) {
    if (t.items.some(i => i.kind === kind)) continue;
    const sp = TOWN_BUILDINGS[kind], def = TOWN_DEFAULT.find(d => d[0] === kind);
    const spots = [...(def ? [[def[1], def[2]]] : []), ...Array.from({ length: t.cols * t.cols }, (_, k) => [k % t.cols, Math.floor(k / t.cols)])];
    const at = spots.find(([x, y]) => canPlaceTown(t, x, y, sp.w, sp.h));
    if (at) t = { ...t, items: [...t.items, { id: "b_" + kind, kind, x: at[0], y: at[1] }] };
  }
  return t;
};
// 町に 見える物 ぜんぶ（建物・飾り ＋ 園の 展示）。置けるかを 調べるときは これを使う
export function mapOf(shop) {
  const t = townOf(shop), ex = [];
  for (const f of ["zoo", "aqua"]) for (const e of shop[f]?.exhibits || []) if (e.x != null) ex.push({ id: e.id, kind: "ex_" + e.type, x: e.x, y: e.y, f });
  return { ...t, items: [...t.items, ...ex] };
}

export function canPlaceTown(town, x, y, w, h, skipId = null) {
  if (x < 0 || y < 0 || x + w > colsOf(town) || y + h > colsOf(town)) return false;
  return !town.items.some(it => {
    if (it.id === skipId) return false;
    const s = townSpec(it.kind);
    return x < it.x + s.w && it.x < x + w && y < it.y + s.h && it.y < y + h;
  });
}
export const canPlaceAt = (shop, x, y, w, h, skipId = null) => canPlaceTown(mapOf(shop), x, y, w, h, skipId);

// 動かす（建物・飾り・展示）
export function moveTownItem(shop, id, x, y) {
  const map = mapOf(shop), it = map.items.find(i => i.id === id);
  if (!it) return { shop, ok: false };
  const sp = townSpec(it.kind);
  if (!canPlaceTown(map, x, y, sp.w, sp.h, id)) return { shop, ok: false };
  const s = clone(shop);
  if (it.f) Object.assign(s[it.f].exhibits.find(e => e.id === id), { x, y });
  else { s.town = clone(townOf(shop)); delete s.town.cols; Object.assign(s.town.items.find(i => i.id === id), { x, y }); }
  return { shop: s, ok: true };
}

// 飾りを買って置く（x,y を わたせば そこ。なければ あいている所の 上の左から）
export function buyTownDecor(shop, kind, x = null, y = null) {
  const d = TOWN_DECOR[kind];
  if (!d) return { shop, ok: false, reason: "none" };
  if (shop.money < d.price) return { shop, ok: false, reason: "nomoney" };
  const map = mapOf(shop), town = clone(townOf(shop)), cols = town.cols;
  delete town.cols;
  const spots = x != null ? [[x, y]] : Array.from({ length: cols * cols }, (_, k) => [k % cols, Math.floor(k / cols)]);
  for (const [px, py] of spots) {
    if (!canPlaceTown(map, px, py, d.w, d.h)) continue;
    const id = "t" + town.nextId++;
    town.items.push({ id, kind, x: px, y: py });
    const s = { ...clone(shop), town };
    s.money -= d.price; s.today.expense += d.price;
    return { shop: s, ok: true, id };
  }
  return { shop, ok: false, reason: "noroom" };
}

// 飾りを しまう（建物は しまえない）。半分のお金が もどる（ごほうび・行事の 飾りは 値段0）
export function removeTownDecor(shop, id) {
  const town = clone(townOf(shop)), it = town.items.find(i => i.id === id);
  if (!it || isBuilding(it.kind)) return { shop, ok: false };
  town.items = town.items.filter(i => i !== it);
  delete town.cols;
  const s = { ...clone(shop), town };
  s.money += Math.floor(TOWN_DECOR[it.kind].price / 2);
  return { shop: s, ok: true };
}

const key = (x, y) => x + "," + y;
// せんろ が えき から 町のはし（x=0 か いちばん おく）まで つながっているか
export function railConnected(shop) {
  const town = townOf(shop), st = town.items.find(i => i.kind === "station");
  if (!st) return false;
  const sp = townSpec("station"), rails = new Set(town.items.filter(i => i.kind === "rail").map(i => key(i.x, i.y)));
  const queue = [], seen = new Set();
  for (let x = st.x - 1; x <= st.x + sp.w; x++) for (let y = st.y - 1; y <= st.y + sp.h; y++) {
    const inside = x >= st.x && x < st.x + sp.w && y >= st.y && y < st.y + sp.h, corner = (x < st.x || x >= st.x + sp.w) && (y < st.y || y >= st.y + sp.h);
    if (!inside && !corner && rails.has(key(x, y))) { queue.push([x, y]); seen.add(key(x, y)); }
  }
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === 0 || x === colsOf(town) - 1) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = key(x + dx, y + dy);
      if (rails.has(k) && !seen.has(k)) { seen.add(k); queue.push([x + dx, y + dy]); }
    }
  }
  return false;
}

// お客さんの 歩ける 道（みち・つちの みち・じゃり）で、町の 入口（x=0 の へり）から つながっている マス
const WALK = new Set(["road", "dirt", "gravel"]);
export function roadNet(shop) {
  const town = townOf(shop), roads = new Set(town.items.filter(i => WALK.has(i.kind)).map(i => key(i.x, i.y)));
  const seen = new Set(), queue = [];
  for (const k of roads) if (k.startsWith("0,")) { seen.add(k); queue.push(k); }
  while (queue.length) {
    const [x, y] = queue.shift().split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = key(x + dx, y + dy); if (roads.has(k) && !seen.has(k)) { seen.add(k); queue.push(k); } }
  }
  return seen;
}
// 展示が 入口からの 道に 面しているか（となりの マスに つながった 道がある）。場所の 決まっていない 展示は 面している あつかい
export function exhibitOpen(shop, ex, net = roadNet(shop)) {
  if (ex.x == null) return true;
  const [w, h] = EXHIBIT_SIZE[ex.type];
  for (let x = ex.x - 1; x <= ex.x + w; x++) for (let y = ex.y - 1; y <= ex.y + h; y++) {
    const side = (x === ex.x - 1 || x === ex.x + w) !== (y === ex.y - 1 || y === ex.y + h); // かどは のぞく
    if (side && net.has(key(x, y))) return true;
  }
  return false;
}
// 展示を 置ける 所を さがす（入口からの 道に 面した 所を さきに）
export function findExhibitSpot(shop, type) {
  const [w, h] = EXHIBIT_SIZE[type], map = mapOf(shop), net = roadNet(shop), free = [];
  for (let y = 0; y + h <= map.cols; y++) for (let x = 0; x + w <= map.cols; x++) if (canPlaceTown(map, x, y, w, h)) free.push([x, y]);
  return free.find(([x, y]) => exhibitOpen(shop, { type, x, y }, net)) || free[0] || null;
}

// 町の飾りで ふえる 見学のお客さん（5まで）
export const townAppeal = shop => Math.min(TOWN_APPEAL_MAX, townOf(shop).items.reduce((n, it) => n + (TOWN_DECOR[it.kind]?.appeal || 0), 0));
