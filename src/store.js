// 画面どうしで共有する「いまの家族の記録」。変えたらすぐ端末に保存する。
import { load, save } from "./logic/save.js";
import { localDate } from "./logic/playclock.js";

let storage;
try { storage = window.localStorage; } catch (e) { storage = { getItem: () => null, setItem: () => {} }; }

export const store = {
  family: load(storage),
  paused: false, // おとなの設定を開いている間は時間を数えない
  get kid() { return this.family.kids[this.family.current] || null; },
  get shop() { return this.kid ? this.kid.shop : null; },
  setShop(shop) { if (this.kid) { this.kid.shop = shop; this.persist(); } },
  setFamily(f) { this.family = f; this.persist(); },
  persist() { save(storage, this.family); },
  today: () => localDate(),
};
