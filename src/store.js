// 家族の記録の読み書き。数年分・写真入りになるので IndexedDB に置く（localStorage は約5MBで足りない見込み）。
// IndexedDB が使えない環境では localStorage に置く。版2までは localStorage の "kas.save" に置いていたので、
// 初めて開いたときにそこから読み、IndexedDB へ移す（元の localStorage の記録は消さずに残す）。
import { parse, serialize, newFamily, KEY } from "./logic/save.js";
import { advance } from "./logic/shop.js";

const DB = "kas", STORE = "kv";

function idb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("no idb"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key) {
  const db = await idb();
  return new Promise((res, rej) => { const r = db.transaction(STORE).objectStore(STORE).get(key); r.onsuccess = () => res(r.result ?? null); r.onerror = () => rej(r.error); });
}
async function idbSet(key, val) {
  const db = await idb();
  return new Promise((res, rej) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(val, key); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); });
}
const ls = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
};

export const store = {
  family: newFamily(),
  useIdb: true,
  paused: false, // おとなの設定を開いている間は時間を進めない（画面の更新を止めるだけ。現実の時計は進む）

  async load() {
    let raw = null;
    try { raw = await idbGet(KEY); } catch (e) { this.useIdb = false; }
    if (!raw) raw = ls.get(KEY); // 版2までの置き場所から
    const { family, broken } = parse(raw);
    if (broken) await this.write(KEY + ".broken", broken);
    this.family = family;
    await this.persist();
    return family;
  },
  async write(key, val) {
    if (this.useIdb) { try { return await idbSet(key, val); } catch (e) { this.useIdb = false; } }
    return ls.set(key, val);
  },
  persist() { return this.write(KEY, serialize(this.family)); },

  get kid() { return this.family.kids[this.family.current] || null; },
  get shop() { return this.kid ? this.kid.shop : null; },
  setShop(shop) { if (this.kid) { this.kid.shop = shop; this.persist(); } },
  // 今の時刻まで進めてから返す（画面はいつもこれで最新を読む）
  tick(now = Date.now()) {
    if (!this.kid) return null;
    const s = advance(this.kid.shop, now);
    if (s !== this.kid.shop) this.setShop(s);
    return s;
  },
  setFamily(f) { this.family = f; this.persist(); },

  // おとなの「控え」：ファイルに保存する文字列と、ファイルから戻す
  exportText() { return serialize(this.family); },
  async importText(text) {
    const { family, broken } = parse(text);
    if (broken) return false;
    this.family = family;
    await this.persist();
    return true;
  },
};
