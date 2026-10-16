// 陸の動物（第1弾）。数字の出典は docs/design-tables.md、図鑑の文の出典は docs/creature-sources.md。
// food=エサ（foods.js）、pen=住める場所（pens.js）、size=要る広さ（場所のレベルがこれ以上で住める）
// market: pet＝ペットとして幼いころが一番高い／zoo＝動物園向けで若い大人が一番高い
// space: 柵の中で取る広さ（柵の広さは pens.js の CAPACITY）。group: 同じ group なら同じ柵で飼える（食べる・食べられるは別の group）
// cost: お店で買う値段（null は買えない＝寄贈・第3弾）、price: 一番高く売れるときの値段（仮をふくむ）
// life/adult/old: 寿命・大人になる年齢・お年よりになる年齢（ゲームの年）。sellFromDays: 生まれてから売れるまで（ゲームの日）
// fact: 出典のある文だけ。出典のないものは空にしておく
const A = o => ({ size: 1, sellFromDays: 0, cost: null, fact: "", ...o });

export const ANIMALS = {
  hamster: A({ name: "ハムスター", space: 1, group: "small", food: "hamsterfood", pen: "cage", market: "pet", cost: 8, price: 25,
    life: 2.5, adult: 2 / 12, old: 2, sellFromDays: 21,
    fact: "ほおぶくろに たべものを たくさん つめて はこぶよ。" }),
  rabbit: A({ name: "うさぎ", space: 2, group: "small", food: "rabbitfood", pen: "cage", market: "pet", cost: 250, price: 500,
    life: 8, adult: 0.5, old: 6, sellFromDays: 45,
    fact: "はが ずっと のびつづける。かたい ものを かじって けずるよ。" }),
  cat: A({ name: "ねこ", space: 3, group: "pet", food: "catfood", pen: "cage", size: 2, market: "pet", cost: 1200, price: 2500,
    life: 14.5, adult: 1, old: 11, sellFromDays: 57 }), // 生後56日を過ぎるまで売れない（動物愛護管理法）
  dog: A({ name: "いぬ", space: 4, group: "pet", food: "dogfood", pen: "cage", size: 2, market: "pet", cost: 1500, price: 3000,
    life: 14, adult: 1, old: 10, sellFromDays: 57 }),
  penguin: A({ name: "ペンギン", endangered: true, space: 1, group: "cold", food: "fishfood", pen: "cold", market: "zoo", price: 6000,
    life: 20, adult: 2, old: 15, fact: "にほんの すいぞくかんで いちばん おおく くらす ペンギン。" }), // 附属書I。お店では買えない
  seal: A({ name: "アザラシ", space: 3, group: "cold", food: "fishfood", pen: "cold", size: 2, market: "zoo", price: 10000,
    life: 30, adult: 4, old: 22 }),
  lion: A({ name: "ライオン", space: 5, group: "meat", food: "meat", pen: "big", size: 2, market: "zoo", price: 20000,
    life: 20, adult: 3, old: 15, fact: "オスと メスと こどもで むれを つくる。かりは おもに メスが するよ。" }),
  zebra: A({ name: "シマウマ", space: 4, group: "grass", food: "hay", pen: "big", size: 2, market: "zoo", price: 10000,
    life: 16, adult: 3, old: 12, fact: "しまもようは 1とうずつ すこしずつ ちがう。むしに さされにくく なる という せつが あるよ。" }),
  tiger: A({ name: "トラ", space: 5, group: "meat", food: "meat", pen: "big", size: 2, market: "zoo", price: 30000,
    life: 20, adult: 3, old: 15 }),
  giraffe: A({ name: "キリン", space: 8, group: "grass", food: "hay", pen: "big", size: 3, market: "zoo", price: 40000,
    life: 25, adult: 4, old: 19, fact: "ながい したは 50センチほど。したで はっぱを まきとって たべるよ。" }),
  elephant: A({ name: "ゾウ", space: 12, group: "grass", food: "hay", pen: "big", size: 3, market: "zoo", price: 50000,
    life: 70, adult: 12, old: 45, fact: "やせいでも どうぶつえんでも 60〜80ねん ほど いきるよ。" }),
};
