// 兄弟の あいだの 売り買い・プレゼント（第2弾。2026-10-16）。値段は ゲームが決める（壁打ち）＝ 売る子の はんばいよう の値段（相場×たかめ等）。
// 行き方は えき の でんしゃ（せんろ が つながったら）。買った子・もらった子は 図鑑に のらない（自分で手に入れた子ではない）。
// 色・血統・キラキラは そのまま。来た日（arrived）は 新しく（3日は 売れない）。
import { findPen, whyNoRoom, purposeOf, tierOf, salePrice, sellBlock } from "./shop.js";

const clone = o => JSON.parse(JSON.stringify(o));
const locate = (shop, id) => { for (const p of shop.pens) { const a = p.animals.find(x => x.id === id); if (a) return { pen: p, a }; } return null; };
function moveInto(shop, a, now) {
  const pi = findPen(shop, a.kind);
  const b = { ...a, id: "a" + shop.nextId++, arrived: now };
  shop.pens[pi].animals.push(b);
  return b;
}

// 兄弟の お店の はんばいよう の子を 買う。"ok" のほか nomoney / noroom（買う子の お店に 入れる所が ない）/ notsale / blocked
export function buyFromSibling(family, buyerId, sellerId, animalId, now) {
  const f = clone(family), buyer = f.kids[buyerId].shop, seller = f.kids[sellerId].shop, hit = locate(seller, animalId);
  if (!hit || purposeOf(hit.pen) !== "sale") return { family, ok: false, why: "notsale" };
  if (sellBlock(hit.a, now)) return { family, ok: false, why: "blocked" };
  const price = salePrice(hit.a, now, tierOf(hit.pen));
  if (buyer.money < price) return { family, ok: false, why: "nomoney" };
  if (findPen(buyer, hit.a.kind) < 0) return { family, ok: false, why: whyNoRoom(buyer, hit.a.kind) };
  hit.pen.animals = hit.pen.animals.filter(x => x.id !== animalId);
  moveInto(buyer, hit.a, now);
  buyer.money -= price; buyer.today.expense += price;
  seller.money += price; seller.today.income += price; seller.earned += price; seller.today.sold += 1;
  return { family: f, ok: true, price };
}

// 自分の子を 兄弟に プレゼント（だいじに でも はんばいよう でも よい。わたすのは 自分で決めたこと）
export function giftToSibling(family, fromId, toId, animalId, now) {
  const f = clone(family), from = f.kids[fromId].shop, to = f.kids[toId].shop, hit = locate(from, animalId);
  if (!hit) return { family, ok: false, why: "none" };
  if (hit.a.hospitalUntil) return { family, ok: false, why: "hospital" };
  if (findPen(to, hit.a.kind) < 0) return { family, ok: false, why: whyNoRoom(to, hit.a.kind) };
  hit.pen.animals = hit.pen.animals.filter(x => x.id !== animalId);
  moveInto(to, hit.a, now);
  return { family: f, ok: true };
}
