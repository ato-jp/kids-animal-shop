// 旅立ち。状態は最初に確定させ（途中で閉じても記録は正しい）、あとは演出だけ。
import { store } from "../store.js";
import { depart } from "../logic/state.js";
import { PLACES } from "../data/places.js";
import { W, H, text, img, burst, floatText, moneyCounter, yen } from "../ui/kit.js";
import { sfx } from "../sound/sfx.js";

export class Departure extends Phaser.Scene {
  constructor() { super("Departure"); }
  create({ room, place }) {
    const a = store.shop.rooms[room].animal;
    const { shop, reward } = depart(store.shop, room, place);
    if (!reward) { this.scene.start("Shop"); return; }
    store.setShop(shop);
    const byShip = PLACES[place].kind === "aqua";

    const g = this.add.graphics();
    g.fillGradientStyle(0x8fd8ff, 0x8fd8ff, 0xdff4ff, 0xdff4ff, 1).fillRect(0, 0, W, H);
    if (byShip) { g.fillStyle(0x3aa7d8, 1).fillRect(0, 470, W, 250); g.fillStyle(0x5fc0e8, 1).fillRect(0, 470, W, 20); }
    else { g.fillStyle(0x9ed37a, 1).fillRect(0, 470, W, 250); g.fillStyle(0x8a8f99, 1).fillRect(0, 520, W, 110); for (let x = 20; x < W; x += 120) g.fillStyle(0xffffff, 1).fillRect(x, 570, 60, 10); }
    const money = moneyCounter(this, 60, 50);
    money.set(shop.money - reward);

    text(this, W / 2, 110, "いってらっしゃい！", 64, "#ffffff", { stroke: "#ff7a59", strokeThickness: 12 });
    const ride = img(this, 640, byShip ? 470 : 500, byShip ? "ship" : "truck", 300).setFlipX(true);
    const pet = img(this, 300, 430, a.kind, 160);
    const staff = img(this, 160, 420, "farmer", 170);
    this.tweens.add({ targets: staff, angle: { from: -6, to: 6 }, duration: 250, yoyo: true, repeat: -1 });

    this.tweens.chain({
      targets: pet,
      tweens: [
        { y: 280, x: 470, duration: 400, ease: "Quad.easeOut" },
        { y: byShip ? 330 : 360, x: 610, scale: pet.scale * 0.6, duration: 400, ease: "Quad.easeIn", onComplete: () => { sfx.pop(); burst(this, 610, 360, "heart", 6, 40, 90); } },
      ],
      onComplete: () => {
        sfx.whoosh();
        this.tweens.add({ targets: [ride, pet], x: "+=900", duration: 1400, ease: "Cubic.easeIn", delay: 300 });
        this.time.delayedCall(1200, () => {
          sfx.coin();
          for (let i = 0; i < 4; i++) {
            const k = img(this, W / 2 + (i - 1.5) * 60, H / 2, "coin", 70);
            this.tweens.add({ targets: k, x: money.pos.x, y: money.pos.y, scale: 0.1, duration: 600, delay: i * 120, ease: "Cubic.easeIn", onComplete: () => { k.destroy(); if (i === 3) money.set(shop.money); } });
          }
          floatText(this, W / 2, H / 2 - 60, "ありがとう！ +" + yen(reward));
        });
        this.time.delayedCall(2900, () => this.scene.start("Map", { highlight: place, kind: a.kind }));
      },
    });
  }
}
