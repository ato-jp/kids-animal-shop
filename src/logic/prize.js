// 図鑑のごほうび・家族の図鑑・トロフィー（2026-10-16 壁打ちで決定。docs/roadmap.md）
// ・自分の図鑑が ふえると 町に置ける 特別な飾りが もらえる（買えない飾り。TOWN_DECOR の prize）
// ・兄弟3人の図鑑を あわせた「かぞくの ずかん」が ふえると、みんなが もらえる飾りもある（取り合いではなく 協力）
// ・トロフィーは 今の記録から 毎回 計算する（はじめての つり・はじめての レインボー など）
import { TOWN_DECOR } from "../data/town.js";
import { buyTownDecor, townOf } from "./town.js";
import { shopLevel } from "./shop.js";

export const PRIZES = Object.entries(TOWN_DECOR).filter(([, d]) => d.prize).map(([kind, d]) => ({ kind, ...d.prize }));
export const familySeen = family => new Set(Object.values(family.kids).flatMap(k => k.shop?.seen || []));

// その子の ごほうび：ok（数が たりた）／got（もう もらった＝町にある か しまってある）
export function prizesOf(family, kidId) {
  const shop = family.kids[kidId].shop, mine = shop.seen.length, all = familySeen(family).size, got = shop.prizes || [];
  return PRIZES.map(p => {
    const have = p.family ? all : mine, need = p.family || p.zukan;
    return { ...p, have, need, ok: have >= need, got: got.includes(p.kind), placed: townOf(shop).items.some(i => i.kind === p.kind) };
  });
}
export const prizeReady = (family, kidId) => prizesOf(family, kidId).some(p => p.ok && !p.got);

// もらって 町に置く（しまった ごほうびは もういちど 置ける）。"ok" のほか notyet / placed / noroom
export function claimPrize(shop, family, kidId, kind) {
  const p = prizesOf(family, kidId).find(x => x.kind === kind);
  if (!p || !p.ok) return { shop, ok: false, why: "notyet" };
  if (p.placed) return { shop, ok: false, why: "placed" };
  const r = buyTownDecor(shop, kind); // 値段は 0
  if (!r.ok) return { shop, ok: false, why: r.reason };
  r.shop.prizes = [...new Set([...(shop.prizes || []), kind])];
  return { shop: r.shop, ok: true, id: r.id };
}

const has = (shop, shine) => Object.values(shop.shines || {}).some(l => l.includes(shine));
export const TROPHIES = [
  { id: "fish1", name: "はじめての つり", icon: "pole", ok: s => (s.fishCount || 0) >= 1 },
  { id: "fish100", name: "つった かず 100", icon: "fish", ok: s => (s.fishCount || 0) >= 100 },
  { id: "bronze", name: "はじめての ブロンズ", icon: "star", ok: s => has(s, "bronze") },
  { id: "silver", name: "はじめての シルバー", icon: "star", ok: s => has(s, "silver") },
  { id: "gold", name: "はじめての ゴールド", icon: "star", ok: s => has(s, "gold") },
  { id: "rainbow", name: "はじめての レインボー", icon: "sparkles", ok: s => has(s, "rainbow") },
  { id: "baby", name: "はじめての あかちゃん", icon: "heart", ok: s => (s.bornCount || 0) >= 1 },
  { id: "zoo", name: "どうぶつえん オープン", icon: "park", ok: s => !!s.zoo },
  { id: "gift", name: "すいぞくかんからの おくりもの", icon: "gift", ok: s => (s.zoo?.given || 0) >= 1 },
  { id: "whale", name: "ジンベエザメが きた", icon: "shark", ok: s => s.seen.includes("a78") },
  { id: "gate", name: "おしろの もん", icon: "house", ok: s => (s.zoo?.gate || 0) >= 3 },
  { id: "lv4", name: "おみせ レベル4", icon: "store", ok: s => shopLevel(s) >= 4 },
  { id: "earn", name: "うりあげ 1まん コイン", icon: "coin", ok: s => (s.earned || 0) >= 10000 },
  { id: "zukan50", name: "ずかん 50しゅるい", icon: "book", ok: s => s.seen.length >= 50 },
];
export const trophiesOf = shop => TROPHIES.map(t => ({ ...t, got: t.ok(shop) }));
