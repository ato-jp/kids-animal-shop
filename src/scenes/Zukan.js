// 図鑑：陸の動物と水の生き物。会ったことのある子は絵と説明、まだの子は かげ だけ。
// 水の生き物は「どこで・いつ・どんな天気で」会えるかも出す（現実の決まりで売れない・放すだけの子は その理由も）。
import { store } from "../store.js";
import * as S from "../logic/shop.js";
import { ANIMALS } from "../data/animals.js";
import { AQUATIC } from "../data/aquatic.js";
import { PLACE_NAME, RARITY_NAME } from "../data/fish.js";
import { PENS } from "../data/pens.js";
import { SHINES, SHINE_IDS } from "../data/shine.js";
import { SEASONS, TIMES } from "../logic/time.js";
import { WEATHER_NAME } from "../weather.js";
import { W, H, text, card, creature, panel } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { sfx } from "../sound/sfx.js";
import { bgm } from "../sound/bgm.js";

const PER = 18;
const WHERE = { market: "いちばで かえる", gift: "すいぞくかんから とどく" };

// 紙の地：うすい しみ と 繊維の線（毎回同じになるよう決まった並び）
function paper(scene) {
  const g = scene.add.graphics();
  for (let i = 0; i < 260; i++) {
    const x = (i * 97) % W, y = 84 + ((i * 53) % (H - 84)), l = 6 + (i % 5) * 4;
    g.lineStyle(1, i % 3 ? 0xd9ccb0 : 0xc9b994, 0.5).lineBetween(x, y, x + l, y + ((i % 3) - 1));
  }
  for (let i = 0; i < 6; i++) g.fillStyle(0xd8c7a0, 0.12).fillCircle((i * 331) % W, 140 + (i * 173) % 520, 60 + (i % 3) * 30);
}

// 図鑑の1枚（標本の台紙のような 二重の細い枠）
function plate(scene, x, y, w, h, onTap) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.08).fillRect(x - w / 2 + 3, y - h / 2 + 4, w, h);
  g.fillStyle(0xfbf7ec, 1).fillRect(x - w / 2, y - h / 2, w, h);
  g.lineStyle(1, 0x8a7656, 0.8).strokeRect(x - w / 2 + 5, y - h / 2 + 5, w - 10, h - 10);
  g.lineStyle(1, 0x8a7656, 0.35).strokeRect(x - w / 2 + 8, y - h / 2 + 8, w - 16, h - 16);
  scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).on("pointerup", onTap);
  return g;
}

export class Zukan extends Phaser.Scene {
  constructor() { super("Zukan"); }
  create({ tab = 0, page = 0 } = {}) {
    bgm.play("shop");
    this.cameras.main.setBackgroundColor("#efe6d0");
    paper(this);
    topBar(this);
    const list = tab === 0 ? Object.keys(ANIMALS) : AQUATIC.map(a => a.id);
    const seen = store.shop.seen;
    [["どうぶつ", 0], ["みずの いきもの", 1]].forEach(([label, i]) => {
      card(this, this.add.container(), 200 + i * 260, 130, 240, 64, () => { sfx.pop(); this.scene.restart({ tab: i }); }, i === tab ? 0xffe28a : 0xffffff);
      text(this, 200 + i * 260, 131, label, 22, "#4a2c17");
    });
    text(this, 1000, 120, `あった かず ${list.filter(k => seen.includes(k)).length} / ${list.length}`, 26, "#7a4a1e");
    // 水の生き物は キラキラあつめ（ふつう＋4つ）の数も
    if (tab === 1) {
      const got = list.reduce((n, k) => n + ((store.shop.shines || {})[k] || []).length, 0);
      text(this, 1000, 152, `キラキラ あつめ ${got} / ${list.length * (SHINE_IDS.length + 1)}`, 20, "#b8860b");
    }
    list.slice(page * PER, page * PER + PER).forEach((k, i) => {
      const x = 130 + (i % 6) * 205, y = 250 + Math.floor(i / 6) * 150, known = seen.includes(k);
      plate(this, x, y, 190, 140, () => known && this.detail(k));
      const c = creature(this, x, y - 16, k, 86);
      if (!known) c.setTint(0x000000).setAlpha(0.25);
      text(this, x, y + 46, known ? S.species(k).name : "？？？", 17, "#3b2a1a");
      const nc = ((store.shop.shines || {})[k] || []).filter(c => c !== "normal").length;
      if (tab === 1 && nc) text(this, x + 70, y - 56, "★".repeat(nc), 12, "#b8860b").setOrigin(1, 0.5); // 集めた キラキラの数
      text(this, x - 82, y - 58, String(list.indexOf(k) + 1).padStart(3, "0"), 12, "#8a7656").setOrigin(0, 0.5); // 図鑑の番号
    });
    const pages = Math.ceil(list.length / PER);
    if (pages > 1) {
      text(this, W / 2, 690, `${page + 1} / ${pages}`, 22, "#7a4a1e");
      if (page > 0) { card(this, this.add.container(), W / 2 - 170, 690, 130, 46, () => this.scene.restart({ tab, page: page - 1 })); text(this, W / 2 - 170, 690, "まえ", 20, "#4a2c17"); }
      if (page < pages - 1) { card(this, this.add.container(), W / 2 + 170, 690, 130, 46, () => this.scene.restart({ tab, page: page + 1 })); text(this, W / 2 + 170, 690, "つぎ", 20, "#4a2c17"); }
    }
  }

  detail(k) {
    sfx.pop();
    const d = S.species(k);
    const P = panel(this, d.name, { w: 980, h: 560 });
    P.L.add(creature(this, P.left + 230, H / 2 + 10, k, 260));
    const lines = [];
    if (d.aquatic) {
      const a = d.aquatic;
      lines.push(`あえる ところ：${PLACE_NAME[a.area] || WHERE[a.area]}`);
      if (PLACE_NAME[a.area]) {
        lines.push(`きせつ：${a.seasons.length === 4 ? "いつでも" : a.seasons.map(s => SEASONS[s]).join("・")}`);
        lines.push(`じかん：${a.times.length === 4 ? "いつでも" : a.times.map(t => TIMES[t]).join("・")}　てんき：${a.weathers.length === 3 ? "どれでも" : a.weathers.map(w => WEATHER_NAME[w]).join("・")}`);
      }
      lines.push(`めずらしさ：${RARITY_NAME[a.rarity]}`);
      if (a.noSale) lines.push("きまりで うったり かったり できない");
      if (a.releaseOnly) lines.push("きまりで つったら かえす");
    }
    if (d.endangered) lines.push("かずが へって いる いきもの（ぜつめつ きぐしゅ）");
    if (!d.aquatic) {
      lines.push(`すむ ところ：${PENS[d.pen].name} Lv${d.size}〜`);
      lines.push(`じゅみょう：だいたい ${d.life}さい`);
    }
    lines.forEach((l, i) => P.L.add(text(this, P.left + 430, P.top + 130 + i * 40, l, 22, "#4a2c17").setOrigin(0, 0.5)));
    // キラキラあつめ：ふつう＋4つ。会ったものは 光って、まだのものは かげ
    if (d.aquatic) {
      const got = (store.shop.shines || {})[k] || [];
      [null, ...SHINE_IDS].forEach((c, i) => {
        const x = P.left + 80 + i * 66, y = P.top + P.h - 60, has = got.includes(c || "normal");
        const im = creature(this, x, y, k, 54, has ? c : false);
        if (!has) im.setTint(0x000000).setAlpha(0.2);
        P.L.add([im, text(this, x, y + 34, c ? SHINES[c].name : "ふつう", 11, "#7a4a1e")]);
      });
    }
    if (d.fact) P.L.add(text(this, P.left + 430, P.top + 160 + lines.length * 40, d.fact, 24, "#7a4a1e", { wordWrap: { width: 500, useAdvancedWrap: true }, lineSpacing: 8, align: "left" }).setOrigin(0, 0));
  }
}
