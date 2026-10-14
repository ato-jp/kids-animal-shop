// 「だれの おみせ？」字が読めなくても、自分の動物と色で選べる。
import { store } from "../store.js";
import { addKid } from "../logic/state.js";
import { isNight } from "../logic/playclock.js";
import { W, H, text, img, button, parentGate } from "../ui/kit.js";
import { openParent } from "../parent.js";
import { sfx } from "../sound/sfx.js";

const MAX_KIDS = 4;
const COLORS = [0xff9f80, 0x8fd3ff, 0xb9e88f, 0xffd36e];
const KID_ICONS = ["hamster", "rabbit", "dog", "cat", "penguin", "lion"];

export class Who extends Phaser.Scene {
  constructor() { super("Who"); }
  create() {
    this.cameras.main.setBackgroundColor("#fff3e0");
    this.draw();
    this.events.on("refresh", () => this.scene.restart());
  }
  draw() {
    text(this, W / 2, 110, "だれの おみせ？", 64, "#7a4a1e");
    const kids = Object.entries(store.family.kids);
    const items = kids.map(([id, k]) => ({ id, k }));
    if (kids.length < MAX_KIDS) items.push({ add: true });
    const gap = 290, x0 = W / 2 - ((items.length - 1) * gap) / 2;
    items.forEach((it, i) => {
      const x = x0 + i * gap, y = 380;
      if (it.add) {
        button(this, x, y, "plus", 120, () => { sfx.pop(); this.pickIcon(kids.length); }, { bg: 0xffffff, ring: 0xdddddd });
        return;
      }
      const color = Number(String(it.k.color).replace("#", "0x"));
      button(this, x, y, it.k.icon, 170, () => this.enter(it.id), { bg: color, ring: 0xffffff });
      text(this, x, y + 160, it.k.name || "", 40, "#7a4a1e");
    });
    parentGate(this, W - 50, H - 50, () => openParent(this));
  }
  pickIcon(n) {
    const layer = this.add.container(0, 0).setDepth(500);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setInteractive();
    const panel = this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(140, 120, W - 280, 480, 40);
    const panelHit = this.add.rectangle(W / 2, 360, W - 280, 480, 0xffffff, 0).setInteractive(); // 白い所を押しても閉じない
    layer.add([dim, panel, panelHit,text(this, W / 2, 190, "どの どうぶつに する？", 48, "#7a4a1e")]);
    KID_ICONS.forEach((k, i) => {
      const x = 290 + i * 140, y = 400;
      layer.add(button(this, x, y, k, 110, () => {
        const color = "#" + COLORS[n % COLORS.length].toString(16).padStart(6, "0");
        const r = addKid(store.family, { name: "", icon: k, color });
        r.family.current = r.id;
        store.setFamily(r.family);
        sfx.star();
        this.enter(r.id);
      }));
    });
    dim.on("pointerup", () => layer.destroy());
  }
  enter(id) {
    sfx.pop();
    store.family.current = id;
    store.persist();
    this.scene.start(isNight(store.shop, store.today()) ? "Night" : "Shop");
  }
}
