// 遊びのルール。Phaser も画面も使わない純粋な関数だけを置く（node --test で確かめるため）。
// どの関数も渡された状態を書き換えず、新しい状態を返す。乱数は rng を引数で受ける。
import { ANIMALS } from "../data/animals.js";
import { PLACES } from "../data/places.js";

export const SLOT_COUNT = 6;
export const MAX_STARS = 3;
const HUNGER_PER_SEC = 1 / 90;   // 満腹から90秒でおなかが空になる
const CLEAN_PER_SEC = 1 / 150;
const DIRTY_CHANCE_PER_SEC = 1 / 60;
export const NEED_BELOW = 0.6;    // これより下がったら吹き出しで知らせる
const MIN_GAIN_FOR_STAR = 0.4;    // 本当に困っていたときのお世話だけ★につながる
export const DEPART_REWARD = 4;

const clone = o => JSON.parse(JSON.stringify(o));

export function newFamily() {
  return { version: 1, settings: { sound: true }, current: null, kids: {}, nextKid: 1 };
}

export function addKid(family, { name, icon, color }) {
  const f = clone(family);
  const id = "k" + f.nextKid++;
  f.kids[id] = { name, icon, color, shop: newShop() };
  if (!f.current) f.current = id;
  return { family: f, id };
}

export function newShop() {
  const places = {};
  for (const [id, p] of Object.entries(PLACES)) places[id] = { name: p.name, sent: [] };
  const shop = { kuri: 3, slots: Array(SLOT_COUNT).fill(null), places, totalSent: 0, playMinutes: 20, played: { date: "", seconds: 0 }, nextId: 1 };
  return putAnimal(shop, 0, "hamster");
}

function putAnimal(shop, slot, kind) {
  const s = clone(shop);
  s.slots[slot] = { id: "a" + s.nextId++, kind, hunger: 0.3, clean: 0.3, dirty: false, stars: 0 };
  return s;
}

export function tick(shop, sec, rng = Math.random) {
  const s = clone(shop);
  for (const a of s.slots) {
    if (!a) continue;
    a.hunger = Math.max(0, a.hunger - HUNGER_PER_SEC * sec);
    a.clean = Math.max(0, a.clean - CLEAN_PER_SEC * sec);
    if (!a.dirty && rng() < DIRTY_CHANCE_PER_SEC * sec) a.dirty = true;
  }
  return s;
}

// その子が今ほしいもの（吹き出しに出す）。満たされていれば空の配列
export function needs(a) {
  if (!a) return [];
  const n = [];
  if (a.hunger < NEED_BELOW) n.push("food");
  if (a.clean < NEED_BELOW) n.push("bath");
  if (a.dirty) n.push("broom");
  return n;
}

export const isReady = a => !!a && a.stars >= MAX_STARS;

// tool: "food" | "bath" | "broom"。result: "star"（★が増えた）| "ok" | "notneeded"
export function care(shop, slot, tool) {
  const a0 = shop.slots[slot];
  if (!a0) return { shop, result: "notneeded" };
  const s = clone(shop), a = s.slots[slot];
  let gain = 0;
  if (tool === "food") { gain = 1 - a.hunger; a.hunger = 1; }
  else if (tool === "bath") { gain = 1 - a.clean; a.clean = 1; }
  else if (tool === "broom") { gain = a.dirty ? 1 : 0; a.dirty = false; }
  if (gain <= 0.001) return { shop, result: "notneeded" };
  // 「満タン」ではなく「ほしいものが全部なくなった」で判定する。お世話の合間にも時間は進むため
  const allGood = needs(a).length === 0;
  if (allGood && gain >= MIN_GAIN_FOR_STAR && a.stars < MAX_STARS) { a.stars += 1; return { shop: s, result: "star" }; }
  return { shop: s, result: "ok" };
}

// ★3つの子と、その子に合う送り先を1組選ぶ。送った数の少ない所を優先する
export function pickRequest(shop, rng = Math.random) {
  const ready = shop.slots.map((a, i) => (isReady(a) ? i : -1)).filter(i => i >= 0);
  if (!ready.length) return null;
  const slot = ready[Math.floor(rng() * ready.length)];
  const dest = ANIMALS[shop.slots[slot].kind].dest;
  const cands = Object.keys(PLACES).filter(id => PLACES[id].kind === dest);
  const least = Math.min(...cands.map(id => shop.places[id].sent.length));
  const pool = cands.filter(id => shop.places[id].sent.length === least);
  return { slot, place: pool[Math.floor(rng() * pool.length)] };
}

export function depart(shop, slot, placeId) {
  const a = shop.slots[slot];
  if (!isReady(a) || !shop.places[placeId]) return { shop, reward: 0 };
  const s = clone(shop);
  s.slots[slot] = null;
  s.places[placeId].sent.push(a.kind);
  s.totalSent += 1;
  s.kuri += DEPART_REWARD;
  return { shop: s, reward: DEPART_REWARD };
}

// おむかえできる動物（すくいの魚は除く）。locked は解放前、afford は今のどんぐりで迎えられるか
export function adoptable(shop) {
  return Object.entries(ANIMALS)
    .filter(([, d]) => !d.scoop)
    .map(([kind, d]) => ({ kind, cost: d.cost, locked: (d.unlockSent || 0) > shop.totalSent, afford: shop.kuri >= d.cost }));
}

export function adopt(shop, slot, kind) {
  const d = ANIMALS[kind];
  const opt = adoptable(shop).find(o => o.kind === kind);
  if (!d || !opt || opt.locked || !opt.afford || shop.slots[slot]) return { shop, ok: false };
  const s = putAnimal(shop, slot, kind);
  s.kuri -= d.cost;
  return { shop: s, ok: true };
}

// すくった魚を空き部屋へ。空きがなければどんぐり1つに替える
export function catchFish(shop, kind) {
  const slot = shop.slots.findIndex(a => !a);
  if (slot < 0) { const s = clone(shop); s.kuri += 1; return { shop: s, slot: -1 }; }
  return { shop: putAnimal(shop, slot, kind), slot };
}

export function renamePlace(shop, placeId, name) {
  if (!shop.places[placeId] || !name.trim()) return shop;
  const s = clone(shop);
  s.places[placeId].name = name.trim();
  return s;
}
