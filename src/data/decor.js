// お店の外観と内装（「選ぶ」もの）。にんきが上がると見学のお客さんが少しふえる。値段は仮。
// ペットショップでは「少し」。第3弾の動物園・水族館では客足に大きく効かせる予定（DESIGN.md）。
export const DECOR = {
  wall: {
    label: "かべ と ゆか",
    items: {
      wood: { name: "もくめ", price: 0, appeal: 0, wall: 0xfff3e0, stripe: 0xfbe9cc, floor: 0xf6dfb8 },
      pastel: { name: "パステル", price: 200, appeal: 1, wall: 0xfde6f0, stripe: 0xe8f4ff, floor: 0xe6dcf5 },
      jungle: { name: "ジャングル", price: 500, appeal: 2, wall: 0xe4f5d4, stripe: 0xcfeab5, floor: 0xb9d98f },
      ocean: { name: "うみの なか", price: 500, appeal: 2, wall: 0xdaf1fb, stripe: 0xc2e6f5, floor: 0x9fd0e6 },
    },
  },
  sign: {
    label: "かんばん",
    items: {
      plain: { name: "ふつう", price: 0, appeal: 0, color: 0x8a5a2b },
      color: { name: "カラフル", price: 150, appeal: 1, color: 0xff7a59 },
      neon: { name: "ひかる かんばん", price: 600, appeal: 2, color: 0x7a5cff },
    },
  },
  awning: {
    label: "やね",
    items: {
      none: { name: "なし", price: 0, appeal: 0, color: null },
      red: { name: "あかしま", price: 120, appeal: 1, color: 0xe2553d },
      green: { name: "みどりしま", price: 120, appeal: 1, color: 0x3fa56b },
    },
  },
};
export const DEFAULT_DECOR = { wall: "wood", sign: "plain", awning: "none" };
export const VISITOR_SPEND = 3; // 見学のお客さん1人の おみやげ代（仮）
