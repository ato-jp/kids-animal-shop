// のんびり牧場：寿命が来た子が引退して、のんびり暮らす場所。いつでも会いに来られる（死は描かない）。
import { store } from "../store.js";
import * as S from "../logic/shop.js";
import { W, H, text, creature, backdrop } from "../ui/kit.js";
import { ambient } from "../ui/ambient.js";
import { topBar } from "../ui/topbar.js";

import { bgm } from "../sound/bgm.js";

export class Farm extends Phaser.Scene {
  constructor() { super("Farm"); }
  create() {
    bgm.play("town");
    if (!backdrop(this, "farm")) {
      const g = this.add.graphics();
      g.fillGradientStyle(0xbfe6ff, 0xbfe6ff, 0xe8f7ff, 0xe8f7ff, 1).fillRect(0, 84, W, 260);
      g.fillStyle(0x9ed37a, 1).fillRect(0, 344, W, H - 344);
    }
    ambient(this);
    topBar(this);
    text(this, W / 2, 150, "のんびり ぼくじょう", 44, "#2e6b4f");
    const farm = store.shop.farm;
    if (!farm.length) text(this, W / 2, 470, "ながいき した こが ここで のんびり くらすよ", 28, "#2e6b4f");
    farm.slice(-24).forEach((f, i) => {
      const x = 120 + (i % 8) * 150, y = 420 + Math.floor(i / 8) * 110 + (i % 2) * 20;
      const c = creature(this, x, y, f.kind, 90, S.shineOf(f), S.paintOf(f));
      this.tweens.add({ targets: c, x: x + 20, duration: 2500 + i * 200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      text(this, x, y + 54, S.species(f.kind).name, 14, "#2e6b4f");
    });
  }
}
