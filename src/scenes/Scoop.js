// 金魚すくい。指を置くと「あみ」が出て、離したときにあみの中にいた魚が取れる。
// 1回に3匹まで。取れた魚はお店の空き部屋へ（満室ならどんぐり1つ）。
import { store } from "../store.js";
import { catchFish } from "../logic/state.js";
import { SCOOP_FISH } from "../data/animals.js";
import { W, H, text, img, burst, floatText, backButton } from "../ui/kit.js";
import { sfx } from "../sound/sfx.js";

const PER_VISIT = 3, NET_R = 80, FISH_PX = 120;
const rand = (a, b) => a + Math.random() * (b - a);

export class Scoop extends Phaser.Scene {
  constructor() { super("Scoop"); }
  create() {
    this.t = 0; this.caught = 0; this.done = false;
    const g = this.add.graphics();
    g.fillGradientStyle(0x6fd0ee, 0x6fd0ee, 0x1f7fb5, 0x1f7fb5, 1).fillRect(0, 0, W, H);
    g.fillStyle(0xd8fbff, 0.08);
    [150, 450, 780, 1050].forEach(x => g.fillPoints([{ x: x - 20, y: 0 }, { x: x + 40, y: 0 }, { x: x + 170, y: H }, { x: x + 30, y: H }], true));
    g.fillStyle(0xe8cf9a, 1).fillRect(0, 660, W, 60);
    this.weeds = this.add.graphics();
    this.weedList = [90, 330, 610, 880, 1180].map(x => ({ x, h: rand(140, 220), ph: rand(0, 6) }));

    // 右下のおけ。取れた数だけ魚が入る
    const bowl = this.add.graphics().setDepth(40);
    bowl.fillStyle(0xffffff, 0.5).fillEllipse(1140, 600, 230, 120).fillStyle(0x9fe3ff, 0.8).fillEllipse(1140, 590, 200, 90);
    this.bowlFish = [];

    this.fishes = [];
    for (let i = 0; i < 7; i++) this.addFish(rand(150, W - 150));
    this.bubbles = Array.from({ length: 12 }, () => ({ s: img(this, rand(0, W), rand(0, H), "bubbles", rand(18, 34)).setAlpha(0.7).setDepth(30), sp: rand(30, 70), ph: rand(0, 6) }));

    this.net = this.add.graphics().setDepth(60).setVisible(false);
    this.input.on("pointerdown", p => this.showNet(p));
    this.input.on("pointermove", p => { if (p.isDown) this.showNet(p); });
    this.input.on("pointerup", p => this.scoop(p));

    backButton(this, () => this.scene.start("Shop"));
    const hint = text(this, W / 2, 80, "あみで すくってね！", 52, "#ffffff", { stroke: "#1f7fb5", strokeThickness: 10 });
    this.tweens.add({ targets: hint, alpha: 0, delay: 2200, duration: 800 });
  }

  addFish(x) {
    const key = SCOOP_FISH[Math.floor(Math.random() * SCOOP_FISH.length)];
    const s = img(this, x, rand(200, 560), key, FISH_PX).setDepth(20);
    this.fishes.push({ s, key, x: s.x, y: s.y, vx: rand(-80, 80) || 40, vy: rand(-20, 20), ph: rand(0, 6), turn: rand(1, 4) });
  }

  showNet(p) {
    if (this.done) return;
    this.net.setVisible(true).clear()
      .fillStyle(0xffffff, 0.22).fillCircle(p.x, p.y, NET_R)
      .lineStyle(10, 0xff7a59, 1).strokeCircle(p.x, p.y, NET_R)
      .lineStyle(14, 0xff7a59, 1).lineBetween(p.x + NET_R * 0.7, p.y + NET_R * 0.7, p.x + NET_R * 1.6, p.y + NET_R * 1.6);
    this.netAt = { x: p.x, y: p.y };
  }

  scoop(p) {
    this.net.setVisible(false);
    this.netAt = null;
    if (this.done) return;
    let best = null, bd = NET_R + 10;
    for (const f of this.fishes) { const d = Math.hypot(f.s.x - p.x, f.s.y - p.y); if (d < bd) { bd = d; best = f; } }
    if (!best) { sfx.splash(); return; }
    this.fishes = this.fishes.filter(f => f !== best);
    const { shop, slot } = catchFish(store.shop, best.key);
    store.setShop(shop);
    this.caught += 1;
    sfx.splash();
    burst(this, best.s.x, best.s.y, "sparkles", 6, 40, 80);
    const bx = 1080 + (this.caught - 1) * 60;
    this.tweens.add({ targets: best.s, x: bx, y: 585, scale: best.s.scale * 0.5, duration: 700, ease: "Cubic.easeInOut", onComplete: () => { best.s.setDepth(45); sfx.star(); } });
    if (slot < 0) floatText(this, 1140, 500, "おみせが いっぱい！ どんぐり +1");
    if (this.caught >= PER_VISIT) {
      this.done = true;
      this.time.delayedCall(900, () => text(this, W / 2, H / 2 - 40, "おみせに つれて かえろう！", 56, "#ffffff", { stroke: "#ff7a59", strokeThickness: 12 }).setDepth(90));
      this.time.delayedCall(3000, () => this.scene.start("Shop"));
    } else {
      this.time.delayedCall(1500, () => this.addFish(Math.random() < 0.5 ? -60 : W + 60));
    }
  }

  update(_, dtMs) {
    const d = Math.min(dtMs / 1000, 0.05);
    this.t += d;
    this.weeds.clear().lineStyle(16, 0x3fbf6f, 1);
    for (const w of this.weedList) {
      const pts = [];
      for (let i = 0; i <= 8; i++) pts.push({ x: w.x + Math.sin(this.t * 1.3 + w.ph + i * 0.5) * i * 3, y: 670 - (w.h * i) / 8 });
      this.weeds.strokePoints(pts);
    }
    for (const f of this.fishes) {
      f.turn -= d;
      if (f.turn < 0) { f.turn = rand(1.5, 4); f.vx = (Math.random() < 0.5 ? -1 : 1) * rand(50, 110); f.vy = rand(-30, 30); }
      // あみが近いと少し逃げる（簡単すぎないように。ただし速すぎない）
      if (this.netAt) {
        const dx = f.x - this.netAt.x, dy = f.y - this.netAt.y, dist = Math.hypot(dx, dy);
        if (dist < 200 && dist > 1) { f.vx += (dx / dist) * 90 * d; f.vy += (dy / dist) * 90 * d; }
      }
      f.vx = Phaser.Math.Clamp(f.vx, -140, 140); f.vy = Phaser.Math.Clamp(f.vy, -60, 60);
      f.x += f.vx * d; f.y += f.vy * d;
      if (f.x < 70) { f.x = Math.max(f.x, -60); f.vx = Math.abs(f.vx); }
      if (f.x > W - 70) { f.x = Math.min(f.x, W + 60); f.vx = -Math.abs(f.vx); }
      if (f.y < 150 || f.y > 600) { f.y = Phaser.Math.Clamp(f.y, 150, 600); f.vy *= -1; }
      // 元の絵は左向き。右へ進むときは反転
      f.s.setPosition(f.x, f.y + Math.sin(this.t * 2 + f.ph) * 6).setFlipX(f.vx > 0).setRotation(Phaser.Math.Clamp(f.vy / 300, -0.25, 0.25) * (f.vx > 0 ? 1 : -1));
    }
    for (const b of this.bubbles) { b.s.y -= b.sp * d; b.s.x += Math.sin(this.t * 2 + b.ph) * 0.3; if (b.s.y < -20) { b.s.y = H + 20; b.s.x = rand(0, W); } }
  }
}
