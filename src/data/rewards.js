// 寄贈。動物を売ると その園の「こうけん」がたまり、だんかいごとに お返しが届く。
// こうけんは 売った値段 100コイン（＝現実の1万円）につき 1。園ごとに別々にたまる。
// 動物の寄贈は、住める場所（柵の種類と広さ）を用意してから受けとる。ペンギンは第3弾の水族館から（附属書I）。
export const REWARDS = {
  zoo: [
    { points: 30, animal: "zebra" },
    { points: 80, animal: "lion" },
    { points: 150, animal: "tiger" },
    { points: 250, animal: "giraffe" },
    { points: 400, animal: "elephant" },
  ],
  aqua: [
    { points: 5, bait: "okiami", n: 20 },
    { points: 15, rod: "strong" },
    { points: 40, bait: "live", n: 15 },
    { points: 80, animal: "seal" },
    { points: 150, rod: "pro" },
  ],
};
