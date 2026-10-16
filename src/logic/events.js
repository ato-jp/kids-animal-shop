// 現実の こよみの 行事（2026-10-16 壁打ち2回め）。その期間は 町が かざられ、子ごとに 1回 プレゼント（コインと 行事の かざり）
// from/to は [月, 日]（その日を ふくむ）。年をまたぐ ものは ない形にした（おしょうがつは 1/1〜1/7）
import { TOWN_DECOR } from "../data/town.js";
import { buyTownDecor } from "./town.js";

export const EVENTS = [
  { id: "shogatsu", name: "おしょうがつ", from: [1, 1], to: [1, 7], emoji: "🎍", coins: 50, decor: "e_kadomatsu", fx: "snow" },
  { id: "setsubun", name: "せつぶん", from: [2, 1], to: [2, 3], emoji: "👹", coins: 20, decor: null, fx: null },
  { id: "kodomo", name: "こどもの ひ", from: [5, 1], to: [5, 5], emoji: "🎏", coins: 50, decor: "e_koinobori", fx: "petal" },
  { id: "tanabata", name: "たなばた", from: [7, 1], to: [7, 7], emoji: "🎋", coins: 30, decor: "e_sasa", fx: "star" },
  { id: "matsuri", name: "なつまつり", from: [8, 1], to: [8, 20], emoji: "🏮", coins: 30, decor: "e_chochin", fx: "fire" },
  { id: "halloween", name: "ハロウィン", from: [10, 25], to: [10, 31], emoji: "🎃", coins: 30, decor: "e_pumpkin", fx: "leaf" },
  { id: "christmas", name: "クリスマス", from: [12, 18], to: [12, 25], emoji: "🎄", coins: 50, decor: "e_tree", fx: "snow" },
];
const md = t => { const d = new Date(t); return (d.getMonth() + 1) * 100 + d.getDate(); };
export const eventOn = t => EVENTS.find(e => md(t) >= e.from[0] * 100 + e.from[1] && md(t) <= e.to[0] * 100 + e.to[1]) || null;
const key = (e, t) => `${e.id}-${new Date(t).getFullYear()}`;
export const presentReady = (shop, t) => { const e = eventOn(t); return !!e && !(shop.eventsGot || []).includes(key(e, t)); };

// 行事の プレゼントを もらう（その年に 1回）。かざりは 町の あいている所に 置く（置けなければ コインだけ）
export function takePresent(shop, t) {
  const e = eventOn(t);
  if (!e || !presentReady(shop, t)) return { shop, ok: false };
  let s = JSON.parse(JSON.stringify(shop));
  if (e.decor && TOWN_DECOR[e.decor]) { const r = buyTownDecor(s, e.decor); if (r.ok) s = r.shop; }
  s.money += e.coins; s.today.income += e.coins;
  s.eventsGot = [...(s.eventsGot || []), key(e, t)];
  return { shop: s, ok: true, event: e };
}
