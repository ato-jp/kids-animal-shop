// 自分の町（箱庭）：20×9 マスの地面に、建物と飾りを置く。ふだんは 建物を押すと その画面へ。
// ななめ上から見下ろす形（2026-10-16）：地面は 上から見た芝生を描き、「みち」は石だたみを描く。建物と飾りは 見下ろしの絵（tn_）、
// まだ無ければ 前の向きの建物の絵（bd_）、それも無ければ 絵文字で代わりに出す。
// 右下の「もようがえ」で 指で引っぱって動かせる（マスにピタッと止まり、重なる所は赤くなって置けない）。飾りは 買って置き、押すと しまえる。
// 兄弟のお店へは えき から でんしゃで行く（せんろ を 町のはしまで つなぐ。logic/town.js の railConnected）。ルールは logic/town.js、並びと値段は data/town.js。
import { store } from "../store.js";
import { W, H, text, img, kidFace, floatText, panel, creature, coin, button, card, guide, burst } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { ambient } from "../ui/ambient.js";
import { shopLevel, species, needs } from "../logic/shop.js";
import { boardFor, canFulfill } from "../logic/board.js";
import { townOf, townSpec, isBuilding, moveTownItem, buyTownDecor, removeTownDecor, canPlaceTown } from "../logic/town.js";
import { TOWN_TILE as T, TOWN_TOP, TOWN_COLS, TOWN_ROWS, TOWN_DECOR } from "../data/town.js";
import { SHINES } from "../data/shine.js";
import { MORPHS } from "../data/morphs.js";
import { LEVELS, ninki } from "../logic/zoo.js";
import { prizeReady } from "../logic/prize.js";
import { eventOn, presentReady, takePresent } from "../logic/events.js";
import { sfx } from "../sound/sfx.js";
import { bgm } from "../sound/bgm.js";

export class Town extends Phaser.Scene {
  constructor() { super("Town"); }
  create() {
    bgm.play("town");
    this.edit = false;
    this.drawGround();
    this.gridG = this.add.graphics().setDepth(1);
    this.layer = null;
    ambient(this, { depth: 50 }); // 時刻と天気の色は 建物の上・札の下
    topBar(this, { back: false });
    // 右上（町の地面の上の空）に レベルと もようがえ
    this.levelText = text(this, 1000, 112, "", 22, "#2e7d32", { stroke: "#ffffff", strokeThickness: 6 }).setDepth(70);
    this.editBtn = button(this, W - 50, 42, "brush", 56, () => { sfx.pop(); this.edit = !this.edit; this.redraw(); }).setDepth(600);
    this.editLabel = text(this, W - 50, 98, "もようがえ", 15, "#ffffff", { stroke: "#4a2c17", strokeThickness: 5 }).setDepth(600);
    this.buyBtn = button(this, W - 140, 42, "plant", 56, () => { sfx.pop(); this.decorMenu(); }).setDepth(600);
    this.buyLabel = text(this, W - 140, 98, "かざりを かう", 15, "#ffffff", { stroke: "#4a2c17", strokeThickness: 5 }).setDepth(600);
    this.redraw();
    this.eventDeco();
    this.time.delayedCall(300, () => this.showSummary());
  }

  // 現実の行事（logic/events.js）：上に 札、空から ふる物、その年 1回の プレゼント
  eventDeco() {
    const now = Date.now(), e = eventOn(now);
    if (!e) return;
    const tag = text(this, 330, 112, `${e.emoji} きょうは ${e.name}！`, 24, "#ffffff", { stroke: "#c0392b", strokeThickness: 7 }).setDepth(70);
    this.tweens.add({ targets: tag, scale: 1.06, duration: 700, yoyo: true, repeat: -1 });
    const FX = { snow: "❄", petal: "🌸", star: "⭐", fire: "✨", leaf: "🍁" }[e.fx];
    if (FX) for (let i = 0; i < 14; i++) {
      const f = text(this, (i * 97) % W, 80, FX, 18 + (i % 3) * 6).setDepth(52).setAlpha(0.85);
      const fall = () => { f.setPosition(Math.random() * W, 90); this.tweens.add({ targets: f, y: H + 20, x: f.x + (Math.random() * 160 - 80), angle: 360, duration: 6000 + Math.random() * 5000, onComplete: fall }); };
      this.time.delayedCall(i * 500, fall);
    }
    if (!presentReady(store.shop, now) || store.visitFrom) return;
    const box = button(this, 520, 112, "gift", 54, () => {
      const r = takePresent(store.shop, Date.now());
      if (!r.ok) return;
      store.setShop(r.shop); sfx.star(); burst(this, 520, 112, "sparkles", 12, 40, 140); box.destroy();
      const P = panel(this, `${e.name}の プレゼント！`, { w: 700, h: 380 });
      P.L.add([text(this, W / 2, P.top + 160, e.emoji, 90), text(this, W / 2, P.top + 270, `${coin(e.coins)}${e.decor ? ` と ${TOWN_DECOR[e.decor].name}（まちに おいたよ）` : ""}`, 22, "#4a2c17")]);
      this.redraw();
    }).setDepth(70);
    this.tweens.add({ targets: box, y: 100, duration: 450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  // 上から見た芝生：マスごとに少しだけ色を変え、草の線を ちらす（毎回同じ並び）
  // 上から見た芝生（2026-10-16「のっぺりしている」→ むら・草・小さな花・はしの暗さで 奥行きを出す）。並びは毎回同じ
  drawGround() {
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(0x9ccb62, 0x93c45a, 0x7fb04c, 0x76a845, 1).fillRect(0, 84, W, H - 84); // 左上が明るい（光が左上から）
    const rnd = (k, m) => ((k * 2654435761) >>> 0) % m;
    for (let k = 0; k < 260; k++) { // 色のむら（大小の うすい まる）
      const x = rnd(k + 1, W), y = 84 + rnd(k + 7, H - 84), r = 18 + rnd(k + 3, 70);
      g.fillStyle([0xa9d46e, 0x7ca848, 0xb5cf6a, 0x6f9e40, 0x8fc05a][k % 5], 0.06 + (k % 4) * 0.02).fillEllipse(x, y, r * 2, r * 1.4);
    }
    for (let k = 0; k < 1800; k++) { // 草の葉
      const x = rnd(k * 3 + 11, W), y = 88 + rnd(k * 5 + 13, H - 90), h = 4 + rnd(k, 6);
      g.lineStyle(1.5, [0x5f8f33, 0x6e9e3e, 0xb7da82, 0x88b850][k % 4], 0.55).lineBetween(x, y, x + (rnd(k, 5) - 2), y - h);
    }
    for (let k = 0; k < 90; k++) { // 小さな花
      const x = rnd(k * 17 + 5, W), y = 92 + rnd(k * 19 + 3, H - 96);
      g.fillStyle([0xffffff, 0xfff38a, 0xffb3c8][k % 3], 0.9).fillCircle(x, y, 2).fillCircle(x + 3, y + 1, 1.5);
    }
    // はしを 少し暗く（目が まんなかに行く）
    g.fillGradientStyle(0x2f4a1c, 0x2f4a1c, 0x2f4a1c, 0x2f4a1c, 0.18, 0.18, 0, 0).fillRect(0, 84, W, 40);
    g.fillGradientStyle(0x2f4a1c, 0x2f4a1c, 0x2f4a1c, 0x2f4a1c, 0, 0, 0.22, 0.22).fillRect(0, H - 50, W, 50);
    g.fillGradientStyle(0x2f4a1c, 0x2f4a1c, 0x2f4a1c, 0x2f4a1c, 0.18, 0, 0, 0.18).fillRect(0, 84, 40, H - 84);
    g.fillGradientStyle(0x2f4a1c, 0x2f4a1c, 0x2f4a1c, 0x2f4a1c, 0, 0.18, 0.18, 0).fillRect(W - 40, 84, 40, H - 84);
  }

  // みち・せんろ：となりに 同じ物が あるかで つながった形に描く（n＝上右下左に となりがあるか）
  drawFlat(kind, n) {
    const g = this.add.graphics().setDepth(1), e = 6;
    if (kind === "road") {
      g.fillStyle(0xbfa97f, 1).fillRect(0, 0, T, T);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
        const sx = c * 16 + (r % 2) * 8 - 8, sy = r * 16;
        g.fillStyle([0xd9c8a3, 0xc9b48c, 0xe2d4b2, 0xcfbd96][(r * 3 + c) % 4], 1).fillRoundedRect(sx + 1, sy + 1, 14, 14, 4);
      }
      // つながらない がわ に ふち石と 草のかげ
      g.fillStyle(0x8f7a55, 1);
      if (!n.up) g.fillRect(0, 0, T, 4); if (!n.down) g.fillRect(0, T - 4, T, 4);
      if (!n.left) g.fillRect(0, 0, 4, T); if (!n.right) g.fillRect(T - 4, 0, 4, T);
      g.fillStyle(0x000000, 0.08).fillRect(0, n.down ? T : T - e, T, n.down ? 0 : e); // 下がわに うすい かげ
    } else { // せんろ：じゃり・まくら木・レール。よこ につながるなら よこ向き、たて なら たて向き
      g.fillStyle(0x9a9285, 1).fillRect(4, 4, T - 8, T - 8).fillStyle(0x8a8275, 1);
      for (let k = 0; k < 40; k++) g.fillCircle(6 + ((k * 37) % (T - 12)), 6 + ((k * 23) % (T - 12)), 1.5);
      const horiz = n.left || n.right || !(n.up || n.down), vert = n.up || n.down;
      const lay = (h) => {
        for (let k = 0; k < 4; k++) h ? g.fillStyle(0x6b4a2a, 1).fillRect(6 + k * 15, 12, 8, T - 24) : g.fillStyle(0x6b4a2a, 1).fillRect(12, 6 + k * 15, T - 24, 8);
        g.fillStyle(0xc9ced4, 1);
        if (h) g.fillRect(0, 20, T, 4).fillRect(0, T - 24, T, 4); else g.fillRect(20, 0, 4, T).fillRect(T - 24, 0, 4, T);
      };
      if (horiz) lay(true);
      if (vert) lay(false);
    }
    return g;
  }

  // 町ぜんぶを 描き直す（動かしたとき・買ったとき・もようがえの切りかえ）
  redraw() {
    if (this.layer) this.layer.forEach(o => o.destroy());
    this.layer = [];
    const town = townOf(store.shop);
    this.gridG.clear();
    if (this.edit) {
      this.gridG.fillStyle(0xffffff, 0.18).fillRect(0, TOWN_TOP, TOWN_COLS * T, TOWN_ROWS * T).lineStyle(1, 0xffffff, 0.6);
      for (let i = 0; i <= TOWN_COLS; i++) this.gridG.lineBetween(i * T, TOWN_TOP, i * T, TOWN_TOP + TOWN_ROWS * T);
      for (let j = 0; j <= TOWN_ROWS; j++) this.gridG.lineBetween(0, TOWN_TOP + j * T, TOWN_COLS * T, TOWN_TOP + j * T);
    }
    // みち・せんろ の つながりを見るための 置き場所の一覧
    this.flats = {};
    for (const it of town.items) if (townSpec(it.kind).flat) this.flats[it.x + "," + it.y] = it.kind;
    for (const it of town.items) this.drawItem(it);
    this.buyBtn.setVisible(this.edit); this.buyLabel.setVisible(this.edit);
    this.editBtn.list[0].clear().fillStyle(this.edit ? 0xffe28a : 0xffffff, 1).fillCircle(0, 0, 34).lineStyle(5, 0xf0c27a, 1).strokeCircle(0, 0, 34);
    this.levelText.setText(`おみせ レベル ${shopLevel(store.shop)}`);
    this.showGuide();
  }

  drawItem(it) {
    const sp = this.specOf(it.kind), w = sp.w * T, h = sp.h * T, x0 = it.x * T, y0 = TOWN_TOP + it.y * T;
    const c = this.add.container(x0, y0).setDepth(sp.flat ? 1 : 2 + it.y + sp.h); // 下にある物ほど 手前。みちは いちばん下
    if (!sp.flat) {
      const sh = this.add.graphics();
      sh.fillStyle(0x1e2a12, 0.16).fillEllipse(w / 2 + w * 0.12, h - 4, w * 0.95, Math.max(16, h * 0.28));
      sh.fillStyle(0x1e2a12, 0.14).fillEllipse(w / 2 + w * 0.08, h - 6, w * 0.7, Math.max(12, h * 0.18));
      c.add(sh);
    }
    const fit = (key, extra) => { const im = this.add.image(w / 2, h, key).setOrigin(0.5, 1); im.setScale(Math.min(w / im.width, (h + extra) / im.height)); c.add(im); };
    if (sp.flat) {
      const has = (dx, dy) => this.flats[(it.x + dx) + "," + (it.y + dy)] === it.kind;
      c.add(this.drawFlat(it.kind, { up: has(0, -1), down: has(0, 1), left: has(-1, 0), right: has(1, 0) }));
    } else if (this.textures.exists("tn_" + it.kind)) {
      fit("tn_" + it.kind, isBuilding(it.kind) ? 30 : 16); // 見下ろしの絵
      if (isBuilding(it.kind)) this.extras(it, c, w, h, sp, x0, y0);
    } else if (isBuilding(it.kind)) {
      if (this.textures.exists("bd_" + it.kind)) {
        const im = this.add.image(w / 2, h, "bd_" + it.kind).setOrigin(0.5, 1);
        im.setScale(Math.min(w / im.width, (h + 30) / im.height));
        c.add(im);
      } else {
        c.add(this.add.graphics().fillStyle(0xfffaf2, 1).fillRoundedRect(8, 8, w - 16, h - 30, 18).lineStyle(4, 0xe0c9a6, 1).strokeRoundedRect(8, 8, w - 16, h - 30, 18));
        c.add(img(this, w / 2, (h - 22) / 2, sp.icon, Math.min(w, h) * 0.5));
      }
      this.extras(it, c, w, h, sp, x0, y0);
    } else if (sp.emoji) {
      c.add(text(this, w / 2, h / 2, sp.emoji, Math.min(w, h) * 0.8)); // 行事の かざり（絵の代わりに 絵文字）
    } else {
      c.add(img(this, w / 2, h / 2, sp.icon, Math.min(w, h) * 0.95));
    }
    this.layer.push(c);
    // 押す・引っぱる所（見た目と同じ 左上から右下）
    const z = this.add.zone(x0, y0, w, h).setOrigin(0).setDepth(60).setInteractive({ useHandCursor: true, draggable: true });
    this.layer.push(z);
    let dragged = false, red = null;
    z.on("dragstart", () => { dragged = false; if (this.edit) c.setAlpha(0.85).setDepth(45); });
    z.on("drag", (_, x, y) => {
      if (!this.edit) return;
      dragged = true;
      c.setPosition(x, y); z.setPosition(x, y);
      const ok = canPlaceTown(townOf(store.shop), Math.round(x / T), Math.round((y - TOWN_TOP) / T), sp.w, sp.h, it.id);
      if (!red) { red = this.add.rectangle(0, 0, w, h, 0xe2553d, 0.45).setOrigin(0); c.add(red); }
      red.setVisible(!ok);
    });
    z.on("dragend", () => {
      if (!this.edit || !dragged) return;
      const r = moveTownItem(store.shop, it.id, Math.round(z.x / T), Math.round((z.y - TOWN_TOP) / T));
      if (r.ok) { store.setShop(r.shop); sfx.pop(); } else { sfx.no(); floatText(this, z.x + w / 2, z.y, "そこには おけないよ", "#a0522d"); }
      this.time.delayedCall(10, () => this.redraw());
    });
    z.on("pointerup", () => {
      if (dragged) return;
      if (this.edit) { if (!isBuilding(it.kind)) this.decorItemMenu(it); return; }
      if (!isBuilding(it.kind)) return;
      sfx.pop();
      if (sp.to) this.scene.start(sp.to, sp.data); else floatText(this, x0 + w / 2, y0, sp.lockedMsg, "#a0522d");
    });
  }

  // どうぶつえん・すいぞくかん：名前に いまの だんかい（おんぼろ → おおきな）
  specOf(kind) {
    const sp = townSpec(kind), fac = store.shop[kind];
    if ((kind === "zoo" || kind === "aqua") && fac) return { ...sp, name: `${LEVELS[fac.level].name} ${sp.name}` };
    return sp;
  }

  // はじめての案内（お店レベル0の あいだ）：お世話 → つり → うる の順に、することを1つだけ 指で示す
  showGuide() {
    const shop = store.shop;
    const town = townOf(shop), at = kind => { const it = town.items.find(i => i.kind === kind), sp = townSpec(kind); return [it.x * T + (sp.w * T) / 2, TOWN_TOP + it.y * T + (sp.h * T) / 2]; };
    if (this.edit || store.visitFrom) { guide(this, null); return; }
    let target = null;
    const aq = shop.aqua, aqEmpty = aq && !aq.exhibits.some(e => e.animals.length), aqNext = aq && LEVELS[aq.level + 1];
    const first = shopLevel(shop) < 1; // おせわ・つり・うる の 指は お店レベル0の あいだ。すいぞくかんの 指は ペンギンが 来るまで
    if (first && this.badge("shop")) target = ["shop", "おせわを しよう"];
    else if (first && !shop.fishCount) target = ["fishing", "つりに いこう"];
    else if (aq && aq.level === 0 && aqEmpty && shop.pens.some(p => p.type === "tank" && p.animals.length)) target = ["aqua", "すいぞくかんに みせよう"]; // 2026-10-16 案内に 園を足した
    else if (aq && aq.level === 0 && ninki(shop, "aqua") >= aqNext.need.aqua && shop.money >= aqNext.cost) target = ["aqua", "おおきく しよう"];
    else if (!first) { guide(this, null); return; }
    else if (!shop.pens.some(p => p.purpose === "sale") && !(shop.earned > 100)) target = ["shop", "うる こを きめよう"];
    if (!target) { guide(this, null); return; }
    const [x, y] = at(target[0]);
    guide(this, x, y, target[1], 58);
  }

  // 建物の しるし（赤い「！」）：行くと することが ある所
  badge(kind) {
    const shop = store.shop, now = Date.now(), all = shop.pens.flatMap(p => p.animals.map(a => [a, p]));
    if (kind === "shop") return all.some(([a, p]) => needs(a, p).length > 0);
    if (kind === "vet") return all.some(([a]) => a.sick && !a.hospitalUntil);
    if (kind === "station") return shop.gifts.length > 0;
    if (kind === "aqua" || kind === "zoo") return (shop[kind]?.gifts || []).length > 0;
    if (kind === "zukan") return prizeReady(store.family, store.family.current);
    if (kind === "board") return boardFor(now).some(r => canFulfill(store.family, store.family.current, r, now) === "ok");
    return false;
  }

  // 建物に そえる物：自分のお店には顔、まだ行けない建物は うすく、名前の札（時刻の色より上）、しるし
  extras(it, c, w, h, sp, x0, y0) {
    if (this.badge(it.kind)) {
      const b = this.add.container(x0 + w - 14, y0 + 10).setDepth(57);
      b.add([this.add.circle(0, 0, 17, 0xe2553d).setStrokeStyle(3, 0xffffff), text(this, 0, 1, "！", 20, "#ffffff")]);
      this.tweens.add({ targets: b, y: y0 + 2, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.layer.push(b);
    }
    if (it.kind === "shop") c.add(kidFace(this, w - 26, 20, store.family.current, store.kid, 46));
    const fac = (it.kind === "zoo" || it.kind === "aqua") && store.shop[it.kind];
    if (fac && fac.level < 2) for (const im of c.list) if (im.type === "Image" && im.enableFilters) { // おんぼろ・ちいさな は 古びた色
      im.enableFilters(); const cm = im.filters.internal.addColorMatrix().colorMatrix; cm.sepia(); cm.saturate(fac.level ? -0.2 : -0.45, true);
    }
    if (!sp.to) c.setAlpha(0.7);
    const tag = this.tag(x0 + w / 2, y0 + h - 4, sp.icon, sp.name);
    if (!sp.to) tag.setAlpha(0.75);
    this.layer.push(tag);
  }

  // 名前の札：絵文字＋ひらがな
  tag(x, y, icon, label) {
    const c = this.add.container(x, y).setDepth(55);
    const t = text(this, 16, 0, label, 18, "#4a2c17");
    const w = t.width + 60;
    c.x = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, x)); // 画面の はしで 切れないように
    c.add([this.add.graphics().fillStyle(0xffffff, 0.95).fillRoundedRect(-w / 2, -19, w, 38, 19).lineStyle(3, 0xe0c9a6, 1).strokeRoundedRect(-w / 2, -19, w, 38, 19),
      img(this, -w / 2 + 24, 0, icon, 30), t.setX(-w / 2 + 44 + t.width / 2)]);
    return c;
  }

  // 飾りを買う
  decorMenu() {
    const P = panel(this, "かざりを かう", { w: 1000, h: 520 });
    // ごほうびの飾りは ここでは買えない（ずかん から もらう）。5つずつ 2だん（前は 3だんめが 小窓から はみ出していた）
    Object.entries(TOWN_DECOR).filter(([, d]) => !d.prize && !d.event).forEach(([k, d], i) => {
      const x = W / 2 - 400 + (i % 5) * 200, y = H / 2 - 60 + Math.floor(i / 5) * 190;
      card(this, P.L, x, y, 184, 172, () => {
        const r = buyTownDecor(store.shop, k);
        if (!r.ok) { sfx.no(); floatText(this, x, y - 80, r.reason === "noroom" ? "おく ばしょが ないよ" : "おかねが たりないよ", "#a0522d"); return; }
        store.setShop(r.shop); sfx.coin(); P.close(); this.edit = true; this.redraw();
        floatText(this, W / 2, 200, "おいたよ！ ゆびで うごかしてね", "#2e7d32");
      });
      P.L.add([img(this, x, y - 30, d.icon, 70), text(this, x, y + 30, d.name, 18, "#4a2c17"), text(this, x, y + 60, coin(d.price) + (d.appeal ? `  にんき+${d.appeal}` : ""), 15, "#c0392b")]);
    });
  }

  // もようがえ中に 飾りを押したら：しまう（半分のお金が もどる）
  decorItemMenu(it) {
    const d = TOWN_DECOR[it.kind];
    const P = panel(this, d.name, { w: 600, h: 300 });
    card(this, P.L, W / 2, H / 2 + 30, 300, 80, () => {
      const r = removeTownDecor(store.shop, it.id);
      if (r.ok) { store.setShop(r.shop); sfx.pop(); P.close(); this.redraw(); }
    }, 0xffe2d8);
    P.L.add(text(this, W / 2, H / 2 + 30, d.prize ? "しまう（ずかん から また おけるよ）" : d.event ? "しまう（なくなるよ）" : `しまう（+${coin(Math.floor(d.price / 2))}）`, 24, "#a0522d"));
  }

  // きのうの まとめ：その日 はじめて 町に来たとき 1回だけ。とじたら 赤ちゃん → 売れた子 の お知らせへ
  showSummary() {
    const y = store.shop.yesterday;
    if (!y || store.shop.summarySeen === y.date) { this.showBirths(); return; }
    const P = panel(this, "きのうの おみせ", { w: 820, h: 460, onClose: () => { store.setShop({ ...store.shop, summarySeen: y.date }); this.showBirths(); } });
    const rows = [["park", "けんがくの おきゃくさん", `${y.visitors + (y.zooVisitors || 0)}にん`], ["store", "うれた こ", `${y.sold}ひき`], ["coin", "はいった おかね", `+${coin(y.income)}`],
      ["cart", "つかった おかね", `-${coin(y.expense)}`], ["heart", "おせわ", `${y.care}かい`], ["pole", "つった さかな", `${y.fish}ひき`]];
    rows.forEach(([icon, label, v], i) => {
      const x = W / 2 - 200 + (i % 2) * 400, yy = H / 2 - 80 + Math.floor(i / 2) * 80;
      P.L.add([img(this, x - 160, yy, icon, 40), text(this, x - 132, yy, label, 17, "#4a2c17").setOrigin(0, 0.5), text(this, x + 180, yy, v, 22, "#2e7d32").setOrigin(1, 0.5)]);
    });
    const net = y.income - y.expense;
    P.L.add(text(this, W / 2, H / 2 + 170, net >= 0 ? `きのうは +${coin(net)} の もうけ！` : `きのうは ${coin(-net)} の そん。あしたは がんばろう`, 24, net >= 0 ? "#2e7d32" : "#c0392b"));
  }

  // 生まれた 赤ちゃんを まとめて知らせる（見たら消す）。とじたら 売れた子の お知らせへ
  showBirths() {
    const list = store.shop.birthsNew || [];
    if (!list.length) { this.showSales(); return; }
    const P = panel(this, "どうぶつえんで あかちゃんが うまれたよ！", { w: 900, h: 480, onClose: () => { store.setShop({ ...store.shop, birthsNew: [] }); this.showSales(); } });
    list.slice(-8).forEach((x, i) => {
      const cx = W / 2 - 300 + (i % 4) * 200, cy = H / 2 - 50 + Math.floor(i / 4) * 150;
      P.L.add(creature(this, cx, cy - 20, x.kind, 70, x.shine, x.morph ? MORPHS[x.kind]?.list[x.morph]?.paint : null));
      P.L.add(text(this, cx, cy + 38, (x.shine ? SHINES[x.shine].name + "の " : "") + species(x.kind).name, 15, "#4a2c17", { wordWrap: { width: 180 } }));
    });
    sfx.star();
  }

  // はんばいよう の柵・水槽から お客さんが買っていった子を まとめて知らせる（見たら消す）
  showSales() {
    const list = store.shop.salesNew || [];
    if (!list.length) return;
    const total = list.reduce((t, x) => t + x.coins, 0);
    const P = panel(this, "おきゃくさんが かっていったよ！", { w: 900, h: 480, onClose: () => store.setShop({ ...store.shop, salesNew: [] }) });
    list.slice(-8).forEach((x, i) => {
      const cx = W / 2 - 300 + (i % 4) * 200, cy = H / 2 - 50 + Math.floor(i / 4) * 150;
      P.L.add(creature(this, cx, cy - 20, x.kind, 80, x.shine));
      P.L.add(text(this, cx, cy + 38, (x.shine ? SHINES[x.shine].name + "の " : "") + species(x.kind).name, 15, "#4a2c17", { wordWrap: { width: 180 } }));
      P.L.add(text(this, cx, cy + 60, "+" + coin(x.coins), 16, "#2e7d32"));
    });
    if (list.length > 8) P.L.add(text(this, W / 2, H / 2 + 150, `ほか ${list.length - 8}ひき`, 18, "#7a4a1e"));
    P.L.add(text(this, W / 2, H / 2 + 190, `ぜんぶで +${coin(total)}`, 28, "#2e7d32"));
    sfx.coin();
  }
}
