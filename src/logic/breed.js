// 色変わりと 血統くじ（第2弾・赤ちゃん。2026-10-15 壁打ちで決定、docs/brainstorm-v3.md）。画面から切りはなした純粋な計算。
// 子の色：父の色45%・母の色45%・祖父母4匹のどれか 合わせて8%（覚醒遺伝）・ひい祖父母8匹のどれか 合わせて1.5%・新しい色0.5%（突然変異）
// 先祖の色は 3代前まで 子に書き写す（a.line = [[父,母], [祖父母4], [ひい祖父母8]]）。売っても いんたいしても 消えない。
// 釣った子・買った子は 親が分からないので「先祖も自分と同じ色」とみなす。
import { MORPHS } from "../data/morphs.js";

export const morphSpec = kind => MORPHS[kind] || null;
// 名前（色変わりが無い生き物は 空）
export function morphName(a) {
  const m = morphSpec(a.kind);
  if (!m) return "";
  return a.morph ? m.list[a.morph]?.name || "" : m.base;
}
export const morphPaint = a => (a.morph && morphSpec(a.kind)?.list[a.morph]?.paint) || null;

// 釣った・買った子の色（wild の割合。残りは base）
export function rollMorph(kind, rng = Math.random) {
  const m = morphSpec(kind);
  if (!m) return null;
  let r = rng();
  for (const [id, p] of Object.entries(m.wild || {})) { if (r < p) return id; r -= p; }
  return null;
}

export const lineOf = a => a.line || [[a.morph ?? null, a.morph ?? null], Array(4).fill(a.morph ?? null), Array(8).fill(a.morph ?? null)];

// 子の色と 血統
export function inherit(father, mother, rng = Math.random) {
  const lf = lineOf(father), lm = lineOf(mother), m = morphSpec(father.kind);
  const line = [[father.morph ?? null, mother.morph ?? null], [...lf[0], ...lm[0]], [...lf[1], ...lm[1]]];
  let r = rng(), morph;
  if (r < 0.45) morph = father.morph ?? null;
  else if (r < 0.9) morph = mother.morph ?? null;
  else if (r < 0.98) morph = line[1][Math.floor(((r - 0.9) / 0.08) * 4) % 4];
  else if (r < 0.995) morph = line[2][Math.floor(((r - 0.98) / 0.015) * 8) % 8];
  else { const ids = [null, ...Object.keys(m?.list || {})]; morph = ids[Math.floor(rng() * ids.length)]; }
  return { morph: m ? morph : null, line };
}
