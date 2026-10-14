// 夜。動物たちが寝て、その日の遊びがおしまいになる。子どもの操作は受け付けない
// （ほかの子に交代するボタンと、おとなの歯車だけ）。
import { store } from "../store.js";
import { W, H, text, img, button, parentGate } from "../ui/kit.js";
import { openParent } from "../parent.js";
import { sfx } from "../sound/sfx.js";

export class Night extends Phaser.Scene {
  constructor() { super("Night"); }
  create() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0d1b3d, 0x0d1b3d, 0x2a3a6e, 0x2a3a6e, 1).fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const s = this.add.circle(Math.random() * W, Math.random() * 380, Math.random() * 3 + 1, 0xffffff);
      this.tweens.add({ targets: s, alpha: { from: 1, to: 0.2 }, duration: 800 + Math.random() * 1500, yoyo: true, repeat: -1 });
    }
    img(this, 1080, 140, "moon", 170);
    text(this, W / 2, 140, "おやすみなさい", 72, "#fff6cf");
    text(this, W / 2, 230, "また あした ね", 44, "#fff6cf");

    const pets = store.shop ? store.shop.rooms.map(r => r.animal).filter(Boolean) : [];
    const gap = 180, x0 = W / 2 - ((pets.length - 1) * gap) / 2;
    pets.forEach((a, i) => {
      const x = x0 + i * gap, y = 520;
      const p = img(this, x, y, a.kind, 130).setTint(0x8090c0);
      this.tweens.add({ targets: p, scaleY: p.scaleY * 0.95, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: i * 200 });
      const z = img(this, x + 60, y - 70, "zzz", 50);
      this.tweens.add({ targets: z, y: y - 110, alpha: { from: 1, to: 0 }, duration: 2000, repeat: -1, delay: i * 300 });
    });

    if (Object.keys(store.family.kids).length > 1)
      button(this, 70, 62, store.kid.icon, 70, () => { sfx.pop(); this.scene.start("Who"); }, { bg: Number(String(store.kid.color).replace("#", "0x")), ring: 0xffffff });
    parentGate(this, W - 44, H - 40, () => openParent(this));
  }
}
