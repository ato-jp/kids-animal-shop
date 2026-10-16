// いつも裏で動く時計。1秒ごとに：
//  ・現実の時計に合わせてお店を進める（store.tick。実際に変わるのは正時をまたいだときだけ）
//  ・10分ごとに 能美市の天気を見る（取りに行くのは1時間に1回。weather.js がためておく）
import { store } from "../store.js";
import { season } from "../logic/time.js";
import { currentWeather } from "../weather.js";
import { bgm } from "../sound/bgm.js";

export class Clock extends Phaser.Scene {
  constructor() { super("Clock"); }
  create() {
    this.sec = 0;
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.second() });
    this.pollWeather();
    this.time.addEvent({ delay: 10 * 60 * 1000, loop: true, callback: () => this.pollWeather() });
    this.game.events.on("bgm", () => { if (store.family.settings.bgm) bgm.resume(); else bgm.stop(); });
  }
  pollWeather() {
    const now = Date.now(), s = store.shop;
    currentWeather(now, s ? season(s.startedAt, now) : 0).then(() => this.game.events.emit("weather"));
  }
  second() {
    if (!store.kid || store.paused) return;
    // あそんだ時間：画面が見えている あいだ 60秒ごとに 1分（おとなの「あそびの きろく」）
    if (document.visibilityState === "visible" && ++this.sec >= 60) {
      this.sec = 0;
      const s = store.shop;
      store.setShop({ ...s, today: { ...s.today, play: (s.today.play || 0) + 1 } });
    }
    const now = Date.now();
    const before = store.shop;
    const after = store.tick(now);
    if (after !== before) this.game.events.emit("shop-changed");
  }
}
