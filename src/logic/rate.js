// 相場（時価）：生き物の種類ごとに 毎日少しずつ上がり下がりする値段の倍率（0.7〜1.3）。
// 日付と種類だけから計算するので 保存しなくてよく、兄弟で同じ相場になる。グラフ用に 前の日も同じ式で出せる。
// 波は 周期のちがう3つの sin を重ねる（37日・11日・5日）。位相は種類ごとに hash で決める。
import { hash } from "./rng.js";

const DAY = 24 * 60 * 60 * 1000;
// その土地の日付の通し番号（0時で変わる）
export const dayIndex = t => { const d = new Date(t); return Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY); };

export function marketRate(kind, t) {
  const d = dayIndex(t), P = Math.PI * 2;
  const r = 1 + 0.13 * Math.sin((P * d) / 37 + P * hash(kind, "a")) + 0.08 * Math.sin((P * d) / 11 + P * hash(kind, "b")) + 0.04 * Math.sin((P * d) / 5 + P * hash(kind, "c"));
  return Math.round(Math.max(0.7, Math.min(1.3, r)) * 100) / 100;
}

// 過去 n 日の相場（グラフ用。古い順）
export const rateHistory = (kind, t, n = 30) => Array.from({ length: n }, (_, i) => marketRate(kind, t - (n - 1 - i) * DAY));
