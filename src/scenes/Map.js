// 日本地図。送った動物が送り先のまわりに並び、送るほど園の印が大きくなる。
// 島の形は正確な海岸線ではなく、丸い形を重ねた子ども向けの地図。
import { store } from "../store.js";
import { PLACES } from "../data/places.js";
import { W, H, text, img, burst, backButton, button } from "../ui/kit.js";
import { sfx } from "../sound/sfx.js";

// [x, y, 横の半径, 縦の半径, 傾き]（1280×720 の座標）
const ISLANDS = [
  [1000, 120, 120, 80, 0.1], [905, 270, 60, 120, 0.3], [860, 400, 80, 70, 0], [770, 420, 130, 62, -0.25],
  [600, 480, 150, 50, -0.2], [440, 465, 120, 40, -0.15], [520, 560, 85, 32, -0.1], [270, 560, 70, 95, 0.1], [110, 640, 44, 18, -0.4],
];

export class MapScene extends Phaser.Scene {
  constructor() { super("Map"); }
  create({ highlight, kind } = {}) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x7fd1f0, 0x7fd1f0, 0x3a9fd0, 0x3a9fd0, 1).fillRect(0, 0, W, H);
    for (const [x, y, rx, ry, rot] of ISLANDS) {
      this.add.ellipse(x, y, rx * 2 + 16, ry * 2 + 16, 0xf3e3b5).setRotation(rot);
      this.add.ellipse(x, y, rx * 2, ry * 2, 0x9ed37a).setRotation(rot);
    }
    backButton(this, () => this.scene.start("Shop"));

    this.markers = {};
    for (const [id, p] of Object.entries(PLACES)) {
      const sent = store.shop.places[id].sent;
      const shown = id === highlight ? sent.slice(0, -1) : sent; // いま送った子はあとで飛んでくる
      this.markers[id] = this.drawMarker(id, p, shown);
    }
    if (highlight) this.time.delayedCall(400, () => this.arrive(highlight, kind));
  }

  drawMarker(id, p, sent) {
    const x = p.x * W, y = p.y * H;
    const c = this.add.container(x, y);
    const grow = 1 + Math.min(sent.length, 8) * 0.07;
    const base = this.add.graphics().fillStyle(0xffffff, 1).fillCircle(0, 0, 46).lineStyle(5, p.kind === "zoo" ? 0xffb347 : 0x5fb8ff, 1).strokeCircle(0, 0, 46);
    c.add([base, img(this, 0, 0, p.kind === "zoo" ? "lion" : "dolphin", 66)]);
    sent.slice(-8).forEach((k, i) => {
      const a = -Math.PI / 2 + (i - 3.5) * 0.42;
      c.add(img(this, Math.cos(a) * 74, Math.sin(a) * 74 + 10, k, 40));
    });
    c.setScale(grow);
    const label = text(this, x, y + 62 * grow, store.shop.places[id].name, 20, "#24435a", { stroke: "#ffffff", strokeThickness: 6 });
    c.setSize(120, 120).setInteractive({ useHandCursor: true });
    c.on("pointerup", () => this.visit(id));
    return { c, label, grow, count: sent.length };
  }

  arrive(id, kind) {
    const m = this.markers[id];
    const pet = img(this, 160, H - 80, kind, 90).setDepth(500);
    sfx.whoosh();
    this.tweens.add({
      targets: pet, x: m.c.x, y: m.c.y, scale: pet.scale * 0.5, duration: 1200, ease: "Sine.easeInOut",
      onComplete: () => {
        pet.destroy();
        m.c.destroy(); m.label.destroy();
        const p = PLACES[id];
        this.markers[id] = this.drawMarker(id, p, store.shop.places[id].sent);
        const n = this.markers[id];
        this.tweens.add({ targets: n.c, scale: { from: n.grow * 1.4, to: n.grow }, duration: 500, ease: "Back.easeOut" });
        burst(this, n.c.x, n.c.y, "sparkles", 8, 44, 120);
        burst(this, n.c.x, n.c.y, "heart", 5, 40, 90);
        sfx.star();
      },
    });
  }

  // 送り先をのぞく：その園にいる子たちが並んで跳ねる
  visit(id) {
    sfx.pop();
    const L = this.add.container(0, 0).setDepth(700);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setInteractive();
    const isZoo = PLACES[id].kind === "zoo";
    const panel = this.add.graphics().fillStyle(isZoo ? 0xd6efb0 : 0xbfe8fa, 1).fillRoundedRect(110, 100, W - 220, 520, 40);
    L.add([dim, panel, text(this, W / 2, 165, store.shop.places[id].name, 44, "#24435a")]);
    const sent = store.shop.places[id].sent;
    if (!sent.length) L.add(text(this, W / 2, 380, "まだ だれも いないよ", 40, "#24435a"));
    const shown = sent.slice(-12), perRow = Math.min(6, shown.length);
    shown.forEach((k, i) => {
      const row = Math.floor(i / 6), inRow = row === Math.floor((shown.length - 1) / 6) ? shown.length - row * 6 : perRow;
      const x = W / 2 + ((i % 6) - (inRow - 1) / 2) * 165, y = (shown.length > 6 ? 320 : 400) + row * 170;
      const s = img(this, x, y, k, 130);
      L.add(s);
      this.tweens.add({ targets: s, y: y - 18, duration: 400 + (i % 3) * 90, yoyo: true, repeat: -1, ease: "Quad.easeOut", delay: i * 60 });
    });
    const close = () => L.destroy();
    dim.on("pointerup", close);
    L.add(button(this, W - 150, 140, "back", 50, close, { ring: 0x9fd3e6 }));
  }
}
