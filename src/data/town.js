// 自分の町（箱庭）。2026-10-16 決定：子どもごとに自分の町を持ち、マス目に 建物も飾りも 指で置く。
// 同じ日「上から見下ろす形に」→ ななめ上から見下ろす（地面は ほぼ真上から、建物は 屋根と正面が見える）。
// 町の地面は 20×9 マス（1マス 64px、上から 120px の所から）。建物は動かせるが なくせない。飾りは いちばのように買って置く。
export const TOWN_COLS = 20, TOWN_ROWS = 9, TOWN_TILE = 64, TOWN_TOP = 120;
export const TOWN_VERSION = 2; // 並びを作り直したら上げる（古い並びは はじめの並びに もどす）

// 建物：to は押したときに行く画面（null は まだ行けない）。icon は札の絵文字。w,h はマスの大きさ
export const TOWN_BUILDINGS = {
  shop: { name: "じぶんの おみせ", icon: "store", to: "Shop", w: 3, h: 3 },
  market: { name: "いちば", icon: "cart", to: "Market", w: 3, h: 3 },
  station: { name: "えき", icon: "truck", to: "Station", w: 3, h: 3 },
  vet: { name: "じゅういさん", icon: "vet", to: "Vet", w: 3, h: 3 },
  zoo: { name: "どうぶつえんの とち", icon: "park", to: null, lockedMsg: "おみせが もっと そだったら かえるよ", w: 3, h: 3 },
  fishing: { name: "つりば", icon: "pole", to: "Spots", w: 3, h: 3 },
  zukan: { name: "ずかん", icon: "book", to: "Zukan", w: 3, h: 3 },
  board: { name: "けいじばん", icon: "chart", to: "Board", w: 2, h: 2 },
  farm: { name: "のんびり ぼくじょう", icon: "house", to: "Farm", w: 3, h: 3 },
};

// 飾り：price はコイン、appeal は 見学のお客さんの ふえかた（町ぜんぶで 5まで）
export const TOWN_DECOR = {
  road: { name: "みち", icon: "chart", price: 1, w: 1, h: 1, appeal: 0, flat: true }, // 地面にしく（絵ではなく 石だたみを描く）
  rail: { name: "せんろ", icon: "truck", price: 2, w: 1, h: 1, appeal: 0, flat: true }, // えき から 町のはしまで つなぐと となりまちへ 行ける
  tree: { name: "き", icon: "plant", price: 5, w: 1, h: 1, appeal: 0 },
  flower: { name: "はなばたけ", icon: "sunflower", price: 3, w: 1, h: 1, appeal: 0 },
  momiji: { name: "もみじ", icon: "leafy", price: 8, w: 1, h: 1, appeal: 0 },
  rock: { name: "いわ", icon: "mountain", price: 4, w: 1, h: 1, appeal: 0 },
  bench: { name: "ベンチ", icon: "house", price: 10, w: 2, h: 1, appeal: 1 },
  lamp: { name: "がいとう", icon: "star", price: 12, w: 1, h: 1, appeal: 1 },
  fountain: { name: "ふんすい", icon: "bubbles", price: 40, w: 2, h: 2, appeal: 2 },
  park: { name: "こうえん", icon: "park", price: 60, w: 3, h: 2, appeal: 3 },
};
export const TOWN_APPEAL_MAX = 5;

// はじめの ならび（x, y はマス）。まんなか（3段め）に 東西の みち、建物は みちに 面して並ぶ
export const TOWN_DEFAULT = [
  ["market", 0, 0], ["station", 4, 0], ["shop", 8, 0], ["vet", 13, 0], ["zoo", 17, 0],
  ...Array.from({ length: 20 }, (_, x) => ["road", x, 3]),
  ["fishing", 0, 4], ["zukan", 4, 4], ["board", 9, 4], ["farm", 16, 4],
  ["tree", 3, 7], ["tree", 11, 7], ["tree", 19, 8], ["flower", 7, 7], ["flower", 8, 7], ["rock", 15, 8],
];
