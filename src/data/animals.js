// 動物の一覧。dest は送り先の種類（zoo=どうぶつえん / aqua=すいぞくかん）。
// cost はおむかえに要るどんぐり。scoop の子はすくいでだけ来る。unlockSent は解放に要る「送った数」。
export const ANIMALS = {
  hamster: { name: "ハムスター", food: "sunflower", dest: "zoo", cost: 2, home: "cage" },
  rabbit: { name: "うさぎ", food: "carrot", dest: "zoo", cost: 3, home: "cage" },
  dog: { name: "いぬ", food: "bone", dest: "zoo", cost: 4, home: "cage" },
  cat: { name: "ねこ", food: "canned", dest: "zoo", cost: 4, home: "cage" },
  penguin: { name: "ペンギン", food: "fish", dest: "aqua", cost: 5, home: "water" },
  lion: { name: "ライオン", food: "meat", dest: "zoo", cost: 8, home: "big", unlockSent: 3 },
  tropical: { name: "ねったいぎょ", food: "shrimp", dest: "aqua", scoop: true, home: "tank" },
  fish: { name: "さかな", food: "shrimp", dest: "aqua", scoop: true, home: "tank" },
  blowfish: { name: "ふぐ", food: "shrimp", dest: "aqua", scoop: true, home: "tank" },
};

export const SCOOP_FISH = Object.keys(ANIMALS).filter(k => ANIMALS[k].scoop);
