// じぶんの どうぶつえん と すいぞくかん（第3弾 2026-10-16。同じ日の壁打ちで 作り直し。docs/roadmap.md）
// ・どちらも 最初から 町にある。はじめは「おんぼろ」で てんじ2わく。お金で 6だんかいまで 大きくする（LEVELS）
// ・どうぶつえん＝陸の てんじ（ひろば・おおきな ひろば）、すいぞくかん＝水の てんじ（たんすい・かいすい・こおりの いけ）
// ・すいぞくかんが「ちいさな」に なった お祝いに ペンギン2わ（附属書I なので お店では買えない子）
// ・1つの てんじに 1しゅるい（本物の園と同じ）。お世話は 飼育員さん（1ぴき 1日 ZOO_KEEP コイン）
// ・お客さん＝（しゅるい×6 ＋ キラキラ×4 ＋ 数）× だんかいの倍率。赤ちゃんは ここでだけ 生まれる（shop.js の breedDay）
import { species, findPen, whyNoRoom, shineOf, newAnimal, placesFor, priceOf, addPoints } from "./shop.js";
import { ANIMALS } from "../data/animals.js";
import { gameYears, GAME_YEAR_MS } from "./time.js";

export const ZOO_FEE = 2, ZOO_KEEP = 2;
export const FACILITIES = {
  zoo: { name: "どうぶつえん", types: ["land", "big"], icon: "lion" },
  aqua: { name: "すいぞくかん", types: ["fresh", "sea", "cold"], icon: "dolphin" },
};
export const LEVELS = [
  { name: "おんぼろ", slots: 2, k: 1, cost: 0 },
  { name: "ちいさな", slots: 3, k: 1.3, cost: 800 },
  { name: "ふつうの", slots: 4, k: 1.6, cost: 2000 },
  { name: "きれいな", slots: 5, k: 2, cost: 4500 },
  { name: "りっぱな", slots: 6, k: 2.5, cost: 9000 },
  { name: "おおきな", slots: 8, k: 3, cost: 15000 },
];
export const MAX_SLOTS = 8;
export const EXHIBITS = {
  land: { name: "どうぶつの ひろば", cost: 300, cap: 12 },
  big: { name: "おおきな ひろば", cost: 3000, cap: 30 },
  cold: { name: "こおりの いけ", cost: 1500, cap: 14 },
  fresh: { name: "たんすいの すいそう", cost: 500, cap: 48 },
  sea: { name: "かいすいの すいそう", cost: 800, cap: 48 },
};
// すいぞくかんの お客さんの合計が ここまで来たら 届く（大水槽が要る子。DESIGN.md）
export const ZOO_GIFTS = [
  { visitors: 100, kind: "a80" },  // ダンゴウオ
  { visitors: 300, kind: "a76" },  // マンボウ
  { visitors: 800, kind: "a77" },  // イルカ
  { visitors: 2000, kind: "a79" }, // マンタ
  { visitors: 5000, kind: "a78" }, // ジンベエザメ
];

const clone = o => JSON.parse(JSON.stringify(o));
const LAND_TYPE = { cage: "land", big: "big", cold: "cold" };
export const exhibitFor = kind => (ANIMALS[kind] ? LAND_TYPE[ANIMALS[kind].pen] : species(kind).group === "sea" ? "sea" : "fresh");
export const facilityOfType = type => (FACILITIES.zoo.types.includes(type) ? "zoo" : "aqua");
export const facAnimals = (shop, f) => (shop[f] ? shop[f].exhibits.flatMap(e => e.animals) : []);
export const allExhibits = shop => ["zoo", "aqua"].flatMap(f => (shop[f] ? shop[f].exhibits : []));
export const zooAnimals = shop => allExhibits(shop).flatMap(e => e.animals);
const used = ex => ex.animals.reduce((t, a) => t + species(a.kind).space, 0);
const findEx = (s, exId) => { for (const f of ["zoo", "aqua"]) { const ex = s[f]?.exhibits.find(e => e.id === exId); if (ex) return { f, ex }; } return null; };
const findIn = (s, animalId) => { for (const ex of allExhibits(s)) if (ex.animals.some(a => a.id === animalId)) return ex; return null; };
const freeSlot = (fac) => [...Array(LEVELS[fac.level].slots).keys()].find(i => !fac.exhibits.some(e => e.slot === i));

const emptyFac = (prefix, type) => ({ level: 0, nextEx: 2, total: 0, given: 0, gifts: [], exhibits: [{ id: prefix + "1", type, slot: 0, animals: [] }] });
// 新しい お店にも、前の版の記録（1つの どうぶつえん・もん）にも、2つの施設を そろえる（s を書きかえる）
export function ensureFacilities(s) {
  const old = s.zoo && s.zoo.gate !== undefined ? s.zoo : null;
  if (!s.zoo || old) s.zoo = emptyFac("z", "land");
  if (!s.aqua) s.aqua = emptyFac("q", "fresh");
  if (old) { // 前の版：陸の てんじは どうぶつえん、水は すいぞくかんへ。もんの だんかいを 規模に うつす
    s.zoo.exhibits = []; s.aqua.exhibits = [];
    for (const ex of old.exhibits) { const f = facilityOfType(ex.type), fac = s[f]; fac.exhibits.push({ ...ex, id: (f === "zoo" ? "z" : "q") + fac.nextEx++, slot: fac.exhibits.length }); }
    for (const f of ["zoo", "aqua"]) { const fac = s[f]; fac.level = [0, 2, 3, 5][old.gate] || 0; while (LEVELS[fac.level].slots < fac.exhibits.length) fac.level++; }
    Object.assign(s.aqua, { total: old.total || 0, given: old.given || 0, gifts: old.gifts || [] });
  }
  return s;
}

export function buildExhibit(shop, f, type, slot) {
  const fac = shop[f];
  if (!fac || !EXHIBITS[type] || !FACILITIES[f].types.includes(type)) return { shop, ok: false, why: "none" };
  if (slot < 0 || slot >= LEVELS[fac.level].slots || fac.exhibits.some(e => e.slot === slot)) return { shop, ok: false, why: "used" };
  if (shop.money < EXHIBITS[type].cost) return { shop, ok: false, why: "nomoney" };
  const s = clone(shop);
  s.money -= EXHIBITS[type].cost; s.today.expense += EXHIBITS[type].cost;
  s[f].exhibits.push({ id: (f === "zoo" ? "z" : "q") + s[f].nextEx++, type, slot, animals: [] });
  return { shop: s, ok: true };
}

export function removeExhibit(shop, exId) {
  const hit = findEx(shop, exId);
  if (!hit || hit.ex.animals.length) return { shop, ok: false, why: hit ? "notempty" : "none" };
  const s = clone(shop);
  s[hit.f].exhibits = s[hit.f].exhibits.filter(e => e.id !== exId);
  return { shop: s, ok: true };
}

// 大きくする。すいぞくかんが はじめて「ちいさな」に なったら ペンギン2わ（あいた わくに こおりの いけ ごと。なければ おくりもの へ）
export function upgradeFacility(shop, f, now = Date.now()) {
  const fac = shop[f], next = fac && LEVELS[fac.level + 1];
  if (!next) return { shop, ok: false, why: "max" };
  if (shop.money < next.cost) return { shop, ok: false, why: "nomoney" };
  const s = clone(shop);
  s.money -= next.cost; s.today.expense += next.cost; s[f].level += 1;
  let penguins = false;
  if (f === "aqua" && !s.aqua.penguinsGiven) {
    s.aqua.penguinsGiven = true; penguins = true;
    const slot = freeSlot(s.aqua);
    if (slot !== undefined) {
      const ex = { id: "q" + s.aqua.nextEx++, type: "cold", slot, animals: [] };
      ex.animals.push(adultGift(s, "penguin", "m", now), adultGift(s, "penguin", "f", now));
      s.aqua.exhibits.push(ex);
      if (!s.seen.includes("penguin")) s.seen.push("penguin");
    } else s.aqua.gifts.push("penguin", "penguin");
  }
  return { shop: s, ok: true, penguins };
}
// 寄贈の 陸の子は 大人で来る（水の子は 釣れた時点で大人と同じ扱い）
function adultGift(s, kind, sex, now) {
  const a = newAnimal("a" + s.nextId++, kind, ANIMALS[kind] ? now - (ANIMALS[kind].adult + 1) * GAME_YEAR_MS : now, Math.random, now, null, null);
  if (sex) a.sex = sex;
  return { ...a, hunger: 1, clean: 1 };
}

export function canShow(ex, kind) {
  if (exhibitFor(kind) !== ex.type) return "type";
  if (ex.animals.length && ex.animals[0].kind !== kind) return "kind";
  if (used(ex) + species(kind).space > EXHIBITS[ex.type].cap) return "full";
  return "ok";
}

export function toZoo(shop, animalId, exId) {
  const s = clone(shop), hit = findEx(s, exId);
  const pen = s.pens.find(p => p.animals.some(a => a.id === animalId));
  if (!hit || !pen) return { shop, ok: false, why: "none" };
  const a = pen.animals.find(x => x.id === animalId);
  if (a.sick || a.hospitalUntil) return { shop, ok: false, why: "sick" };
  const why = canShow(hit.ex, a.kind);
  if (why !== "ok") return { shop, ok: false, why };
  pen.animals = pen.animals.filter(x => x.id !== animalId);
  hit.ex.animals.push({ ...a, genki: 1 });
  return { shop: s, ok: true };
}

// 売り買いは ペットショップ、園は 見せて育てる所（2026-10-16 パパ決定）。園でしか くらせない子は お店へ出さない
export const zooOnly = kind => kind === "penguin" || species(kind).aquatic?.area === "gift";

export function fromZoo(shop, animalId) {
  const s = clone(shop), ex = findIn(s, animalId);
  if (!ex) return { shop, ok: false, why: "none" };
  const a = ex.animals.find(x => x.id === animalId);
  if (zooOnly(a.kind)) return { shop, ok: false, why: "zooonly" };
  const pi = findPen(s, a.kind);
  if (pi < 0) return { shop, ok: false, why: whyNoRoom(s, a.kind) };
  ex.animals = ex.animals.filter(x => x.id !== animalId);
  s.pens[pi].animals.push({ ...a, hunger: 0.8, clean: 0.8, badHours: 0 });
  return { shop: s, ok: true };
}

export function zooVisitors(shop, f) {
  if (!f) return zooVisitors(shop, "zoo") + zooVisitors(shop, "aqua");
  const all = facAnimals(shop, f);
  if (!all.length) return 0;
  const kinds = new Set(all.map(a => a.kind)).size, shines = all.filter(a => shineOf(a)).length;
  return Math.round((kinds * 6 + shines * 4 + all.length) * LEVELS[shop[f].level].k);
}
export const zooKeepCost = (shop, f) => (f ? facAnimals(shop, f) : zooAnimals(shop)).length * ZOO_KEEP;

// 日付が変わったとき（shop.advance から。s は 書きかえてよい写し）：入園料・お給料・寿命・すいぞくかんからの おくりもの
export function zooDay(s, next) {
  if (!s.zoo || !s.aqua) return;
  let all = 0;
  for (const f of ["zoo", "aqua"]) {
    const fac = s[f], v = zooVisitors(s, f), fee = v * ZOO_FEE, keep = zooKeepCost(s, f);
    s.money += fee - keep; s.today.income += fee; s.earned += fee; s.today.expense += keep;
    fac.yesterday = v; fac.total = (fac.total || 0) + v; all += v;
    for (const ex of fac.exhibits) {
      const stay = [];
      for (const a of ex.animals) {
        if (gameYears(a.born, next) >= species(a.kind).life) s.farm.push({ kind: a.kind, rare: a.rare, shine: a.shine, morph: a.morph, retiredAt: next });
        else stay.push(a);
      }
      ex.animals = stay;
    }
  }
  s.today.zooVisitors = all;
  const q = s.aqua;
  while ((q.given || 0) < ZOO_GIFTS.length && q.total >= ZOO_GIFTS[q.given || 0].visitors) { q.gifts.push(ZOO_GIFTS[q.given || 0].kind); q.given = (q.given || 0) + 1; }
}

// 届いた子を てんじに入れる（すいぞくかん）。入れたら 図鑑にのる（もらった＝自分で手に入れた子）
export function claimZooGift(shop, idx, exId, now, rng = Math.random) {
  const kind = shop.aqua?.gifts?.[idx], hit = findEx(shop, exId);
  if (!kind || !hit) return { shop, ok: false, why: "none" };
  const why = canShow(hit.ex, kind);
  if (why !== "ok") return { shop, ok: false, why };
  const s = clone(shop), e = findEx(s, exId).ex;
  e.animals.push(ANIMALS[kind] ? adultGift(s, kind, null, now) : newAnimal("a" + s.nextId++, kind, now, rng, now, null, null));
  s.aqua.gifts.splice(idx, 1);
  if (!s.seen.includes(kind)) s.seen.push(kind);
  return { shop: s, ok: true };
}

export function setExhibitBreed(shop, exId, on) {
  const s = clone(shop), hit = findEx(s, exId);
  if (!hit) return { shop, ok: false };
  hit.ex.breed = !!on;
  return { shop: s, ok: true };
}

// 園の子を ほかの 園・すいぞくかんへ ゆずる（お金は もらわない。こうけん が 売るときの半分）。
export function giveAway(shop, animalId, placeId, now) {
  const ex0 = findIn(shop, animalId);
  if (!ex0 || !shop.places[placeId]) return { shop, ok: false, why: "none" };
  const a = ex0.animals.find(x => x.id === animalId);
  if (!placesFor(a.kind).includes(placeId)) return { shop, ok: false, why: "place" };
  const s = clone(shop), e = findIn(s, animalId);
  e.animals = e.animals.filter(x => x.id !== animalId);
  s.places[placeId].sent.push(a.kind);
  const points = Math.max(1, Math.floor(priceOf(a, now) / 200));
  return { shop: s, ok: true, points, gifts: addPoints(s, placeId, points) };
}
