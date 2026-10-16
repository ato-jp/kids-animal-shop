// 第3弾：じぶんの どうぶつえん・すいぞくかん（2026-10-16。Claude が決めた。docs/roadmap.md A5）
// ・お店レベル ZOO_LEVEL で「どうぶつえんの とち」が買える。開いた日に すいぞくかんから ペンギン2わの お祝い（附属書I なので お店では買えない子）
// ・てんじ（展示）は 8わく。1つの てんじに 1しゅるい（本物の園と同じ）。お店の子を つれて来て 見せる
// ・お世話は 飼育員さん（1ぴき 1日 ZOO_KEEP コイン）。おなかや そうじは 気にしなくてよい
// ・お客さん＝（しゅるい×6 ＋ キラキラ×4 ＋ 数）×もん の倍率。壁打ちの「動物園では 外観が客足に大きく効く」を もんで表す
import { species, findPen, whyNoRoom, shineOf, newAnimal } from "./shop.js";
import { ANIMALS } from "../data/animals.js";
import { gameYears, GAME_YEAR_MS } from "./time.js";

export const ZOO_LEVEL = 2, ZOO_LAND_COST = 2000, ZOO_SLOTS = 8, ZOO_FEE = 2, ZOO_KEEP = 2;
export const EXHIBITS = {
  land: { name: "どうぶつの ひろば", cost: 300, cap: 12 },
  big: { name: "おおきな ひろば", cost: 3000, cap: 30 },
  cold: { name: "こおりの いけ", cost: 1500, cap: 14 },
  fresh: { name: "たんすいの おおすいそう", cost: 500, cap: 48 },
  sea: { name: "かいすいの おおすいそう", cost: 800, cap: 48 },
};
export const GATES = [
  { name: "ちいさな いりぐち", cost: 0, k: 1 },
  { name: "きれいな もん", cost: 1500, k: 1.5 },
  { name: "りっぱな もん", cost: 6000, k: 2.2 },
  { name: "おしろの もん", cost: 15000, k: 3 },
];

// お客さんの合計が ここまで来たら すいぞくかんから 届く（大水槽が要る子は 第3弾から。DESIGN.md）
export const ZOO_GIFTS = [
  { visitors: 100, kind: "a80" },  // ダンゴウオ
  { visitors: 300, kind: "a76" },  // マンボウ
  { visitors: 800, kind: "a77" },  // イルカ
  { visitors: 2000, kind: "a79" }, // マンタ
  { visitors: 5000, kind: "a78" }, // ジンベエザメ
];

const clone = o => JSON.parse(JSON.stringify(o));
const LAND_TYPE = { cage: "land", big: "big", cold: "cold" };
// その生き物を 見せられる てんじの種類
export const exhibitFor = kind => (ANIMALS[kind] ? LAND_TYPE[ANIMALS[kind].pen] : species(kind).group === "sea" ? "sea" : "fresh");
export const zooAnimals = shop => (shop.zoo ? shop.zoo.exhibits.flatMap(e => e.animals) : []);
const used = ex => ex.animals.reduce((t, a) => t + species(a.kind).space, 0);

export function openZoo(shop, now) {
  if (shop.zoo) return { shop, ok: false, why: "open" };
  if (shop.money < ZOO_LAND_COST) return { shop, ok: false, why: "nomoney" };
  const s = clone(shop);
  s.money -= ZOO_LAND_COST; s.today.expense += ZOO_LAND_COST;
  const born = now - 3 * GAME_YEAR_MS; // ゲームで3さい（大人）
  const peng = sex => ({ id: "a" + s.nextId++, kind: "penguin", born, arrived: now, sex, rare: false, shine: null, morph: null,
    hunger: 1, clean: 1, genki: 1, natsuki: 0.5, sick: false, badHours: 0, hungryToday: false, hospitalUntil: null });
  s.zoo = { openedAt: now, gate: 0, nextEx: 2, exhibits: [{ id: "e1", type: "cold", slot: 0, animals: [peng("m"), peng("f")] }] };
  if (!s.seen.includes("penguin")) s.seen.push("penguin"); // すいぞくかんから もらった＝自分で手に入れた子
  return { shop: s, ok: true };
}

export function buildExhibit(shop, type, slot) {
  const z = shop.zoo;
  if (!z || !EXHIBITS[type]) return { shop, ok: false, why: "none" };
  if (slot < 0 || slot >= ZOO_SLOTS || z.exhibits.some(e => e.slot === slot)) return { shop, ok: false, why: "used" };
  if (shop.money < EXHIBITS[type].cost) return { shop, ok: false, why: "nomoney" };
  const s = clone(shop);
  s.money -= EXHIBITS[type].cost; s.today.expense += EXHIBITS[type].cost;
  s.zoo.exhibits.push({ id: "e" + s.zoo.nextEx++, type, slot, animals: [] });
  return { shop: s, ok: true };
}

// 空の てんじは こわせる（お金は もどらない）
export function removeExhibit(shop, exId) {
  const ex = shop.zoo?.exhibits.find(e => e.id === exId);
  if (!ex || ex.animals.length) return { shop, ok: false, why: ex ? "notempty" : "none" };
  const s = clone(shop);
  s.zoo.exhibits = s.zoo.exhibits.filter(e => e.id !== exId);
  return { shop: s, ok: true };
}

// "ok" | "type"（この てんじでは くらせない）| "kind"（ほかの しゅるいが いる）| "full"
export function canShow(ex, kind) {
  if (exhibitFor(kind) !== ex.type) return "type";
  if (ex.animals.length && ex.animals[0].kind !== kind) return "kind";
  if (used(ex) + species(kind).space > EXHIBITS[ex.type].cap) return "full";
  return "ok";
}

// お店の子を てんじへ。病気・入院中の子は つれて行けない
export function toZoo(shop, animalId, exId) {
  const s = clone(shop), ex = s.zoo?.exhibits.find(e => e.id === exId);
  const pen = s.pens.find(p => p.animals.some(a => a.id === animalId));
  if (!ex || !pen) return { shop, ok: false, why: "none" };
  const a = pen.animals.find(x => x.id === animalId);
  if (a.sick || a.hospitalUntil) return { shop, ok: false, why: "sick" };
  const why = canShow(ex, a.kind);
  if (why !== "ok") return { shop, ok: false, why };
  pen.animals = pen.animals.filter(x => x.id !== animalId);
  ex.animals.push({ ...a, genki: 1 });
  return { shop: s, ok: true };
}

// 売り買いは ペットショップ、どうぶつえんは 見せて育てる所（2026-10-16 パパ決定）。
// 園でしか くらせない子（ペンギン＝附属書I、すいぞくかんからの おくりもの）は お店へ出さない
export const zooOnly = kind => kind === "penguin" || species(kind).aquatic?.area === "gift";

// てんじの子を お店へ もどす（入る柵や水槽が あれば）
export function fromZoo(shop, animalId) {
  const s = clone(shop), ex = s.zoo?.exhibits.find(e => e.animals.some(a => a.id === animalId));
  if (!ex) return { shop, ok: false, why: "none" };
  const a = ex.animals.find(x => x.id === animalId);
  if (zooOnly(a.kind)) return { shop, ok: false, why: "zooonly" };
  const pi = findPen(s, a.kind);
  if (pi < 0) return { shop, ok: false, why: whyNoRoom(s, a.kind) };
  ex.animals = ex.animals.filter(x => x.id !== animalId);
  s.pens[pi].animals.push({ ...a, hunger: 0.8, clean: 0.8, badHours: 0 });
  return { shop: s, ok: true };
}

export function upgradeGate(shop) {
  const z = shop.zoo, next = z && GATES[z.gate + 1];
  if (!next) return { shop, ok: false, why: "max" };
  if (shop.money < next.cost) return { shop, ok: false, why: "nomoney" };
  const s = clone(shop);
  s.money -= next.cost; s.today.expense += next.cost; s.zoo.gate += 1;
  return { shop: s, ok: true };
}

export function zooVisitors(shop) {
  const all = zooAnimals(shop);
  if (!all.length) return 0;
  const kinds = new Set(all.map(a => a.kind)).size, shines = all.filter(a => shineOf(a)).length;
  return Math.round((kinds * 6 + shines * 4 + all.length) * GATES[shop.zoo.gate].k);
}
export const zooKeepCost = shop => zooAnimals(shop).length * ZOO_KEEP;

// 日付が変わったとき（shop.advance から呼ぶ。s は 書きかえてよい写し）：入園料・飼育員さんの お給料・寿命
export function zooDay(s, next) {
  if (!s.zoo) return;
  const v = zooVisitors(s), fee = v * ZOO_FEE, keep = zooKeepCost(s);
  s.money += fee - keep; s.today.income += fee; s.earned += fee; s.today.expense += keep;
  s.today.zooVisitors = v;
  const z = s.zoo;
  z.total = (z.total || 0) + v;
  z.gifts = z.gifts || [];
  while ((z.given || 0) < ZOO_GIFTS.length && z.total >= ZOO_GIFTS[z.given || 0].visitors) { z.gifts.push(ZOO_GIFTS[z.given || 0].kind); z.given = (z.given || 0) + 1; }
  for (const ex of s.zoo.exhibits) {
    const stay = [];
    for (const a of ex.animals) {
      if (gameYears(a.born, next) >= species(a.kind).life) s.farm.push({ kind: a.kind, rare: a.rare, shine: a.shine, morph: a.morph, retiredAt: next });
      else stay.push(a);
    }
    ex.animals = stay;
  }
}

// 届いた子を てんじに 入れる（かいすいの おおすいそう が要る）。入れたら 図鑑にのる（もらった＝自分で手に入れた子）
export function claimZooGift(shop, idx, exId, now, rng = Math.random) {
  const kind = shop.zoo?.gifts?.[idx], ex = shop.zoo?.exhibits.find(e => e.id === exId);
  if (!kind || !ex) return { shop, ok: false, why: "none" };
  const why = canShow(ex, kind);
  if (why !== "ok") return { shop, ok: false, why };
  const s = clone(shop), e = s.zoo.exhibits.find(x => x.id === exId);
  e.animals.push(newAnimal("a" + s.nextId++, kind, now, rng, now, null, null));
  s.zoo.gifts.splice(idx, 1);
  if (!s.seen.includes(kind)) s.seen.push(kind);
  return { shop: s, ok: true };
}
