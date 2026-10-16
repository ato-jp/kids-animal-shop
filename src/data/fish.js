// 釣り場・エサ・竿（第1弾）。
// 2026-10-16「いけ・かわ・うみ ぐらいシンプルに」→ 釣り場は3つ（STAGES）。どれも はじめから行ける。cost は行くお金（コイン）。
// 生き物の表（data/aquatic.js）の area は 出典と合わせるため 細かいまま残し、STAGE_OF で 3つに読みかえる。
// うみ は 投げた距離で「ちかく」（うみべの魚）と「おき」（おき・みなみのしま・きたのくにの魚）に分かれる（ZONE_OF）
export const STAGES = {
  pond: { name: "いけ", icon: "frog", cost: 0, color: 0x7cc47a, bg: "spot_pond" },
  river: { name: "かわ", icon: "mountain", cost: 3, color: 0x6fb8d8, bg: "spot_river" },
  sea: { name: "うみ", icon: "beach", cost: 5, color: 0x4aa8e0, bg: "spot_beach" },
};
export const AREAS = STAGES; // 前の名前で使っている所のため
export const STAGE_OF = { pond: "pond", river: "river", beach: "sea", offshore: "sea", south: "sea", north: "sea" };
export const ZONE_OF = { beach: "near", offshore: "far", south: "far", north: "far" };
// 図鑑の「あえる ところ」
export const PLACE_NAME = { pond: "いけ", river: "かわ", beach: "うみ（ちかく）", offshore: "うみ（おき）", south: "うみ（おき）", north: "うみ（おき）" };
// うみ で「おき」になる 投げた距離（奥ゆき wz、0 が手前・1 が いちばん奥）
export const FAR_FROM = 0.5;
// レア度（1〜4）ごとの 基本の出やすさ。エサと竿の倍率をかける
export const BASE_WEIGHT = [60, 28, 10, 2];
// fit は その場所との相性（アタリの来やすさ）
export const BAITS = {
  worm: { name: "ミミズ", icon: "worm", qty: 10, price: 3, weight: [1, 1, 0.6, 0.3], fit: { pond: 1.3, river: 1.3, sea: 0.7 } },
  okiami: { name: "オキアミ", icon: "shrimp", qty: 10, price: 5, weight: [1, 1.2, 1.2, 1], fit: { pond: 0.8, river: 1, sea: 1.2 } },
  live: { name: "いきエサ", icon: "fish", qty: 5, price: 10, weight: [0.5, 1, 1.8, 2.5], fit: { pond: 0.7, river: 1, sea: 1.3 } },
};
// power は 糸の じょうぶさ。リールの計算（logic/fishing.js）で使う
export const RODS = {
  basic: { name: "ふつうの さお", price: 0, power: 1, weight: [1, 1, 1, 0.5] },
  strong: { name: "じょうぶな さお", price: 150, power: 1.5, weight: [1, 1, 1.2, 1] },
  pro: { name: "プロの さお", price: 600, power: 2.2, weight: [0.8, 1, 1.5, 2] },
};
export const RARITY_NAME = ["", "よく つれる", "ときどき", "めずらしい", "まぼろし"];
