// 自分の町（箱庭）。版3（2026-10-16 パパ決定・docs/town-v3.md）：カイロソフト風の ドット絵。1マス 32px と 小さく、
// 建物・飾り・道に くわえて どうぶつえん・すいぞくかん の 展示も 町に 直接 置く。お客さんは 町の 左はしの 道から 入ってくる。
// 町の よこはばは 園の だんかいで ひろがる（logic/town.js の townCols）。たかさは 19マス。
export const TOWN_COLS = 40, TOWN_ROWS = 19, TOWN_TILE = 32, TOWN_TOP = 84;
export const TOWN_VERSION = 3; // 並びを作り直したら上げる（古い並びは はじめの並びに もどす）

// 建物：to は押したときに行く画面。icon は かんばんの絵文字。w,h はマスの大きさ
export const TOWN_BUILDINGS = {
  shop: { name: "じぶんの おみせ", icon: "store", to: "Shop", w: 5, h: 5 },
  market: { name: "いちば", icon: "cart", to: "Market", w: 5, h: 4 },
  station: { name: "えき", icon: "truck", to: "Station", w: 5, h: 4 },
  vet: { name: "じゅういさん", icon: "vet", to: "Vet", w: 4, h: 4 },
  zoo: { name: "どうぶつえん", icon: "lion", to: "Zoo", data: { f: "zoo" }, w: 5, h: 4 }, // どうぶつえんの もん（だんかい・おくりもの）
  aqua: { name: "すいぞくかん", icon: "dolphin", to: "Zoo", data: { f: "aqua" }, w: 4, h: 4 },
  fishing: { name: "つりば", icon: "pole", to: "Spots", w: 4, h: 4 },
  zukan: { name: "ずかん", icon: "book", to: "Zukan", w: 4, h: 4 },
  board: { name: "けいじばん", icon: "chart", to: "Board", w: 3, h: 3 },
  farm: { name: "のんびり ぼくじょう", icon: "house", to: "Farm", w: 4, h: 4 },
};
// 展示の 大きさ（マス）。町には "ex_<種類>" として 置く（記録は shop.zoo / shop.aqua の exhibits の x,y）
export const EXHIBIT_SIZE = { land: [4, 4], big: [6, 6], cold: [5, 4], fresh: [3, 3], sea: [4, 4] };

// 飾り：price はコイン、appeal は 見学のお客さんの ふえかた（町ぜんぶで 5まで）。flat は 地面に しく物
export const TOWN_DECOR = {
  road: { name: "みち", icon: "chart", price: 1, w: 1, h: 1, appeal: 0, flat: true },
  rail: { name: "せんろ", icon: "truck", price: 2, w: 1, h: 1, appeal: 0, flat: true }, // えき から 町のはしまで つなぐと となりまちへ
  dirt: { name: "つちの みち", icon: "mountain", price: 1, w: 1, h: 1, appeal: 0, flat: true },
  gravel: { name: "じゃり", icon: "mountain", price: 1, w: 1, h: 1, appeal: 0, flat: true },
  tree: { name: "き", icon: "plant", price: 5, w: 1, h: 1, appeal: 0 },
  flower: { name: "はなだん", icon: "sunflower", price: 3, w: 1, h: 1, appeal: 0 },
  momiji: { name: "もみじ", icon: "leafy", price: 8, w: 1, h: 1, appeal: 0 },
  rock: { name: "いわ", icon: "mountain", price: 4, w: 1, h: 1, appeal: 0 },
  planter: { name: "うえき", icon: "plant", price: 6, w: 1, h: 1, appeal: 0 },
  trash: { name: "ごみばこ", icon: "broom", price: 4, w: 1, h: 1, appeal: 0 },
  nobori: { name: "のぼり", icon: "star", price: 8, w: 1, h: 1, appeal: 1 },
  vending: { name: "じはんき", icon: "coin", price: 15, w: 1, h: 1, appeal: 1 },
  bench: { name: "ベンチ", icon: "house", price: 10, w: 2, h: 1, appeal: 1 },
  lamp: { name: "がいとう", icon: "star", price: 12, w: 1, h: 1, appeal: 1 },
  fountain: { name: "ふんすい", icon: "bubbles", price: 40, w: 2, h: 2, appeal: 2 },
  park: { name: "こうえん", icon: "park", price: 60, w: 3, h: 2, appeal: 3 },
};
// ごほうびの飾り（買えない）：prize.zukan＝自分の図鑑の数、prize.family＝兄弟みんなの図鑑を あわせた数（logic/prize.js）
Object.assign(TOWN_DECOR, {
  p_statue: { name: "どうぶつの どうぞう", icon: "trophy", price: 0, w: 2, h: 2, appeal: 1, prize: { zukan: 10 } },
  p_star: { name: "ほしの モニュメント", icon: "star", price: 0, w: 2, h: 2, appeal: 1, prize: { zukan: 20 } },
  p_ship: { name: "ふねの かざり", icon: "ship", price: 0, w: 3, h: 3, appeal: 1, prize: { zukan: 30 } },
  p_moon: { name: "おつきさまの とう", icon: "moon", price: 0, w: 2, h: 3, appeal: 2, prize: { zukan: 45 } },
  p_sun: { name: "たいようの ひろば", icon: "sun", price: 0, w: 3, h: 3, appeal: 3, prize: { zukan: 70 } },
  p_family: { name: "かぞくの きねんひ", icon: "heart", price: 0, w: 3, h: 3, appeal: 2, prize: { family: 40 } },
  p_family2: { name: "かぞくの にじの もん", icon: "sparkles", price: 0, w: 4, h: 2, appeal: 3, prize: { family: 80 } },
  p_family3: { name: "きんの どうぶつぞう", icon: "trophy", price: 0, w: 3, h: 3, appeal: 3, prize: { family: 120 } },
});
// 行事の かざり（買えない。logic/events.js の プレゼント）。絵の代わりに 絵文字（emoji）で 描く
Object.assign(TOWN_DECOR, {
  e_kadomatsu: { name: "かどまつ", icon: "plant", emoji: "🎍", price: 0, w: 1, h: 1, appeal: 0, event: true },
  e_koinobori: { name: "こいのぼり", icon: "fish", emoji: "🎏", price: 0, w: 1, h: 1, appeal: 0, event: true },
  e_sasa: { name: "ささかざり", icon: "leafy", emoji: "🎋", price: 0, w: 1, h: 1, appeal: 0, event: true },
  e_chochin: { name: "ちょうちん", icon: "star", emoji: "🏮", price: 0, w: 1, h: 1, appeal: 0, event: true },
  e_pumpkin: { name: "かぼちゃ", icon: "sun", emoji: "🎃", price: 0, w: 1, h: 1, appeal: 0, event: true },
  e_tree: { name: "クリスマスツリー", icon: "plant", emoji: "🎄", price: 0, w: 1, h: 1, appeal: 0, event: true },
});
export const TOWN_APPEAL_MAX = 5;

// はじめの ならび（x, y はマス）。まんなか（8・9段め）に 東西の 大通り。左はしが 町の 入口
const row = (y, x0, x1, kind = "road") => Array.from({ length: x1 - x0 + 1 }, (_, i) => [kind, x0 + i, y]);
const col = (x, y0, y1, kind = "road") => Array.from({ length: y1 - y0 + 1 }, (_, i) => [kind, x, y0 + i]);
export const TOWN_DEFAULT = [
  ["market", 1, 3], ["station", 7, 3], ["shop", 13, 2], ["vet", 21, 3], ["zukan", 26, 3], ["zoo", 31, 3], ["aqua", 36, 3],
  ...row(8, 0, 39), ...row(9, 0, 39), ...col(12, 10, 18), ...row(17, 13, 39),
  ["fishing", 1, 10], ["board", 6, 10], ["farm", 1, 15],
  ["tree", 0, 0], ["tree", 5, 0], ["tree", 11, 0], ["tree", 19, 1], ["tree", 25, 0], ["tree", 30, 0], ["tree", 39, 1], ["tree", 10, 17], ["tree", 5, 17],
  ["flower", 6, 7], ["flower", 12, 7], ["flower", 19, 7], ["planter", 20, 7], ["nobori", 18, 7], ["vending", 25, 7], ["trash", 30, 7],
  ["lamp", 11, 10], ["lamp", 24, 7], ["bench", 7, 14], ["fountain", 7, 16], ["rock", 10, 13], ["gravel", 0, 10], ["gravel", 0, 11],
];
// はじめの 展示（どうぶつえん：ひろば、すいぞくかん：たんすいの いけ）。どちらも 道に つながる 所
export const DEFAULT_EXHIBITS = { zoo: { type: "land", x: 13, y: 10 }, aqua: { type: "fresh", x: 13, y: 14 } };
