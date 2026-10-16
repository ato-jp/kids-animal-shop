// お店のルール（第1弾）。Phaser も画面も使わない純粋な関数だけ（node --test で確かめる）。
// どの関数も渡された状態を書き換えず、新しい状態を返す。時刻 now（ミリ秒）と乱数は引数で受ける。
// 時間は現実の時計で進む。閉じていた間は advance() が「1時間ずつ区切って」まとめて進める
// （区切りを時計の正時にそろえ、汚れなどの起こる・起こらないを (場所, 何時間目) から決めるので、
//  何回に分けて進めても結果が同じになる）。
import { ANIMALS } from "../data/animals.js";
import { AQUATIC } from "../data/aquatic.js";
import { FOODS, AQUATIC_FOOD } from "../data/foods.js";
import { PENS, MAX_LEVEL, FOOTPRINT, GENKI_DOWN_RATE, GENKI_UP_RATE, CAPACITY, SHOP_SIZES } from "../data/pens.js";
import { FURNITURE } from "../data/furniture.js";
import { zooDay } from "./zoo.js";
import { DECOR, DEFAULT_DECOR, VISITOR_SPEND } from "../data/decor.js";
import { SHINES, SHINE_IDS } from "../data/shine.js";
import { marketRate } from "./rate.js";
import { townAppeal } from "./town.js";
import { rollMorph, inherit, morphName, morphPaint } from "./breed.js";
import { BREEDS } from "../data/morphs.js";
import { PLACES } from "../data/places.js";
import { REWARDS } from "../data/rewards.js";
import { AREAS, BAITS, RODS, BASE_WEIGHT, STAGE_OF, ZONE_OF } from "../data/fish.js";
import { HOUR, floorHour, dateKey, gameYears, gameDays, nextMorning, season } from "./time.js";
import { hash } from "./rng.js";

// お金の単位は コイン（100円＝1コイン）。値段は現実の円を調べて100で割った
export const START_MONEY = 3000;
export const VET_COST = { small: 50, pet: 180, big: 500 };
const HUNGER_PER_HOUR = 1 / 24;     // 約24時間で空腹（docs/brainstorm-v3.md）
const CLEAN_PER_HOUR = 1 / 48;      // 約48時間で よごれる
const DIRTY_CHANCE_PER_HOUR = 1 / 24; // そうじ（汚れ）は1日に1回ほど
const BAD_BELOW = 0.3;
export const NEED_BELOW = 0.5;
const GRACE_HOURS = 12;             // 困った状態が12時間を超えると げんきが下がり始める
const GENKI_DOWN_PER_HOUR = 1 / 36; // → 丸1日あまり放っておくと病気（12 + 0.8×36 ≒ 41時間）
const GENKI_UP_PER_HOUR = 1 / 48;
export const SICK_BELOW = 0.2;
const RARE_CHANCE = 0.01;           // めずらしい色は100匹に1匹
// お店に来てから売れるまで（現実の日数）。買ってすぐ売るだけでお金が増える穴をふさぐ。毎日の世話が値段につながる
export const SETTLE_DAYS = 3;
// いちばで生き物を買う値段＝一番高い売値の1.5倍。買って育てて売っても少し損をする（めずらしい色だけ別）
export const MARKET_MARKUP = 1.5;
const MAX_CATCHUP_HOURS = 24 * 120; // これ以上 前のことは計算しない（時計の狂い対策。現実の4か月）

const clone = o => JSON.parse(JSON.stringify(o));
const DAY_MS = 24 * 60 * 60 * 1000;
const AQ = Object.fromEntries(AQUATIC.map(a => [a.id, a]));
// 水の生き物の広さ：要る水槽の大きさから（1＝メダカくらい、3＝ブリくらい、9＝大水槽）
const AQ_SPACE = { 1: 1, 2: 3, 3: 8, 9: 48 };

// ---- 生き物の情報（陸と水をまとめて引く） ----
export function species(kind) {
  if (ANIMALS[kind]) {
    const d = ANIMALS[kind];
    return { ...d, kind, cost: d.cost == null ? null : Math.round(d.price * MARKET_MARKUP), water: PENS[d.pen].water };
  }
  const a = AQ[kind];
  if (!a) return null;
  return { kind, name: a.name, food: AQUATIC_FOOD, pen: "tank", size: Math.min(a.tank, 3), market: "aqua",
    space: AQ_SPACE[a.tank], group: a.water,
    cost: a.area === "market" ? Math.round(a.price * MARKET_MARKUP) : null, price: a.price, life: a.life, adult: 0, old: a.life * 0.75,
    sellFromDays: 0, water: true, fact: a.fact, noSale: a.noSale, releaseOnly: a.releaseOnly, endangered: a.endangered, aquatic: a };
}

export function newAnimal(id, kind, born, rng = Math.random, arrived = born, shine, morph) {
  // 水の生き物は キラキラのくじ（shine を渡せば それ）。陸の動物は 前からの めずらしい色（1/100）
  const aq = !ANIMALS[kind];
  const c = shine !== undefined ? shine : aq ? rollShine(rng) : null;
  const mo = morph !== undefined ? morph : rollMorph(kind, rng); // 色変わり（data/morphs.js。無い生き物は null）
  return { id, kind, born, arrived, sex: rng() < 0.5 ? "m" : "f", rare: aq ? false : rng() < RARE_CHANCE, shine: c, morph: mo,
    hunger: 0.6, clean: 0.8, genki: 1, natsuki: 0.3, sick: false, badHours: 0, hungryToday: false, hospitalUntil: null };
}

// ---- お店 ----
export function newShop(now, rng = Math.random) {
  const places = {};
  for (const [id, p] of Object.entries(PLACES)) places[id] = { name: p.name, sent: [], points: 0, rewarded: 0 };
  const shop = {
    startedAt: now, lastTick: floorHour(now), size: 0,
    money: START_MONEY,
    // はじめから 空の水槽を1つ（水槽に空きがないと 釣りに行けないため。2026-10-16）
    pens: [{ id: "p1", type: "cage", level: 1, x: 1, y: 1, dirty: false, animals: [] }, { id: "p_tank1", type: "tank", level: 1, x: 4, y: 3, dirty: false, animals: [], water: "fresh" }],
    items: [{ id: "i1", kind: "plant", x: 6, y: 0 }],
    decor: { ...DEFAULT_DECOR }, owned: Object.fromEntries(Object.keys(DECOR).map(k => [k, [DEFAULT_DECOR[k]]])),
    stock: { hamsterfood: 10, pellet: 10 }, baits: { worm: 10 }, rods: ["basic"],
    places, gifts: [], farm: [], seen: [], earned: 0, nextId: 2,
    today: { date: dateKey(now), care: 0, sold: 0, income: 0, expense: 0, fish: 0, visitors: 0 },
    yesterday: null,
  };
  // 最初の1匹：大人になりかけのハムスター（ゲームで生後1か月ほど）
  return putAnimal(shop, 0, "hamster", now - (1 / 12) * (4 / 12) * 365.25 * 24 * HOUR, rng);
}

function putAnimal(shop, penIdx, kind, born, rng = Math.random, arrived = born, shine) {
  const s = clone(shop);
  const a = newAnimal("a" + s.nextId++, kind, born, rng, arrived, shine);
  s.pens[penIdx].animals.push(a);
  return s;
}

// 図鑑に のせる：自分で手に入れたとき（釣った・寄贈を受けとった。第2弾では 自分の店で生まれた）だけ。
// いちばや ほかの子の お店から 買ったときは のせない（2026-10-15 決定）
function record(s, kind, shine) {
  if (!s.seen.includes(kind)) s.seen.push(kind);
  if (species(kind).aquatic) noteShine(s, kind, shine);
}

const spend = (s, coins) => { s.money -= coins; s.today.expense += coins; };
const earn = (s, coins) => { s.money += coins; s.today.income += coins; s.earned += coins; };

// ---- 成長と値段 ----
export function stage(a, now) {
  const d = species(a.kind), y = gameYears(a.born, now);
  if (d.aquatic) return y >= d.old ? "old" : "adult";
  if (y >= d.old) return "old";
  if (y >= d.adult) return "adult";
  return gameDays(a.born, now) < d.sellFromDays ? "baby" : "young";
}
const STAGE_FACTOR = { pet: { baby: 0, young: 1, adult: 0.5, old: 0.2 }, zoo: { baby: 0, young: 0.6, adult: 1, old: 0.3 }, aqua: { adult: 1, old: 0.5 } };

// 売れないときは理由を返す（画面で説明するため）
export function sellBlock(a, now) {
  const d = species(a.kind);
  if (d.noSale) return "nosale";          // アメリカザリガニ：売り買い禁止
  if (a.hospitalUntil) return "hospital";
  if (a.sick) return "sick";
  if (stage(a, now) === "baby") return "baby"; // 犬猫は生後56日まで（動物愛護管理法）
  if (now - (a.arrived ?? a.born) < SETTLE_DAYS * 24 * HOUR) return "new";
  return null;
}

// ---- キラキラ（data/shine.js）----
// キラキラを1つ決める（めずらしい順に くじを引く）。null は ふつう
export function rollShine(rng = Math.random) {
  let r = rng();
  for (const id of [...SHINE_IDS].reverse()) { if (r < SHINES[id].odds) return id; r -= SHINES[id].odds; }
  return null;
}
// その子のキラキラ（前からの rare は ゴールド。版の途中で使っていた色の名前も読みかえる）
const OLD = { kin: "gold", niji: "rainbow" };
export const shineOf = a => a.shine || OLD[a.color] || (a.rare ? "gold" : null);
// 名前の前につける キラキラ（「ゴールドの 」など。ふつうは空）
export const shineName = a => (shineOf(a) ? SHINES[shineOf(a)].name + "の " : "") + (morphName(a) ? morphName(a) + "の " : "");
// 絵に塗る 色変わりの色（なければ null）
export const paintOf = a => morphPaint(a);
// 値段の倍率：水の生き物は キラキラごと、陸の動物の めずらしい色は 3倍（前のまま）
export function shinePrice(a) {
  const c = shineOf(a);
  if (!c) return 1;
  return species(a.kind).aquatic ? SHINES[c].price : 3;
}
// 図鑑の キラキラあつめ：その種類で 会ったことのある キラキラ
function noteShine(s, kind, shine) {
  s.shines = s.shines || {};
  const list = s.shines[kind] || (s.shines[kind] = []);
  const id = shine || "normal";
  if (!list.includes(id)) list.push(id);
}
// つりレベル：釣った数で上がる（1〜8）。高いほど 糸が切れにくい（logic/fishing.js の grip）
export const FISH_LEVELS = [0, 10, 30, 60, 100, 160, 240, 350];
export const fishLevel = shop => FISH_LEVELS.filter(v => (shop.fishCount || 0) >= v).length;

// ---- 販売用の柵・水槽（2026-10-16 決定）----
// 柵・水槽は「だいじに そだてる」（売れない）か「はんばいよう」。はんばいよう は 相場×たかめ/ふつう/やすめ の値段で、
// お店が開いている 9〜19時に お客さんが自動で買っていく。perDay は 1日のうちに その子が売れる見こみ
export const TIERS = {
  high: { name: "たかめ", k: 1.3, perDay: 0.2 },
  normal: { name: "ふつう", k: 1, perDay: 0.5 },
  low: { name: "やすめ", k: 0.8, perDay: 0.85 },
};
export const OPEN_HOURS = [9, 19];
const OPEN_LEN = OPEN_HOURS[1] - OPEN_HOURS[0];
export const purposeOf = pen => pen.purpose || "keep";
export const tierOf = pen => pen.tier || "normal";
// はんばいよう の値段：その子の値段 × 相場 × たかめ/ふつう/やすめ
export const salePrice = (a, now, tier = "normal") => Math.max(1, Math.round(priceOf(a, now) * marketRate(a.kind, now) * TIERS[tier].k));
export function setPurpose(shop, penId, purpose) {
  const s = clone(shop), p = s.pens.find(q => q.id === penId);
  if (!p || !["keep", "sale"].includes(purpose)) return { shop, ok: false };
  p.purpose = purpose;
  return { shop: s, ok: true };
}
export function setTier(shop, penId, tier) {
  const s = clone(shop), p = s.pens.find(q => q.id === penId);
  if (!p || !TIERS[tier]) return { shop, ok: false };
  p.tier = tier;
  return { shop: s, ok: true };
}
// ---- 赤ちゃん（第2弾。2026-10-16）----
// だいじに そだてる 柵・水槽で、同じ種類の おとなの オスとメスが そろい、元気（0.5以上）で おなかが すいていなければ、
// 1日に BREED_CHANCE の見こみで 生まれる（1回に 1〜litter ひき。柵の広さが たりない分は 生まれない）。
// はんばいよう では 生まれない。柵ごとに breed:false で とめられる。色は 血統くじ（logic/breed.js）、キラキラは 親がキラキラなら2倍
export const BREED_CHANCE = 0.3;
export const canBreedIn = pen => purposeOf(pen) === "keep" && pen.breed !== false;
export function setBreed(shop, penId, on) {
  const s = clone(shop), p = s.pens.find(q => q.id === penId);
  if (!p) return { shop, ok: false };
  p.breed = !!on;
  return { shop: s, ok: true };
}
function breedDay(s, next, dayIdx) {
  for (const pen of s.pens) {
    if (!canBreedIn(pen)) continue;
    const ok = pen.animals.filter(a => BREEDS[a.kind] && !a.hospitalUntil && !a.sick && a.genki >= 0.5 && a.hunger >= BAD_BELOW && stage(a, next) === "adult");
    for (const kind of [...new Set(ok.map(a => a.kind))]) {
      const dad = ok.find(a => a.kind === kind && a.sex === "m"), mom = ok.find(a => a.kind === kind && a.sex === "f");
      if (!dad || !mom || hash(pen.id, dayIdx, kind, "baby") >= BREED_CHANCE) continue;
      const n = 1 + Math.floor(hash(pen.id, dayIdx, kind, "n") * BREEDS[kind].litter);
      let k = 0;
      const rng = () => hash(pen.id, dayIdx, kind, "r", k++);
      for (let i = 0; i < n; i++) {
        if (usedSpace(pen) + species(kind).space > capacity(pen)) break;
        const { morph, line } = inherit(dad, mom, rng);
        const parentShine = shineOf(dad) || shineOf(mom);
        const sh = rollShine(parentShine ? () => rng() / 2 : rng);
        const baby = { ...newAnimal("a" + s.nextId++, kind, next, rng, next, sh, morph), line, hunger: 0.8, natsuki: 0.5, mother: mom.id, father: dad.id };
        pen.animals.push(baby);
        record(s, kind, sh);
        s.birthsNew = [...(s.birthsNew || []), { t: next, kind, shine: sh, morph, pen: pen.id }].slice(-50);
      }
      break; // 1つの柵で 1日に 1回まで
    }
  }
}

// ---- スタッフ（第2弾。2026-10-16）----
// 旅行などで 何日か 留守にする日のため（壁打ち）。1日 STAFF_PAY コイン（現実の 1日1万円）。雇っている あいだ 毎日 8時と18時に
// おなかが すいた子に お店のエサを あげ（エサが たりなければ あげられない）、からだを きれいにし、柵・水槽を そうじする
export const STAFF_PAY = 100;
export const STAFF_HOURS = [8, 18];
export function hireStaff(shop, days, now) {
  const cost = STAFF_PAY * days;
  if (![1, 3, 7].includes(days)) return { shop, ok: false, reason: "none" };
  if (shop.money < cost) return { shop, ok: false, reason: "nomoney" };
  const s = clone(shop), from = Math.max(now, s.staff?.until || 0);
  s.staff = { until: from + days * DAY_MS, short: [] };
  spend(s, cost);
  return { shop: s, ok: true, until: s.staff.until };
}
export const staffWorking = (shop, t) => !!shop.staff && t < shop.staff.until;
function staffWork(s, next) {
  if (!staffWorking(s, next) || !STAFF_HOURS.includes(new Date(next).getHours())) return;
  for (const pen of s.pens) {
    if (pen.dirty && pen.animals.length) pen.dirty = false;
    for (const a of pen.animals) {
      if (a.hospitalUntil) continue;
      const food = species(a.kind).food;
      if (a.hunger < 0.7) {
        if ((s.stock[food] || 0) > 0) { s.stock[food] -= 1; a.hunger = 1; }
        else if (!s.staff.short.includes(food)) s.staff.short.push(food); // エサが たりなかった（帰ってきたら 知らせる）
      }
      if (a.clean < 0.7) a.clean = 1;
    }
  }
}

// 1時間ぶんの お客さん：はんばいよう の子を くじで売る（くじは hash なので 何回に分けて進めても 同じ結果）
function customersBuy(s, next, hourIdx) {
  const h = new Date(next).getHours();
  if (h < OPEN_HOURS[0] || h >= OPEN_HOURS[1]) return;
  for (const pen of s.pens) {
    if (purposeOf(pen) !== "sale") continue;
    const tier = tierOf(pen), pHour = 1 - Math.pow(1 - TIERS[tier].perDay, 1 / OPEN_LEN);
    const left = [];
    for (const a of pen.animals) {
      if (!sellBlock(a, next) && hash(a.id, hourIdx, "buy") < pHour) {
        const coins = salePrice(a, next, tier);
        earn(s, coins);
        s.today.sold += 1;
        s.salesNew = [...(s.salesNew || []), { t: next, kind: a.kind, shine: shineOf(a), coins }].slice(-50);
      } else left.push(a);
    }
    pen.animals = left;
  }
}

export function priceOf(a, now) {
  const d = species(a.kind);
  const f = STAGE_FACTOR[d.market][stage(a, now)] ?? 0;
  const coins = d.price * f * (0.6 + 0.4 * a.genki) * (0.8 + 0.4 * a.natsuki) * shinePrice(a);
  return Math.max(1, Math.round(coins));
}

// ---- 柵・水槽と床のマス目 ----
export const footprint = p => FOOTPRINT[p.level];
export function shopSize(shop) { const s = SHOP_SIZES[shop.size]; return { w: s.w, h: s.h }; }

function rectsOf(shop, skip) {
  const out = [];
  for (const p of shop.pens) if (p.id !== skip) { const [w, h] = footprint(p); out.push({ x: p.x, y: p.y, w, h }); }
  for (const i of shop.items) if (i.id !== skip) { const f = FURNITURE[i.kind]; out.push({ x: i.x, y: i.y, w: f.w, h: f.h }); }
  return out;
}
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// そこに置けるか（床からはみ出さない・重ならない）。skip は動かしている物自身のID
export function canPlace(shop, x, y, w, h, skip = null) {
  const { w: W, h: H } = shopSize(shop);
  if (x < 0 || y < 0 || x + w > W || y + h > H) return false;
  return !rectsOf(shop, skip).some(r => overlap(r, { x, y, w, h }));
}

export function moveThing(shop, id, x, y) {
  const s = clone(shop);
  const p = s.pens.find(q => q.id === id), it = s.items.find(q => q.id === id);
  const [w, h] = p ? footprint(p) : it ? [FURNITURE[it.kind].w, FURNITURE[it.kind].h] : [0, 0];
  if (!(p || it) || !canPlace(shop, x, y, w, h, id)) return { shop, ok: false };
  Object.assign(p || it, { x, y });
  return { shop: s, ok: true };
}

// 水槽の水（2026-10-16）：建てるときに たんすい（fresh）か かいすい（sea）を選ぶ。前の水槽は 中の魚で決め、空なら たんすい
export const WATER_NAME = { fresh: "たんすい", sea: "かいすい" };
export const waterOf = pen => pen.water || (pen.animals[0] ? species(pen.animals[0].kind).group : "fresh");
export function canLive(pen, kind) {
  const d = species(kind);
  if (pen.type !== d.pen) return "wrongpen";
  if (pen.level < d.size) return "toosmall";
  if (pen.type === "tank" && waterOf(pen) !== d.group) return "water"; // 川・池の魚は たんすい、海の魚は かいすい
  if (pen.type !== "tank" && pen.animals.some(a => species(a.kind).group !== d.group)) return "eat"; // 食べる・食べられる
  if (usedSpace(pen) + d.space > capacity(pen)) return "full";
  return "ok";
}
export const capacity = pen => CAPACITY[pen.type][pen.level];
export const usedSpace = pen => pen.animals.reduce((t, a) => t + species(a.kind).space, 0);
export const findPen = (shop, kind) => shop.pens.findIndex(p => canLive(p, kind) === "ok");
// 入れる場所がないとき、いちばん役に立つ理由を1つ返す（画面で説明するため）
export function whyNoRoom(shop, kind) {
  const r = shop.pens.map(p => canLive(p, kind)).filter(x => x !== "wrongpen");
  return ["full", "eat", "water", "toosmall"].find(x => r.includes(x)) || "nopen";
}

// water：水槽のときの水（"fresh" たんすい／"sea" かいすい）
export function buildPen(shop, type, x, y, water = "fresh") {
  const t = PENS[type];
  if (!t || shop.money < t.cost[0] || !canPlace(shop, x, y, ...FOOTPRINT[1])) return { shop, ok: false };
  const s = clone(shop);
  s.pens.push({ id: "p" + s.nextId++, type, level: 1, x, y, dirty: false, animals: [], ...(type === "tank" ? { water } : {}) });
  spend(s, t.cost[0]);
  return { shop: s, ok: true };
}

export const upgradeCost = p => (p.level < MAX_LEVEL ? PENS[p.type].cost[p.level] : null);

// 広げる。大きくなった分の床が空いていないと広げられない
export function upgradePen(shop, penId) {
  const p = shop.pens.find(q => q.id === penId), cost = p && upgradeCost(p);
  if (cost == null || shop.money < cost) return { shop, ok: false, reason: "nomoney" };
  if (!canPlace(shop, p.x, p.y, ...FOOTPRINT[p.level + 1], p.id)) return { shop, ok: false, reason: "noroom" };
  const s = clone(shop);
  s.pens.find(q => q.id === penId).level += 1;
  spend(s, cost);
  return { shop: s, ok: true };
}

export function removePen(shop, penId) {
  const p = shop.pens.find(q => q.id === penId);
  if (!p || p.animals.length) return { shop, ok: false };
  const s = clone(shop);
  s.pens = s.pens.filter(q => q.id !== penId);
  return { shop: s, ok: true };
}

export function expandShop(shop) {
  const next = SHOP_SIZES[shop.size + 1];
  if (!next || shop.money < next.cost) return { shop, ok: false };
  const s = clone(shop);
  s.size += 1;
  spend(s, next.cost);
  return { shop: s, ok: true };
}

// ---- 家具・外観内装 ----
export function buyFurniture(shop, kind, x, y, now) {
  const f = FURNITURE[kind];
  if (!f || shop.money < f.price || !canPlace(shop, x, y, f.w, f.h)) return { shop, ok: false };
  if (f.season != null && season(shop.startedAt, now) !== f.season) return { shop, ok: false };
  const s = clone(shop);
  s.items.push({ id: "i" + s.nextId++, kind, x, y });
  spend(s, f.price);
  return { shop: s, ok: true };
}

export function removeItem(shop, id) {
  const s = clone(shop);
  s.items = s.items.filter(i => i.id !== id);
  return { shop: s, ok: true };
}

export function buyDecor(shop, part, id) {
  const it = DECOR[part]?.items[id];
  if (!it) return { shop, ok: false };
  if (!shop.owned[part].includes(id) && shop.money < it.price) return { shop, ok: false };
  const s = clone(shop);
  if (!s.owned[part].includes(id)) { spend(s, it.price); s.owned[part].push(id); }
  s.decor[part] = id;
  return { shop: s, ok: true };
}

// おもちゃが その柵の中か となりのマスに あるか
function hasToy(shop, pen) {
  const [w, h] = footprint(pen);
  const area = { x: pen.x - 1, y: pen.y - 1, w: w + 2, h: h + 2 };
  return shop.items.some(i => FURNITURE[i.kind].toy && overlap(area, { x: i.x, y: i.y, w: 1, h: 1 }));
}

// にんき＝外観内装 ＋ 置いた家具 ＋ 生き物の種類 ＋ みんなの元気
export function appeal(shop) {
  const decor = Object.keys(DECOR).reduce((n, k) => n + DECOR[k].items[shop.decor[k]].appeal, 0);
  const items = shop.items.reduce((n, i) => n + FURNITURE[i.kind].appeal, 0);
  const all = shop.pens.flatMap(p => p.animals);
  const kinds = new Set(all.map(a => a.kind)).size;
  const genki = all.length ? all.reduce((n, a) => n + a.genki, 0) / all.length : 0;
  return decor + items + kinds + Math.round(genki * 3);
}
// 見学のお客さん：お店の にんき ＋ 自分の町の飾り（logic/town.js）
export const visitorsPerDay = shop => 2 + appeal(shop) + townAppeal(shop);

// お店レベル：売上の合計と図鑑の数（第3弾の動物園・遠くの釣り場の条件）
export function shopLevel(shop) {
  // 毎日30回ほど釣ると Lv1（おき）まで約5日・Lv3（みなみのしま）まで約84日（2026-10-15 試算して決定）
  const bySales = [0, 500, 3000, 10000, 30000].filter(v => shop.earned >= v).length - 1;
  const byZukan = [0, 10, 25, 45, 70].filter(v => shop.seen.length >= v).length - 1;
  return Math.min(bySales, byZukan);
}

// ---- 時間を進める ----
export function advance(shop, now) {
  const target = floorHour(now);
  if (target <= shop.lastTick) return shop;
  const s = clone(shop);
  let t = Math.max(s.lastTick, target - MAX_CATCHUP_HOURS * HOUR);
  while (t < target) {
    const next = t + HOUR, hourIdx = Math.round(next / HOUR);
    for (const pen of s.pens) {
      if (!pen.animals.length) continue;
      if (!pen.dirty && hash(pen.id, hourIdx) < DIRTY_CHANCE_PER_HOUR) pen.dirty = true;
      const down = GENKI_DOWN_RATE[pen.level] * (hasToy(s, pen) ? 0.8 : 1), up = GENKI_UP_RATE[pen.level];
      for (const a of pen.animals) {
        if (a.hospitalUntil) continue;
        a.hunger = Math.max(0, a.hunger - HUNGER_PER_HOUR);
        a.clean = Math.max(0, a.clean - CLEAN_PER_HOUR);
        if (a.hunger < BAD_BELOW) a.hungryToday = true;
        const bad = a.hunger < BAD_BELOW || a.clean < BAD_BELOW || pen.dirty;
        a.badHours = bad ? a.badHours + 1 : 0;
        if (a.badHours > GRACE_HOURS) a.genki = Math.max(0, a.genki - GENKI_DOWN_PER_HOUR * down);
        else if (!bad && !a.sick) a.genki = Math.min(1, a.genki + GENKI_UP_PER_HOUR * up);
        if (a.genki < SICK_BELOW) a.sick = true;
      }
    }
    staffWork(s, next);
    customersBuy(s, next, hourIdx);
    // 入院していた子が帰ってくる
    for (const pen of s.pens) for (const a of pen.animals) {
      if (a.hospitalUntil && next >= a.hospitalUntil) { a.hospitalUntil = null; a.sick = false; a.genki = Math.max(a.genki, 0.7); a.badHours = 0; }
    }
    // 日付が変わった：なつき度・見学のお客さん・寿命・きのうのまとめ
    if (dateKey(next) !== dateKey(t)) {
      for (const pen of s.pens) for (const a of pen.animals) {
        a.natsuki = Math.min(1, Math.max(0, a.natsuki + (a.hungryToday ? -0.05 : 0.1)));
        a.hungryToday = false;
      }
      breedDay(s, next, Math.round(next / DAY_MS));
      const v = s.pens.some(p => p.animals.length) ? visitorsPerDay(s) : 0;
      s.today.visitors += v;
      earn(s, v * VISITOR_SPEND);
      for (const pen of s.pens) {
        const keep = [];
        for (const a of pen.animals) {
          if (gameYears(a.born, next) >= species(a.kind).life) s.farm.push({ kind: a.kind, rare: a.rare, shine: a.shine, morph: a.morph, retiredAt: next });
          else keep.push(a);
        }
        pen.animals = keep;
      }
      zooDay(s, next); // 第3弾：じぶんの どうぶつえん（logic/zoo.js）
      s.yesterday = s.today;
      s.today = { date: dateKey(next), care: 0, sold: 0, income: 0, expense: 0, fish: 0, visitors: 0 };
    }
    t = next;
  }
  s.lastTick = target;
  return s;
}

// ---- 世話（柵・水槽ごと） ----
export function needs(a, pen) {
  if (!a || a.hospitalUntil) return [];
  const n = [];
  if (a.sick) n.push("vet");
  if (a.hunger < NEED_BELOW) n.push("food");
  if (a.clean < NEED_BELOW) n.push("clean");
  if (pen && pen.dirty) n.push("broom");
  return n;
}

// tool: エサ（FOODS）| "soap" | "water" | "broom"
// result: "ok" | "notneeded" | "wrongfood" | "wrongtool" | "nostock"
export function care(shop, penId, tool) {
  const pi = shop.pens.findIndex(p => p.id === penId), pen0 = shop.pens[pi];
  const none = r => ({ shop, result: r });
  const here = pen0 ? pen0.animals.filter(a => !a.hospitalUntil) : [];
  if (!here.length) return none("notneeded");
  const water = PENS[pen0.type].water;
  if (tool === "soap" && water) return none("wrongtool");
  if (tool === "water" && !water) return none("wrongtool");
  if (FOODS[tool] && !here.some(a => species(a.kind).food === tool)) return none("wrongfood");
  const s = clone(shop), pen = s.pens[pi];
  let done = 0;
  if (FOODS[tool]) {
    const hungry = pen.animals.filter(a => !a.hospitalUntil && species(a.kind).food === tool && a.hunger < 0.999);
    if (!hungry.length) return none("notneeded");
    if (!(s.stock[tool] > 0)) return none("nostock");
    for (const a of hungry) { if (!(s.stock[tool] > 0)) break; a.hunger = 1; s.stock[tool] -= 1; done++; }
  } else if (tool === "soap" || tool === "water") {
    for (const a of pen.animals) if (!a.hospitalUntil && a.clean < 0.999) { a.clean = 1; done++; }
  } else if (tool === "broom") {
    if (pen.dirty) { pen.dirty = false; done = 1; }
  }
  if (!done) return none("notneeded");
  for (const a of pen.animals) if (!a.hospitalUntil && needs(a, pen).filter(n => n !== "vet").length === 0) a.badHours = 0;
  s.today.care += 1;
  s.careLog = [{ t: Date.now(), pen: penId, tool }, ...(s.careLog || [])].slice(0, 50);
  return { shop: s, result: "ok" };
}

// じゅういさんに連れて行く：入院して次の朝7時に戻る
export function vetCost(kind) {
  const d = species(kind);
  return d.size >= 2 && d.market === "zoo" ? VET_COST.big : d.market === "pet" && d.size >= 2 ? VET_COST.pet : VET_COST.small;
}
export function toVet(shop, animalId, now) {
  const s = clone(shop);
  const a = s.pens.flatMap(p => p.animals).find(x => x.id === animalId);
  if (!a || !a.sick || a.hospitalUntil) return { shop, ok: false, reason: "notneeded" };
  const cost = vetCost(a.kind);
  if (s.money < cost) return { shop, ok: false, reason: "nomoney" };
  a.hospitalUntil = nextMorning(now);
  spend(s, cost);
  return { shop: s, ok: true, cost, until: a.hospitalUntil };
}

// ---- 買う ----
function buyStock(shop, table, bag, key) {
  const b = table[key];
  if (!b || shop.money < b.price) return { shop, ok: false };
  const s = clone(shop);
  s[bag][key] = (s[bag][key] || 0) + b.qty;
  spend(s, b.price);
  return { shop: s, ok: true };
}
export const buyFood = (shop, food) => buyStock(shop, FOODS, "stock", food);
export const buyBait = (shop, bait) => buyStock(shop, BAITS, "baits", bait);

export function buyRod(shop, rod) {
  const r = RODS[rod];
  if (!r || shop.rods.includes(rod) || shop.money < r.price) return { shop, ok: false };
  const s = clone(shop);
  s.rods.push(rod);
  spend(s, r.price);
  return { shop: s, ok: true };
}

// お店で買える生き物：ペット（ペンギン以外）と いちばの水の生き物
export function buyable() {
  const land = Object.keys(ANIMALS).filter(k => ANIMALS[k].cost != null);
  const water = AQUATIC.filter(a => a.area === "market").map(a => a.id);
  return [...land, ...water];
}

// result: "ok" | "nomoney" | "noroom" | "notsold"
export function buyAnimal(shop, kind, now, rng = Math.random) {
  const d = species(kind);
  if (!d || d.cost == null || !buyable().includes(kind)) return { shop, result: "notsold" };
  const pi = findPen(shop, kind);
  if (pi < 0) return { shop, result: "noroom", why: whyNoRoom(shop, kind) };
  if (shop.money < d.cost) return { shop, result: "nomoney" };
  // お店に来るのは売れる年ごろの子（ペットは売れるようになったばかり、水の生き物は大人）
  const born = now - (d.sellFromDays / 365.25) * (365.25 / 3) * 24 * HOUR;
  const s = putAnimal(shop, pi, kind, born, rng, now);
  spend(s, d.cost);
  return { shop: s, result: "ok", pen: s.pens[pi].id };
}

// ---- 売る（全国の園へ）・こうけん・寄贈 ----
export function placesFor(kind) {
  const dest = species(kind).market === "pet" || species(kind).market === "zoo" ? "zoo" : "aqua";
  return Object.keys(PLACES).filter(id => PLACES[id].kind === dest);
}

// しゅっか：はんばいよう の子を その場で売る（相場×0.8。お客さんを待たない かわりに やすい。こうけんは たまらない）
export const SHIP_K = 0.8;
export const shipPrice = (a, now) => Math.max(1, Math.round(priceOf(a, now) * marketRate(a.kind, now) * SHIP_K));
export function shipAnimal(shop, animalId, now) {
  const pen = shop.pens.find(p => p.animals.some(a => a.id === animalId));
  if (!pen) return { shop, ok: false, reason: "none" };
  if (purposeOf(pen) !== "sale") return { shop, ok: false, reason: "keep" };
  const a = pen.animals.find(x => x.id === animalId), block = sellBlock(a, now);
  if (block) return { shop, ok: false, reason: block };
  const s = clone(shop), coins = shipPrice(a, now);
  for (const p of s.pens) p.animals = p.animals.filter(x => x.id !== animalId);
  s.today.sold += 1;
  earn(s, coins);
  return { shop: s, ok: true, coins };
}

export function sell(shop, animalId, placeId, now) {
  const a = shop.pens.flatMap(p => p.animals).find(x => x.id === animalId);
  // だいじに そだてている子は 送れない（まちがって手ばなす事故をふせぐ）
  if (a && purposeOf(shop.pens.find(p => p.animals.includes(a))) === "keep") return { shop, ok: false, reason: "keep", reward: 0, gifts: [] };
  if (!a || sellBlock(a, now) || !shop.places[placeId]) return { shop, ok: false, reward: 0, gifts: [] };
  const s = clone(shop), reward = priceOf(a, now), place = s.places[placeId];
  for (const p of s.pens) p.animals = p.animals.filter(x => x.id !== animalId);
  place.sent.push(a.kind);
  place.points += Math.floor(reward / 100);
  s.today.sold += 1;
  earn(s, reward);
  const ladder = REWARDS[PLACES[placeId].kind], gifts = [];
  while (place.rewarded < ladder.length && place.points >= ladder[place.rewarded].points) {
    const g = { ...ladder[place.rewarded], from: placeId };
    place.rewarded += 1;
    if (g.rod) { if (!s.rods.includes(g.rod)) s.rods.push(g.rod); }
    else if (g.bait) s.baits[g.bait] = (s.baits[g.bait] || 0) + g.n;
    else s.gifts.push(g);
    gifts.push(g);
  }
  return { shop: s, ok: true, reward, gifts };
}

export function claimGift(shop, giftIdx, now, rng = Math.random) {
  const g = shop.gifts[giftIdx];
  if (!g || !g.animal) return { shop, result: "none" };
  const pi = findPen(shop, g.animal);
  if (pi < 0) return { shop, result: "noroom", why: whyNoRoom(shop, g.animal) };
  const d = species(g.animal);
  const s = putAnimal(shop, pi, g.animal, now - d.adult * (365.25 / 3) * 24 * HOUR, rng, now); // 寄贈は若い大人
  const got = s.pens[pi].animals[s.pens[pi].animals.length - 1];
  record(s, g.animal, shineOf(got));
  s.gifts.splice(giftIdx, 1);
  return { shop: s, result: "ok", pen: s.pens[pi].id };
}

// ---- 釣り ----
// 釣り場に行けるか。2026-10-16「水槽に空きがなかったら行けない」：その釣り場の水（いけ・かわ＝淡水、うみ＝海水）の魚が
// 1ぴき（いちばん小さい広さ1）は入る 水槽が要る。空の水槽か、同じ水の魚の水槽で 広さが余っているもの
export const WATER_OF_STAGE = { pond: "fresh", river: "fresh", sea: "sea" };
export function hasTankRoom(shop, stage) {
  const water = WATER_OF_STAGE[stage];
  return shop.pens.some(p => p.type === "tank" && waterOf(p) === water && usedSpace(p) + 1 <= capacity(p));
}
// 水槽を1つも持っていない お店に、空の水槽を1回だけ足す（はじめの水槽ができる前に作った お店のため。床に空きがあるときだけ）
export function ensureStarterTank(shop) {
  if (shop.starterTank || shop.pens.some(p => p.type === "tank")) return { ...shop, starterTank: true };
  const s = clone(shop), { w, h } = shopSize(s), [fw, fh] = FOOTPRINT[1];
  for (let y = 0; y + fh <= h; y++) for (let x = 0; x + fw <= w; x++) {
    if (!canPlace(s, x, y, fw, fh)) continue;
    s.pens.push({ id: "p_tank1", type: "tank", level: 1, x, y, dirty: false, animals: [], water: "fresh" });
    s.starterTank = true;
    return s;
  }
  return { ...s, starterTank: true };
}

export function canGo(shop, area) {
  const a = AREAS[area];
  if (!a) return "none";
  if (!hasTankRoom(shop, area)) return "notank";
  if (shop.money < a.cost) return "nomoney";
  return "ok";
}
export function startTrip(shop, area) {
  if (canGo(shop, area) !== "ok") return { shop, ok: false };
  const s = clone(shop);
  spend(s, AREAS[area].cost);
  return { shop: s, ok: true };
}
export function useBait(shop, bait) {
  if (!(shop.baits[bait] > 0)) return { shop, ok: false };
  const s = clone(shop);
  s.baits[bait] -= 1;
  return { shop: s, ok: true };
}

// その釣り場（いけ・かわ・うみ）・季節・時間帯・天気で 釣れる生き物。zone は うみ の「near（ちかく）」「far（おき）」（省くと両方）
export const catchable = (stage, sea, tod, weather, zone = null) =>
  AQUATIC.filter(a => STAGE_OF[a.area] === stage && (!zone || ZONE_OF[a.area] === zone) && a.seasons.includes(sea) && a.times.includes(tod) && a.weathers.includes(weather));

export function rarityOdds(bait, rod) {
  const w = BASE_WEIGHT.map((b, i) => b * BAITS[bait].weight[i] * RODS[rod].weight[i]);
  const sum = w.reduce((x, y) => x + y, 0);
  return w.map(x => x / sum);
}

export function rollFish(list, bait, rod, rng = Math.random) {
  if (!list.length) return null;
  const odds = rarityOdds(bait, rod);
  let r = rng(), rarity = 4;
  for (let i = 0; i < 4; i++) { if (r < odds[i]) { rarity = i + 1; break; } r -= odds[i]; }
  for (let k = rarity; k >= 1; k--) {
    const pool = list.filter(a => a.rarity === k);
    if (pool.length) return pool[Math.floor(rng() * pool.length)].id;
  }
  return list[Math.floor(rng() * list.length)].id;
}

// 釣れた：放すだけの魚は記録だけ。水槽に入れば入れ、入らなければ いちばで半値で売る（売れない生き物は放す）
// 釣りあげた：図鑑と 釣った数に のせる。そのあと 水槽に入れるか にがすかは 子どもが選ぶ（keepFish。2026-10-16 決定、いちばへは売らない）
// shine：釣れた魚の キラキラ（釣りの画面で 影を出したときに決めたもの。null は ふつう）
// result："released"（きまりで放すだけ）／"caught"（えらべる）。canKeep：入れる水槽があるか、なければ why に その理由
export function landFish(shop, id, now, rng = Math.random, shine = null) {
  const d = species(id);
  const s = clone(shop);
  s.today.fish += 1;
  s.today.caught = [...(s.today.caught || []), id]; // きょう釣った種類（けいじばんの「つって きて」）
  s.fishCount = (s.fishCount || 0) + 1;
  record(s, id, shine);
  if (d.releaseOnly) return { shop: s, result: "released" };
  const pi = findPen(s, id);
  return { shop: s, result: "caught", canKeep: pi >= 0, why: pi >= 0 ? null : whyNoRoom(s, id) };
}
// 釣った魚を 水槽に入れる（入れられる水槽が なければ ok:false と その理由）
export function keepFish(shop, id, now, rng = Math.random, shine = null) {
  const pi = findPen(shop, id);
  if (pi < 0) return { shop, ok: false, why: whyNoRoom(shop, id) };
  return { shop: putAnimal(shop, pi, id, now - 0.5 * (365.25 / 3) * 24 * HOUR, rng, now, shine), ok: true, pen: shop.pens[pi].id };
}

export function renamePlace(shop, placeId, name) {
  if (!shop.places[placeId] || !name.trim()) return shop;
  const s = clone(shop);
  s.places[placeId].name = name.trim();
  return s;
}
