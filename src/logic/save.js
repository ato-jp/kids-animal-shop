// セーブの読み書き。storage は localStorage と同じ形（getItem / setItem）なら何でもよい（テストで差し替える）。
// 形を変えたら VERSION を上げ、migrate に「古い形 → 新しい形」を足す。古いセーブは捨てない。
import { newFamily } from "./state.js";

export const KEY = "kas.save";
export const VERSION = 1;

export function migrate(data) {
  if (!data || typeof data !== "object" || typeof data.version !== "number") throw new Error("セーブの形が違う");
  if (data.version > VERSION) throw new Error("新しい版のセーブ");
  // 版1しかまだない。版2を作ったらここに if (data.version === 1) {...; data.version = 2} を足す
  return data;
}

export function load(storage) {
  let raw = null;
  try { raw = storage.getItem(KEY); } catch (e) { return newFamily(); }
  if (!raw) return newFamily();
  try { return migrate(JSON.parse(raw)); }
  catch (e) {
    // 読めないセーブは消さずに退避してから新しく始める
    try { storage.setItem(KEY + ".broken", raw); } catch (e2) {}
    return newFamily();
  }
}

export function save(storage, family) {
  try { storage.setItem(KEY, JSON.stringify(family)); return true; } catch (e) { return false; }
}
