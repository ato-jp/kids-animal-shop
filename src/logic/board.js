// けいじばんの依頼（第2弾。2026-10-16）。壁打ちの決定：早いもの勝ち・1日の上限あり（docs/brainstorm-v3.md）。
// ・依頼は 毎日4つ。中身は 日付から hash で決まる（保存しなくても 兄弟で同じものが見える）
// ・兄弟みんなで 同じ掲示板。かなえた子の名前が残り、ほかの子は かなえられない（family.board.taken）
// ・1人 1日 2つまで（BOARD_LIMIT）
// 種類：show（お店に いれば OK）／give（はんばいよう の子を 1ぴき わたす。お礼は 値段の1.5倍）／catch（その日に 釣っていれば OK）
import { hash } from "./rng.js";
import { dateKey } from "./time.js";
import { AQUATIC } from "../data/aquatic.js";
import { ANIMALS } from "../data/animals.js";
import { species, priceOf, purposeOf, sellBlock } from "./shop.js";

export const BOARD_LIMIT = 2;
const FISH = AQUATIC.filter(a => ["pond", "river", "beach"].includes(a.area) && a.rarity <= 2 && !a.releaseOnly).map(a => a.id);
const PETS = Object.keys(ANIMALS).filter(k => ANIMALS[k].cost != null);
const WHO = ["となりの おばあさん", "しょうがっこうの せんせい", "ほいくえんの こどもたち", "まちの パンやさん", "えきの えきいんさん", "つりずきの おじさん"];

export function boardFor(t) {
  const day = dateKey(t), out = [];
  for (let i = 0; i < 4; i++) {
    const r = hash("board", day, i), type = ["show", "give", "catch", "show"][Math.floor(hash("bt", day, i) * 4)];
    // ゆずって には 売り買いが禁止の生き物（アメリカザリガニ）を出さない
    const pool = (type === "catch" ? FISH : r < 0.5 ? FISH : PETS).filter(k => type !== "give" || !species(k).noSale);
    const kind = pool[Math.floor(hash("bk", day, i) * pool.length)];
    const base = Math.max(10, species(kind).price);
    // みせて は 見せるだけなので 50まで。つって きて は 魚の値段の1.2倍＋15。ゆずって は 手ばなすので 値段の1.5倍
    const reward = type === "show" ? Math.min(50, Math.round(base * 0.3 + 10)) : type === "catch" ? Math.round(base * 1.2 + 15) : Math.round(base * 1.5 + 10);
    out.push({ id: `${day}-${i}`, type, kind, reward, who: WHO[Math.floor(hash("bw", day, i) * WHO.length)] });
  }
  return out;
}

// その子が いま かなえられるか。"ok" | "taken"（ほかの子が かなえた）| "limit"（きょうは もう2つ）| "notyet"（条件が まだ）
export function canFulfill(family, kidId, req, now) {
  const b = boardState(family, now), shop = family.kids[kidId].shop;
  if (b.taken[req.id]) return "taken";
  if ((b.done[kidId] || 0) >= BOARD_LIMIT) return "limit";
  const all = shop.pens.flatMap(p => p.animals);
  if (req.type === "show") return all.some(a => a.kind === req.kind && !a.hospitalUntil) ? "ok" : "notyet";
  if (req.type === "catch") return (shop.today.caught || []).includes(req.kind) ? "ok" : "notyet";
  return giveTarget(shop, req.kind, now) ? "ok" : "notyet";
}
// わたせる子：はんばいよう の柵の その種類で、売れない理由（病気・来たばかり など）が無い子
const giveTarget = (shop, kind, now) => {
  for (const p of shop.pens) if (purposeOf(p) === "sale") for (const a of p.animals) if (a.kind === kind && !sellBlock(a, now)) return a;
  return null;
};

const boardState = (family, now) => (family.board && family.board.date === dateKey(now) ? family.board : { date: dateKey(now), taken: {}, done: {} });

export function fulfill(family, kidId, req, now) {
  const why = canFulfill(family, kidId, req, now);
  if (why !== "ok") return { family, ok: false, why };
  const f = JSON.parse(JSON.stringify(family)), b = boardState(f, now), shop = f.kids[kidId].shop;
  if (req.type === "give") {
    const a = giveTarget(shop, req.kind, now);
    for (const p of shop.pens) p.animals = p.animals.filter(x => x.id !== a.id);
  }
  shop.money += req.reward; shop.today.income += req.reward; shop.earned += req.reward;
  b.taken[req.id] = kidId;
  b.done[kidId] = (b.done[kidId] || 0) + 1;
  f.board = b;
  return { family: f, ok: true };
}
export const takenBy = (family, req, now) => boardState(family, now).taken[req.id] || null;
export const doneToday = (family, kidId, now) => boardState(family, now).done[kidId] || 0;
// 値段の目安（画面で「ふつうなら いくら」を出すとき）
export const usualPrice = (a, now) => priceOf(a, now);
