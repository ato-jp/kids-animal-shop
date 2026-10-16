// じゅういさん：病気の子を連れて行くと入院して、次の朝7時に元気になってお店へ戻る。お金がかかる。
import { store } from "../store.js";
import * as S from "../logic/shop.js";
import { W, H, text, img, creature, card, floatText, coin, backdrop } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { sfx } from "../sound/sfx.js";
import { bgm } from "../sound/bgm.js";

export class Vet extends Phaser.Scene {
  constructor() { super("Vet"); }
  create() {
    bgm.play("town");
    this.cameras.main.setBackgroundColor("#eaf6f0");
    backdrop(this, "vet", 0.45);
    topBar(this);
    img(this, 140, 200, "vet", 120);
    text(this, 640, 150, "じゅういさん", 44, "#2e6b4f");
    const all = store.shop.pens.flatMap(p => p.animals);
    const sick = all.filter(a => a.sick && !a.hospitalUntil), stay = all.filter(a => a.hospitalUntil);
    if (!sick.length && !stay.length) text(this, W / 2, 380, "びょうきの こは いないよ。よかったね！", 32, "#2e6b4f");
    sick.forEach((a, i) => {
      const x = 260 + (i % 4) * 250, y = 330 + Math.floor(i / 4) * 230, cost = S.vetCost(a.kind);
      card(this, this.add.container(), x, y, 230, 210, () => {
        const r = S.toVet(store.shop, a.id, Date.now());
        if (!r.ok) { sfx.no(); floatText(this, x, y - 90, r.reason === "nomoney" ? "おかねが たりないよ" : "", "#a0522d"); return; }
        store.setShop(r.shop); sfx.star(); this.scene.restart();
      });
      creature(this, x, y - 40, a.kind, 100, S.shineOf(a), S.paintOf(a)).setTint(0xb8c4a0);
      text(this, x, y + 40, `にゅういん ${coin(cost)}`, 20, "#c0392b");
      text(this, x, y + 74, "あしたの あさ 7じに かえるよ", 14, "#2e6b4f");
    });
    if (stay.length) text(this, W / 2, 620, `にゅういん ちゅう：${stay.map(a => S.species(a.kind).name).join("、")}（あさ 7じに かえるよ）`, 22, "#2e6b4f");
  }
}
