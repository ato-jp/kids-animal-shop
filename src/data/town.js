// 自分の町（箱庭）。版4（2026-10-16 パパ「カイロソフトを 再現して」→ クォータービュー。docs/town-v3.md）：
// ひし形の マスを ななめ上から 見る。建物・飾り・道に くわえて どうぶつえん・すいぞくかん の 展示も 町に 直接 置く。
// お客さんは x=0 の へり（画面の 左上の へり）の 道から 入ってくる。
// 町は 正方形。園の だんかいで たて・よこ とも ひろがる（logic/town.js の townCols）。
export const TOWN_COLS = 24, TOWN_TOP = 84;
export const TOWN_VERSION = 4; // 並びを作り直したら上げる（古い並びは はじめの並びに もどす）

// 建物：to は押したときに行く画面。icon は かんばんの絵文字。w,h はマスの大きさ
export const TOWN_BUILDINGS = {
  shop: { name: "じぶんの おみせ", icon: "store", to: "Shop", w: 3, h: 3 },
  market: { name: "いちば", icon: "cart", to: "Market", w: 3, h: 2 },
  station: { name: "えき", icon: "truck", to: "Station", w: 4, h: 2 },
  vet: { name: "じゅういさん", icon: "vet", to: "Vet", w: 2, h: 2 },
  zoo: { name: "どうぶつえん", icon: "lion", to: "Zoo", data: { f: "zoo" }, w: 3, h: 2 }, // どうぶつえんの もん（だんかい・おくりもの）
  aqua: { name: "すいぞくかん", icon: "dolphin", to: "Zoo", data: { f: "aqua" }, w: 3, h: 3 },
  fishing: { name: "つりば", icon: "pole", to: "Spots", w: 3, h: 2 },
  zukan: { name: "ずかん", icon: "book", to: "Zukan", w: 3, h: 2 },
  board: { name: "けいじばん", icon: "chart", to: "Board", w: 2, h: 1 },
  farm: { name: "のんびり ぼくじょう", icon: "house", to: "Farm", w: 3, h: 2 },
};
// 展示の 大きさ（マス）。町には "ex_<種類>" として 置く（記録は shop.zoo / shop.aqua の exhibits の x,y）
export const EXHIBIT_SIZE = { land: [3, 3], big: [4, 4], cold: [3, 3], fresh: [2, 2], sea: [3, 3] };

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
  bench: { name: "ベンチ", icon: "house", price: 10, w: 1, h: 1, appeal: 1 },
  lamp: { name: "がいとう", icon: "star", price: 12, w: 1, h: 1, appeal: 1 },
  fountain: { name: "ふんすい", icon: "bubbles", price: 40, w: 2, h: 2, appeal: 2 },
  park: { name: "こうえん", icon: "park", price: 60, w: 2, h: 2, appeal: 3 },
};
// ごほうびの飾り（買えない）：prize.zukan＝自分の図鑑の数、prize.family＝兄弟みんなの図鑑を あわせた数（logic/prize.js）
Object.assign(TOWN_DECOR, {
  p_statue: { name: "どうぶつの どうぞう", icon: "trophy", price: 0, w: 1, h: 1, appeal: 1, prize: { zukan: 10 } },
  p_star: { name: "ほしの モニュメント", icon: "star", price: 0, w: 1, h: 1, appeal: 1, prize: { zukan: 20 } },
  p_ship: { name: "ふねの かざり", icon: "ship", price: 0, w: 2, h: 2, appeal: 1, prize: { zukan: 30 } },
  p_moon: { name: "おつきさまの とう", icon: "moon", price: 0, w: 1, h: 1, appeal: 2, prize: { zukan: 45 } },
  p_sun: { name: "たいようの ひろば", icon: "sun", price: 0, w: 2, h: 2, appeal: 3, prize: { zukan: 70 } },
  p_family: { name: "かぞくの きねんひ", icon: "heart", price: 0, w: 2, h: 2, appeal: 2, prize: { family: 40 } },
  p_family2: { name: "かぞくの にじの もん", icon: "sparkles", price: 0, w: 2, h: 1, appeal: 3, prize: { family: 80 } },
  p_family3: { name: "きんの どうぶつぞう", icon: "trophy", price: 0, w: 2, h: 2, appeal: 3, prize: { family: 120 } },
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

// はじめの ならび（x, y はマス。24×24）。x=0 の へりが 町の 入口。10段め（y=10）に 大通り、x=10 に たての 道、y=17 に もう1本
const row = (y, x0, x1, kind = "road") => Array.from({ length: x1 - x0 + 1 }, (_, i) => [kind, x0 + i, y]);
const col = (x, y0, y1, kind = "road") => Array.from({ length: y1 - y0 + 1 }, (_, i) => [kind, x, y0 + i]);
export const TOWN_DEFAULT = [
  ["market", 1, 8], ["station", 5, 8], ["vet", 1, 4], ["zukan", 4, 5], ["shop", 11, 7], ["zoo", 15, 8], ["aqua", 19, 7],
  ["fishing", 1, 11], ["board", 5, 11], ["farm", 1, 15],
  ...row(10, 0, 23), ...col(10, 0, 9), ...col(10, 11, 23), ...row(17, 11, 23),
  ["tree", 0, 0], ["tree", 3, 0], ["tree", 7, 1], ["tree", 13, 0], ["tree", 17, 1], ["tree", 22, 0], ["tree", 23, 3], ["momiji", 8, 3], ["tree", 0, 2],
  ["tree", 0, 21], ["tree", 3, 23], ["tree", 7, 22], ["momiji", 6, 19], ["tree", 23, 12], ["tree", 23, 20], ["tree", 20, 23], ["tree", 15, 22],
  ["flower", 9, 9], ["flower", 14, 9], ["planter", 18, 9], ["nobori", 11, 11], ["vending", 9, 11], ["trash", 18, 11],
  ["lamp", 4, 11], ["lamp", 9, 7], ["lamp", 15, 11], ["lamp", 22, 9], ["bench", 8, 12], ["fountain", 6, 13], ["rock", 8, 16], ["gravel", 0, 11], ["gravel", 0, 12],
  ["tree", 2, 18], ["tree", 8, 19], ["momiji", 9, 21], ["tree", 5, 20], ["flower", 4, 9], ["bench", 9, 13], ["tree", 18, 4], ["tree", 21, 5], ["momiji", 15, 3], ["flower", 16, 6], ["planter", 14, 6], ["tree", 12, 2], ["tree", 6, 2],
];
// はじめの 展示（どうぶつえん：ひろば、すいぞくかん：たんすいの いけ）。どちらも 大通りに 面した 所
export const DEFAULT_EXHIBITS = { zoo: { type: "land", x: 12, y: 11 }, aqua: { type: "fresh", x: 16, y: 11 } };
