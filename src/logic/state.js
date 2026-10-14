// 遊びのルール。Phaser も画面も使わない純粋な関数だけを置く（node --test で確かめるため）。
// どの関数も渡された状態を書き換えず、新しい状態を返す。乱数は rng を引数で受ける。
// 版2（小学校低学年向け）：お金・エサの在庫・部屋の種類・げんきと病気・1日の営業。
import { ANIMALS } from "../data/animals.js";
import { PLACES } from "../data/places.js";
import { FOODS } from "../data/foods.js";
import { ROOMS } from "../data/rooms.js";

export const ROOM_COUNT = 6;
export const MAX_STARS = 3;
export const DAY_SEC = 300;           // お店の1日（9じ〜18じ）は 5ふん
export const VET_COST = 300;
export const FULL_TANK_SELL = 50;     // すいそうが いっぱいの時、すくった魚を ほかの お店に うる値段
// 6匹のとき、吹き出しが出てすぐ世話すると約5.5秒に1回、困る手前まで待てば約8秒に1回の操作（変更前は約2.7秒に1回で忙しすぎた）
const HUNGER_PER_SEC = 1 / 180;       // 満腹から3分でおなかが空になる
const CLEAN_PER_SEC = 1 / 300;
const DIRTY_CHANCE_PER_SEC = 1 / 120;
const GENKI_DOWN_PER_SEC = 1 / 120;   // 困っている状態が続くと げんきが へる
const GENKI_UP_PER_SEC = 1 / 240;
const BAD_BELOW = 0.3;                // おなか・きれいさが これより下だと「困っている」
export const NEED_BELOW = 0.6;        // これより下がったら吹き出しで知らせる
export const SICK_BELOW = 0.2;
const MIN_GAIN_FOR_STAR = 0.4;        // 本当に困っていたときのお世話だけ★につながる
const STAR_GENKI = 0.5;

const clone = o => JSON.parse(JSON.stringify(o));
const emptyLog = () => ({ care: 0, sent: 0, income: 0, expense: 0 });

export function newFamily() {
  return { version: 2, settings: { sound: true }, current: null, kids: {}, nextKid: 1 };
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
  const shop = {
    money: 1000,
    rooms: ["cage", "cage", "cage", "tank", "tank", null].map(type => ({ type, animal: null })),
    stock: { sunflower: 5, shrimp: 10 },
    places, totalSent: 0, seen: [],
    playMinutes: 20, played: { date: "", seconds: 0 },
    day: { n: 1, sec: 0, log: emptyLog() },
    nextId: 1,
  };
  return putAnimal(shop, 0, "hamster");
}

export function newAnimal(id, kind) {
  return { id, kind, hunger: 0.3, clean: 0.3, dirty: false, genki: 1, sick: false, stars: 0 };
}

function putAnimal(shop, room, kind) {
  const s = clone(shop);
  s.rooms[room].animal = newAnimal("a" + s.nextId++, kind);
  if (!s.seen.includes(kind)) s.seen.push(kind);
  return s;
}

const spend = (s, yen) => { s.money -= yen; s.day.log.expense += yen; };
const earn = (s, yen) => { s.money += yen; s.day.log.income += yen; };

// 時間が進む。お店が閉まっている（1日が終わった）間は何も変わらない
export function tick(shop, sec, rng = Math.random) {
  if (dayOver(shop)) return shop;
  const s = clone(shop);
  s.day.sec = Math.min(DAY_SEC, s.day.sec + sec);
  for (const { animal: a } of s.rooms) {
    if (!a) continue;
    a.hunger = Math.max(0, a.hunger - HUNGER_PER_SEC * sec);
    a.clean = Math.max(0, a.clean - CLEAN_PER_SEC * sec);
    if (!a.dirty && rng() < DIRTY_CHANCE_PER_SEC * sec) a.dirty = true;
    const bad = a.hunger < BAD_BELOW || a.clean < BAD_BELOW || a.dirty;
    if (bad) a.genki = Math.max(0, a.genki - GENKI_DOWN_PER_SEC * sec);
    else if (!a.sick) a.genki = Math.min(1, a.genki + GENKI_UP_PER_SEC * sec);
    if (a.genki < SICK_BELOW) a.sick = true;
  }
  return s;
}

// その子が今こまっていること（吹き出しに出す。何がほしいかの答えは出さない）
export function needs(a) {
  if (!a) return [];
  const n = [];
  if (a.sick) n.push("vet");
  if (a.hunger < NEED_BELOW) n.push("food");
  if (a.clean < NEED_BELOW) n.push("clean");
  if (a.dirty) n.push("broom");
  return n;
}

export const isReady = a => !!a && a.stars >= MAX_STARS && !a.sick;

// tool: エサの名前（FOODS のキー）| "soap" | "water" | "broom" | "vet"
// result: "star" | "ok" | "notneeded" | "wrongfood" | "wrongtool" | "nostock" | "nomoney" | "sick"
export function care(shop, room, tool) {
  const a0 = shop.rooms[room]?.animal;
  if (!a0) return { shop, result: "notneeded" };
  const d = ANIMALS[a0.kind];
  if (tool === "vet") {
    if (!a0.sick) return { shop, result: "notneeded" };
    if (shop.money < VET_COST) return { shop, result: "nomoney" };
    const s = clone(shop), a = s.rooms[room].animal;
    a.sick = false; a.genki = Math.max(a.genki, 0.6);
    spend(s, VET_COST); s.day.log.care += 1;
    return { shop: s, result: "ok" };
  }
  if (FOODS[tool] && tool !== d.food) return { shop, result: "wrongfood" };
  if (tool === "soap" && d.water) return { shop, result: "wrongtool" };
  if (tool === "water" && !d.water) return { shop, result: "wrongtool" };
  if (FOODS[tool] && !(shop.stock[tool] > 0)) return { shop, result: "nostock" };

  const s = clone(shop), a = s.rooms[room].animal;
  let gain = 0;
  if (FOODS[tool]) { gain = 1 - a.hunger; if (gain > 0.001) { a.hunger = 1; s.stock[tool] -= 1; } }
  else if (tool === "soap" || tool === "water") { gain = 1 - a.clean; a.clean = 1; }
  else if (tool === "broom") { gain = a.dirty ? 1 : 0; a.dirty = false; }
  if (gain <= 0.001) return { shop, result: "notneeded" };
  s.day.log.care += 1;
  if (a.sick) return { shop: s, result: "sick" }; // 病気のあいだは★にならない（獣医さんが先）
  if (needs(a).length === 0 && gain >= MIN_GAIN_FOR_STAR && a.genki >= STAR_GENKI && a.stars < MAX_STARS) {
    a.stars += 1;
    return { shop: s, result: "star" };
  }
  return { shop: s, result: "ok" };
}

// 旅立ちのお礼。とても元気（0.8以上）なら2わりまし。10えん単位
export const priceOf = a => Math.round((ANIMALS[a.kind].price * (a.genki >= 0.8 ? 1.2 : 1)) / 10) * 10;

export function pickRequest(shop, rng = Math.random) {
  const ready = shop.rooms.map((r, i) => (isReady(r.animal) ? i : -1)).filter(i => i >= 0);
  if (!ready.length) return null;
  const room = ready[Math.floor(rng() * ready.length)];
  const dest = ANIMALS[shop.rooms[room].animal.kind].dest;
  const cands = Object.keys(PLACES).filter(id => PLACES[id].kind === dest);
  const least = Math.min(...cands.map(id => shop.places[id].sent.length));
  const pool = cands.filter(id => shop.places[id].sent.length === least);
  return { room, place: pool[Math.floor(rng() * pool.length)] };
}

export function depart(shop, room, placeId) {
  const a = shop.rooms[room]?.animal;
  if (!isReady(a) || !shop.places[placeId]) return { shop, reward: 0 };
  const s = clone(shop), reward = priceOf(a);
  s.rooms[room].animal = null;
  s.places[placeId].sent.push(a.kind);
  s.totalSent += 1;
  s.day.log.sent += 1;
  earn(s, reward);
  return { shop: s, reward };
}

// 仕入れられる動物。locked=解放前、afford=お金が足りる、hasRoom=合う部屋が空いている
export function adoptable(shop) {
  return Object.entries(ANIMALS).filter(([, d]) => !d.scoop).map(([kind, d]) => ({
    kind, cost: d.cost, room: d.room,
    locked: (d.unlockSent || 0) > shop.totalSent,
    afford: shop.money >= d.cost,
    hasRoom: shop.rooms.some(r => r.type === d.room && !r.animal),
  }));
}

// result: "ok" | "locked" | "nomoney" | "wrongroom" | "full"
export function adopt(shop, room, kind) {
  const d = ANIMALS[kind], r = shop.rooms[room];
  if (!d || d.scoop || !r) return { shop, result: "wrongroom" };
  if ((d.unlockSent || 0) > shop.totalSent) return { shop, result: "locked" };
  if (r.animal) return { shop, result: "full" };
  if (r.type !== d.room) return { shop, result: "wrongroom" };
  if (shop.money < d.cost) return { shop, result: "nomoney" };
  const s = putAnimal(shop, room, kind);
  spend(s, d.cost);
  return { shop: s, result: "ok" };
}

export function buyFood(shop, food) {
  const f = FOODS[food];
  if (!f) return { shop, ok: false };
  if (shop.money < f.price) return { shop, ok: false };
  const s = clone(shop);
  s.stock[food] = (s.stock[food] || 0) + f.qty;
  spend(s, f.price);
  return { shop: s, ok: true };
}

// 部屋を建てる・建てかえる。動物がいる部屋は建てかえられない
export function build(shop, room, type) {
  const r = shop.rooms[room], t = ROOMS[type];
  if (!r || !t || r.animal || r.type === type) return { shop, ok: false };
  if (shop.money < t.cost) return { shop, ok: false };
  const s = clone(shop);
  s.rooms[room].type = type;
  spend(s, t.cost);
  return { shop: s, ok: true };
}

// すくった魚は空いている すいそうへ。なければ ほかの お店に うる
export function catchFish(shop, kind) {
  const room = shop.rooms.findIndex(r => r.type === "tank" && !r.animal);
  if (room < 0) { const s = clone(shop); earn(s, FULL_TANK_SELL); return { shop: s, room: -1 }; }
  return { shop: putAnimal(shop, room, kind), room };
}

export const dayOver = shop => shop.day.sec >= DAY_SEC;

// 時計の表示用。9:00 から 18:00 まで
export function dayClock(shop) {
  const min = 9 * 60 + Math.floor((shop.day.sec / DAY_SEC) * 9 * 60);
  return { h: Math.floor(min / 60), m: min % 60 };
}

// お店を閉めて、きょうの まとめを返し、つぎの日にする
export function closeDay(shop) {
  const report = { day: shop.day.n, ...shop.day.log, money: shop.money };
  const s = clone(shop);
  s.day = { n: shop.day.n + 1, sec: 0, log: emptyLog() };
  return { shop: s, report };
}

export function renamePlace(shop, placeId, name) {
  if (!shop.places[placeId] || !name.trim()) return shop;
  const s = clone(shop);
  s.places[placeId].name = name.trim();
  return s;
}
