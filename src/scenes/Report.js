// 閉店と売上報告。きょう何をして、いくら入って、いくら出たかを振り返り、次の日へ進む。
import { store } from "../store.js";
import { closeDay } from "../logic/state.js";
import { W, H, text, img, button, yen } from "../ui/kit.js";
import { sfx } from "../sound/sfx.js";

export class Report extends Phaser.Scene {
  constructor() { super("Report"); }
  create() {
    const shop = store.shop, log = shop.day.log;
    const g = this.add.graphics();
    g.fillGradientStyle(0xffb36b, 0xffb36b, 0x6b5aa8, 0x6b5aa8, 1).fillRect(0, 0, W, H);
    g.fillStyle(0xfffaf2, 1).fillRoundedRect(W / 2 - 400, 70, 800, 580, 40);
    img(this, W / 2 - 300, 135, "chart", 70);
    text(this, W / 2 + 20, 135, `${shop.day.n}にちめ おしまい`, 48, "#7a4a1e");

    const profit = log.income - log.expense;
    const rows = [
      ["heart", "おせわ した かず", log.care + "かい", "#4a2c17"],
      ["truck", "たびだった どうぶつ", log.sent + "ひき", "#4a2c17"],
      ["coin", "はいった おかね", "+" + yen(log.income), "#2e7d32"],
      ["cart", "つかった おかね", "-" + yen(log.expense), "#c0392b"],
    ];
    rows.forEach(([icon, label, value, color], i) => {
      const y = 215 + i * 62;
      img(this, W / 2 - 320, y, icon, 48);
      text(this, W / 2 - 280, y, label, 30, "#4a2c17").setOrigin(0, 0.5);
      text(this, W / 2 + 330, y, value, 34, color).setOrigin(1, 0.5);
    });
    this.add.graphics().lineStyle(4, 0xe0c9a6, 1).lineBetween(W / 2 - 330, 455, W / 2 + 330, 455);
    text(this, W / 2 - 280, 492, "きょうの もうけ", 32, "#4a2c17").setOrigin(0, 0.5);
    text(this, W / 2 + 330, 492, (profit >= 0 ? "+" : "-") + yen(Math.abs(profit)), 40, profit >= 0 ? "#2e7d32" : "#c0392b").setOrigin(1, 0.5);
    text(this, W / 2 + 330, 535, "てもちの おかね " + yen(shop.money), 24, "#7a4a1e").setOrigin(1, 0.5);

    button(this, W / 2 - 80, 598, "sun", 60, () => {
      sfx.star();
      store.setShop(closeDay(store.shop).shop);
      this.scene.start("Shop");
    });
    text(this, W / 2 + 40, 600, "つぎの ひへ", 32, "#7a4a1e");
  }
}
