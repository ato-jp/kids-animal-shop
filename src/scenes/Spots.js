// つりば：場所・エサ・竿を選んで出かける。場所ごとに行くお金（ガソリン・船・飛行機）がかかる。
// いま（季節・時間帯・天気）その場所で釣れる生き物の かげ を見せる（会ったことのある子は絵で）。
import { store } from "../store.js";
import * as S from "../logic/shop.js";
import { AREAS, BAITS, RODS, RARITY_NAME } from "../data/fish.js";
import { season, timeOfDay, SEASONS, TIMES } from "../logic/time.js";
import { weatherNow, WEATHER_NAME } from "../weather.js";
import { W, H, text, img, card, creature, floatText, coin, backdrop } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { sfx } from "../sound/sfx.js";
import { bgm } from "../sound/bgm.js";

export class Spots extends Phaser.Scene {
  constructor() { super("Spots"); }
  create({ area = "pond", bait = null, rod = null } = {}) {
    if (!AREAS[area]) area = "pond"; // 前の版の 細かい釣り場の名前が 残っていたとき
    bgm.play("fish");
    this.cameras.main.setBackgroundColor("#dff1fb");
    backdrop(this, "spots", 0.45);
    topBar(this);
    const shop = store.shop, now = Date.now();
    const sea = season(shop.startedAt, now), tod = timeOfDay(now), w = weatherNow(now, sea);
    bait = bait || Object.keys(BAITS).find(b => shop.baits[b] > 0) || "worm";
    rod = rod || shop.rods[shop.rods.length - 1];
    this.sel = { area, bait, rod };
    text(this, W / 2, 112, `いまは ${SEASONS[sea]}・${TIMES[tod]}・${WEATHER_NAME[w]}　　つりレベル ${S.fishLevel(shop)}`, 24, "#24435a");

    // 場所
    // 釣り場は いけ・かわ・うみ の3つ（景色の絵があれば それを小さく）
    Object.entries(AREAS).forEach(([id, a], i) => {
      const x = 250 + i * 390, y = 215, why = S.canGo(shop, id), on = id === area;
      card(this, this.add.container(), x, y, 350, 140, () => { sfx.pop(); this.scene.restart({ ...this.sel, area: id }); }, on ? 0xffe28a : 0xffffff);
      if (this.textures.exists("bg_" + a.bg)) this.add.image(x - 70, y, "bg_" + a.bg).setDisplaySize(176, 99); else img(this, x - 70, y, a.icon, 80);
      text(this, x + 90, y - 22, a.name, 30, "#24435a");
      text(this, x + 90, y + 24, why === "notank" ? "あいた すいそうが ない" : a.cost ? coin(a.cost) : "ただ", 18, why === "ok" ? "#2e7d32" : "#c0392b");
    });

    // いま釣れる生き物のかげ
    const list = S.catchable(area, sea, tod, w);
    text(this, 90, 330, "いま つれる", 20, "#24435a").setOrigin(0, 0.5);
    list.slice(0, 11).forEach((a, i) => {
      const x = 260 + i * 92, seen = shop.seen.includes(a.id);
      const c = creature(this, x, 330, a.id, 70);
      if (!seen) c.setTint(0x000000).setAlpha(0.3);
    });

    // エサ
    Object.entries(BAITS).forEach(([id, b], i) => {
      const x = 170 + i * 220, y = 450, n = shop.baits[id] || 0, on = id === bait;
      card(this, this.add.container(), x, y, 200, 110, () => { sfx.pop(); this.scene.restart({ ...this.sel, bait: id }); }, on ? 0xffe28a : 0xffffff);
      img(this, x - 50, y, b.icon, 56).setAlpha(n ? 1 : 0.35);
      text(this, x + 30, y - 14, b.name, 18, "#24435a");
      text(this, x + 30, y + 18, `${n}こ`, 18, "#7a4a1e");
    });
    // 竿
    shop.rods.forEach((id, i) => {
      const x = 170 + i * 220, y = 580, on = id === rod;
      card(this, this.add.container(), x, y, 200, 90, () => { sfx.pop(); this.scene.restart({ ...this.sel, rod: id }); }, on ? 0xffe28a : 0xffffff);
      img(this, x - 60, y, "pole", 50);
      text(this, x + 25, y, RODS[id].name, 17, "#24435a");
    });
    // めずらしい魚の出やすさ（エサ×竿）
    const odds = S.rarityOdds(bait, rod);
    odds.forEach((o, i) => text(this, 900, 430 + i * 34, `${RARITY_NAME[i + 1]}  ${Math.round(o * 100)}%`, 20, "#24435a").setOrigin(0, 0.5));

    // 出かける
    card(this, this.add.container(), 1090, 600, 260, 110, () => this.go(), 0xff9f80);
    img(this, 1010, 600, AREAS[area].cost ? "fuel" : "pole", 60);
    text(this, 1120, 600, "しゅっぱつ", 30, "#ffffff", { stroke: "#a0522d", strokeThickness: 6 });
  }
  go() {
    const { area, bait, rod } = this.sel, shop = store.shop;
    const why = S.canGo(shop, area);
    const NO = { notank: area === "sea" ? "うみの さかなを いれる すいそうに あきが ないよ" : "かわ・いけの さかなを いれる すいそうに あきが ないよ", nomoney: "おかねが たりないよ" };
    if (why !== "ok") { sfx.no(); floatText(this, W / 2, 520, NO[why] || "まだ いけないよ", "#a0522d"); return; }
    if (!(shop.baits[bait] > 0)) { sfx.no(); floatText(this, 1090, 520, "エサが ないよ。いちばで かおう", "#a0522d"); return; }
    store.setShop(S.startTrip(shop, area).shop);
    sfx.whoosh();
    this.scene.start("Fishing", { area, bait, rod });
  }
}
