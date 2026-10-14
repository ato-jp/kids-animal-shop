// いつも裏で動く時計。遊んでいる画面が出ている間だけ1秒ずつ時間を進め、
// 動物のおなかを減らし、夕方には空を染め、時間が来たら夜の画面へ切り替える。
// Phaser の時計はタブが裏に回ると止まるので、見えていない間は数えない。
import { store } from "../store.js";
import { tick, dayOver } from "../logic/state.js";
import { addPlayed, isNight, isEvening } from "../logic/playclock.js";
import { PLAY_SCENES } from "../parent.js";
import { W, H } from "../ui/kit.js";
import { sfx } from "../sound/sfx.js";

export class Clock extends Phaser.Scene {
  constructor() { super("Clock"); }
  create() {
    this.shade = this.add.rectangle(0, 0, W, H, 0xff7a2f, 0).setOrigin(0);
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.second() });
  }
  second() {
    const playing = PLAY_SCENES.filter(k => this.scene.isActive(k));
    if (!store.kid || store.paused || !playing.length) { this.shade.setAlpha(0); return; }
    const today = store.today();
    store.setShop(addPlayed(tick(store.shop, 1), 1, today));
    this.game.events.emit("shop-changed");
    this.shade.setAlpha(isEvening(store.shop, today) ? 0.16 : 0);
    if (isNight(store.shop, today)) {
      playing.forEach(k => this.scene.stop(k));
      this.shade.setAlpha(0);
      sfx.sleep();
      this.scene.launch("Night");
    } else if (dayOver(store.shop)) {
      // お店の1日（9じ〜18じ）が終わった：閉店して売上報告へ
      playing.forEach(k => this.scene.stop(k));
      this.shade.setAlpha(0);
      this.scene.launch("Report");
    }
  }
}
