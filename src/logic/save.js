// セーブの形の移し替え（純粋な関数）。読み書きそのものは store.js（IndexedDB）が受けもつ。
// 形を変えたら VERSION を上げ、migrate に「古い形 → 新しい形」を足す。古いセーブは捨てない。
// 版の歴史：1＝4〜6歳向け／2＝お金と部屋（公開した）／3＝柵のレベル（公開していない）／4＝第1弾（現実の時計）
import { newPen } from "./legacy.js";
import { newAnimal, newShop, START_MONEY, ensureStarterTank } from "./shop.js";
import { ANIMALS } from "../data/animals.js";
import { AQUATIC } from "../data/aquatic.js";
import { PLACES } from "../data/places.js";
import { DECOR, DEFAULT_DECOR } from "../data/decor.js";
import { FOOTPRINT } from "../data/pens.js";
import { HOUR, floorHour, dateKey } from "./time.js";

export const KEY = "kas.save";
export const VERSION = 4;

export function newFamily() {
  return { version: VERSION, settings: { sound: true, bgm: true }, current: null, kids: {}, nextKid: 1 };
}

// ---- 1 → 2 ----
const V1_ROOM = { hamster: "cage", rabbit: "cage", dog: "cage", cat: "cage", penguin: "cold", lion: "big", tropical: "tank", fish: "tank", blowfish: "tank" };
function shopV1toV2(old) {
  const defaults = ["cage", "cage", "cage", "tank", "tank", null];
  const seen = new Set(Object.values(old.places).flatMap(p => p.sent));
  const rooms = old.slots.map((a, i) => {
    if (!a) return { type: defaults[i], animal: null };
    seen.add(a.kind);
    return { type: V1_ROOM[a.kind], animal: { id: a.id, kind: a.kind, hunger: a.hunger, clean: a.clean, dirty: a.dirty, genki: 1, sick: false, stars: a.stars } };
  });
  return {
    money: 1000 + old.kuri * 100, rooms, stock: { sunflower: 5, shrimp: 10 },
    places: old.places, totalSent: old.totalSent, seen: [...seen],
    playMinutes: old.playMinutes, played: old.played,
    day: { n: 1, sec: 0, log: { care: 0, sent: 0, income: 0, expense: 0 } }, nextId: old.nextId,
  };
}

// ---- 2 → 3 ----
const V2_SIZE = { hamster: 1, rabbit: 1, penguin: 1, cat: 2, dog: 2, lion: 2, elephant: 3 };
function shopV2toV3(old) {
  const kindOf = k => (k === "fish" ? "aji" : k);
  const pens = old.rooms.map(r => {
    const p = newPen(r.type || null);
    if (r.animal) {
      const { dirty, ...a } = r.animal;
      p.animals.push({ ...a, kind: kindOf(a.kind) });
      p.dirty = !!dirty;
      p.level = Math.max(1, V2_SIZE[kindOf(a.kind)] || 1);
    }
    return p;
  });
  const places = {};
  for (const [id, p] of Object.entries(old.places)) places[id] = { name: p.name, sent: p.sent.map(kindOf), points: 0, rewarded: 0 };
  return {
    money: old.money, pens, stock: old.stock, baits: { worm: 10 }, rods: ["basic"],
    decor: { wall: "wood", sign: "plain", awning: "none" }, gifts: [], places, totalSent: old.totalSent,
    seen: [...new Set(old.seen.map(kindOf))], playMinutes: old.playMinutes, played: old.played, nextId: old.nextId,
  };
}

// ---- 3 → 4（第1弾）----
// 版3までの生き物の名前 → 第1弾の生き物（水の生き物は名前で探す）
const AQ_BY_NAME = Object.fromEntries(AQUATIC.map(a => [a.name.split("（")[0], a.id]));
const OLD_KIND = { aji: "アジ", tropical: "チョウチョウウオ", blowfish: "フグ", fish: "アジ", funa: "フナ", medaka: "メダカ", koi: "コイ" };
const OLD_FOOD = { sunflower: "hamsterfood", carrot: "rabbitfood", canned: "catfood", bone: "dogfood", fish: "fishfood", meat: "meat", leafy: "hay", shrimp: "pellet" };
const kindV4 = k => (ANIMALS[k] ? k : AQ_BY_NAME[OLD_KIND[k]] || null);
const priceV4 = k => (ANIMALS[k] ? ANIMALS[k].price : AQUATIC.find(a => a.id === k)?.price || 0);

// 柵を 8×5 の床に左上から詰めて並べる（入りきらない柵は動物ごと残すため、床を広げた扱いにする）
function layout(pens) {
  let x = 0, y = 0, rowH = 0, size = 0;
  const W = [8, 12, 16], H = [5, 6, 7];
  for (const p of pens) {
    const [w, h] = FOOTPRINT[p.level];
    if (x + w > W[size]) { x = 0; y += rowH; rowH = 0; }
    while (y + h > H[size] && size < 2) size++;
    p.x = x; p.y = y; x += w; rowH = Math.max(rowH, h);
  }
  return size;
}

function shopV3toV4(old, now) {
  const born = now - 0.5 * (365.25 / 3) * 24 * HOUR; // 年齢の記録がないので、みんな「若い大人」として迎え直す
  let n = old.nextId || 1;
  const pens = old.pens.filter(p => p.type).map(p => ({
    id: "p" + n++, type: p.type, level: p.level || 1, x: 0, y: 0, dirty: !!p.dirty,
    animals: p.animals.map(a => ({ ...a, kind: kindV4(a.kind) })).filter(a => a.kind).map(a => ({
      ...newAnimal(a.id, a.kind, born, () => 0.99), hunger: a.hunger ?? 0.6, clean: a.clean ?? 0.8, genki: a.genki ?? 1, sick: !!a.sick,
    })),
  }));
  const size = layout(pens);
  const stock = {};
  for (const [k, v] of Object.entries(old.stock || {})) if (OLD_FOOD[k]) stock[OLD_FOOD[k]] = (stock[OLD_FOOD[k]] || 0) + v;
  const places = {};
  for (const id of Object.keys(PLACES)) {
    const p = old.places[id] || { name: PLACES[id].name, sent: [] };
    const sent = p.sent.map(kindV4).filter(Boolean);
    places[id] = { name: p.name, sent, points: sent.reduce((t, k) => t + Math.floor(priceV4(k) / 100), 0), rewarded: 0 };
  }
  return {
    startedAt: now, lastTick: floorHour(now), size,
    money: START_MONEY + Math.round((old.money || 0) / 10), // 版2の「えん」を コインへ（現実の値段にそろえて10倍、100円＝1コインで1/100）＋始めのお金
    pens, items: [], decor: { ...DEFAULT_DECOR }, owned: Object.fromEntries(Object.keys(DECOR).map(k => [k, [DEFAULT_DECOR[k]]])),
    stock, baits: old.baits || { worm: 10 }, rods: old.rods || ["basic"],
    places, gifts: [], farm: [], seen: [...new Set((old.seen || []).map(kindV4).filter(Boolean))], earned: 0, nextId: n,
    today: { date: dateKey(now), care: 0, sold: 0, income: 0, expense: 0, fish: 0, visitors: 0 }, yesterday: null,
  };
}

export function migrate(data, now = Date.now()) {
  if (!data || typeof data !== "object" || typeof data.version !== "number") throw new Error("セーブの形が違う");
  if (data.version > VERSION) throw new Error("新しい版のセーブ");
  const steps = [null, shopV1toV2, shopV2toV3, s => shopV3toV4(s, now)];
  while (data.version < VERSION) {
    for (const k of Object.values(data.kids)) k.shop = steps[data.version](k.shop);
    data.version += 1;
  }
  data.settings = { sound: true, bgm: true, ...data.settings };
  return data;
}

// 文字列 → 家族の記録。読めなければ broken に元の文字列を返す（消さずに退避するため）
export function parse(raw, now = Date.now()) {
  if (!raw) return { family: newFamily(), broken: null };
  try {
    const family = migrate(JSON.parse(raw), now);
    for (const k of Object.values(family.kids)) k.shop = ensureStarterTank(k.shop); // 2026-10-16：水槽がないと釣りに行けなくなったため
    return { family, broken: null };
  }
  catch (e) { return { family: newFamily(), broken: raw }; }
}
export const serialize = family => JSON.stringify(family);

// 子どもを足す（お店ごと）。写真はあとから おとなの設定で入れる
export function addKid(family, { name, icon, color }, now) {
  const f = JSON.parse(JSON.stringify(family));
  const id = "k" + f.nextKid++;
  f.kids[id] = { name, icon, color, photo: null, shop: newShop(now) };
  if (!f.current) f.current = id;
  return { family: f, id };
}
