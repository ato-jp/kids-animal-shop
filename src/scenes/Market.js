// いちば：エサ・どうぶつ・水の生き物・釣り道具を買う。「そうば」で きょうの相場と 30日の動きを見る（売るのは お店の はんばいよう の柵・水槽で）。上のタブで切りかえる。
import { store } from "../store.js";
import * as S from "../logic/shop.js";
import { rateHistory } from "../logic/rate.js";
import { FOODS } from "../data/foods.js";
import { BAITS, RODS } from "../data/fish.js";
import { PENS } from "../data/pens.js";
import { W, H, text, img, card, creature, floatText, coin, backdrop } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { MESSAGE } from "./Shop.js";
import { sfx } from "../sound/sfx.js";
import { bgm } from "../sound/bgm.js";

const TABS = [["fork", "エサ"], ["dog", "どうぶつ"], ["fish", "すいそうの いきもの"], ["pole", "つりどうぐ"], ["chart", "そうば"]];

export class Market extends Phaser.Scene {
  constructor() { super("Market"); }
  create({ tab = 0, page = 0 } = {}) {
    bgm.play("town");
    this.cameras.main.setBackgroundColor("#f3ead8");
    backdrop(this, "market", 0.45);
    topBar(this);
    TABS.forEach(([icon, label], i) => {
      const x = 135 + i * 240, on = i === tab;
      card(this, this.add.container(), x, 130, 225, 70, () => { sfx.pop(); this.scene.restart({ tab: i }); }, on ? 0xffe28a : 0xffffff);
      img(this, x - 78, 130, icon, 44);
      text(this, x + 22, 132, label, label.length > 6 ? 16 : 20, "#4a2c17");
    });
    if (tab === 4) { this.rates(page); return; }
    const list = this.items(tab);
    const per = 10, pages = Math.ceil(list.length / per);
    list.slice(page * per, page * per + per).forEach((it, k) => {
      const x = 140 + (k % 5) * 250, y = 300 + Math.floor(k / 5) * 240;
      card(this, this.add.container(), x, y, 230, 220, () => this.buy(it, x, y));
      it.draw(x, y);
    });
    if (pages > 1) {
      text(this, W / 2, 690, `${page + 1} / ${pages}`, 22, "#7a4a1e");
      if (page > 0) card(this, this.add.container(), W / 2 - 160, 690, 120, 46, () => this.scene.restart({ tab, page: page - 1 }));
      if (page < pages - 1) card(this, this.add.container(), W / 2 + 160, 690, 120, 46, () => this.scene.restart({ tab, page: page + 1 }));
      if (page > 0) text(this, W / 2 - 160, 690, "まえ", 20, "#4a2c17");
      if (page < pages - 1) text(this, W / 2 + 160, 690, "つぎ", 20, "#4a2c17");
    }
  }

  items(tab) {
    const shop = store.shop;
    const label = (x, y, icon, name, price, note) => {
      img(this, x, y - 50, icon, 80);
      text(this, x, y + 20, name, 18, "#4a2c17", { wordWrap: { width: 210 } });
      text(this, x, y + 60, price, 20, "#c0392b");
      if (note) text(this, x, y + 88, note, 15, "#7a6a5a");
    };
    if (tab === 0) return Object.entries(FOODS).map(([k, f]) => ({
      buy: () => S.buyFood(store.shop, k), draw: (x, y) => label(x, y, f.icon, f.name, `${f.qty}かい ${coin(f.price)}`, `いま ${shop.stock[k] || 0}かい`),
    }));
    if (tab === 1 || tab === 2) return S.buyable().filter(k => (tab === 1) === !S.species(k).aquatic).map(k => {
      const d = S.species(k);
      return {
        buy: () => S.buyAnimal(store.shop, k, Date.now()),
        draw: (x, y) => {
          creature(this, x, y - 50, k, 90);
          text(this, x, y + 20, d.name, 18, "#4a2c17", { wordWrap: { width: 210 } });
          text(this, x, y + 60, coin(d.cost), 20, "#c0392b");
          text(this, x, y + 88, d.aquatic ? `${S.WATER_NAME[d.group]}の すいそう Lv${d.size}〜` : `${PENS[d.pen].name} Lv${d.size}〜`, 15, "#7a6a5a");
        },
      };
    });
    return [
      ...Object.entries(BAITS).map(([k, b]) => ({ buy: () => S.buyBait(store.shop, k), draw: (x, y) => label(x, y, b.icon, b.name, `${b.qty}こ ${coin(b.price)}`, `いま ${shop.baits[k] || 0}こ`) })),
      ...Object.entries(RODS).filter(([, r]) => r.price).map(([k, r]) => ({
        buy: () => S.buyRod(store.shop, k), draw: (x, y) => label(x, y, "pole", r.name, shop.rods.includes(k) ? "もっている" : coin(r.price)),
      })),
    ];
  }

  // きょうの相場：お店にいる子の種類（なければ いちばで買える種類）ごとに 倍率と 30日の動き（小さな線グラフ）
  rates(page) {
    const now = Date.now(), shop = store.shop;
    const mine = [...new Set(shop.pens.flatMap(p => p.animals.map(a => a.kind)))];
    const kinds = mine.length ? mine : S.buyable().slice(0, 10);
    text(this, W / 2, 188, mine.length ? "おみせに いる こ の そうば（きょう）" : "そうば（きょう）", 22, "#7a4a1e");
    const per = 8, pages = Math.ceil(kinds.length / per);
    kinds.slice(page * per, page * per + per).forEach((k, i) => {
      const x = 170 + (i % 4) * 315, y = 300 + Math.floor(i / 4) * 210, hist = rateHistory(k, now, 30), r = hist[hist.length - 1];
      card(this, this.add.container(), x + 80, y, 290, 190, () => {});
      creature(this, x - 10, y - 40, k, 70);
      text(this, x + 90, y - 62, S.species(k).name, 18, "#4a2c17", { wordWrap: { width: 160 } });
      text(this, x + 90, y - 30, `×${r.toFixed(2)} ${r >= hist[hist.length - 2] ? "↑" : "↓"}`, 26, r >= 1 ? "#c0392b" : "#2a6fb5");
      // 30日の線グラフ（まんなかの線が ×1.00）
      const g = this.add.graphics(), gx = x - 50, gy = y + 10, gw = 260, gh = 60;
      g.lineStyle(1, 0x000000, 0.15).lineBetween(gx, gy + gh / 2, gx + gw, gy + gh / 2);
      g.lineStyle(3, r >= 1 ? 0xc0392b : 0x2a6fb5, 1).strokePoints(hist.map((v, n) => ({ x: gx + (gw * n) / 29, y: gy + gh / 2 - ((v - 1) / 0.3) * (gh / 2) })));
      text(this, gx, gy + gh + 12, "30にち まえ", 12, "#7a6a5a").setOrigin(0, 0.5);
      text(this, gx + gw, gy + gh + 12, "きょう", 12, "#7a6a5a").setOrigin(1, 0.5);
    });
    if (pages > 1) {
      text(this, W / 2, 690, `${page + 1} / ${pages}`, 22, "#7a4a1e");
      if (page > 0) { card(this, this.add.container(), W / 2 - 160, 690, 120, 46, () => this.scene.restart({ tab: 4, page: page - 1 })); text(this, W / 2 - 160, 690, "まえ", 20, "#4a2c17"); }
      if (page < pages - 1) { card(this, this.add.container(), W / 2 + 160, 690, 120, 46, () => this.scene.restart({ tab: 4, page: page + 1 })); text(this, W / 2 + 160, 690, "つぎ", 20, "#4a2c17"); }
    }
  }

  buy(it, x, y) {
    const r = it.buy();
    if (!(r.ok || r.result === "ok")) { sfx.no(); floatText(this, x, y - 100, MESSAGE[r.why || r.result] || MESSAGE.nomoney, "#a0522d"); return; }
    store.setShop(r.shop);
    sfx.coin();
    floatText(this, x, y - 100, "かったよ！", "#2e7d32");
    this.time.delayedCall(400, () => this.scene.restart(this.sys.settings.data));
  }
}
