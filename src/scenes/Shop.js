// お店（第1弾）。床はマス目。柵・水槽と家具が置いてある。
// ふだん：下の道具を選んで柵を押すと、その柵の子みんなにお世話。道具なしで柵を押すと、中の子のようすと「うる」。
// もようがえ：柵や家具を指で引っぱって動かす。たてる・かぐ・ひろげる・かざり もここから。
import { store } from "../store.js";
import { NAMES } from "../data/names.js";
import * as S from "../logic/shop.js";
import { marketRate } from "../logic/rate.js";
import { gameYears, season } from "../logic/time.js";
import { PENS, SHOP_SIZES } from "../data/pens.js";
import { FURNITURE } from "../data/furniture.js";
import { FOODS } from "../data/foods.js";
import { DECOR } from "../data/decor.js";
import { PLACES } from "../data/places.js";
import { MORPHS } from "../data/morphs.js";
import { buyFromSibling, giftToSibling } from "../logic/trade.js";
import { W, H, text, img, button, burst, floatText, creature, gauge, panel, card, coin, kidFace, guide } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { sfx } from "../sound/sfx.js";
import { bgm } from "../sound/bgm.js";

// 床の場所。上の 84〜150 は 奥の壁（窓と棚）を描く（2026-10-16「ハイクオリティに」）
const AREA = { x: 24, y: 152, w: 960, h: 428 };
const STAGE_NAME = { baby: "あかちゃん", young: "こども", adult: "おとな", old: "おとしより" };
const NEED_ICON = { food: "fork", clean: "soap", broom: "broom", vet: "sick" };
export const MESSAGE = {
  wrongfood: "これは たべないみたい…", wrongtool: "ちがう きれいの しかた だよ", nostock: "エサが ないよ。いちばで かおう",
  notneeded: "いまは いらないみたい", nomoney: "おかねが たりないよ", noroom: "おく ばしょが ないよ",
  nopen: "すむ ばしょが ないよ。もようがえで たてよう", toosmall: "もっと ひろく しないと はいらないよ", full: "いっぱいで もう はいらないよ",
  eat: "たべられちゃうから いっしょには できないよ", nozoo: "どうぶつえんに あいた「おおきな ひろば」を つくってね", noaqua: "すいぞくかんに あいた すいそうが ないよ", water: "かわ・いけ と うみ では みずが ちがうよ",
  nosale: "この いきものは うっては いけない きまり", baby: "まだ ちいさすぎて うれないよ", sick: "びょうきの あいだは うれないよ", hospital: "にゅういん ちゅう", new: "おみせに なれるまで（3にち）まってね",
};

export class Shop extends Phaser.Scene {
  constructor() { super("Shop"); }

  create({ openPen, visit } = {}) {
    bgm.play("shop");
    this.tool = null;
    this.edit = false;
    this.layer = null;
    this.trayButtons = [];
    // 兄弟の お店を見に来たとき（えき の でんしゃ から）：見るだけ。かえる で 自分に もどる
    if (visit && visit !== store.family.current) { store.visitFrom = store.visitFrom || store.family.current; store.family.current = visit; }
    this.visit = !!store.visitFrom;
    store.tick();
    this.drawRoom();
    topBar(this, { back: !this.visit });
    this.trayG = this.add.graphics();
    if (this.visit) {
      const k = store.kid;
      kidFace(this, 1130, 230, store.family.current, k, 110);
      text(this, 1130, 330, `${k.name ? k.name + "の" : ""}
おみせ（みるだけ）`, 20, "#ffffff", { stroke: "#4a2c17", strokeThickness: 5 });
      button(this, W - 56, 42, "back", 48, () => { sfx.pop(); store.family.current = store.visitFrom; store.visitFrom = null; store.persist(); this.scene.start("Station"); }, { ring: 0x9fd3e6 }).setDepth(501);
    } else this.makeSide();
    this.redraw();
    const onChange = () => this.redraw();
    this.game.events.on("shop-changed", onChange);
    this.events.once("shutdown", () => this.game.events.off("shop-changed", onChange));
    if (openPen) this.penPanel(openPen);
    this.startCustomers();
  }

  // 歩き回る お客さん（2026-10-16 壁打ち2回め）：お店が あいている時間（9〜19時）に 入ってきて 柵を のぞいて 帰る。
  // 売れた子が ふえたら（advance の customersBuy）、その子を だいて 帰る人を 出す。売れ方の計算は 変えない（見せるだけ）
  startCustomers() {
    this.people = 0;
    this.lastSales = (store.shop.salesNew || []).length;
    const open = () => { const h = new Date().getHours(); return h >= S.OPEN_HOURS[0] && h < S.OPEN_HOURS[1]; };
    this.time.addEvent({ delay: 2500, loop: true, callback: () => {
      if (!open() || this.edit || this.people >= 3 || !store.shop.pens.some(p => p.animals.length)) return;
      if (Math.random() < 0.5) this.customer(null);
    } });
    const onSale = () => {
      const n = (store.shop.salesNew || []).length;
      if (n > this.lastSales) (store.shop.salesNew || []).slice(this.lastSales).slice(-3).forEach((x, i) => this.time.delayedCall(i * 1500, () => this.customer(x)));
      this.lastSales = n;
    };
    this.game.events.on("shop-changed", onSale);
    this.events.once("shutdown", () => this.game.events.off("shop-changed", onSale));
    this.time.delayedCall(800, () => open() && this.customer(null));
  }

  customer(sold) {
    const shop = store.shop, pens = shop.pens.filter(p => p.animals.length);
    if (!pens.length) return;
    const sale = pens.filter(p => S.purposeOf(p) === "sale"), pool = sale.length && Math.random() < 0.7 ? sale : pens;
    const pen = pool[Math.floor(Math.random() * pool.length)], [fw, fh] = S.footprint(pen), [px, py] = this.toScreen(pen.x, pen.y);
    const tx = px + (fw * this.tile) / 2 + (Math.random() * 40 - 20), ty = Math.min(AREA.y + AREA.h - 30, py + fh * this.tile + 26);
    // AIの全身の絵（pp_。tools/gen_scenes.py の PEOPLE）があれば それ、まだなら 絵文字の顔
    const pp = this.textures.getTextureKeys().filter(k => k.startsWith("pp_"));
    const c = this.add.container(-60, AREA.y + AREA.h - 40).setDepth(20);
    let body;
    if (pp.length) { body = this.add.image(0, 30, pp[Math.floor(Math.random() * pp.length)]).setOrigin(0.5, 1); body.setScale(110 / body.height); }
    else body = img(this, 0, 0, ["man", "woman", "boy", "girl"][Math.floor(Math.random() * 4)], 72);
    c.add([this.add.ellipse(0, 34, 50, 14, 0x000000, 0.18), body]);
    this.people++;
    this.tweens.add({ targets: body, y: -6, duration: 220, yoyo: true, repeat: -1 }); // てくてく
    const walk = (x, y, then) => this.tweens.add({ targets: c, x, y, duration: Math.max(600, Math.hypot(x - c.x, y - c.y) * 5), onComplete: then });
    walk(tx, ty, () => {
      const bubble = text(this, 0, -62, sold ? "これ ください！" : ["かわいい！", "どの こに しようかな", "げんきだね", "♪"][Math.floor(Math.random() * 4)], 16, "#4a2c17", { backgroundColor: "#ffffffdd", padding: { x: 8, y: 4 } });
      c.add(bubble);
      this.time.delayedCall(2200, () => {
        bubble.destroy();
        if (sold) { c.add(creature(this, 30, 6, sold.kind, 44, sold.shine)); sfx.coin(); floatText(this, c.x, c.y - 70, `+${coin(sold.coins)}`, "#2e7d32"); }
        walk(-80, AREA.y + AREA.h - 40, () => { c.destroy(); this.people--; });
      });
    });
  }

  get tile() { const { w, h } = S.shopSize(store.shop); return Math.floor(Math.min(AREA.w / w, AREA.h / h)); }
  toScreen(x, y) { return [AREA.x + x * this.tile, AREA.y + y * this.tile]; }

  // 部屋：奥の壁（壁紙・窓・棚・はば木）と、右の木の台（メニューの置き場）。床は redraw で描く
  drawRoom() {
    const d = DECOR.wall.items[store.shop.decor.wall];
    const g = this.add.graphics();
    g.fillStyle(d.wall, 1).fillRect(0, 84, W, H - 84);
    for (let x = 0; x < W; x += 80) g.fillStyle(d.stripe, 1).fillRect(x, 84, 40, H - 84);
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.12, 0.12).fillRect(0, 84, W, 70); // 壁の下ほど 少し暗い
    // 窓（空と光）と 窓わく
    for (const wx of [150, 470, 790]) {
      g.fillGradientStyle(0xa8d8f0, 0xa8d8f0, 0xe6f4fb, 0xe6f4fb, 1).fillRect(wx, 92, 120, 48);
      g.fillStyle(0xffffff, 0.35).fillTriangle(wx + 10, 92, wx + 50, 92, wx + 10, 132);
      g.lineStyle(5, 0x8a6a48, 1).strokeRect(wx, 92, 120, 48).lineBetween(wx + 60, 92, wx + 60, 140);
    }
    // 棚と小びん
    g.fillStyle(0x8a6a48, 1).fillRect(320, 120, 110, 6).fillRect(640, 120, 110, 6);
    [[330, 0xe2553d], [350, 0x5fb3dd], [372, 0xf2c14e], [398, 0x7ac77a], [652, 0xb48aff], [676, 0xf2a35a], [700, 0x5fb3dd], [724, 0xe8e8e8]]
      .forEach(([x, c]) => g.fillStyle(c, 0.9).fillRoundedRect(x, 104, 14, 16, 3).fillStyle(0xffffff, 0.4).fillRect(x + 3, 107, 3, 8));
    // 部屋の床（お店の床の まわり。少し暗い 板）
    g.fillStyle(0x9a7550, 1).fillRect(0, 152, 1000, H - 152);
    for (let y = 152, r = 0; y < H; y += 26, r++) {
      g.lineStyle(1, 0x5a3b22, 0.3).lineBetween(0, y, 1000, y);
      for (let x = (r * 89) % 140; x < 1000; x += 140) g.lineBetween(x, y, x, y + 26);
    }
    g.fillStyle(0x6b4a2a, 1).fillRect(0, 144, W, 8); // はば木
    // 右の木の台（メニュー）
    g.fillGradientStyle(0x9b7148, 0x8a6240, 0x7a5436, 0x6e4a2f, 1).fillRect(1000, 152, W - 1000, H - 152);
    for (let y = 160; y < H; y += 22) g.lineStyle(1, 0x5a3b22, 0.25).lineBetween(1000, y, W, y + 4);
    g.fillStyle(0x000000, 0.18).fillRect(996, 152, 4, H - 152);
    this.floorG = this.add.graphics();
  }

  // ---- 床・柵・家具を描き直す ----
  redraw() {
    const shop = store.shop, t = this.tile, { w, h } = S.shopSize(shop);
    const d = DECOR.wall.items[shop.decor.wall];
    // 床は板張り：板ごとに少しだけ色を変え、継ぎ目をずらす。マス目の線は もようがえ中だけ
    const fg = this.floorG.clear(), fw = w * t, fh = h * t, plank = Math.max(18, Math.round(t / 3));
    fg.fillStyle(0x5a3d22, 0.35).fillRoundedRect(AREA.x - 8, AREA.y - 4, fw + 16, fh + 16, 10); // 床の影
    fg.fillStyle(d.floor, 1).fillRect(AREA.x - 6, AREA.y - 6, fw + 12, fh + 12);
    for (let y = 0, row = 0; y < fh + 12; y += plank, row++) {
      const shade = ((row * 37) % 5 - 2) * 0.025;
      fg.fillStyle(shade > 0 ? 0xffffff : 0x000000, Math.abs(shade)).fillRect(AREA.x - 6, AREA.y - 6 + y, fw + 12, plank);
      for (let k = 0; k < 6; k++) { // 木目
        const gx = AREA.x + ((row * 131 + k * 173) % (fw + 6)), gy = AREA.y - 6 + y + 3 + (k % 3) * (plank / 4);
        fg.lineStyle(1, 0x5a3b22, 0.08).lineBetween(gx, gy, gx + 40 + (k % 4) * 20, gy + 1);
      }
      fg.lineStyle(1, 0x000000, 0.12).lineBetween(AREA.x - 6, AREA.y - 6 + y, AREA.x + fw + 6, AREA.y - 6 + y);
      for (let x = ((row * 97) % 160); x < fw + 12; x += 160) fg.lineBetween(AREA.x - 6 + x, AREA.y - 6 + y, AREA.x - 6 + x, AREA.y - 6 + y + plank);
    }
    // 窓から差しこむ光（床の上に うすい 白）と、すみの暗さ
    for (const wx of [150, 470, 790]) fg.fillStyle(0xfff8e0, 0.13).fillPoints([{ x: wx, y: AREA.y }, { x: wx + 120, y: AREA.y }, { x: wx + 220, y: AREA.y + fh * 0.75 }, { x: wx + 90, y: AREA.y + fh * 0.75 }], true);
    fg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.16, 0.16, 0, 0).fillRect(AREA.x - 6, AREA.y - 6, fw + 12, 30);
    fg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.14, 0, 0, 0.14).fillRect(AREA.x - 6, AREA.y - 6, 24, fh + 12);
    if (this.edit) {
      fg.lineStyle(1, 0x000000, 0.22);
      for (let i = 0; i <= w; i++) fg.lineBetween(AREA.x + i * t, AREA.y, AREA.x + i * t, AREA.y + fh);
      for (let j = 0; j <= h; j++) fg.lineBetween(AREA.x, AREA.y + j * t, AREA.x + fw, AREA.y + j * t);
    }
    if (this.layer) this.layer.destroy();
    this.layer = this.add.container(0, 0);
    for (const it of shop.items) this.drawItem(it);
    for (const p of shop.pens) this.drawPen(p);
    this.drawTray();
  }

  // 上から見た柵・水槽。水槽＝ガラスのふちと水（淡水は緑がかる）、こべや＝木わくと わら、つめたい みずべ＝氷と水、うんどうじょう＝草と土
  penBase(p, pw, ph) {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.12).fillRoundedRect(10, 14, pw, ph, 12).fillStyle(0x000000, 0.12).fillRoundedRect(6, 9, pw - 2, ph - 2, 10); // 右下へ落ちる影
    const side = { tank: 0x263238, cage: 0x6b4a24, cold: 0xa9c4d4, big: 0x6b5236 }[p.type];
    g.fillStyle(side, 1).fillRoundedRect(2, 10, pw - 4, ph - 4, 8); // 手前の側面（下に 8px ずらして あつみを出す）
    if (p.type === "tank") {
      const fresh = S.waterOf(p) === "fresh";
      const [a, b] = fresh ? [0x8fd0b0, 0x2f7a5e] : [0x8fdcf2, 0x2a86b8];
      g.fillStyle(0x37474f, 1).fillRoundedRect(2, 2, pw - 4, ph - 4, 8);                 // 枠
      g.fillStyle(0xdff3fb, 1).fillRoundedRect(6, 6, pw - 12, ph - 12, 6);               // ガラス
      g.fillGradientStyle(a, a, b, b, 1).fillRect(10, 10, pw - 20, ph - 20);              // 水
      g.fillStyle(fresh ? 0x8a7a5e : 0xe8d6a8, 0.9).fillRect(10, ph - 10 - (ph - 20) * 0.16, pw - 20, (ph - 20) * 0.16); // 底の砂
      for (let i = 0; i < 5; i++) g.fillStyle(0xffffff, 0.12).fillEllipse(20 + ((i * 53) % (pw - 40)), 22 + ((i * 31) % (ph * 0.5)), 40, 8); // 水面の光
      const by = ph - 10 - (ph - 20) * 0.16; // 底：たんすい＝水草、かいすい＝サンゴ
      for (let i = 0; i < Math.max(3, pw / 30); i++) {
        const x = 18 + ((i * 41) % (pw - 36));
        if (fresh) g.lineStyle(3, i % 2 ? 0x3f8f3a : 0x5fb34a, 1).lineBetween(x, by + 4, x + ((i % 3) - 1) * 5, by - 14 - (i % 3) * 8);
        else g.fillStyle([0xff8a7a, 0xffb36a, 0xf06aa8][i % 3], 0.95).fillCircle(x, by + 2, 4 + (i % 2) * 2).fillCircle(x + 5, by - 3, 3);
      }
      g.fillStyle(0xffffff, 0.35).fillRect(10, 10, pw - 20, 4);                          // ガラスの反射
    } else if (p.type === "cage") {
      g.fillStyle(0x8d6232, 1).fillRoundedRect(2, 2, pw - 4, ph - 4, 6);
      g.fillStyle(0xe9cf8a, 1).fillRect(8, 8, pw - 16, ph - 16);
      for (let i = 0; i < pw * ph / 400; i++) { const x = 10 + ((i * 47) % (pw - 30)), y = 10 + ((i * 29) % (ph - 24)); g.lineStyle(2, i % 2 ? 0xd4b05a : 0xf3dc8e, 0.9).lineBetween(x, y, x + 14, y + ((i % 3) - 1) * 4); }
      g.lineStyle(2, 0x6b4a24, 0.55);
      for (let x = 14; x < pw - 8; x += 12) g.lineBetween(x, 4, x, 10).lineBetween(x, ph - 10, x, ph - 4); // 柵の格子
    } else if (p.type === "cold") {
      g.fillStyle(0xf4f9fc, 1).fillRoundedRect(2, 2, pw - 4, ph - 4, 10);
      g.fillGradientStyle(0x7cc6e8, 0x7cc6e8, 0x2f86b8, 0x2f86b8, 1).fillRoundedRect(pw * 0.38, ph * 0.3, pw * 0.56, ph * 0.62, 18);
      g.fillStyle(0xdce9f2, 1).fillEllipse(pw * 0.2, ph * 0.7, pw * 0.25, ph * 0.18);
    } else {
      g.fillStyle(0x8a6a48, 1).fillRoundedRect(2, 2, pw - 4, ph - 4, 6);
      g.fillStyle(0xa9c46a, 1).fillRect(7, 7, pw - 14, ph - 14);
      g.fillStyle(0xc9ae7a, 0.8).fillEllipse(pw * 0.6, ph * 0.62, pw * 0.5, ph * 0.35);
      for (let i = 0; i < pw * ph / 300; i++) { const x = 9 + ((i * 41) % (pw - 20)), y = 9 + ((i * 23) % (ph - 20)); g.lineStyle(2, i % 2 ? 0x8fb050 : 0xbcd585, 1).lineBetween(x, y, x + 2, y - 6); }
    }
    return g;
  }

  drawItem(it) {
    const f = FURNITURE[it.kind], t = this.tile;
    const [sx, sy] = this.toScreen(it.x, it.y);
    const c = this.add.container(sx, sy);
    c.add(this.add.graphics().fillStyle(0x000000, 0.18).fillEllipse((f.w * t) / 2 + 8, f.h * t - 10, f.w * t * 0.75, 16)); // 影
    c.add(img(this, (f.w * t) / 2, (f.h * t) / 2, f.icon, Math.min(f.w, f.h) * t * 0.8));
    if (f.toy) c.add(img(this, f.w * t - 14, 14, "star", 22));
    c.setSize(f.w * t, f.h * t);
    this.makeDraggable(c, it.id);
    c.on("pointerup", () => { if (this.edit && !c.dragged) this.itemMenu(it); });
    this.layer.add(c);
  }

  drawPen(p) {
    const now = Date.now(), t = this.tile, [fw, fh] = S.footprint(p), pw = fw * t, ph = fh * t;
    const [sx, sy] = this.toScreen(p.x, p.y);
    const c = this.add.container(sx, sy);
    c.add(this.penBase(p, pw, ph));
    const mark = S.purposeOf(p) === "sale" ? `🏷${S.TIERS[S.tierOf(p)].name}` : "❤";
    const pname = p.type === "tank" ? `${S.WATER_NAME[S.waterOf(p)]}の すいそう` : PENS[p.type].name;
    const label = text(this, 14, 16, `${mark} ${pname} Lv${p.level}  ${S.usedSpace(p)}/${S.capacity(p)}`, 14, "#ffffff").setOrigin(0, 0.5);
    c.add([this.add.graphics().fillStyle(0x1d2a33, 0.55).fillRoundedRect(6, 5, Math.min(label.width + 16, pw - 12), 22, 11), label]);
    // たくさん いるときは マス目に ならべる。ほしい物の印は、少ないときは1ぴきずつ、多いときは まとめて左下に
    const here = p.animals, n = here.length, top = 30, ih = ph - top - 6;
    const cols = Math.max(1, Math.ceil(Math.sqrt((n * pw) / ih))), rows = Math.max(1, Math.ceil(n / cols));
    const cw = pw / cols, ch = ih / rows, px = Math.min(cw, ch) * (n > 3 ? 0.8 : 0.62);
    const many = n > 3;
    here.forEach((a, i) => {
      const ax = cw * (i % cols) + cw / 2, ay = top + ch * Math.floor(i / cols) + ch / 2 + (many ? 0 : 8);
      const im = creature(this, ax, ay, a.kind, a.hospitalUntil || S.stage(a, now) === "baby" ? px * 0.6 : px, S.shineOf(a), S.paintOf(a));
      if (a.hospitalUntil) im.setAlpha(0.35);
      if (a.sick) im.setTint(0xb8c4a0);
      this.tweens.add({ targets: im, y: ay - 3, duration: 800 + (i % 7) * 150, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      c.add(im);
      if (many) return;
      const want = S.needs(a, p).filter(k => k !== "broom");
      want.forEach((k, j) => c.add(img(this, ax - 14 * (want.length - 1) + j * 28, ay - px * 0.55 - 6, NEED_ICON[k], 26)));
    });
    if (many) {
      const want = [...new Set(here.flatMap(a => S.needs(a, p)).filter(k => k !== "broom"))];
      want.forEach((k, j) => c.add(img(this, 20 + j * 30, ph - 18, NEED_ICON[k], 26)));
    }
    if (p.dirty && here.length) c.add(this.add.graphics().fillStyle(0x8a5a2b, 1).fillCircle(pw - 30, ph - 22, 9).fillCircle(pw - 18, ph - 26, 11).fillCircle(pw - 8, ph - 20, 7));
    c.setSize(pw, ph);
    this.makeDraggable(c, p.id);
    c.on("pointerup", () => { if (c.dragged) return; if (this.edit) this.penEditMenu(p); else if (this.tool) this.applyTool(p); else this.scene.start("PenView", { penId: p.id, readonly: this.visit }); });
    this.layer.add(c);
  }

  // もようがえ中だけ引っぱれる。離したらマスにそろえて置く（置けなければ元にもどる）
  makeDraggable(c, id) {
    // 押せる範囲は 見た目と同じ「左上から右下」（setSize だけだと 左上の角を中心にした四角になり、右下が押せない）
    c.setInteractive({ hitArea: new Phaser.Geom.Rectangle(c.width / 2, c.height / 2, c.width, c.height), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true, draggable: true });
    c.on("dragstart", () => { c.dragged = false; if (this.edit) c.setAlpha(0.8); });
    c.on("drag", (_, x, y) => {
      if (!this.edit) return;
      c.dragged = true; c.x = x; c.y = y;
      // 離したら置かれるマスに 置けるかどうかを色で見せる（置けない所は赤）
      const gx = Math.round((x - AREA.x) / this.tile), gy = Math.round((y - AREA.y) / this.tile);
      const ok = S.moveThing(store.shop, id, gx, gy).ok;
      if (!c.redMark) { c.redMark = this.add.rectangle(0, 0, c.width, c.height, 0xe2553d, 0.45).setOrigin(0); c.add(c.redMark); }
      c.redMark.setVisible(!ok);
    });
    c.on("dragend", () => {
      if (!this.edit || !c.dragged) return;
      const gx = Math.round((c.x - AREA.x) / this.tile), gy = Math.round((c.y - AREA.y) / this.tile);
      const r = S.moveThing(store.shop, id, gx, gy);
      if (r.ok) { store.setShop(r.shop); sfx.pop(); } else { sfx.no(); floatText(this, c.x + 40, c.y, "そこには おけないよ", "#a0522d"); }
      this.time.delayedCall(10, () => this.redraw());
    });
  }

  // ---- 右の列 ----
  makeSide() {
    const x = 1130;
    this.editBtn = button(this, x, 160, "brush", 70, () => { sfx.pop(); this.edit = !this.edit; this.tool = null; this.showEditButtons(); this.redraw(); });
    const LB = { stroke: "#3a2412", strokeThickness: 5 }; // 木の台の上でも 読める白い字
    text(this, x, 222, "もようがえ", 20, "#ffffff", LB);
    // スタッフ（留守の日の お世話）。もようがえ中は かくす
    const st = store.shop.staff, working = S.staffWorking(store.shop, Date.now());
    this.staffBtn = button(this, x, 330, "woman", 64, () => { sfx.pop(); this.staffMenu(); });
    this.staffText = text(this, x, 390, working ? `スタッフ
あと ${Math.ceil((st.until - Date.now()) / 86400000)}にち` : "スタッフ", 18, "#ffffff", LB);
    this.editButtons = [
      [300, "hammer", "たてる", () => this.buildMenu()],
      [400, "plant", "かぐ", () => this.furnitureMenu()],
      [500, "house", "ひろげる", () => this.expandMenu()],
      [600, "brush", "かざり", () => this.decorMenu()],
    ].map(([y, key, label, fn]) => [button(this, x, y, key, 56, () => { sfx.pop(); fn(); }), text(this, x, y + 50, label, 18, "#ffffff", LB)]);
    this.showEditButtons();
  }
  showEditButtons() {
    for (const [b, t] of this.editButtons) { b.setVisible(this.edit); t.setVisible(this.edit); }
    this.staffBtn?.setVisible(!this.edit); this.staffText?.setVisible(!this.edit);
    this.editBtn.list[0].clear().fillStyle(this.edit ? 0xffe28a : 0xffffff, 1).fillCircle(0, 0, 43).lineStyle(6, 0xf0c27a, 1).strokeCircle(0, 0, 43);
  }

  // ---- 道具箱 ----
  drawTray() {
    for (const b of this.trayButtons) b.destroy();
    this.trayButtons = [];
    this.trayG.clear();
    if (this.edit || this.visit) { guide(this, null); return; }
    const shop = store.shop;
    const foods = Object.keys(FOODS).filter(f => shop.pens.some(p => p.animals.some(a => S.species(a.kind).food === f)) || (shop.stock[f] || 0) > 0);
    const tools = [...foods, "soap", "water", "broom"];
    this.trayG.fillStyle(0xf6dfb8, 1).fillRoundedRect(14, 596, 980, 116, 24);
    this.trayX = {};
    tools.forEach((tool, k) => {
      const x = 62 + k * 88, on = this.tool === tool;
      this.trayX[tool] = x;
      const c = this.add.container(x, on ? 640 : 646);
      const g = this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-38, -40, 76, 102, 16);
      if (on) g.lineStyle(5, 0xff7a59, 1).strokeRoundedRect(-38, -40, 76, 102, 16);
      const icon = img(this, 0, 0, FOODS[tool] ? FOODS[tool].icon : tool, 52);
      c.add([g, icon]);
      if (FOODS[tool]) { const n = shop.stock[tool] || 0; c.add(text(this, 0, 46, n + "かい", 15, "#7a4a1e")); if (!n) icon.setAlpha(0.35); }
      c.setSize(76, 102).setInteractive({ useHandCursor: true });
      c.on("pointerup", () => {
        sfx.pop();
        this.tool = this.tool === tool ? null : tool;
        if (this.tool) floatText(this, x, 580, FOODS[tool]?.name || { soap: "せっけん", water: "みずかえ", broom: "そうじ" }[tool], "#7a4a1e");
        this.drawTray();
      });
      this.trayButtons.push(c);
    });
    this.showGuide();
  }

  // はじめての案内（お店レベル0の あいだ）：おなかが すいた子の エサを指し、えらんだら その柵を指す
  showGuide() {
    const shop = store.shop;
    if (this.edit || this.visit || S.shopLevel(shop) >= 1) { guide(this, null); return; }
    for (const p of shop.pens) for (const a of p.animals) {
      if (!S.needs(a, p).includes("food")) continue;
      const food = S.species(a.kind).food;
      if (this.tool !== food) { if (this.trayX?.[food] != null && (shop.stock[food] || 0) > 0) { guide(this, this.trayX[food], 640, "エサを えらんで", 700); return; } }
      else { const [sx, sy] = this.toScreen(p.x, p.y), [fw, fh] = S.footprint(p); guide(this, sx + (fw * this.tile) / 2, sy + (fh * this.tile) / 2, "ここに あげよう", 700); return; }
    }
    guide(this, null);
  }

  applyTool(p) {
    const { shop, result } = S.care(store.shop, p.id, this.tool);
    const [sx, sy] = this.toScreen(p.x, p.y);
    if (result !== "ok") { sfx.no(); floatText(this, sx + 80, sy + 30, MESSAGE[result], "#a0522d"); return; }
    store.setShop(shop);
    sfx.eat();
    burst(this, sx + 60, sy + 60, this.tool === "broom" ? "sparkles" : this.tool === "soap" || this.tool === "water" ? "bubbles" : "heart", 5, 36, 70);
    this.redraw();
  }

  // ---- 柵の中のようす・売る ----
  penPanel(penId, page = 0) {
    const p = store.shop.pens.find(q => q.id === penId);
    if (!p) return;
    const P = panel(this, `${p.type === "tank" ? S.WATER_NAME[S.waterOf(p)] + "の すいそう" : PENS[p.type].name} Lv${p.level}  ひろさ ${S.usedSpace(p)}/${S.capacity(p)}`);
    const PER = 3, pages = Math.max(1, Math.ceil(p.animals.length / PER));
    page = Math.min(page, pages - 1);
    if (pages > 1) {
      P.L.add(text(this, P.left + P.w - 150, P.top + P.h - 60, `${page + 1} / ${pages}`, 22, "#7a4a1e"));
      const go = d => () => { sfx.pop(); P.close(); this.penPanel(penId, page + d); };
      if (page > 0) P.L.add(button(this, P.left + P.w - 230, P.top + P.h - 60, "back", 44, go(-1)));
      if (page < pages - 1) P.L.add(button(this, P.left + P.w - 70, P.top + P.h - 60, "back", 44, go(1)).setScale(-1, 1));
    }
    const now = Date.now();
    // だいじに そだてる／はんばいよう と、はんばいよう の 値段の つけかた（相場 × たかめ・ふつう・やすめ）
    const purpose = S.purposeOf(p), tier = S.tierOf(p);
    const pick = (x, w, label, on, fn) => { card(this, P.L, x, P.top + 96, w, 50, () => { sfx.pop(); fn(); }, on ? 0xffe28a : 0xf3ead8); P.L.add(text(this, x, P.top + 97, label, 19, "#4a2c17")); };
    const redo = r => { if (!r.ok) return; store.setShop(r.shop); P.close(); this.redraw(); this.penPanel(penId, page); };
    if (this.visit) { // 見に来ている兄弟の お店：切りかえは できない
      P.L.add(text(this, P.left + 60, P.top + 97, purpose === "sale" ? `🏷 はんばいよう（${S.TIERS[tier].name}）` : "❤ だいじに そだてて いるよ", 20, "#7a4a1e").setOrigin(0, 0.5));
    } else {
    pick(P.left + 160, 240, "❤ だいじに そだてる", purpose === "keep", () => redo(S.setPurpose(store.shop, penId, "keep")));
    pick(P.left + 380, 180, "🏷 はんばいよう", purpose === "sale", () => redo(S.setPurpose(store.shop, penId, "sale")));
    if (purpose === "sale") Object.entries(S.TIERS).forEach(([id, t], k) => pick(P.left + 580 + k * 125, 115, t.name, tier === id, () => redo(S.setTier(store.shop, penId, id))));
    else P.L.add(text(this, P.left + 520, P.top + 97, "うられないよ（あかちゃんは どうぶつえんで うまれるよ）", 15, "#7a4a1e").setOrigin(0, 0.5));
    }
    if (!p.animals.length) P.L.add(text(this, W / 2, H / 2 - 40, "まだ だれも いないよ。いちばで むかえよう", 30, "#4a2c17"));
    p.animals.slice(page * PER, page * PER + PER).forEach((a, i) => {
      const y = P.top + 190 + i * 132, d = S.species(a.kind);
      card(this, P.L, W / 2, y, P.w - 80, 124, () => {});
      const g = this.add.graphics();
      P.L.add(g);
      P.L.add(creature(this, P.left + 110, y, a.kind, 100, S.shineOf(a), S.paintOf(a)));
      const name = `${a.name ? "「" + a.name + "」 " : ""}${S.shineName(a)}${d.name}  ${a.sex === "m" ? "♂" : "♀"}  ${STAGE_NAME[S.stage(a, now)]}  ${gameYears(a.born, now).toFixed(1)}さい`;
      P.L.add(text(this, P.left + 180, y - 44, name, 22, "#4a2c17").setOrigin(0, 0.5));
      [["fork", a.hunger], [d.water ? "water" : "soap", a.clean], ["heart", a.genki], ["star", a.natsuki]].forEach(([icon, v], k) => {
        const gx = P.left + 190 + (k % 2) * 250, gy = y - 6 + Math.floor(k / 2) * 34;
        P.L.add(img(this, gx, gy, icon, 26));
        gauge(this, g, gx + 22, gy, 180, v);
      });
      card(this, P.L, P.left + 75, y + 50, 84, 26, () => { sfx.pop(); this.lineagePanel(a); }, 0xf3ead8);
      P.L.add(text(this, P.left + 75, y + 50, "けいとう", 13, "#7a4a1e"));
      // あげる（兄弟に プレゼント）。兄弟が いて、自分の お店のときだけ
      if (!this.visit && Object.keys(store.family.kids).length > 1 && !a.hospitalUntil) {
        card(this, P.L, P.left + 165, y + 50, 84, 26, () => { sfx.pop(); this.giftMenu(a, P); }, 0xffe2ec);
        P.L.add(text(this, P.left + 165, y + 50, "🎁 あげる", 13, "#c0392b"));
      }
      if (!this.visit) { // なまえ（用意した名前から えらぶ。2026-10-16）
        card(this, P.L, P.left + 255, y + 50, 84, 26, () => { sfx.pop(); this.namePanel(a, () => { P.close(); this.penPanel(penId, page); }); }, 0xe6f0ff);
        P.L.add(text(this, P.left + 255, y + 50, "なまえ", 13, "#2f5f9f"));
      }
      if (S.stage(a, now) === "old") P.L.add(text(this, P.left + 310, y + 50, "もうすぐ いんたい（のんびり ぼくじょうへ）", 16, "#a0522d").setOrigin(0, 0.5));
      const block = S.sellBlock(a, now), bx = P.left + P.w - 170;
      if (a.sick && !a.hospitalUntil) {
        P.L.add(button(this, bx, y, "vet", 56, () => { P.close(); this.scene.start("Vet"); }));
        P.L.add(text(this, bx, y + 50, "じゅういさんへ", 16, "#c0392b"));
      } else if (this.visit) { // 兄弟の お店：はんばいよう の子は その値段で 買える
        if (purpose !== "sale") P.L.add(text(this, bx, y, "❤ だいじに\nそだてて いるよ", 18, "#c0392b"));
        else if (block) P.L.add(text(this, bx, y, MESSAGE[block], 18, "#a0522d", { wordWrap: { width: 200 } }));
        else {
          const price = S.salePrice(a, now, tier);
          card(this, P.L, bx - 20, y, 190, 56, () => {
            const r = buyFromSibling(store.family, store.visitFrom, store.family.current, a.id, Date.now());
            if (!r.ok) { sfx.no(); floatText(this, bx, y - 50, MESSAGE[r.why] || (r.why === "nomoney" ? MESSAGE.nomoney : "かえないよ"), "#a0522d"); return; }
            store.setFamily(r.family); sfx.coin(); P.close(); this.redraw(); floatText(this, W / 2, 300, `かったよ！ -${coin(r.price)}（じぶんの おみせに いれたよ）`, "#2e7d32");
          }, 0x2e9d6a);
          P.L.add(text(this, bx - 20, y, `かう ${coin(price)}`, 20, "#ffffff"));
        }
      } else if (purpose === "keep") {
        P.L.add(text(this, bx, y, "❤ だいじに\nそだてて いるよ", 18, "#c0392b"));
      } else if (block) {
        P.L.add(text(this, bx, y, MESSAGE[block], 18, "#a0522d", { wordWrap: { width: 200 } }));
      } else {
        // はんばいよう：お店での うりね（相場×たかめ等）。コインのボタンで えきへ おくる（こうけんが たまる）こともできる
        const rate = marketRate(a.kind, now);
        P.L.add(text(this, bx - 40, y - 30, "うりね " + coin(S.salePrice(a, now, tier)), 18, "#2e7d32"));
        P.L.add(text(this, bx - 40, y - 6, `そうば ×${rate.toFixed(2)} ${rate >= 1 ? "↑" : "↓"}`, 15, rate >= 1 ? "#c0392b" : "#2a6fb5"));
        P.L.add(button(this, bx + 50, y + 24, "truck", 44, () => this.sellMenu(a, P)));
        P.L.add(text(this, bx + 50, y + 56, "えきへ", 13, "#7a4a1e"));
        // しゅっか：その場で 相場×0.8 で売る（待たない かわりに やすい）
        const sx = bx - 70;
        card(this, P.L, sx, y + 26, 110, 40, () => {
          const r = S.shipAnimal(store.shop, a.id, Date.now());
          if (!r.ok) { sfx.no(); return; }
          store.setShop(r.shop); sfx.coin(); P.close(); this.redraw(); floatText(this, W / 2, 300, `しゅっか したよ +${coin(r.coins)}`, "#2e7d32");
        }, 0xffd9a0);
        P.L.add(text(this, sx, y + 26, `しゅっか ${coin(S.shipPrice(a, now))}`, 13, "#7a4a1e"));
      }
    });
    const cost = S.upgradeCost(p);
    if (cost != null && !this.visit) { // 兄弟の お店では 広げられない
      P.L.add(button(this, W / 2 - 140, P.top + P.h - 60, "hammer", 48, () => {
        const r = S.upgradePen(store.shop, p.id);
        if (!r.ok) { sfx.no(); floatText(this, W / 2, P.top + P.h - 120, MESSAGE[r.reason] || MESSAGE.nomoney, "#a0522d"); return; }
        store.setShop(r.shop); sfx.coin(); P.close(); this.redraw();
      }));
      P.L.add(text(this, W / 2 + 20, P.top + P.h - 58, `ひろげる Lv${p.level + 1}  ${coin(cost)}`, 22, "#7a4a1e"));
    }
  }

  // プレゼント：兄弟を えらんで わたす（相手の お店に 入れる所が 要る）
  giftMenu(a, parentPanel) {
    const others = Object.entries(store.family.kids).filter(([id]) => id !== store.family.current);
    const P = panel(this, `${S.shineName(a)}${S.species(a.kind).name} を だれに あげる？`, { w: 900, h: 420 });
    others.forEach(([id, k], i) => {
      const x = W / 2 - ((others.length - 1) * 230) / 2 + i * 230, y = H / 2 + 10;
      card(this, P.L, x, y, 200, 220, () => {
        const r = giftToSibling(store.family, store.family.current, id, a.id, Date.now());
        if (!r.ok) { sfx.no(); floatText(this, x, y - 130, MESSAGE[r.why] ? "あいての おみせ：" + MESSAGE[r.why] : "あげられないよ", "#a0522d"); return; }
        store.setFamily(r.family); sfx.star(); P.close(); parentPanel.close(); this.redraw();
        floatText(this, W / 2, 300, `${k.name || "きょうだい"}に プレゼント したよ！`, "#2e7d32");
      });
      P.L.add([kidFace(this, x, y - 30, id, k, 110), text(this, x, y + 70, k.name || "", 18, "#4a2c17")]);
    });
  }

  // スタッフを雇う：1・3・7日（1日 100コイン）。雇っている あいだは 朝8時と夕方6時に お世話をする
  staffMenu() {
    const P = panel(this, "スタッフを やとう（るすの日の おせわ）", { w: 900, h: 480 });
    const st = store.shop.staff, now = Date.now();
    if (S.staffWorking(store.shop, now)) P.L.add(text(this, W / 2, P.top + 100, `いま やとって いるよ：あと ${Math.ceil((st.until - now) / 86400000)}にち`, 22, "#2e7d32"));
    else P.L.add(text(this, W / 2, P.top + 100, "あさ 8じと ゆうがた 6じに エサ・きれい・そうじを してくれるよ", 20, "#4a2c17"));
    if (st && st.short && st.short.length) P.L.add(text(this, W / 2, P.top + 138, `エサが たりなかったよ：${st.short.map(f => FOODS[f]?.name || f).join("・")}`, 18, "#c0392b"));
    [1, 3, 7].forEach((d, i) => {
      const x = W / 2 - 250 + i * 250, y = H / 2 + 50;
      card(this, P.L, x, y, 210, 200, () => {
        const r = S.hireStaff(store.shop, d, Date.now());
        if (!r.ok) { sfx.no(); floatText(this, x, y - 120, MESSAGE.nomoney, "#a0522d"); return; }
        store.setShop(r.shop); sfx.coin(); P.close(); this.scene.restart();
      });
      P.L.add([img(this, x, y - 40, "woman", 80), text(this, x, y + 30, `${d}にち`, 26, "#4a2c17"), text(this, x, y + 70, coin(S.STAFF_PAY * d), 22, "#c0392b")]);
    });
    P.L.add(text(this, W / 2, P.top + P.h - 40, "エサは おみせに ある ぶんを つかうよ。たくさん かって おこう", 17, "#7a4a1e"));
  }

  // 家系図：自分・父母・祖父母・ひい祖父母 の 色（色変わりの無い生き物は 名前だけ）
  // 名前を えらぶ：字が打てない子でも 押すだけで つけられる（data/names.js）
  namePanel(a, done) {
    const P = panel(this, `${S.species(a.kind).name}の なまえ`, { w: 1100, h: 600 });
    [...NAMES, ""].forEach((n, i) => {
      const x = P.left + 105 + (i % 7) * 148, y = P.top + 120 + Math.floor(i / 7) * 74;
      card(this, P.L, x, y, 136, 60, () => {
        const r = S.nameAnimal(store.shop, a.id, n);
        if (!r.ok) return;
        store.setShop(r.shop); sfx.star(); P.close(); done();
      }, n === (a.name || "") ? 0xffe28a : 0xf3ead8);
      P.L.add(text(this, x, y, n || "なし", 20, "#4a2c17"));
    });
  }

  lineagePanel(a) {
    const B = { name: m => (m ? MORPHS[a.kind]?.list[m]?.name : MORPHS[a.kind]?.base) || "？", paint: m => (m ? MORPHS[a.kind]?.list[m]?.paint : null) };
    const line = a.line;
    const P = panel(this, `${S.shineName(a)}${S.species(a.kind).name} の けいとう`, { w: 1100, h: 600 });
    const row = (y, list, size, label) => {
      P.L.add(text(this, P.left + 70, y, label, 18, "#7a4a1e"));
      list.forEach((m, i) => {
        const x = P.left + 200 + ((P.w - 260) / list.length) * (i + 0.5);
        P.L.add(creature(this, x, y - 8, a.kind, size, false, B.paint(m)));
        P.L.add(text(this, x, y + size / 2, B.name(m), 13, "#4a2c17"));
      });
    };
    row(P.top + 120, [a.morph ?? null], 90, "じぶん");
    if (!line) { P.L.add(text(this, W / 2, H / 2 + 40, a.father ? "" : "つった・かった こ なので おやは わからないよ", 22, "#7a4a1e")); return; }
    row(P.top + 250, line[0], 70, "おや");
    row(P.top + 370, line[1], 56, "そふぼ");
    row(P.top + 480, line[2], 42, "ひいそふぼ");
  }

  sellMenu(a, parentPanel) {
    const P = panel(this, "どこに おくる？", { w: 1000, h: 560 });
    const now = Date.now();
    S.placesFor(a.kind).forEach((id, i) => {
      const x = W / 2 - 330 + (i % 4) * 220, y = P.top + 170 + Math.floor(i / 4) * 190, pl = store.shop.places[id];
      card(this, P.L, x, y, 200, 170, () => {
        const r = S.sell(store.shop, a.id, id, now);
        if (!r.ok) { sfx.no(); return; }
        store.setShop(r.shop); sfx.coin();
        P.close(); parentPanel.close();
        floatText(this, W / 2, 300, `ありがとう！ +${coin(r.reward)}`);
        for (const g of r.gifts) floatText(this, W / 2, 380, `${pl.name} から おれいが とどいた！`, "#2e7d32");
        this.redraw();
      });
      P.L.add([img(this, x, y - 30, PLACES[id].kind === "zoo" ? "lion" : "dolphin", 64), text(this, x, y + 30, pl.name, 16, "#4a2c17", { wordWrap: { width: 180 } }), text(this, x, y + 64, `こうけん ${pl.points}`, 16, "#2e7d32")]);
    });
  }

  // ---- もようがえの小窓 ----
  freeSpot(w, h) {
    const { w: W2, h: H2 } = S.shopSize(store.shop);
    for (let y = 0; y + h <= H2; y++) for (let x = 0; x + w <= W2; x++) if (S.canPlace(store.shop, x, y, w, h)) return [x, y];
    return null;
  }
  buildMenu() {
    const P = panel(this, "なにを たてる？");
    // 水槽は たんすい（川・池の魚）と かいすい（海の魚）を べつに建てる
    const items = [["cage"], ["tank", "fresh"], ["tank", "sea"], ["cold"], ["big"]];
    items.forEach(([type, water], k) => {
      const t = PENS[type], x = W / 2 - 420 + k * 210, y = H / 2;
      card(this, P.L, x, y, 196, 300, () => {
        const spot = this.freeSpot(2, 2);
        if (!spot) { sfx.no(); floatText(this, x, y - 100, "ばしょが ないよ。ひろげよう", "#a0522d"); return; }
        const r = S.buildPen(store.shop, type, ...spot, water);
        if (!r.ok) { sfx.no(); floatText(this, x, y - 100, MESSAGE.nomoney, "#a0522d"); return; }
        store.setShop(r.shop); sfx.coin(); P.close(); this.redraw();
      });
      const name = water ? `${S.WATER_NAME[water]}の すいそう` : t.name;
      P.L.add([img(this, x, y - 70, water === "sea" ? "tropical" : water ? "fish" : t.icon, 84), text(this, x, y + 20, name, 19, "#4a2c17", { wordWrap: { width: 180 } }),
        text(this, x, y + 64, coin(t.cost[0]), 22, "#c0392b")]);
      if (water) P.L.add(text(this, x, y + 100, water === "sea" ? "うみの さかな" : "かわ・いけの さかな", 14, "#7a6a5a"));
    });
  }
  furnitureMenu() {
    const P = panel(this, "かぐを かう");
    const now = Date.now(), sea = season(store.shop.startedAt, now);
    Object.entries(FURNITURE).filter(([, f]) => f.season == null || f.season === sea).forEach(([kind, f], k) => {
      const x = W / 2 - 400 + (k % 5) * 200, y = P.top + 180 + Math.floor(k / 5) * 210;
      card(this, P.L, x, y, 180, 190, () => {
        const spot = this.freeSpot(f.w, f.h);
        if (!spot) { sfx.no(); floatText(this, x, y - 80, "ばしょが ないよ", "#a0522d"); return; }
        const r = S.buyFurniture(store.shop, kind, ...spot, now);
        if (!r.ok) { sfx.no(); floatText(this, x, y - 80, MESSAGE.nomoney, "#a0522d"); return; }
        store.setShop(r.shop); sfx.coin(); P.close(); this.redraw();
      });
      P.L.add([img(this, x, y - 40, f.icon, 70), text(this, x, y + 20, f.name, 16, "#4a2c17", { wordWrap: { width: 170 } }), text(this, x, y + 62, coin(f.price), 18, "#c0392b")]);
    });
  }
  expandMenu() {
    const next = SHOP_SIZES[store.shop.size + 1];
    const P = panel(this, "おみせを ひろげる", { w: 700, h: 400 });
    if (!next) { P.L.add(text(this, W / 2, H / 2, "これ いじょう ひろげられないよ", 28, "#4a2c17")); return; }
    P.L.add(text(this, W / 2, H / 2 - 30, `${next.w}×${next.h} マスに ひろげる  ${coin(next.cost)}`, 28, "#4a2c17"));
    P.L.add(button(this, W / 2, H / 2 + 80, "hammer", 64, () => {
      const r = S.expandShop(store.shop);
      if (!r.ok) { sfx.no(); floatText(this, W / 2, H / 2 + 20, MESSAGE.nomoney, "#a0522d"); return; }
      store.setShop(r.shop); sfx.star(); this.scene.restart();
    }));
  }
  decorMenu() {
    const P = panel(this, "かざり（かべ・かんばん・やね）");
    Object.entries(DECOR).forEach(([part, def], row) => {
      const y = P.top + 140 + row * 160;
      P.L.add(text(this, P.left + 90, y, def.label, 22, "#7a4a1e"));
      Object.entries(def.items).forEach(([id, it], k) => {
        const x = P.left + 300 + k * 200, owned = store.shop.owned[part].includes(id), on = store.shop.decor[part] === id;
        card(this, P.L, x, y, 180, 120, () => {
          const r = S.buyDecor(store.shop, part, id);
          if (!r.ok) { sfx.no(); floatText(this, x, y - 60, MESSAGE.nomoney, "#a0522d"); return; }
          store.setShop(r.shop); sfx.coin(); this.scene.restart();
        }, on ? 0xffe28a : 0xffffff);
        P.L.add([text(this, x, y - 18, it.name, 20, "#4a2c17"), text(this, x, y + 22, owned ? "もっている" : coin(it.price), 18, owned ? "#2e7d32" : "#c0392b")]);
      });
    });
  }
  itemMenu(it) {
    const P = panel(this, FURNITURE[it.kind].name, { w: 600, h: 320 });
    P.L.add(button(this, W / 2, H / 2 + 20, "no", 64, () => { store.setShop(S.removeItem(store.shop, it.id).shop); sfx.sweep(); P.close(); this.redraw(); }));
    P.L.add(text(this, W / 2, H / 2 + 90, "しまう（すてる）", 20, "#a0522d"));
  }
  penEditMenu(p) {
    if (p.animals.length) { this.penPanel(p.id); return; }
    const P = panel(this, PENS[p.type].name, { w: 600, h: 320 });
    P.L.add(button(this, W / 2, H / 2 + 20, "no", 64, () => { store.setShop(S.removePen(store.shop, p.id).shop); sfx.sweep(); P.close(); this.redraw(); }));
    P.L.add(text(this, W / 2, H / 2 + 90, "とりこわす", 20, "#a0522d"));
  }
}
