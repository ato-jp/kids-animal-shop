// 自分の町（箱庭）のルール。画面から切りはなした純粋な計算（記録は shop.town に持つ）。
// 置いてある物は { id, kind, x, y }。kind は TOWN_BUILDINGS か TOWN_DECOR の名前。重なる所・はみ出す所には置けない。
import { TOWN_COLS, TOWN_ROWS, TOWN_BUILDINGS, TOWN_DECOR, TOWN_DEFAULT, TOWN_APPEAL_MAX, TOWN_VERSION } from "../data/town.js";

const clone = o => JSON.parse(JSON.stringify(o));
export const townSpec = kind => TOWN_BUILDINGS[kind] || TOWN_DECOR[kind];
export const isBuilding = kind => !!TOWN_BUILDINGS[kind];

// 町の よこはば。2026-10-16「右へ 広げる」：お金で 10マスずつ（TOWN_EXPAND）。前の町は 20マス
export const colsOf = town => town.cols || TOWN_COLS;
export const TOWN_EXPAND = [{ cols: 30, cost: 3000 }, { cols: 40, cost: 8000 }];
export function expandTown(shop) {
  const town = clone(townOf(shop)), next = TOWN_EXPAND.find(e => e.cols > colsOf(town));
  if (!next) return { shop, ok: false, why: "max" };
  if (shop.money < next.cost) return { shop, ok: false, why: "nomoney" };
  town.cols = next.cols;
  const s = { ...clone(shop), town };
  s.money -= next.cost; s.today.expense += next.cost;
  return { shop: s, ok: true, cols: next.cols };
}

export function defaultTown() {
  return { version: TOWN_VERSION, items: TOWN_DEFAULT.map(([kind, x, y], i) => ({ id: "t" + (i + 1), kind, x, y })), nextId: TOWN_DEFAULT.length + 1 };
}
// 前の版の記録には町がない／並びが古いときは はじめの ならび（2026-10-16 見下ろしに作り直した。古い並びは 半日しか使っていない）
// 「となりまち」の看板は 2026-10-16 に なくした（せんろ で えき から行く）。前の記録に残っていたら のぞく
// あとから ふえた建物（2026-10-16 すいぞくかん）は、前の町の ならびを こわさず あいている所に足す（はじめの場所が あいていれば そこ）
export const townOf = shop => {
  let t = shop.town && shop.town.version === TOWN_VERSION ? shop.town : defaultTown();
  if (t.items.some(i => !townSpec(i.kind))) t = { ...t, items: t.items.filter(i => townSpec(i.kind)) };
  for (const kind of Object.keys(TOWN_BUILDINGS)) {
    if (t.items.some(i => i.kind === kind)) continue;
    const sp = TOWN_BUILDINGS[kind], def = TOWN_DEFAULT.find(d => d[0] === kind);
    const cols = colsOf(t), spots = [...(def ? [[def[1], def[2]]] : []), ...Array.from({ length: cols * TOWN_ROWS }, (_, k) => [k % cols, Math.floor(k / cols)])];
    const at = spots.find(([x, y]) => canPlaceTown(t, x, y, sp.w, sp.h));
    if (at) t = { ...t, items: [...t.items, { id: "b_" + kind, kind, x: at[0], y: at[1] }] };
  }
  return t;
};

// せんろ が えき から 町のはし（左か右）まで つながっているか。えき に となりあう せんろ から、となりあう せんろ を たどる
export function railConnected(shop) {
  const town = townOf(shop), st = town.items.find(i => i.kind === "station");
  if (!st) return false;
  const sp = townSpec("station"), rails = new Set(town.items.filter(i => i.kind === "rail").map(i => i.x + "," + i.y));
  const queue = [], seen = new Set();
  for (let x = st.x - 1; x <= st.x + sp.w; x++) for (let y = st.y - 1; y <= st.y + sp.h; y++) {
    const inside = x >= st.x && x < st.x + sp.w && y >= st.y && y < st.y + sp.h, corner = (x < st.x || x >= st.x + sp.w) && (y < st.y || y >= st.y + sp.h);
    if (!inside && !corner && rails.has(x + "," + y)) { queue.push([x, y]); seen.add(x + "," + y); }
  }
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === 0 || x === colsOf(town) - 1) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = x + dx + "," + (y + dy);
      if (rails.has(k) && !seen.has(k)) { seen.add(k); queue.push([x + dx, y + dy]); }
    }
  }
  return false;
}

export function canPlaceTown(town, x, y, w, h, skipId = null) {
  if (x < 0 || y < 0 || x + w > colsOf(town) || y + h > TOWN_ROWS) return false;
  return !town.items.some(it => {
    if (it.id === skipId) return false;
    const s = townSpec(it.kind);
    return x < it.x + s.w && it.x < x + w && y < it.y + s.h && it.y < y + h;
  });
}

export function moveTownItem(shop, id, x, y) {
  const town = clone(townOf(shop)), it = town.items.find(i => i.id === id);
  if (!it) return { shop, ok: false };
  const sp = townSpec(it.kind);
  if (!canPlaceTown(town, x, y, sp.w, sp.h, id)) return { shop, ok: false };
  Object.assign(it, { x, y });
  return { shop: { ...clone(shop), town }, ok: true };
}

// 飾りを買って、あいている所（上の左から）に置く
export function buyTownDecor(shop, kind) {
  const d = TOWN_DECOR[kind];
  if (!d) return { shop, ok: false, reason: "none" };
  if (shop.money < d.price) return { shop, ok: false, reason: "nomoney" };
  const town = clone(townOf(shop));
  for (let y = 0; y + d.h <= TOWN_ROWS; y++) for (let x = 0; x + d.w <= colsOf(town); x++) {
    if (!canPlaceTown(town, x, y, d.w, d.h)) continue;
    const id = "t" + town.nextId++;
    town.items.push({ id, kind, x, y });
    const s = { ...clone(shop), town };
    s.money -= d.price; s.today.expense += d.price;
    return { shop: s, ok: true, id };
  }
  return { shop, ok: false, reason: "noroom" };
}

// 飾りを しまう（建物は しまえない）。半分のお金が もどる
export function removeTownDecor(shop, id) {
  const town = clone(townOf(shop)), it = town.items.find(i => i.id === id);
  if (!it || isBuilding(it.kind)) return { shop, ok: false };
  town.items = town.items.filter(i => i !== it);
  const s = { ...clone(shop), town }; // ごほうびの飾りは 値段0なので 何も もどらない（また ずかん から 置ける）
  s.money += Math.floor(TOWN_DECOR[it.kind].price / 2);
  return { shop: s, ok: true };
}

// 町の飾りで ふえる 見学のお客さん（5まで）
export const townAppeal = shop => Math.min(TOWN_APPEAL_MAX, townOf(shop).items.reduce((n, it) => n + (TOWN_DECOR[it.kind]?.appeal || 0), 0));
