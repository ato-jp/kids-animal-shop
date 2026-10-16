// エサ。1回分を1日に1回あげる。1袋＝10回分。
// 値段の根拠：アニコム『家庭どうぶつ白書』2025年の年間支出 ÷ 365 を「1日の飼う費用」とし、その10日分（docs/design-tables.md）。
// 動物園の動物と魚のエサは仮。
export const FOODS = {
  hamsterfood: { name: "ハムスターフード", icon: "sunflower", qty: 10, price: 32 },
  rabbitfood: { name: "うさぎの ほしくさ", icon: "carrot", qty: 10, price: 41 },
  catfood: { name: "キャットフード", icon: "canned", qty: 10, price: 54 },
  dogfood: { name: "ドッグフード", icon: "bone", qty: 10, price: 110 },
  fishfood: { name: "アジ（ペンギン・アザラシ用）", icon: "fish", qty: 10, price: 200 },
  meat: { name: "おにく", icon: "meat", qty: 10, price: 500 },
  hay: { name: "ほしくさ（大きな動物用）", icon: "leafy", qty: 10, price: 300 },
  pellet: { name: "さかなの エサ", icon: "shrimp", qty: 10, price: 5 },
};
// 水の生き物は みんな「さかなの エサ」（種類ごとの好みは第2弾以降）
export const AQUATIC_FOOD = "pellet";
