// お店に「置く」家具（マス目に指で引っぱって置く）。値段・にんきは仮（docs/design-tables.md）。
// toy: 柵・水槽の中かとなりのマスに置くと、その場所の子の げんきが下がりにくい（下がり方 × 0.8）
// season: その季節（time.js の番号）にだけ いちばで買える。置いたあとは いつでも飾れる
export const FURNITURE = {
  plant: { name: "うえき", icon: "plant", w: 1, h: 1, price: 30, appeal: 1 },
  flower: { name: "はな", icon: "sunflower", w: 1, h: 1, price: 20, appeal: 1 },
  bench: { name: "ベンチ", icon: "house", w: 2, h: 1, price: 80, appeal: 1 },
  ball: { name: "ボール（おもちゃ）", icon: "star", w: 1, h: 1, price: 50, appeal: 0, toy: true },
  wheel: { name: "まわしぐるま（おもちゃ）", icon: "gear", w: 1, h: 1, price: 60, appeal: 0, toy: true },
  rock: { name: "いわ（おもちゃ）", icon: "mountain", w: 1, h: 1, price: 80, appeal: 0, toy: true },
  sakura: { name: "さくらの き", icon: "plant", w: 1, h: 1, price: 200, appeal: 2, season: 0 },
  fuurin: { name: "ふうりん", icon: "bubbles", w: 1, h: 1, price: 150, appeal: 2, season: 1 },
  momiji: { name: "もみじの き", icon: "leafy", w: 1, h: 1, price: 200, appeal: 2, season: 2 },
  yukidaruma: { name: "ゆきだるま", icon: "ice", w: 1, h: 1, price: 150, appeal: 2, season: 3 },
};
