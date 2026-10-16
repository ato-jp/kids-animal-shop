// 柵・水槽（第1弾）。お店の床のマス目に置く。レベル1→2→3で 広さ（住める数）と大きさ・居心地が上がる。
// 費用は仮（docs/design-tables.md）。cost[0]＝たてる、cost[1]＝Lv2へ、cost[2]＝Lv3へ。
export const PENS = {
  cage: { name: "どうぶつの さく", icon: "house", cost: [100, 300, 800], color: 0xffe2b8, water: false },
  tank: { name: "すいそう", icon: "water", cost: [80, 250, 600], color: 0x9fdcf0, water: true },
  cold: { name: "つめたい みずべ", icon: "ice", cost: [1000, 2500, 5000], color: 0xd9f3ff, water: true },
  big: { name: "ひろい うんどうじょう", icon: "park", cost: [5000, 10000, 20000], color: 0xd6efb0, water: false },
};
export const MAX_LEVEL = 3;
// レベルごとの床の大きさ（よこ×たて マス）
export const FOOTPRINT = [null, [2, 2], [3, 2], [3, 3]];
// レベルごとの げんきの下がり方・上がり方（広いほど居心地がよい）
export const GENKI_DOWN_RATE = [null, 1, 0.75, 0.55];
export const GENKI_UP_RATE = [null, 1, 1.25, 1.5];
// レベルごとの広さ。生き物は体に合わせて広さを取る（animals.js の space、水の生き物は要る水槽の大きさから）。
// 例：Lv1 の すいそう に 小さな魚なら10ひき、Lv1 の さく に ハムスター6ぴき
export const CAPACITY = { cage: [null, 6, 12, 20], tank: [null, 10, 24, 48], cold: [null, 4, 8, 14], big: [null, 8, 16, 30] };

// お店の床の広さ。お金で広げる（費用は仮）
export const SHOP_SIZES = [{ w: 8, h: 5, cost: 0 }, { w: 12, h: 6, cost: 2000 }, { w: 16, h: 7, cost: 6000 }];
