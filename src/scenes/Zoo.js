// 第3弾：じぶんの どうぶつえん・すいぞくかん。てんじ（展示）8わく・もん・きのうの お客さん（ルールは logic/zoo.js）
import { store } from "../store.js";
import * as S from "../logic/shop.js";
import * as Z from "../logic/zoo.js";
import { AQUATIC } from "../data/aquatic.js";
import { W, H, text, card, creature, panel, floatText, coin, burst } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { MESSAGE } from "./Shop.js";
import { sfx } from "../sound/sfx.js";
import { bgm } from "../sound/bgm.js";

const SW = 290, SH = 236, X0 = 36, Y0 = 168, GAP = 16;
const slotXY = i => [X0 + (i % 4) * (SW + GAP), Y0 + Math.floor(i / 4) * (SH + GAP)];
const SAMPLE = { land: "rabbit", big: "lion", cold: "penguin", fresh: "a01", sea: (AQUATIC.find(a => a.water === "sea") || {}).id };
const WHY = { type: "この てんじでは くらせないよ", kind: "1つの てんじに 1しゅるい だよ", full: "いっぱいで もう はいらないよ", sick: "びょうきの こは つれて いけないよ", notempty: "なかの こを もどしてから だよ", zooonly: "この こは どうぶつえんで くらす こ だよ" };
const say = why => WHY[why] || MESSAGE[why] || "できないよ";

export class Zoo extends Phaser.Scene {
  constructor() { super("Zoo"); }
  create() {
    bgm.play("town");
    const shop = store.shop, z = shop.zoo, g = this.add.graphics();
    // 地面：芝生と 園内の小道
    g.fillGradientStyle(0x9fd47c, 0x9fd47c, 0x7fbf62, 0x7fbf62, 1).fillRect(0, 84, W, H - 84);
    for (let k = 0; k < 500; k++) g.fillStyle(k % 2 ? 0x8cc76c : 0xb2df90, 0.55).fillCircle((k * 131) % W, 90 + ((k * 71) % (H - 90)), 2 + (k % 3));
    g.fillStyle(0xe9d8b0, 1).fillRect(0, Y0 + SH + 2, W, GAP - 4);
    topBar(this);
    const name = store.kid?.name ? `${store.kid.name}の どうぶつえん` : "じぶんの どうぶつえん";
    text(this, 40, 128, name, 30, "#ffffff", { stroke: "#2e6b4f", strokeThickness: 7 }).setOrigin(0, 0.5);
    const y = shop.yesterday?.zooVisitors;
    text(this, 700, 128, `きのう ${y ?? "—"}にん ・ あしたの よそう ${Z.zooVisitors(shop)}にん`, 22, "#ffffff", { stroke: "#2e6b4f", strokeThickness: 6 });
    // もん（客足が大きく ふえる）
    const gate = Z.GATES[z.gate];
    card(this, this.add.container(0, 0), 1130, 128, 220, 52, () => { sfx.pop(); this.gateMenu(); }, 0xfff1c9);
    text(this, 1130, 128, `🏯 ${gate.name}`, 20, "#7a4a1e");
    for (let i = 0; i < Z.ZOO_SLOTS; i++) {
      const ex = z.exhibits.find(e => e.slot === i);
      ex ? this.exhibit(ex, ...slotXY(i)) : this.emptySlot(i, ...slotXY(i));
    }
    const next = Z.ZOO_GIFTS[z.given || 0];
    if (next && !z.gifts?.length) text(this, W / 2, 668, `つぎの すいぞくかんからの おくりもの まで あと ${next.visitors - (z.total || 0)}にん`, 18, "#fff4a8", { stroke: "#2e6b4f", strokeThickness: 5 });
    if (z.gifts?.length) this.giftBanner();
    text(this, W / 2, 698, `にゅうえんりょう 1にん ${Z.ZOO_FEE}コイン　しいくいんさん 1ぴき 1にち ${Z.ZOO_KEEP}コイン（${coin(Z.zooKeepCost(shop))}）`, 20, "#ffffff", { stroke: "#2e6b4f", strokeThickness: 5 });
  }

  // てんじの見た目：種類ごとに 地面や水の色、さく・ガラス
  ground(g, type, x, y) {
    const w = SW, h = SH - 40;
    g.fillStyle(0x000000, 0.16).fillRoundedRect(x + 6, y + 8, w, h, 18);
    if (type === "fresh" || type === "sea") {
      const [a, b] = type === "sea" ? [0x5fb4ef, 0x1d5fa8] : [0xa6e0c8, 0x3f8f78];
      g.fillGradientStyle(a, a, b, b, 1).fillRoundedRect(x, y, w, h, 14);
      g.fillStyle(0xe8d9a8, 1).fillRect(x + 6, y + h - 22, w - 12, 16);
      for (let k = 0; k < 6; k++) g.fillStyle(type === "sea" ? 0xff8a7a : 0x5aa858, 0.9).fillTriangle(x + 20 + k * 48, y + h - 8, x + 30 + k * 48, y + h - 50 - (k % 3) * 14, x + 40 + k * 48, y + h - 8);
      g.fillStyle(0xffffff, 0.25).fillRect(x + 12, y + 10, 10, h - 40);
      g.lineStyle(6, 0x37474f, 1).strokeRoundedRect(x, y, w, h, 14);
      return;
    }
    const base = { land: 0xe8d3a0, big: 0xb7dc8a, cold: 0xeaf7ff }[type];
    g.fillStyle(base, 1).fillRoundedRect(x, y, w, h, 18);
    if (type === "cold") g.fillStyle(0x7cc6e8, 1).fillEllipse(x + w * 0.62, y + h * 0.62, w * 0.6, h * 0.42).fillStyle(0xffffff, 0.5).fillEllipse(x + w * 0.55, y + h * 0.55, w * 0.25, h * 0.1);
    if (type === "big") g.fillStyle(0x8a8f96, 1).fillEllipse(x + 50, y + h - 40, 60, 34).fillStyle(0x4f8f3a, 1).fillCircle(x + w - 40, y + 40, 30).fillStyle(0x7a5230, 1).fillRect(x + w - 44, y + 60, 8, 30);
    if (type === "land") g.fillStyle(0xc9a874, 1).fillEllipse(x + 60, y + h - 34, 50, 18).fillStyle(0x6fae4f, 1).fillCircle(x + w - 36, y + 34, 18);
    // 木のさく
    g.lineStyle(5, 0x8a5a33, 1).strokeRoundedRect(x, y, w, h, 18);
    for (let k = 0; k <= 9; k++) g.fillStyle(0x8a5a33, 1).fillRect(x + 4 + k * ((w - 14) / 9), y + h - 18, 6, 22);
  }

  exhibit(ex, x, y) {
    const g = this.add.graphics(), h = SH - 40, water = ex.type === "fresh" || ex.type === "sea";
    this.ground(g, ex.type, x, y);
    ex.animals.slice(0, 5).forEach((a, i) => {
      const px = ex.animals.length > 3 ? 70 : 100, cx = x + 60 + ((i * 97) % (SW - 120)), cy = y + 60 + ((i * 53) % (h - 110));
      const c = creature(this, cx, cy, a.kind, px, S.shineOf(a), S.paintOf(a));
      this.tweens.add({ targets: c, x: cx + (water ? 70 : 30) * (i % 2 ? -1 : 1), y: cy + (water ? 10 : 6), duration: (water ? 3000 : 2200) + i * 300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    });
    const kind = ex.animals[0]?.kind;
    const label = kind ? `${S.species(kind).name}　${ex.animals.length}` : `${Z.EXHIBITS[ex.type].name}（からっぽ）`;
    g.fillStyle(0x5b3a1f, 1).fillRoundedRect(x + 20, y + h + 6, SW - 40, 30, 10);
    text(this, x + SW / 2, y + h + 21, label, 17, "#fff4dc");
    const zone = this.add.zone(x + SW / 2, y + SH / 2, SW, SH).setInteractive({ useHandCursor: true });
    zone.on("pointerup", () => { sfx.pop(); this.exhibitMenu(ex); });
  }

  emptySlot(i, x, y) {
    const g = this.add.graphics(), h = SH - 40;
    g.fillStyle(0xffffff, 0.22).fillRoundedRect(x, y, SW, h, 18).lineStyle(4, 0xffffff, 0.8).strokeRoundedRect(x, y, SW, h, 18);
    text(this, x + SW / 2, y + h / 2 - 10, "＋", 64, "#ffffff");
    text(this, x + SW / 2, y + h / 2 + 44, "てんじを つくる", 20, "#ffffff", { stroke: "#2e6b4f", strokeThickness: 5 });
    const zone = this.add.zone(x + SW / 2, y + SH / 2, SW, SH).setInteractive({ useHandCursor: true });
    zone.on("pointerup", () => { sfx.pop(); this.buildMenu(i); });
  }

  buildMenu(slot) {
    const P = panel(this, "なにを つくる？", { w: 1120, h: 420 });
    Object.entries(Z.EXHIBITS).forEach(([type, e], k) => {
      const x = P.left + 120 + k * 220, y = P.top + 220;
      card(this, P.L, x, y, 200, 250, () => {
        const r = Z.buildExhibit(store.shop, type, slot);
        if (!r.ok) { sfx.no(); floatText(this, x, y - 140, say(r.why)); return; }
        store.setShop(r.shop); sfx.coin(); P.close(); this.scene.restart();
      }, 0xf3ead8);
      P.L.add([creature(this, x, y - 50, SAMPLE[type], 100), text(this, x, y + 40, e.name, 17, "#4a2c17", { wordWrap: { width: 180, useAdvancedWrap: true } }), text(this, x, y + 92, coin(e.cost), 20, "#2e7d32")]);
    });
  }

  // てんじを押したとき：いる子（押すと お店へ もどす）と、つれて来られる お店の子
  exhibitMenu(ex) {
    const shop = store.shop, P = panel(this, Z.EXHIBITS[ex.type].name, { w: 1120, h: 600 });
    P.L.add(text(this, P.left + 40, P.top + 100, "いる こ（おすと おみせへ もどす。うるのは おみせで）", 20, "#7a4a1e").setOrigin(0, 0.5));
    if (!ex.animals.length) P.L.add(text(this, P.left + 300, P.top + 170, "まだ だれも いないよ", 20, "#9a8a7a"));
    ex.animals.slice(0, 9).forEach((a, k) => {
      const x = P.left + 90 + k * 116, y = P.top + 175;
      card(this, P.L, x, y, 104, 104, () => {
        const r = Z.fromZoo(store.shop, a.id);
        if (!r.ok) { sfx.no(); floatText(this, x, y - 70, say(r.why)); return; }
        store.setShop(r.shop); sfx.pop(); P.close(); this.scene.restart();
      }, 0xe9f6ff);
      P.L.add(creature(this, x, y, a.kind, 80, S.shineOf(a), S.paintOf(a)));
    });
    P.L.add(text(this, P.left + 40, P.top + 260, "おみせから つれて くる", 20, "#7a4a1e").setOrigin(0, 0.5));
    const want = shop.pens.flatMap(p => p.animals).filter(a => Z.exhibitFor(a.kind) === ex.type && (!ex.animals.length || a.kind === ex.animals[0].kind));
    if (!want.length) P.L.add(text(this, W / 2, P.top + 340, ex.animals.length ? `おみせに ${S.species(ex.animals[0].kind).name}が いないよ` : "この てんじで くらせる こが おみせに いないよ", 20, "#9a8a7a"));
    want.slice(0, 18).forEach((a, k) => {
      const x = P.left + 90 + (k % 9) * 116, y = P.top + 335 + Math.floor(k / 9) * 116;
      card(this, P.L, x, y, 104, 104, () => {
        const r = Z.toZoo(store.shop, a.id, ex.id);
        if (!r.ok) { sfx.no(); floatText(this, x, y - 70, say(r.why)); return; }
        store.setShop(r.shop); sfx.coin(); burst(this, x, y, "sparkles", 6, 30, 60); P.close(); this.scene.restart();
      }, 0xfff6e0);
      P.L.add([creature(this, x, y - 6, a.kind, 76, S.shineOf(a), S.paintOf(a)), text(this, x, y + 40, S.species(a.kind).name, 13, "#4a2c17")]);
    });
    if (!ex.animals.length) {
      const bx = P.left + P.w - 130, by = P.top + 100;
      card(this, P.L, bx, by, 180, 44, () => {
        const r = Z.removeExhibit(store.shop, ex.id);
        if (!r.ok) { sfx.no(); return; }
        store.setShop(r.shop); sfx.pop(); P.close(); this.scene.restart();
      }, 0xf6d3cc);
      P.L.add(text(this, bx, by, "こわす", 18, "#a0522d"));
    }
  }

  // すいぞくかんから 届いた子：押すと かいすいの おおすいそう に入れる
  giftBanner() {
    const c = this.add.container(W / 2, 664).setDepth(50);
    const g = this.add.graphics().fillStyle(0xff7a59, 1).fillRoundedRect(-200, -22, 400, 44, 22);
    c.add([g, text(this, 0, 0, `🎁 すいぞくかんから とどいたよ（${store.shop.zoo.gifts.length}）`, 20, "#ffffff")]);
    this.tweens.add({ targets: c, scale: 1.06, duration: 500, yoyo: true, repeat: -1 });
    const zone = this.add.zone(W / 2, 664, 400, 44).setDepth(51).setInteractive({ useHandCursor: true });
    zone.on("pointerup", () => { sfx.pop(); this.giftMenu(); });
  }

  giftMenu() {
    const z = store.shop.zoo, P = panel(this, "すいぞくかんからの おくりもの", { w: 900, h: 440 });
    z.gifts.forEach((kind, k) => {
      const x = W / 2 + (k - (z.gifts.length - 1) / 2) * 220, y = P.top + 220;
      card(this, P.L, x, y, 200, 230, () => {
        const ex = z.exhibits.find(e => Z.canShow(e, kind) === "ok");
        if (!ex) { sfx.no(); floatText(this, x, y - 140, "かいすいの おおすいそう を つくってね"); return; }
        const r = Z.claimZooGift(store.shop, k, ex.id, Date.now());
        if (!r.ok) { sfx.no(); floatText(this, x, y - 140, say(r.why)); return; }
        store.setShop(r.shop); sfx.coin(); P.close(); this.scene.restart();
      }, 0xe9f6ff);
      P.L.add([creature(this, x, y - 30, kind, 130), text(this, x, y + 80, S.species(kind).name, 20, "#4a2c17")]);
    });
    P.L.add(text(this, W / 2, P.top + P.h - 40, "おすと てんじに いれるよ", 18, "#7a4a1e"));
  }

  gateMenu() {
    const z = store.shop.zoo, now = Z.GATES[z.gate], next = Z.GATES[z.gate + 1];
    const P = panel(this, "どうぶつえんの もん", { w: 760, h: 380 });
    P.L.add(text(this, W / 2, P.top + 120, `いま：${now.name}（おきゃくさん ×${now.k}）`, 22, "#4a2c17"));
    if (!next) { P.L.add(text(this, W / 2, P.top + 220, "いちばん りっぱな もん だよ！", 24, "#2e7d32")); return; }
    P.L.add(text(this, W / 2, P.top + 180, `つぎ：${next.name}（おきゃくさん ×${next.k}）`, 22, "#4a2c17"));
    card(this, P.L, W / 2, P.top + 270, 300, 64, () => {
      const r = Z.upgradeGate(store.shop);
      if (!r.ok) { sfx.no(); floatText(this, W / 2, P.top + 220, say(r.why)); return; }
      store.setShop(r.shop); sfx.coin(); P.close(); this.scene.restart();
    }, 0xffe28a);
    P.L.add(text(this, W / 2, P.top + 270, `${coin(next.cost)}で つくる`, 22, "#7a4a1e"));
  }
}
