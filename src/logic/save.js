// セーブの読み書き。storage は localStorage と同じ形（getItem / setItem）なら何でもよい（テストで差し替える）。
// 形を変えたら VERSION を上げ、migrate に「古い形 → 新しい形」を足す。古いセーブは捨てない。
import { newFamily, newAnimal } from "./state.js";
import { ANIMALS } from "../data/animals.js";

export const KEY = "kas.save";
export const VERSION = 2;

// 版1（4〜6歳向け）→ 版2：どんぐり→お金、部屋の種類・エサの在庫・げんき・1日の営業を足す
function shopV1toV2(old) {
  const defaults = ["cage", "cage", "cage", "tank", "tank", null];
  const seen = new Set(Object.values(old.places).flatMap(p => p.sent));
  const rooms = old.slots.map((a, i) => {
    if (!a) return { type: defaults[i], animal: null };
    seen.add(a.kind);
    return { type: ANIMALS[a.kind].room, animal: { ...newAnimal(a.id, a.kind), hunger: a.hunger, clean: a.clean, dirty: a.dirty, stars: a.stars } };
  });
  return {
    money: 1000 + old.kuri * 100, rooms, stock: { sunflower: 5, shrimp: 10 },
    places: old.places, totalSent: old.totalSent, seen: [...seen],
    playMinutes: old.playMinutes, played: old.played,
    day: { n: 1, sec: 0, log: { care: 0, sent: 0, income: 0, expense: 0 } },
    nextId: old.nextId,
  };
}

export function migrate(data) {
  if (!data || typeof data !== "object" || typeof data.version !== "number") throw new Error("セーブの形が違う");
  if (data.version > VERSION) throw new Error("新しい版のセーブ");
  if (data.version === 1) {
    for (const k of Object.values(data.kids)) k.shop = shopV1toV2(k.shop);
    data.version = 2;
  }
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
