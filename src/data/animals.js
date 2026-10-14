// 動物の一覧。food は食べるエサ（data/foods.js）、room は住める部屋（data/rooms.js）。
// water の子は せっけんではなく「みずかえ」できれいにする。dest は送り先の種類（zoo / aqua）。
// cost は仕入れ値、price は旅立ちのお礼の基本（円）。unlockSent は解放に要る「送った数」。
// fact は図鑑に出す本当の話（ひらがな・カタカナだけ）。
export const ANIMALS = {
  hamster: { name: "ハムスター", food: "sunflower", room: "cage", dest: "zoo", cost: 300, price: 700,
    fact: "よるに げんきに うごく どうぶつ。ほおぶくろに たべものを つめて はこぶよ。" },
  rabbit: { name: "うさぎ", food: "carrot", room: "cage", dest: "zoo", cost: 500, price: 1000,
    fact: "まえばが ずっと のびつづける。かたい ものを かじって はを けずるよ。" },
  dog: { name: "いぬ", food: "bone", room: "cage", dest: "zoo", cost: 800, price: 1600,
    fact: "はなが とても よくて、においで なかまを みわけるよ。" },
  cat: { name: "ねこ", food: "canned", room: "cage", dest: "zoo", cost: 800, price: 1600,
    fact: "ひげで まわりの ようすを かんじとる。くらい ところでも よく みえるよ。" },
  penguin: { name: "ペンギン", food: "fish", room: "cold", dest: "aqua", water: true, cost: 1500, price: 3000,
    fact: "そらは とべないけれど、みずの なかを はやく およぐのが とくい。" },
  lion: { name: "ライオン", food: "meat", room: "big", dest: "zoo", cost: 3000, price: 6000, unlockSent: 3,
    fact: "むれで くらす ネコの なかま。おすには りっぱな たてがみが あるよ。" },
  elephant: { name: "ゾウ", food: "leafy", room: "big", dest: "zoo", cost: 5000, price: 10000, unlockSent: 6,
    fact: "りくで いちばん おおきい どうぶつ。はなを てのように つかって たべるよ。" },
  tropical: { name: "ねったいぎょ", food: "shrimp", room: "tank", dest: "aqua", water: true, scoop: true, price: 400,
    fact: "あたたかい うみの サンゴの まわりで くらす なかまが おおいよ。" },
  fish: { name: "さかな", food: "shrimp", room: "tank", dest: "aqua", water: true, scoop: true, price: 300,
    fact: "えらで みずに とけた さんそを とりこんで いきを しているよ。" },
  blowfish: { name: "フグ", food: "shrimp", room: "tank", dest: "aqua", water: true, scoop: true, price: 500,
    fact: "びっくりすると みずを のんで からだを まるく ふくらませるよ。" },
};

export const SCOOP_FISH = Object.keys(ANIMALS).filter(k => ANIMALS[k].scoop);
