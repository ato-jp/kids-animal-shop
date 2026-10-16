// 決まった種（たね）から決まった乱数を出す。閉じていた間の計算を「何回に分けて進めても同じ結果」に
// するため、汚れなどの起こる・起こらないは (場所のID, 何時間目か) から決める。
export function hash(...parts) {
  let h = 2166136261;
  for (const ch of parts.join("|")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// その場かぎりの乱数（買う・釣るなど）。テストでは差しかえる
export const random = () => Math.random();
