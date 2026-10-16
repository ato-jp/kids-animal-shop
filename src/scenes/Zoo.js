// じぶんの どうぶつえん／すいぞくかん（f で切りかえ）。てんじ・だんかい（おんぼろ→おおきな）・きのうの お客さん（ルールは logic/zoo.js）
import { store } from "../store.js";
import * as S from "../logic/shop.js";
import * as Z from "../logic/zoo.js";
import { AQUATIC } from "../data/aquatic.js";
import { W, H, text, card, creature, panel, floatText, coin, burst, button, guide } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { MESSAGE } from "./Shop.js";
import { sfx } from "../sound/sfx.js";
import { bgm } from "../sound/bgm.js";

const SW = 290, SH = 236, X0 = 36, Y0 = 168, GAP = 16;
const slotXY = i => [X0 + (i % 4) * (SW + GAP), Y0 + Math.floor(i / 4) * (SH + GAP)];
const SAMPLE = { land: "rabbit", big: "lion", cold: "penguin", fresh: "a01", sea: (AQUATIC.find(a => a.water === "sea") || {}).id };
const WHY = { type: "この てんじでは くらせないよ", kind: "1つの てんじに 1しゅるい だよ", full: "いっぱいで もう はいらないよ", sick: "びょうきの こは つれて いけないよ", notempty: "なかの こを もどしてから だよ", zooonly: "この こは どうぶつえんで くらす こ だよ", ninki: "にんきが まだ たりないよ" };
const say = why => WHY[why] || MESSAGE[why] || "できないよ";

export class Zoo extends Phaser.Scene {
  constructor() { super("Zoo"); }
  create({ visit, f = "zoo" } = {}) {
    bgm.play(f);
    this.f = f;
    // 兄弟の 園を 見に来たとき（えき の でんしゃ から）：見るだけ。← で えき に もどる（お店の見学と同じ形）
    if (visit && visit !== store.family.current) { store.visitFrom = store.visitFrom || store.family.current; store.family.current = visit; }
    this.visit = !!store.visitFrom;
    const shop = store.shop, z = shop[f], lv = Z.LEVELS[z.level], g = this.add.graphics();
    this.old = z.level < 2; // おんぼろ・ちいさな：ひび・雑草・色あせ
    if (f === "zoo") { // 芝生と 小道（おんぼろは 土が見える）
      g.fillGradientStyle(0x9fd47c, 0x9fd47c, 0x7fbf62, 0x7fbf62, 1).fillRect(0, 84, W, H - 84);
      for (let k = 0; k < 500; k++) g.fillStyle(this.old && k % 5 === 0 ? 0xb89a6a : k % 2 ? 0x8cc76c : 0xb2df90, 0.55).fillCircle((k * 131) % W, 90 + ((k * 71) % (H - 90)), 2 + (k % 3) + (this.old && k % 5 === 0 ? 6 : 0));
      g.fillStyle(0xe9d8b0, 1).fillRect(0, Y0 + SH + 2, W, GAP - 4);
    } else { // 館内：青い かべと タイルの ゆか
      g.fillGradientStyle(0x1f4f7a, 0x1f4f7a, 0x123552, 0x123552, 1).fillRect(0, 84, W, H - 84);
      for (let x = 0; x < W; x += 64) for (let y = 156; y < H; y += 64) g.lineStyle(1, 0xffffff, this.old ? 0.04 : 0.08).strokeRect(x, y, 64, 64);
      if (this.old) for (let k = 0; k < 14; k++) g.lineStyle(2, 0x0b2236, 0.6).lineBetween((k * 211) % W, 160 + (k * 97) % 500, (k * 211) % W + 30, 180 + (k * 97) % 500); // ひび
    }
    topBar(this, { back: !this.visit });
    if (this.visit) button(this, W - 56, 42, "back", 48, () => { sfx.pop(); store.family.current = store.visitFrom; store.visitFrom = null; store.persist(); this.scene.start("Station"); }, { ring: 0x9fd3e6 }).setDepth(501);
    const title = `${store.kid?.name ? store.kid.name + "の " : ""}${lv.name} ${Z.FACILITIES[f].name}${this.visit ? "（みるだけ）" : ""}`;
    text(this, 40, 128, title, 28, "#ffffff", { stroke: f === "zoo" ? "#2e6b4f" : "#0b2236", strokeThickness: 7 }).setOrigin(0, 0.5);
    const nk = Z.ninki(shop, f), nextLv = Z.LEVELS[z.level + 1];
    text(this, 690, 116, `⭐ にんき ${nk}${nextLv ? `（つぎは ${nextLv.need}）` : ""}`, 20, "#fff4a8", { stroke: "#2e6b4f", strokeThickness: 6 });
    if (!this.visit) text(this, 690, 144, `きのう ${z.yesterday ?? "—"}にん ・ あしたの よそう ${Z.zooVisitors(shop, f)}にん`, 17, "#ffffff", { stroke: "#2e6b4f", strokeThickness: 5 });
    // 大きくする（だんかい。お客さんの倍率と てんじの数が ふえる）
    card(this, this.add.container(0, 0), 1140, 128, 200, 52, () => { if (this.visit) return; sfx.pop(); this.levelMenu(); }, Z.LEVELS[z.level + 1] ? 0xfff1c9 : 0xe6f4dc);
    text(this, 1140, 128, Z.LEVELS[z.level + 1] ? "🏗 おおきく する" : "⭐ いちばん おおきい", 18, "#7a4a1e");
    for (let i = 0; i < Z.MAX_SLOTS; i++) {
      const ex = z.exhibits.find(e => e.slot === i), [x, y] = slotXY(i);
      if (ex) this.exhibit(ex, x, y);
      else if (i >= lv.slots) this.lockedSlot(x, y);
      else if (!this.visit) this.emptySlot(i, x, y);
    }
    const lvGift = nextLv?.gift?.[f], hint = { stroke: "#0b2236", strokeThickness: 5 };
    if (z.gifts?.length && !this.visit) this.giftBanner();
    else if (lvGift && !this.visit) text(this, W / 2, 668, `「${nextLv.name} ${Z.FACILITIES[f].name}」に すると ${S.species(lvGift).name}が くるよ`, 18, "#fff4a8", hint);
    else if (f === "aqua" && Z.ZOO_GIFTS[z.given || 0] && !this.visit) text(this, W / 2, 668, `つぎの おくりもの まで あと ${Z.ZOO_GIFTS[z.given || 0].visitors - (z.total || 0)}にん`, 18, "#fff4a8", hint);
    this.showGuide();
    text(this, W / 2, 698, `にゅうえんりょう 1にん ${Z.ZOO_FEE}コイン　しいくいんさん 1ぴき 1にち ${Z.ZOO_KEEP}コイン（${coin(Z.zooKeepCost(shop, f))}）`, 18, "#ffffff", { stroke: "#2e6b4f", strokeThickness: 5 });
  }

  lockedSlot(x, y) {
    const g = this.add.graphics(), h = SH - 40;
    g.fillStyle(0x000000, 0.18).fillRoundedRect(x, y, SW, h, 18);
    text(this, x + SW / 2, y + h / 2 - 10, "🔒", 40);
    text(this, x + SW / 2, y + h / 2 + 36, "おおきく すると つかえる", 16, "#ffffff", { stroke: "#00000080", strokeThickness: 4 });
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
      g.lineStyle(6, this.old ? 0x6b5a48 : 0x37474f, 1).strokeRoundedRect(x, y, w, h, 14);
      if (this.old) g.fillStyle(0x6b5a2a, 0.25).fillRect(x + 4, y + 4, w - 8, h - 8).lineStyle(2, 0xffffff, 0.5).lineBetween(x + w - 60, y + 10, x + w - 30, y + 50).lineBetween(x + w - 30, y + 50, x + w - 44, y + 80); // にごった水と ガラスの ひび
      return;
    }
    const base = { land: 0xe8d3a0, big: 0xb7dc8a, cold: 0xeaf7ff }[type];
    g.fillStyle(base, 1).fillRoundedRect(x, y, w, h, 18);
    if (type === "cold") g.fillStyle(0x7cc6e8, 1).fillEllipse(x + w * 0.62, y + h * 0.62, w * 0.6, h * 0.42).fillStyle(0xffffff, 0.5).fillEllipse(x + w * 0.55, y + h * 0.55, w * 0.25, h * 0.1);
    if (type === "big") g.fillStyle(0x8a8f96, 1).fillEllipse(x + 50, y + h - 40, 60, 34).fillStyle(0x4f8f3a, 1).fillCircle(x + w - 40, y + 40, 30).fillStyle(0x7a5230, 1).fillRect(x + w - 44, y + 60, 8, 30);
    if (type === "land") g.fillStyle(0xc9a874, 1).fillEllipse(x + 60, y + h - 34, 50, 18).fillStyle(0x6fae4f, 1).fillCircle(x + w - 36, y + 34, 18);
    // 木のさく
    g.lineStyle(5, this.old ? 0x6e5a48 : 0x8a5a33, 1).strokeRoundedRect(x, y, w, h, 18);
    for (let k = 0; k <= 9; k++) if (!this.old || k % 4 !== 2) g.fillStyle(this.old ? 0x6e5a48 : 0x8a5a33, 1).fillRect(x + 4 + k * ((w - 14) / 9), y + h - 18 + (this.old && k % 3 === 0 ? 6 : 0), 6, 22); // おんぼろは さくが ぬけて かたむく
    if (this.old) for (let k = 0; k < 5; k++) g.fillStyle(0x5f8f3a, 1).fillTriangle(x + 20 + k * 57, y + h - 2, x + 26 + k * 57, y + h - 20, x + 32 + k * 57, y + h - 2); // 雑草
  }

  exhibit(ex, x, y) {
    const g = this.add.graphics(), h = SH - 40, water = ex.type === "fresh" || ex.type === "sea";
    this.ground(g, ex.type, x, y);
    ex.animals.slice(0, 5).forEach((a, i) => {
      const px = ex.animals.length > 3 ? 70 : 100, cx = x + 60 + ((i * 97) % (SW - 120)), cy = y + 60 + ((i * 53) % (h - 110));
      const st = S.stage(a, Date.now()), grow = st === "baby" ? 0.6 : st === "young" ? 0.8 : 1; // 赤ちゃんは 小さく
      const c = creature(this, cx, cy, a.kind, px * grow, S.shineOf(a), S.paintOf(a));
      if (st === "baby") this.tweens.add({ targets: text(this, cx + 22, cy - 30, "🍼", 18), x: cx + 22 + (water ? 70 : 30) * (i % 2 ? -1 : 1), y: cy - 30 + (water ? 10 : 6), duration: (water ? 3000 : 2200) + i * 300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: c, x: cx + (water ? 70 : 30) * (i % 2 ? -1 : 1), y: cy + (water ? 10 : 6), duration: (water ? 3000 : 2200) + i * 300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    });
    const kind = ex.animals[0]?.kind;
    const label = kind ? `${S.species(kind).name}　${ex.animals.length}` : `${Z.EXHIBITS[ex.type].name}（からっぽ）`;
    g.fillStyle(0x5b3a1f, 1).fillRoundedRect(x + 20, y + h + 6, SW - 40, 30, 10);
    text(this, x + SW / 2, y + h + 21, label, 17, "#fff4dc");
    const zone = this.add.zone(x + SW / 2, y + SH / 2, SW, SH).setInteractive({ useHandCursor: true });
    zone.on("pointerup", () => { if (this.visit) return; sfx.pop(); this.exhibitMenu(ex); });
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
    const types = Z.FACILITIES[this.f].types;
    types.forEach((type, k) => {
      const e = Z.EXHIBITS[type], x = W / 2 + (k - (types.length - 1) / 2) * 220, y = P.top + 220;
      card(this, P.L, x, y, 200, 250, () => {
        const r = Z.buildExhibit(store.shop, this.f, type, slot);
        if (!r.ok) { sfx.no(); floatText(this, x, y - 140, say(r.why)); return; }
        store.setShop(r.shop); sfx.coin(); P.close(); this.scene.restart({ f: this.f });
      }, 0xf3ead8);
      P.L.add([creature(this, x, y - 50, SAMPLE[type], 100), text(this, x, y + 40, e.name, 17, "#4a2c17", { wordWrap: { width: 180, useAdvancedWrap: true } }), text(this, x, y + 92, coin(e.cost), 20, "#2e7d32")]);
    });
  }

  // てんじを押したとき：いる子（押すと お店へ もどす）と、つれて来られる お店の子
  exhibitMenu(ex) {
    const shop = store.shop, P = panel(this, Z.EXHIBITS[ex.type].name, { w: 1120, h: 600 });
    P.L.add(text(this, P.left + 40, P.top + 100, "いる こ（おすと おみせへ もどす・ほかの えんへ ゆずる）", 20, "#7a4a1e").setOrigin(0, 0.5));
    if (!ex.animals.length) P.L.add(text(this, P.left + 300, P.top + 170, "まだ だれも いないよ", 20, "#9a8a7a"));
    ex.animals.slice(0, 9).forEach((a, k) => {
      const x = P.left + 90 + k * 116, y = P.top + 175;
      card(this, P.L, x, y, 104, 104, () => { sfx.pop(); this.animalMenu(a); }, 0xe9f6ff);
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
        store.setShop(r.shop); sfx.coin(); burst(this, x, y, "sparkles", 6, 30, 60); P.close(); this.scene.restart({ f: this.f });
      }, 0xfff6e0);
      P.L.add([creature(this, x, y - 6, a.kind, 76, S.shineOf(a), S.paintOf(a)), text(this, x, y + 40, S.species(a.kind).name, 13, "#4a2c17")]);
    });
    if (ex.animals.length) { // 赤ちゃんを うませる／とめる
      const on = ex.breed !== false, bx = P.left + P.w - 150, by = P.top + 100;
      card(this, P.L, bx, by, 220, 44, () => {
        const r = Z.setExhibitBreed(store.shop, ex.id, !on);
        if (!r.ok) return;
        store.setShop(r.shop); sfx.pop(); P.close(); this.exhibitMenu(r.shop[this.f].exhibits.find(e => e.id === ex.id));
      }, on ? 0xffe28a : 0xf3ead8);
      P.L.add(text(this, bx, by, on ? "👶 あかちゃん OK" : "あかちゃん なし", 18, "#4a2c17"));
    }
    if (!ex.animals.length) {
      const bx = P.left + P.w - 130, by = P.top + 100;
      card(this, P.L, bx, by, 180, 44, () => {
        const r = Z.removeExhibit(store.shop, ex.id);
        if (!r.ok) { sfx.no(); return; }
        store.setShop(r.shop); sfx.pop(); P.close(); this.scene.restart({ f: this.f });
      }, 0xf6d3cc);
      P.L.add(text(this, bx, by, "こわす", 18, "#a0522d"));
    }
  }

  // はじめて入った日の 案内：てんじを つくる → お店の子を つれて くる
  showGuide() {
    const z = store.shop[this.f];
    if (this.visit) return;
    const empty = z.exhibits.find(e => !e.animals.length);
    if (empty) { const [x, y] = slotXY(empty.slot); guide(this, x + SW / 2, y + SH / 2 - 70, "おみせの こを つれて こよう", 60); return; }
    if (z.exhibits.length < 2) { const free = [...Array(Z.LEVELS[z.level].slots).keys()].find(i => !z.exhibits.some(e => e.slot === i)); const [x, y] = slotXY(free); guide(this, x + SW / 2, y + SH / 2 - 70, "てんじを つくろう", 60); }
  }

  // てんじの子を押したとき：おみせへ もどす（売るのは おみせで）／ほかの えんへ ゆずる（こうけん が たまる）
  animalMenu(a) {
    const P = panel(this, S.shineName(a) + S.species(a.kind).name, { w: 900, h: 470 }), only = Z.zooOnly(a.kind);
    P.L.add(creature(this, W / 2, P.top + 140, a.kind, 120, S.shineOf(a), S.paintOf(a)));
    const go = (r, msg) => {
      if (!r.ok) { sfx.no(); floatText(this, W / 2, P.top + 230, say(r.why)); return; }
      store.setShop(r.shop); sfx.coin(); floatText(this, W / 2, P.top + 230, msg, "#2e7d32");
      this.time.delayedCall(600, () => { P.close(); this.scene.restart({ f: this.f }); });
    };
    if (!only) {
      card(this, P.L, W / 2, P.top + 260, 360, 56, () => go(Z.fromZoo(store.shop, a.id), "おみせに もどったよ"), 0xe9f6ff);
      P.L.add(text(this, W / 2, P.top + 260, "おみせへ もどす（うるなら こちら）", 19, "#4a2c17"));
    } else P.L.add(text(this, W / 2, P.top + 260, "この こは どうぶつえんで くらす こ だよ", 19, "#7a4a1e"));
    P.L.add(text(this, W / 2, P.top + 320, "ほかの えんへ ゆずる（こうけん が たまるよ）", 18, "#7a4a1e"));
    S.placesFor(a.kind).forEach((id, k, all) => {
      const x = W / 2 + (k - (all.length - 1) / 2) * 200, y = P.top + 385;
      card(this, P.L, x, y, 186, 56, () => {
        const r = Z.giveAway(store.shop, a.id, id, Date.now());
        go(r, r.ok ? `ありがとう！ こうけん +${r.points}` : "");
      }, 0xfff1c9);
      P.L.add(text(this, x, y, store.shop.places[id].name, 14, "#4a2c17", { wordWrap: { width: 176, useAdvancedWrap: true } }));
    });
  }

  // すいぞくかんから 届いた子：押すと かいすいの おおすいそう に入れる
  giftBanner() {
    const c = this.add.container(W / 2, 664).setDepth(50);
    const g = this.add.graphics().fillStyle(0xff7a59, 1).fillRoundedRect(-200, -22, 400, 44, 22);
    c.add([g, text(this, 0, 0, `🎁 おくりものが とどいたよ（${store.shop[this.f].gifts.length}）`, 20, "#ffffff")]);
    this.tweens.add({ targets: c, scale: 1.06, duration: 500, yoyo: true, repeat: -1 });
    const zone = this.add.zone(W / 2, 664, 400, 44).setDepth(51).setInteractive({ useHandCursor: true });
    zone.on("pointerup", () => { sfx.pop(); this.giftMenu(); });
  }

  giftMenu() {
    const z = store.shop[this.f], P = panel(this, `${Z.FACILITIES[this.f].name}への おくりもの`, { w: 1000, h: 440 });
    z.gifts.slice(0, 4).forEach((g0, k, list) => {
      const g = Z.giftOf(g0), kind = g.kind;
      const x = W / 2 + (k - (list.length - 1) / 2) * 220, y = P.top + 220;
      card(this, P.L, x, y, 200, 230, () => {
        const ex = z.exhibits.find(e => Z.canShow(e, kind) === "ok");
        if (!ex) { sfx.no(); floatText(this, x, y - 140, `${Z.EXHIBITS[Z.exhibitFor(kind)].name} を つくってね`); return; }
        const r = Z.claimZooGift(store.shop, k, ex.id, Date.now());
        if (!r.ok) { sfx.no(); floatText(this, x, y - 140, say(r.why)); return; }
        store.setShop(r.shop); sfx.coin(); P.close(); this.scene.restart({ f: this.f });
      }, 0xe9f6ff);
      P.L.add([creature(this, x, y - 30, kind, 130), text(this, x, y + 80, S.species(kind).name + (g.sex ? (g.sex === "m" ? " ♂" : " ♀") : ""), 20, "#4a2c17")]);
    });
    P.L.add(text(this, W / 2, P.top + P.h - 40, "おすと てんじに いれるよ", 18, "#7a4a1e"));
  }

  levelMenu() {
    const z = store.shop[this.f], now = Z.LEVELS[z.level], next = Z.LEVELS[z.level + 1], name = Z.FACILITIES[this.f].name;
    const P = panel(this, `${name}を おおきく する`, { w: 820, h: 420 });
    P.L.add(text(this, W / 2, P.top + 120, `いま：${now.name} ${name}（てんじ ${now.slots}・おきゃくさん ×${now.k}）`, 22, "#4a2c17"));
    if (!next) { P.L.add(text(this, W / 2, P.top + 220, "いちばん おおきい よ！", 26, "#2e7d32")); return; }
    P.L.add(text(this, W / 2, P.top + 180, `つぎ：${next.name} ${name}（てんじ ${next.slots}・おきゃくさん ×${next.k}）`, 22, "#4a2c17"));
    const nk = Z.ninki(store.shop, this.f), gift = next.gift?.[this.f];
    P.L.add(text(this, W / 2, P.top + 225, `⭐ にんき ${nk} / ${next.need}${nk < next.need ? `（あと ${next.need - nk}。しゅるいを ふやすと あがるよ）` : " OK！"}`, 19, nk < next.need ? "#c0392b" : "#2e7d32"));
    if (gift) P.L.add(text(this, W / 2, P.top + 258, `🎉 おいわいに ${S.species(gift).name}が 2ひき やってくるよ`, 19, "#1f6fb2"));
    card(this, P.L, W / 2, P.top + 330, 320, 60, () => {
      const r = Z.upgradeFacility(store.shop, this.f, Date.now());
      if (!r.ok) { sfx.no(); floatText(this, W / 2, P.top + 250, say(r.why)); return; }
      store.setShop(r.shop); sfx.star(); P.close();
      if (r.penguins) floatText(this, W / 2, 300, "ペンギンが やってきた！", "#ffffff");
      if (r.gift) floatText(this, W / 2, 300, `${S.species(r.gift).name}が とどいたよ！`, "#ffffff");
      this.time.delayedCall(r.penguins ? 900 : 0, () => this.scene.restart({ f: this.f }));
    }, 0xffe28a);
    P.L.add(text(this, W / 2, P.top + 330, `${coin(next.cost)}で おおきく する`, 22, "#7a4a1e"));
  }
}
