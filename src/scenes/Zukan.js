// 図鑑。一度でも お店に来た動物は、たべもの・すむ へや・ほんとうの 話が読める。
// まだ会っていない動物は かげ だけ見える（何を集めるかの目標になる）。
import { store } from "../store.js";
import { ANIMALS } from "../data/animals.js";
import { FOODS } from "../data/foods.js";
import { ROOMS } from "../data/rooms.js";
import { W, H, text, img, backButton, button } from "../ui/kit.js";
import { sfx } from "../sound/sfx.js";

export class Zukan extends Phaser.Scene {
  constructor() { super("Zukan"); }
  create() {
    this.cameras.main.setBackgroundColor("#f3ead8");
    backButton(this, () => this.scene.start("Shop"));
    img(this, W / 2 - 260, 60, "book", 60);
    const seen = store.shop.seen;
    const kinds = Object.keys(ANIMALS);
    text(this, W / 2 + 20, 62, `どうぶつ ずかん  ${kinds.filter(k => seen.includes(k)).length} / ${kinds.length}`, 40, "#7a4a1e");
    kinds.forEach((k, i) => {
      const x = 170 + (i % 5) * 235, y = 230 + Math.floor(i / 5) * 270;
      const known = seen.includes(k);
      this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(x - 105, y - 115, 210, 240, 24);
      const pic = img(this, x, y - 25, k, 140);
      if (!known) pic.setTint(0x000000).setAlpha(0.25);
      text(this, x, y + 85, known ? ANIMALS[k].name : "？？？", 26, "#4a2c17");
      if (known) {
        const z = this.add.zone(x, y, 210, 240).setInteractive({ useHandCursor: true });
        z.on("pointerup", () => this.detail(k));
      }
    });
  }

  detail(k) {
    sfx.pop();
    const d = ANIMALS[k], f = FOODS[d.food], r = ROOMS[d.room];
    const L = this.add.container(0, 0).setDepth(500);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setInteractive();
    const close = () => L.destroy();
    dim.on("pointerup", close);
    const hit = this.add.rectangle(W / 2, H / 2, 900, 520, 0xffffff, 0).setInteractive();
    const bg = this.add.graphics().fillStyle(0xfffaf2, 1).fillRoundedRect(W / 2 - 450, H / 2 - 260, 900, 520, 40);
    L.add([dim, hit, bg,
      img(this, W / 2 - 270, H / 2 - 40, k, 260),
      text(this, W / 2 + 140, H / 2 - 200, d.name, 48, "#4a2c17"),
      img(this, W / 2 - 20, H / 2 - 110, d.food, 56), text(this, W / 2 + 20, H / 2 - 110, "たべもの： " + f.name, 28, "#4a2c17").setOrigin(0, 0.5),
      img(this, W / 2 - 20, H / 2 - 40, r.icon, 56), text(this, W / 2 + 20, H / 2 - 40, "すむ へや： " + r.name, 28, "#4a2c17").setOrigin(0, 0.5),
      img(this, W / 2 - 20, H / 2 + 30, d.water ? "water" : "soap", 56), text(this, W / 2 + 20, H / 2 + 30, "きれいに する： " + (d.water ? "みずかえ" : "せっけん"), 28, "#4a2c17").setOrigin(0, 0.5),
      text(this, W / 2 + 160, H / 2 + 150, d.fact, 26, "#7a4a1e", { wordWrap: { width: 520, useAdvancedWrap: true }, lineSpacing: 10 }),
      button(this, W / 2 + 400, H / 2 - 210, "back", 44, close, { ring: 0x9fd3e6 })]);
  }
}
