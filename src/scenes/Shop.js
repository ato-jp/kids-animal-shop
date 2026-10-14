// お店（版2）。下の道具箱からエサや道具を選び、動物を押してお世話する。
// 吹き出しは「こまっていること」だけを出し、どのエサかは教えない（図鑑で調べる）。
import { store } from "../store.js";
import { care, needs, isReady, pickRequest, adoptable, adopt, buyFood, build, dayClock, priceOf, VET_COST, MAX_STARS } from "../logic/state.js";
import { ANIMALS } from "../data/animals.js";
import { FOODS } from "../data/foods.js";
import { ROOMS } from "../data/rooms.js";
import { PLACES } from "../data/places.js";
import { W, H, text, img, button, burst, floatText, moneyCounter, parentGate, yen } from "../ui/kit.js";
import { openParent } from "../parent.js";
import { sfx } from "../sound/sfx.js";

const ROOM_W = 300, ROOM_H = 210;
const ROOM_POS = [[175, 222], [500, 222], [825, 222], [175, 448], [500, 448], [825, 448]];
const TOOLS = [...Object.keys(FOODS), "soap", "water", "broom", "vet"];
const TOOL_ICON = { soap: "soap", water: "water", broom: "broom", vet: "vet" };
const MESSAGE = {
  wrongfood: "これは たべないみたい…",
  nostock: "エサが ないよ。しいれ しよう",
  nomoney: "おかねが たりないよ",
  notneeded: "いまは いらないみたい",
  sick: "びょうきだよ。じゅういさんを よぼう",
};

export class Shop extends Phaser.Scene {
  constructor() { super("Shop"); }

  create() {
    this.tool = null;
    this.panel = null;
    this.customer = null;
    this.drawBackground();
    this.drawTopBar();
    this.rooms = ROOM_POS.map(([x, y], i) => this.makeRoom(i, x, y));
    this.makeTray();
    parentGate(this, W - 36, H - 34, () => openParent(this));

    const onChange = () => this.refresh();
    this.game.events.on("shop-changed", onChange);
    this.events.on("refresh", onChange);
    this.events.once("shutdown", () => this.game.events.off("shop-changed", onChange));
    this.refresh();
  }

  drawBackground() {
    const g = this.add.graphics();
    g.fillStyle(0xfff3e0, 1).fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 80) g.fillStyle(0xfbe9cc, 1).fillRect(x, 90, 40, 520);
    g.fillStyle(0xe9b77c, 1).fillRoundedRect(1000, 470, 260, 120, 20);
    g.fillStyle(0xd59a58, 1).fillRect(1000, 510, 260, 12);
  }

  drawTopBar() {
    this.add.graphics().fillStyle(0xf6dfb8, 1).fillRect(0, 0, W, 90);
    button(this, 48, 45, store.kid.icon, 60, () => { sfx.pop(); this.scene.start("Who"); }, { bg: Number(String(store.kid.color).replace("#", "0x")), ring: 0xffffff });
    this.money = moneyCounter(this, 110, 45);
    this.add.graphics().fillStyle(0xffffff, 0.92).fillRoundedRect(370, 11, 250, 68, 34);
    img(this, 405, 45, "sun", 48);
    this.clock = text(this, 438, 47, "", 30, "#7a4a1e").setOrigin(0, 0.5);
    const nav = [["book", "Zukan"], ["cart", null], ["japan", "Map"], ["pole", "Scoop"]];
    nav.forEach(([key, scene], i) => {
      button(this, 900 + i * 100, 45, key, 58, () => {
        sfx.pop();
        if (scene) this.scene.start(scene, {}); else this.openMarket();
      }, { ring: i === 1 ? 0xff9f80 : 0xf0c27a });
      text(this, 900 + i * 100, 86, ["ずかん", "しいれ", "ちず", "すくい"][i], 16, "#7a4a1e");
    });
  }

  // ---- 部屋 ----
  makeRoom(i, x, y) {
    const r = { i, x, y, id: null };
    r.bg = this.add.graphics();
    r.label = text(this, x - ROOM_W / 2 + 14, y - ROOM_H / 2 + 14, "", 16, "#7a4a1e").setOrigin(0, 0.5);
    r.empty = img(this, x, y - 5, "plus", 70).setAlpha(0.5);
    r.emptyText = text(this, x, y + 55, "", 20, "#a08060");
    r.hit = this.add.zone(x, y, ROOM_W, ROOM_H).setInteractive({ useHandCursor: true });
    r.hit.on("pointerup", () => this.tapRoom(r));
    r.animal = this.add.image(x - 50, y + 5, "hamster").setInteractive({ useHandCursor: true });
    r.animal.on("pointerup", () => this.tapAnimal(r));
    this.tweens.add({ targets: r.animal, y: y + 2, duration: 900 + i * 120, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    // ゲージ（おなか・きれい・げんき）
    r.gauges = ["fork", "soap", "heart"].map((key, k) => {
      const gy = y - 48 + k * 38;
      return { icon: img(this, x + 50, gy, key, 30), bar: this.add.graphics(), gy };
    });
    r.stars = [0, 1, 2].map(k => img(this, x - 88 + k * 38, y + 82, "star", 32));
    r.dirt = this.add.container(x + 105, y + 78);
    r.dirt.add(this.add.graphics().fillStyle(0x8a5a2b, 1).fillCircle(-12, 4, 12).fillCircle(6, 0, 15).fillCircle(20, 7, 9));
    r.dirt.setSize(80, 50).setInteractive({ useHandCursor: true });
    r.dirt.on("pointerup", () => this.applyTool(r, this.tool === "broom" ? "broom" : null));
    r.bubble = this.add.container(x - 50, y - 50);
    r.glow = this.add.graphics();
    this.tweens.add({ targets: r.glow, alpha: { from: 0.3, to: 1 }, duration: 600, yoyo: true, repeat: -1 });
    return r;
  }

  refresh() {
    const shop = store.shop;
    if (!shop) return;
    this.money.set(shop.money);
    const { h, m } = dayClock(shop);
    this.clock.setText(`${shop.day.n}にちめ ${h}:${String(m).padStart(2, "0")}`);
    shop.rooms.forEach((room, i) => this.drawRoom(this.rooms[i], room));
    this.drawTray();
    if (!this.customer) {
      const req = pickRequest(shop);
      if (req) this.comeCustomer(req);
    }
  }

  drawRoom(r, room) {
    const a = room.animal, type = room.type;
    const L = r.x - ROOM_W / 2, T = r.y - ROOM_H / 2;
    r.bg.clear();
    if (!type) {
      r.bg.fillStyle(0xe8d9bf, 1).fillRoundedRect(L, T, ROOM_W, ROOM_H, 26);
      for (let k = 0; k < 6; k++) r.bg.fillStyle(0xd8c6a6, 1).fillCircle(L + 40 + k * 45, T + 160 - (k % 2) * 20, 6);
    } else {
      r.bg.fillStyle(ROOMS[type].color, 1).fillRoundedRect(L, T, ROOM_W, ROOM_H, 26);
      if (!a) r.bg.lineStyle(4, 0xe0c9a6, 1).strokeRoundedRect(L, T, ROOM_W, ROOM_H, 26);
    }
    r.label.setText(type ? ROOMS[type].name : "あきち");
    r.empty.setVisible(!a).setTexture(type ? "plus" : "hammer");
    r.emptyText.setVisible(!a).setText(type ? "どうぶつを しいれる" : "へやを たてる");
    for (const o of [r.animal, ...r.stars, r.dirt]) o.setVisible(!!a);
    r.gauges.forEach(g => { g.icon.setVisible(!!a); g.bar.clear(); });
    r.glow.clear();
    if (!a) { r.bubble.removeAll(true); r.bubbleKey = null; r.id = null; return; }

    const d = ANIMALS[a.kind];
    if (r.id !== a.id) {
      r.id = a.id;
      r.animal.setTexture(a.kind).setScale((a.kind === "elephant" || a.kind === "lion" ? 140 : 120) / 256);
    }
    r.animal.setTint(a.sick ? 0xb8c4a0 : 0xffffff);
    r.gauges[1].icon.setTexture(d.water ? "water" : "soap");
    [a.hunger, a.clean, a.genki].forEach((v, k) => {
      const g = r.gauges[k], color = v < 0.3 ? 0xe2553d : v < 0.6 ? 0xf2b53c : 0x6cc070;
      g.bar.fillStyle(0xffffff, 1).fillRoundedRect(r.x + 72, g.gy - 7, 70, 14, 7).fillStyle(color, 1).fillRoundedRect(r.x + 72, g.gy - 7, Math.max(6, 70 * v), 14, 7);
    });
    r.stars.forEach((s, k) => s.setTint(k < a.stars ? 0xffffff : 0x555555).setAlpha(k < a.stars ? 1 : 0.35));
    r.dirt.setVisible(a.dirty);
    if (isReady(a)) r.glow.lineStyle(10, 0xffd34d, 1).strokeRoundedRect(L - 4, T - 4, ROOM_W + 8, ROOM_H + 8, 30);

    const want = needs(a).filter(n => n !== "broom");
    const key = want.join(",") + (d.water ? "w" : "");
    if (r.bubbleKey === key) return;
    r.bubbleKey = key;
    r.bubble.removeAll(true);
    if (!want.length) return;
    const bw = 14 + want.length * 40;
    r.bubble.add(this.add.graphics().fillStyle(0xffffff, 0.95).fillRoundedRect(-bw / 2, -22, bw, 44, 22));
    want.forEach((n, k) => r.bubble.add(img(this, -bw / 2 + 27 + k * 40, 0, { food: "fork", clean: d.water ? "water" : "soap", vet: "sick" }[n], 32)));
    r.bubble.setScale(0.6);
    this.tweens.add({ targets: r.bubble, scale: 1, duration: 300, ease: "Back.easeOut" });
  }

  tapRoom(r) {
    const room = store.shop.rooms[r.i];
    if (room.animal) { this.applyTool(r, this.tool); return; }
    if (!room.type) this.openBuild(r.i); else this.openAdopt(r.i);
  }

  tapAnimal(r) {
    if (this.tool) { this.applyTool(r, this.tool); return; }
    const a = store.shop.rooms[r.i].animal;
    if (!a) return;
    sfx.pop();
    this.hop(r);
    floatText(this, r.x - 50, r.y - 40, ANIMALS[a.kind].name, "#7a4a1e");
    if (isReady(a) && this.customer && this.customer.req.room === r.i) this.sendOff();
  }

  hop(r) {
    this.tweens.add({ targets: r.animal, scaleY: r.animal.scaleX * 0.85, duration: 90, yoyo: true });
  }

  shake(r) {
    this.tweens.add({ targets: r.animal, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => r.animal.setAngle(0) });
  }

  applyTool(r, tool) {
    if (!tool) { floatText(this, r.x, r.y - 40, "したの どうぐを えらんでね", "#7a4a1e"); return; }
    const { shop, result } = care(store.shop, r.i, tool);
    if (result === "wrongtool") {
      sfx.no(); this.shake(r);
      floatText(this, r.x, r.y - 40, tool === "soap" ? "みずの いきものは みずかえ だよ" : "みずかえは みずの いきもの だけ", "#a0522d");
      return;
    }
    if (MESSAGE[result] && result !== "sick") {
      sfx.no(); if (result === "wrongfood") this.shake(r);
      floatText(this, r.x, r.y - 40, MESSAGE[result], "#a0522d");
      return;
    }
    store.setShop(shop);
    if (tool === "broom") {
      const b = img(this, r.x + 105, r.y + 50, "broom", 80).setDepth(800);
      this.tweens.add({ targets: b, angle: { from: -30, to: 30 }, duration: 150, yoyo: true, repeat: 2, onComplete: () => b.destroy() });
      sfx.sweep();
    } else if (tool === "vet") {
      sfx.star(); burst(this, r.x - 50, r.y, "heart", 6, 36, 80);
      floatText(this, r.x, r.y - 40, "げんきに なった！ -" + yen(VET_COST));
    } else {
      const f = img(this, r.x, r.y + 120, TOOL_ICON[tool] || tool, 64).setDepth(800);
      this.tweens.add({ targets: f, x: r.x - 50, y: r.y, scale: 0.05, duration: 400, ease: "Cubic.easeIn", onComplete: () => f.destroy() });
      if (tool === "soap" || tool === "water") burst(this, r.x - 50, r.y, "bubbles", 6, 40, 70);
      sfx.eat();
      if (result === "sick") floatText(this, r.x, r.y - 40, MESSAGE.sick, "#a0522d");
    }
    this.hop(r);
    if (result === "star") {
      this.time.delayedCall(350, () => {
        sfx.star();
        const k = shop.rooms[r.i].animal.stars - 1;
        burst(this, r.stars[k].x, r.stars[k].y, "star", 6, 28, 60);
        if (k + 1 === MAX_STARS) floatText(this, r.x, r.y - 60, "たびだちの じゅんび できた！");
      });
    }
    this.refresh();
  }

  // ---- 道具箱 ----
  makeTray() {
    this.add.graphics().fillStyle(0xf6dfb8, 1).fillRoundedRect(10, 600, 980, 112, 24);
    this.toolButtons = TOOLS.map((tool, k) => {
      const x = 52 + k * 78, y = 646;
      const c = this.add.container(x, y);
      const ring = this.add.graphics();
      const icon = img(this, 0, 0, TOOL_ICON[tool] || tool, 52);
      const count = text(this, 0, 44, "", 16, "#7a4a1e");
      c.add([ring, icon, count]).setSize(74, 100).setInteractive({ useHandCursor: true });
      c.on("pointerup", () => {
        sfx.pop();
        this.tool = this.tool === tool ? null : tool;
        if (this.tool) floatText(this, x, 590, tool === "vet" ? "じゅういさん " + yen(VET_COST) : (FOODS[tool]?.name || { soap: "せっけん", water: "みずかえ", broom: "ほうき" }[tool]), "#7a4a1e");
        this.drawTray();
      });
      return { tool, c, ring, icon, count };
    });
  }

  drawTray() {
    const stock = store.shop.stock;
    for (const b of this.toolButtons) {
      const on = this.tool === b.tool;
      b.ring.clear().fillStyle(on ? 0xffffff : 0xfffaf2, 1).fillRoundedRect(-34, -38, 68, 98, 16);
      if (on) b.ring.lineStyle(5, 0xff7a59, 1).strokeRoundedRect(-34, -38, 68, 98, 16);
      b.c.y = on ? 640 : 646;
      if (FOODS[b.tool]) {
        const n = stock[b.tool] || 0;
        b.count.setText(n + "こ");
        b.icon.setAlpha(n ? 1 : 0.35);
      } else b.count.setText(b.tool === "vet" ? "300えん" : "");
    }
  }

  // ---- お客さん ----
  comeCustomer(req) {
    const a = store.shop.rooms[req.room].animal;
    const c = this.add.container(1400, 390).setDepth(300);
    const body = img(this, 0, 0, "farmer", 150);
    const bub = this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-110, -235, 220, 140, 40).fillTriangle(-10, -97, 20, -97, 0, -75);
    c.add([body, bub, img(this, -45, -190, a.kind, 70), img(this, 50, -190, PLACES[req.place].kind === "zoo" ? "truck" : "ship", 62),
      text(this, 0, -128, yen(priceOf(a)), 26, "#2e7d32")]);
    c.setSize(240, 400).setInteractive({ useHandCursor: true });
    c.on("pointerup", () => this.sendOff());
    this.customer = { c, req };
    sfx.pop();
    this.tweens.add({ targets: c, x: 1130, duration: 1200, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: body, y: -8, duration: 400, yoyo: true, repeat: -1 });
  }

  sendOff() {
    if (!this.customer) return;
    const { room, place } = this.customer.req;
    if (!isReady(store.shop.rooms[room].animal)) return;
    sfx.whoosh();
    this.scene.start("Departure", { room, place });
  }

  // ---- 小窓（しいれ・どうぶつ・へや） ----
  openPanel(title) {
    if (this.panel) this.panel.destroy();
    const L = this.add.container(0, 0).setDepth(600);
    this.panel = L;
    const close = () => { L.destroy(); this.panel = null; this.refresh(); };
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setInteractive();
    dim.on("pointerup", close);
    const hit = this.add.rectangle(W / 2, H / 2, 1040, 600, 0xffffff, 0).setInteractive();
    const bg = this.add.graphics().fillStyle(0xfffaf2, 1).fillRoundedRect(W / 2 - 520, H / 2 - 300, 1040, 600, 40);
    const m = text(this, W / 2 + 330, H / 2 - 252, yen(store.shop.money), 30, "#7a4a1e");
    L.add([dim, hit, bg, text(this, W / 2 - 150, H / 2 - 252, title, 40, "#7a4a1e"), img(this, W / 2 + 220, H / 2 - 252, "coin", 44), m]);
    L.add(button(this, W / 2 + 470, H / 2 - 252, "back", 44, close, { ring: 0x9fd3e6 }));
    return { L, close, setMoney: () => m.setText(yen(store.shop.money)) };
  }

  card(L, x, y, w, h, onTap) {
    const g = this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 24);
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    z.on("pointerup", onTap);
    L.add([g, z]);
  }

  openMarket() {
    const P = this.openPanel("エサの しいれ");
    Object.entries(FOODS).forEach(([key, f], k) => {
      const x = W / 2 - 375 + (k % 4) * 250, y = H / 2 - 95 + Math.floor(k / 4) * 230;
      const now = text(this, x, y + 88, "", 20, "#a08060");
      const setNow = () => now.setText("いま " + (store.shop.stock[key] || 0) + "こ");
      this.card(P.L, x, y, 230, 210, () => {
        const r = buyFood(store.shop, key);
        if (!r.ok) { sfx.no(); floatText(this, x, y - 40, MESSAGE.nomoney, "#a0522d"); return; }
        store.setShop(r.shop); sfx.coin(); setNow(); P.setMoney();
        floatText(this, x, y - 40, "+" + f.qty + "こ");
      });
      P.L.add([img(this, x, y - 45, key, 80), text(this, x, y + 15, f.name, 22, "#4a2c17"), text(this, x, y + 52, `${f.qty}こ ${yen(f.price)}`, 22, "#2e7d32"), now]);
      setNow();
    });
  }

  openAdopt(room) {
    const type = store.shop.rooms[room].type;
    const P = this.openPanel(ROOMS[type].name + "に すむ どうぶつ");
    const list = adoptable(store.shop).filter(o => o.room === type);
    if (!list.length) P.L.add(text(this, W / 2, H / 2 - 40, "すいそうの さかなは\n「すくい」で つかまえよう", 36, "#4a2c17", { lineSpacing: 14 }));
    list.forEach((o, k) => {
      const x = W / 2 - 250 * (list.length - 1) / 2 + k * 250, y = H / 2 - 40;
      const d = ANIMALS[o.kind];
      this.card(P.L, x, y, 230, 260, () => {
        const r = adopt(store.shop, room, o.kind);
        if (r.result !== "ok") { sfx.no(); floatText(this, x, y - 60, r.result === "locked" ? "まだ しいれられないよ" : MESSAGE.nomoney, "#a0522d"); return; }
        store.setShop(r.shop); sfx.star(); P.close();
        burst(this, this.rooms[room].x, this.rooms[room].y, "sparkles", 8, 40, 110);
      });
      const pic = img(this, x, y - 40, o.kind, 120);
      const name = text(this, x, y + 50, o.locked ? "？？？" : d.name, 26, "#4a2c17");
      const cost = text(this, x, y + 92, o.locked ? `${d.unlockSent}ひき おくると でる` : yen(o.cost), 22, o.locked ? "#a08060" : "#c0392b");
      if (o.locked) pic.setTint(0x000000).setAlpha(0.3); else if (!o.afford) pic.setAlpha(0.45);
      P.L.add([pic, name, cost]);
    });
    P.L.add(button(this, W / 2, H / 2 + 220, "hammer", 50, () => this.openBuild(room)));
    P.L.add(text(this, W / 2 + 120, H / 2 + 222, "へやを たてかえる", 22, "#7a4a1e"));
  }

  openBuild(room) {
    const P = this.openPanel("どの へやを たてる？");
    const cur = store.shop.rooms[room].type;
    Object.entries(ROOMS).forEach(([type, t], k) => {
      const x = W / 2 - 375 + k * 250, y = H / 2;
      this.card(P.L, x, y, 230, 360, () => {
        if (type === cur) return;
        const r = build(store.shop, room, type);
        if (!r.ok) { sfx.no(); floatText(this, x, y - 80, MESSAGE.nomoney, "#a0522d"); return; }
        store.setShop(r.shop); sfx.coin(); P.close();
        burst(this, this.rooms[room].x, this.rooms[room].y, "sparkles", 8, 40, 110);
      });
      const lives = Object.entries(ANIMALS).filter(([, d]) => d.room === type).map(([k2]) => k2);
      P.L.add([img(this, x, y - 110, t.icon, 90), text(this, x, y - 30, t.name, 24, "#4a2c17"),
        text(this, x, y + 10, type === cur ? "いまの へや" : yen(t.cost), 22, type === cur ? "#a08060" : "#c0392b")]);
      lives.slice(0, 4).forEach((k2, j) => {
        const seen = store.shop.seen.includes(k2);
        const s = img(this, x - 38 + (j % 2) * 76, y + 80 + Math.floor(j / 2) * 70, k2, 56);
        if (!seen) s.setTint(0x000000).setAlpha(0.25);
        P.L.add(s);
      });
    });
  }
}
