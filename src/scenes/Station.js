// えき：全国の動物園・水族館の地図と「こうけん」、つぎのお返し、とどいた寄贈を受けとる。
// 売るのは お店の柵の中から（売り先はここの園）。
import { store } from "../store.js";
import * as S from "../logic/shop.js";
import { PLACES } from "../data/places.js";
import { REWARDS } from "../data/rewards.js";
import { BAITS, RODS } from "../data/fish.js";
import { W, H, text, img, creature, card, panel, floatText } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { MESSAGE } from "./Shop.js";
import { sfx } from "../sound/sfx.js";
import { bgm } from "../sound/bgm.js";
import { railConnected } from "../logic/town.js";
import { kidFace } from "../ui/kit.js";

const ISLANDS = [
  [1000, 160, 120, 70, 0.1], [905, 290, 60, 110, 0.3], [860, 410, 80, 64, 0], [770, 430, 130, 58, -0.25],
  [600, 490, 150, 46, -0.2], [440, 475, 120, 38, -0.15], [520, 565, 85, 30, -0.1], [270, 565, 70, 88, 0.1], [110, 650, 44, 18, -0.4],
];
const giftIcon = g => (g.animal ? g.animal : g.rod ? "pole" : BAITS[g.bait].icon);
const giftName = g => (g.animal ? S.species(g.animal).name : g.rod ? RODS[g.rod].name : `${BAITS[g.bait].name} ${g.n}こ`);

export class Station extends Phaser.Scene {
  constructor() { super("Station"); }
  create() {
    bgm.play("town");
    this.cameras.main.setBackgroundColor("#5fb3dd");
    for (const [x, y, rx, ry, rot] of ISLANDS) {
      this.add.ellipse(x, y, rx * 2 + 16, ry * 2 + 16, 0xf3e3b5).setRotation(rot);
      this.add.ellipse(x, y, rx * 2, ry * 2, 0x9ed37a).setRotation(rot);
    }
    topBar(this);
    const shop = store.shop;
    for (const [id, p] of Object.entries(PLACES)) {
      const pl = shop.places[id], x = p.x * W, y = 84 + p.y * (H - 110);
      const c = this.add.container(x, y);
      c.add(this.add.graphics().fillStyle(0xffffff, 1).fillCircle(0, 0, 40).lineStyle(5, p.kind === "zoo" ? 0xffb347 : 0x5fb8ff, 1).strokeCircle(0, 0, 40));
      c.add(img(this, 0, 0, p.kind === "zoo" ? "lion" : "dolphin", 58));
      c.add(text(this, 0, 54, pl.name, 15, "#24435a", { stroke: "#ffffff", strokeThickness: 5 }));
      c.add(text(this, 0, 76, `こうけん ${pl.points}`, 15, "#2e7d32", { stroke: "#ffffff", strokeThickness: 5 }));
      c.setSize(100, 100).setInteractive({ useHandCursor: true });
      c.on("pointerup", () => this.placePanel(id));
    }
    // となりまち：えき から 町のはしまで せんろ を つなぐと、でんしゃで 兄弟の お店を見に行ける（見るだけ。売り買いは第2弾）
    const others = Object.entries(store.family.kids).filter(([id]) => id !== store.family.current);
    if (others.length) {
      const ok = railConnected(shop);
      card(this, this.add.container(), W - 200, 160, 330, 90, () => { sfx.pop(); ok ? this.trainPanel(others) : floatText(this, W - 200, 230, "えき から まちの はしまで せんろを つなごう（まちの もようがえ → かざり）", "#ffffff"); }, ok ? 0xffe28a : 0xe8e8e8);
      img(this, W - 320, 160, "truck", 56).setAlpha(ok ? 1 : 0.4);
      text(this, W - 180, 160, ok ? "でんしゃで となりまちへ" : "せんろが まだ つながって いないよ", ok ? 20 : 16, ok ? "#4a2c17" : "#7a6a5a");
    }
    // とどいた寄贈（動物は住める場所があれば受けとれる）
    if (shop.gifts.length) {
      card(this, this.add.container(), 170, 160, 280, 90, () => this.giftPanel(), 0xffe28a);
      img(this, 70, 160, "gift", 56);
      text(this, 200, 160, `とどいた おれい ${shop.gifts.length}`, 22, "#4a2c17");
    }
  }

  trainPanel(others) {
    const P = panel(this, "だれの おみせに いく？", { w: 900, h: 520 });
    others.forEach(([id, k], i) => {
      const x = W / 2 - ((others.length - 1) * 230) / 2 + i * 230, y = H / 2 + 10;
      card(this, P.L, x, y, 200, 220, () => { sfx.pop(); P.close(); this.scene.start("Shop", { visit: id }); });
      P.L.add([kidFace(this, x, y - 30, id, k, 110), text(this, x, y + 70, (k.name || "") + "の おみせ", 18, "#4a2c17")]);
      if (k.shop?.zoo) { // 兄弟の どうぶつえんも 見に行ける（第3弾）
        card(this, P.L, x, y + 150, 200, 56, () => { sfx.pop(); P.close(); this.scene.start("Zoo", { visit: id }); }, 0xd8f0c8);
        P.L.add(text(this, x, y + 150, "🦁 どうぶつえん", 18, "#2e6b4f"));
      }
    });
  }

  placePanel(id) {
    sfx.pop();
    const pl = store.shop.places[id], ladder = REWARDS[PLACES[id].kind];
    const P = panel(this, pl.name);
    P.L.add(text(this, W / 2, P.top + 110, `こうけん ${pl.points}（うった ねだん 100コイン につき 1）`, 22, "#2e7d32"));
    ladder.forEach((g, i) => {
      const x = P.left + 140 + i * 205, y = P.top + 260, got = i < pl.rewarded;
      card(this, P.L, x, y, 185, 200, () => {}, got ? 0xd9f2d0 : 0xffffff);
      P.L.add(g.animal ? creature(this, x, y - 40, g.animal, 80) : img(this, x, y - 40, giftIcon(g), 70));
      P.L.add(text(this, x, y + 30, giftName(g), 16, "#4a2c17", { wordWrap: { width: 170 } }));
      P.L.add(text(this, x, y + 70, got ? "もらった" : `こうけん ${g.points}`, 18, got ? "#2e7d32" : "#7a4a1e"));
    });
    const sent = pl.sent.slice(-10);
    P.L.add(text(this, W / 2, P.top + 420, sent.length ? "おくった いきもの" : "まだ おくって いないよ", 22, "#4a2c17"));
    sent.forEach((k, i) => P.L.add(creature(this, W / 2 - ((sent.length - 1) * 80) / 2 + i * 80, P.top + 500, k, 64)));
  }

  giftPanel() {
    sfx.pop();
    const P = panel(this, "とどいた おれい");
    store.shop.gifts.forEach((g, i) => {
      const x = P.left + 160 + (i % 4) * 260, y = P.top + 200 + Math.floor(i / 4) * 220;
      card(this, P.L, x, y, 230, 200, () => {
        const r = S.claimGift(store.shop, i, Date.now());
        if (r.result !== "ok") { sfx.no(); floatText(this, x, y - 90, r.result === "noroom" ? `${S.species(g.animal).name}：${MESSAGE[r.why]}` : "", "#a0522d"); return; }
        store.setShop(r.shop); sfx.star(); P.close(); this.scene.restart();
      });
      P.L.add([creature(this, x, y - 30, g.animal, 90), text(this, x, y + 50, giftName(g), 20, "#4a2c17"), text(this, x, y + 80, `${PLACES[g.from].name} から`, 14, "#7a6a5a")]);
    });
  }
}
