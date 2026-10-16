// キラキラ（2026-10-15 決定）：ブロンズ ＜ シルバー ＜ ゴールド ＜ レインボー。
// 2026-10-16「釣りスピリッツのように色違いで」→ 魚の色も変わる（paint：銅色・銀色・金色。レインボーは虹色に変わり続ける）うえで、光の粒と ふちの光で光る。
// めずらしいほど 高く売れるが、よく あばれる。交配では ほとんど受け継がない（第2弾。docs/brainstorm-v3.md）。
// odds は 1匹ごとの出やすさ、price は 値段の倍率、power は 引きの強さの倍率、run は あばれる回数の上乗せ（logic/fishing.js）、
// glow は 光の粒の色（レインボーは いろいろな色）、rate は 1秒に出る粒の数。
// 陸の動物の「めずらしい色」（1/100・値段3倍）は ゴールドとして見せる。
export const SHINES = {
  bronze: { name: "ブロンズ", odds: 1 / 30, price: 1.5, power: 1.15, run: 0.08, glow: [0xd08a4a], rate: 3, paint: 0xd9905a },
  silver: { name: "シルバー", odds: 1 / 100, price: 3, power: 1.35, run: 0.14, glow: [0xe8eef5], rate: 5, paint: 0xe4ebf2 },
  gold: { name: "ゴールド", odds: 1 / 400, price: 8, power: 1.65, run: 0.22, glow: [0xffd54a], rate: 8, paint: 0xffd23a },
  rainbow: { name: "レインボー", odds: 1 / 1500, price: 20, power: 1.9, run: 0.3, glow: [0xff6a6a, 0xffc36a, 0xfff07a, 0x8af08a, 0x7ac8ff, 0xb48aff], rate: 12 },
};
export const SHINE_IDS = Object.keys(SHINES);
