// お店。6つの部屋に動物がいて、吹き出しに出た「ほしいもの」を押すとお世話になる。
// ★3つの子がいるとお客さん（園のスタッフ）が来て、押すと旅立ちへ。
import { store } from "../store.js";
import { care, needs, isReady, pickRequest, adoptable, adopt, MAX_STARS } from "../logic/state.js";
import { ANIMALS } from "../data/animals.js";
import { PLACES } from "../data/places.js";
import { W, H, text, img, button, burst, floatText, kuriCounter, parentGate } from "../ui/kit.js";
import { openParent } from "../parent.js";
import { sfx } from "../sound/sfx.js";

const ROOM_W = 300, ROOM_H = 240;
const ROOM_POS = [[175, 255], [500, 255], [825, 255], [175, 525], [500, 525], [825, 525]];
const HOME_COLOR = { cage: 0xffe2b8, water: 0xcdeefc, tank: 0x9fdcf0, big: 0xd6efb0 };
const ANIMAL_PX = a => (a.kind === "lion" ? 180 : ANIMALS[a.kind].home === "tank" ? 130 : 150);

export class Shop extends Phaser.Scene {
  constructor() { super("Shop"); }

  create() {
    this.drawBackground();
    this.kuri = kuriCounter(this, 150, 62);
    button(this, 60, 62, store.kid.icon, 70, () => { sfx.pop(); this.scene.start("Who"); }, { bg: Number(String(store.kid.color).replace("#", "0x")), ring: 0xffffff });
    button(this, 1090, 62, "japan", 76, () => { sfx.pop(); this.scene.start("Map", {}); });
    button(this, 1210, 62, "pole", 76, () => { sfx.pop(); this.scene.start("Scoop"); }, { ring: 0x9fd3e6 });
    parentGate(this, W - 44, H - 40, () => openParent(this));

    this.rooms = ROOM_POS.map(([x, y], i) => this.makeRoom(i, x, y));
    this.customer = null;
    this.adoptLayer = null;

    const onChange = () => this.refresh();
    this.game.events.on("shop-changed", onChange);
    this.events.on("refresh", onChange);
    this.events.once("shutdown", () => this.game.events.off("shop-changed", onChange));
    this.refresh();
  }

  drawBackground() {
    const g = this.add.graphics();
    g.fillStyle(0xfff3e0, 1).fillRect(0, 0, W, H);
    g.fillStyle(0xf6dfb8, 1).fillRect(0, 640, W, 80);
    for (let x = 0; x < W; x += 80) g.fillStyle(0xfbe9cc, 1).fillRect(x, 0, 40, 640);
    // 右側はお客さんの来るカウンター
    g.fillStyle(0xe9b77c, 1).fillRoundedRect(1000, 560, 260, 120, 20);
    g.fillStyle(0xd59a58, 1).fillRect(1000, 600, 260, 12);
  }

  makeRoom(i, x, y) {
    const r = { i, x, y, id: null };
    r.bg = this.add.graphics();
    r.plus = img(this, x, y, "plus", 90).setAlpha(0.5);
    r.hit = this.add.zone(x, y, ROOM_W, ROOM_H).setInteractive({ useHandCursor: true });
    r.hit.on("pointerup", () => this.tapRoom(r));
    r.dirt = this.add.container(x - 95, y + 70);
    const dg = this.add.graphics().fillStyle(0x8a5a2b, 1).fillCircle(-14, 6, 16).fillCircle(10, 0, 20).fillCircle(26, 10, 12);
    r.dirt.add(dg).setSize(110, 80).setInteractive({ useHandCursor: true });
    r.dirt.on("pointerup", () => this.doCare(r, "broom"));
    r.animal = this.add.image(x, y + 5, "hamster").setInteractive({ useHandCursor: true });
    r.animal.on("pointerup", () => this.tapAnimal(r));
    r.stars = [0, 1, 2].map(k => img(this, x - 44 + k * 44, y + 95, "star", 38));
    r.bubble = this.add.container(x + 95, y - 70);
    r.glow = this.add.graphics();
    this.tweens.add({ targets: r.glow, alpha: { from: 0.3, to: 1 }, duration: 600, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: r.animal, y: y - 3, duration: 900 + i * 120, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    return r;
  }

  refresh() {
    const shop = store.shop;
    if (!shop) return;
    this.kuri.set(shop.kuri);
    for (const r of this.rooms) this.drawRoom(r, shop.slots[r.i]);
    if (!this.customer) {
      const req = pickRequest(shop);
      if (req) this.comeCustomer(req);
    }
  }

  drawRoom(r, a) {
    const home = a ? ANIMALS[a.kind].home : null;
    r.bg.clear().fillStyle(a ? HOME_COLOR[home] : 0xffffff, a ? 1 : 0.6).fillRoundedRect(r.x - ROOM_W / 2, r.y - ROOM_H / 2, ROOM_W, ROOM_H, 26);
    if (!a) r.bg.lineStyle(5, 0xe0c9a6, 1).strokeRoundedRect(r.x - ROOM_W / 2, r.y - ROOM_H / 2, ROOM_W, ROOM_H, 26);
    if (home === "cage") for (let k = -2; k <= 2; k++) r.bg.fillStyle(0xe8c391, 1).fillRect(r.x + k * 55 - 3, r.y - ROOM_H / 2 + 10, 6, 40);
    if (home === "tank" || home === "water") r.bg.fillStyle(0xffffff, 0.35).fillRoundedRect(r.x - ROOM_W / 2 + 14, r.y - ROOM_H / 2 + 14, 40, ROOM_H - 28, 14);
    r.plus.setVisible(!a);
    r.animal.setVisible(!!a);
    r.dirt.setVisible(!!a && a.dirty);
    r.stars.forEach((s, k) => s.setVisible(!!a).setTint(a && k < a.stars ? 0xffffff : 0x555555).setAlpha(a && k < a.stars ? 1 : 0.35));
    r.glow.clear();
    if (!a) { r.bubble.removeAll(true); r.id = null; return; }
    if (r.id !== a.id) {
      r.id = a.id;
      r.animal.setTexture(a.kind).setScale(ANIMAL_PX(a) / 256);
    }
    if (isReady(a)) r.glow.lineStyle(10, 0xffd34d, 1).strokeRoundedRect(r.x - ROOM_W / 2 - 4, r.y - ROOM_H / 2 - 4, ROOM_W + 8, ROOM_H + 8, 30);
    // 吹き出し：ほしいもの（エサ・おふろ）。ほうきは部屋の汚れを押す
    const want = needs(a).filter(n => n !== "broom");
    const key = want.join(",");
    if (r.bubbleKey === key) return;
    r.bubbleKey = key;
    r.bubble.removeAll(true);
    if (!want.length) return;
    const bw = 30 + want.length * 74;
    r.bubble.add(this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-bw / 2, -46, bw, 92, 40).fillTriangle(-30, 40, -10, 40, -40, 64));
    want.forEach((n, k) => {
      const ix = -bw / 2 + 52 + k * 74;
      const icon = img(this, ix, 0, n === "food" ? ANIMALS[a.kind].food : "soap", 62).setInteractive({ useHandCursor: true });
      icon.on("pointerup", () => this.doCare(r, n));
      r.bubble.add(icon);
    });
    r.bubble.setScale(0.6);
    this.tweens.add({ targets: r.bubble, scale: 1, duration: 300, ease: "Back.easeOut" });
  }

  doCare(r, tool) {
    const before = store.shop.slots[r.i];
    if (!before) return;
    const { shop, result } = care(store.shop, r.i, tool);
    if (result === "notneeded") { sfx.no(); return; }
    store.setShop(shop);
    const ax = r.x, ay = r.y;
    if (tool === "broom") {
      const b = img(this, r.x - 95, r.y + 50, "broom", 100).setDepth(800);
      this.tweens.add({ targets: b, angle: { from: -30, to: 30 }, duration: 150, yoyo: true, repeat: 2, onComplete: () => b.destroy() });
      sfx.sweep();
      burst(this, r.x - 95, r.y + 70, "sparkles", 5, 40, 60);
    } else {
      const key = tool === "food" ? ANIMALS[before.kind].food : "soap";
      const f = img(this, r.x + 95, r.y - 70, key, 70).setDepth(800);
      this.tweens.add({ targets: f, x: ax, y: ay, scale: 0.05, duration: 400, ease: "Cubic.easeIn", onComplete: () => f.destroy() });
      if (tool === "bath") burst(this, ax, ay, "bubbles", 6, 50, 80);
      sfx.eat();
    }
    this.hop(r);
    if (result === "star") {
      this.time.delayedCall(350, () => {
        sfx.star();
        const k = shop.slots[r.i].stars - 1;
        burst(this, r.stars[k].x, r.stars[k].y, "star", 6, 30, 60);
        this.tweens.add({ targets: r.stars[k], scale: { from: r.stars[k].scale * 2, to: r.stars[k].scale }, duration: 400, ease: "Back.easeOut" });
      });
    }
    this.refresh();
  }

  hop(r) {
    this.tweens.add({ targets: r.animal, scaleY: r.animal.scaleX * 0.85, duration: 90, yoyo: true });
    this.tweens.add({ targets: r.animal, angle: { from: -8, to: 8 }, duration: 120, yoyo: true, repeat: 1, onComplete: () => r.animal.setAngle(0) });
  }

  tapAnimal(r) {
    const a = store.shop.slots[r.i];
    if (!a) return;
    sfx.pop();
    this.hop(r);
    burst(this, r.x, r.y - 20, "heart", 4, 36, 70);
    if (isReady(a) && this.customer && this.customer.req.slot === r.i) this.sendOff();
  }

  tapRoom(r) {
    if (!store.shop.slots[r.i]) this.openAdopt(r.i);
  }

  comeCustomer(req) {
    const kind = store.shop.slots[req.slot].kind;
    const c = this.add.container(1400, 470).setDepth(300);
    const body = img(this, 0, 0, "farmer", 170);
    const bub = this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-110, -230, 220, 110, 40).fillTriangle(-10, -122, 20, -122, 0, -95);
    const want = img(this, -45, -175, kind, 80);
    const ride = img(this, 50, -175, PLACES[req.place].kind === "zoo" ? "truck" : "ship", 70);
    c.add([body, bub, want, ride]).setSize(240, 420).setInteractive({ useHandCursor: true });
    c.on("pointerup", () => this.sendOff());
    this.customer = { c, req };
    sfx.pop();
    this.tweens.add({ targets: c, x: 1130, duration: 1200, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: body, y: -8, duration: 400, yoyo: true, repeat: -1 });
  }

  sendOff() {
    if (!this.customer) return;
    const { slot, place } = this.customer.req;
    if (!isReady(store.shop.slots[slot])) return;
    sfx.whoosh();
    this.scene.start("Departure", { slot, place });
  }

  openAdopt(slot) {
    if (this.adoptLayer) return;
    sfx.pop();
    const L = this.add.container(0, 0).setDepth(600);
    this.adoptLayer = L;
    const close = () => { L.destroy(); this.adoptLayer = null; };
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setInteractive();
    dim.on("pointerup", close);
    const panelHit = this.add.rectangle(W / 2, H / 2 + 20, 980, 560, 0xffffff, 0).setInteractive();
    const panel = this.add.graphics().fillStyle(0xfffaf2, 1).fillRoundedRect(W / 2 - 490, H / 2 - 260, 980, 560, 40);
    L.add([dim, panelHit, panel, text(this, W / 2, H / 2 - 205, "どの こを おむかえする？", 46, "#7a4a1e")]);
    adoptable(store.shop).forEach((o, k) => {
      const x = W / 2 - 300 + (k % 3) * 300, y = H / 2 - 60 + Math.floor(k / 3) * 220;
      const card = this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(x - 120, y - 90, 240, 190, 30);
      const pic = img(this, x, y - 15, o.kind, 120);
      const cost = img(this, x - 30, y + 70, "kuri", 40);
      const n = text(this, x + 22, y + 72, String(o.cost), 36, "#7a4a1e");
      L.add([card, pic, cost, n]);
      if (o.locked) { pic.setTint(0x000000).setAlpha(0.3); n.setText("?"); }
      else if (!o.afford) { pic.setAlpha(0.4); cost.setAlpha(0.4); n.setAlpha(0.4); }
      const hit = this.add.zone(x, y, 240, 190).setInteractive({ useHandCursor: true });
      L.add(hit);
      hit.on("pointerup", () => {
        const r = adopt(store.shop, slot, o.kind);
        if (!r.ok) { sfx.no(); this.tweens.add({ targets: pic, x: pic.x + 8, duration: 50, yoyo: true, repeat: 3 }); return; }
        store.setShop(r.shop);
        close();
        sfx.star();
        floatText(this, this.kuri.pos.x, this.kuri.pos.y + 40, "-" + o.cost, "#a0522d");
        this.refresh();
        const room = this.rooms[slot];
        room.animal.setScale(0.01);
        this.tweens.add({ targets: room.animal, scale: ANIMAL_PX(store.shop.slots[slot]) / 256, duration: 500, ease: "Back.easeOut" });
        burst(this, room.x, room.y, "sparkles", 8, 40, 110);
      });
    });
    L.add(button(this, W / 2 + 450, H / 2 - 230, "back", 50, close, { ring: 0x9fd3e6 }));
  }
}
