// 釣りの やりとり（リールを 巻く ところ）。画面から 切りはなした 純粋な 計算。
// 2026-10-15「難易度は高めで、メダルゲームの釣りのように本格的に」→ 左右の あばれ・体力・反対に引く を足した。
//   ・指を おしている 間は リールを 巻く（近づくが 糸が はる）。はなすと 糸が ゆるむ
//   ・魚は ときどき 左か右へ あばれる（dir）。指を 画面の「反対がわ」に置いて巻くと 竿を反対に倒したことになり、
//     糸の はりを おさえながら 体力（stamina）を けずれる。同じがわで巻くと すぐ はって 切れる
//   ・体力が 残っている魚は あまり寄ってこない。弱らせてから 巻きあげる
//   はりすぎが つづく → 糸が きれる / ゆるすぎが つづく → にげられる / 遠くへ 行かれる → にげられる
// 数字は tools/sim_fishing.mjs（自動で遊ぶ人で 何回も試す）で決めた。結果は下の FISH_POWER の説明に書く
import { species } from "./shop.js";
import { RODS } from "../data/fish.js";
import { SHINES } from "../data/shine.js";

export const SAFE = [0.2, 0.8];
// レア度ごとの 強さと 体力。試算（tools/sim_fishing.mjs、反応0.3秒・上手な子／反応0.6秒・ふつうの子 各400回）は README の作業記録
const FISH_POWER = [1, 1.3, 1.7, 2.2];
const FISH_STAMINA = [1, 1.6, 2.6, 4];
const BREAK_SEC = 0.6, SLACK_SEC = 2;
// 糸の切れにくさ（grip）：良い竿と つりレベルで上がる。あばれた時に 同じがわを押しても はりにくく、切れるまで 長く もつ
const ROD_GRIP = { basic: 0, strong: 0.15, pro: 0.3 };
export const gripOf = (rod, level = 1) => (ROD_GRIP[rod] || 0) + 0.04 * Math.min(7, level - 1);

// opt.shine：キラキラ（めずらしいほど 強く よく あばれる）、opt.level：つりレベル
export function newFight(kind, rod, { shine = null, level = 1 } = {}) {
  const d = species(kind), rarity = d.aquatic.rarity, size = 1 + (d.size - 1) * 0.2, c = shine ? SHINES[shine] : null;
  const grip = gripOf(rod, level);
  return {
    kind, shine, dist: 1, tension: 0.35, over: 0, slack: 0, run: false, dir: 0, phase: 0.8, stamina: 1,
    runBias: c ? c.run : 0, breakSec: BREAK_SEC + 0.6 * grip, sameK: Math.max(0.4, 0.75 - 0.5 * grip),
    power: (FISH_POWER[rarity - 1] * size * (c ? c.power : 1)) / RODS[rod].power,
    tough: FISH_STAMINA[rarity - 1] * size,
    weight: 1 + (d.size - 1) * 0.4,
  };
}

// input: true/false（巻く・巻かない）か { hold, side }（side は 指の位置：-1 左・0 まんなか・1 右）
// result: null（つづく）| "caught" | "broke" | "escaped"
export function step(f, dt, input, rng = Math.random) {
  const hold = typeof input === "object" ? input.hold : !!input, side = typeof input === "object" ? input.side || 0 : 0;
  const g = { ...f };
  const tired = 0.35 + 0.65 * g.stamina; // 弱るほど 力が出ない
  g.phase -= dt;
  if (g.phase <= 0) {
    g.run = rng() < 0.25 + 0.4 * g.stamina + (g.runBias || 0);
    g.dir = g.run ? (rng() < 0.5 ? -1 : 1) : 0;
    g.phase = g.run ? 0.6 + rng() * 1.2 : 0.5 + rng() * 1.0;
  }
  const counter = g.run && side === -g.dir, same = g.run && side === g.dir;
  const pull = g.run ? g.power * tired : 0.12 * g.power;
  g.tension += ((hold ? 0.65 : -0.95) + pull * (counter ? 0.3 : same ? (g.sameK ?? 0.75) : 0.55)) * dt;
  g.tension = Math.max(0, Math.min(1.2, g.tension));
  // 体力は 糸を ほどよく張っているあいだ けずれる。反対に引くと よく けずれる
  const safe = g.tension >= SAFE[0] && g.tension <= SAFE[1];
  g.stamina = Math.max(0, g.stamina - (dt * (safe ? 1 : 0.25) * (counter ? 0.32 : 0.1)) / g.tough);
  // 近づく速さ：体力が 残っているほど 寄ってこない
  if (hold) g.dist -= (0.42 / g.weight) * (g.run ? (counter ? 0.45 : 0.1) : 1) * (1.15 - 0.85 * g.stamina) * dt;
  else if (g.run) g.dist += 0.07 * g.power * tired * dt;
  g.over = g.tension > SAFE[1] ? g.over + dt : Math.max(0, g.over - dt * 2);
  g.slack = g.tension < SAFE[0] ? g.slack + dt : 0;
  let result = null;
  if (g.dist <= 0) result = "caught";
  else if (g.over >= (g.breakSec ?? BREAK_SEC)) result = "broke";
  else if (g.slack >= SLACK_SEC || g.dist >= 1.3) result = "escaped";
  return { f: g, result };
}
