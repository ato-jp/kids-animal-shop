// 柵・水槽を のぞく：お店の床で柵を押すと、その中を全画面で見る。
// 水槽は試作（prototype/src.html の Phaser 版）と同じ作り：光の筋・ゆれる水草・砂・あわ。奥の生き物ほど小さく水の色に近づける。
// 川・池の水槽（淡水）は緑がかった水と砂利、海の水槽は青い水と砂。陸の柵は 床（こべや）・草原（うんどうじょう）・氷と水べ。
// 世話はここでもできる（エサ・みず/せっけん・そうじ）。くわしい ようす と 売る は お店の小窓で。
import { store } from "../store.js";
import * as S from "../logic/shop.js";
import { PENS } from "../data/pens.js";
import { AQUATIC_IMAGES } from "../data/aquatic_images.js";
import { ANIMAL_IMAGES } from "../data/animal_images.js";
import { W, H, text, img, button, creature, floatText, burst } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { MESSAGE } from "./Shop.js";
import { sfx } from "../sound/sfx.js";
import { ambient } from "../ui/ambient.js";
import { bgm } from "../sound/bgm.js";
import { EXHIBITS } from "../logic/zoo.js";

const EXHIBIT_NAME = Object.fromEntries(Object.entries(EXHIBITS).map(([k, v]) => [k, v.name]));

const TOP = 84, VH = H - TOP;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 底を歩く・はう生き物と、ほとんど動かない生き物（名前で決める。絵や動きの話なので画面の側に置く）
const BOTTOM = new Set(["ザリガニ", "サワガニ", "モクズガニ", "ヤドカリ", "アマエビ", "ズワイガニ", "サザエ", "ヒトデ", "ムラサキウニ", "イソギンチャク",
  "ドジョウ", "ナマズ", "ヒラメ", "カレイ", "チンアナゴ", "ダンゴウオ", "ウーパールーパー", "マダコ", "カサゴ", "オオカミウオ"]);
const STILL = new Set(["ヒトデ", "ムラサキウニ", "イソギンチャク", "サザエ", "チンアナゴ"]);
const DRIFT = new Set(["ミズクラゲ"]);
const AQ_PX = { 1: 90, 2: 140, 3: 200, 9: 260 };

export class PenView extends Phaser.Scene {
  constructor() { super("PenView"); }

  create({ penId, readonly = false, exhibit = null, f = null }) {
    this.ex = exhibit ? { id: exhibit, f } : null; // 園の てんじを のぞく（2026-10-16）：世話は 飼育員さん。なでる・あそぶ・見るだけ
    this.readonly = readonly || !!exhibit;
    this.penId = penId;
    const p = this.pen();
    if (!p) { this.scene.start(this.ex ? "Zoo" : "Shop", this.ex ? { f } : undefined); return; }
    bgm.play(p.type === "tank" ? "fish" : "shop");
    this.type = p.type;
    this.water = PENS[p.type].water;
    this.fresh = p.type === "tank" && S.waterOf(p) === "fresh";
    this.t = 0; this.foods = []; this.cast = []; this.bubbles = [];
    this.drawBack();
    this.makeCast(p);
    this.drawFront();
    if (p.type !== "tank") ambient(this, { indoor: p.type === "cage", depth: 88 }); // 水槽は お店の中の明かり
    topBar(this, { back: false });
    if (this.ex) this.exhibitBar(p);
    else if (readonly) {
      button(this, W - 70, H - 60, "back", 56, () => { sfx.pop(); this.scene.start("Shop"); }).setDepth(101);
      text(this, W - 70, H - 18, "もどる", 17, "#ffffff", { stroke: "#00000080", strokeThickness: 4 }).setDepth(101);
    } else this.makeBar(p);
    this.input.on("pointerup", (ptr, over) => {
      if (this.readonly || over.length || ptr.y < TOP || ptr.y > H - 110 || ptr.getDistance() > 24) return; // こすった あとは エサを 落とさない
      if (this.type === "tank") this.feed(ptr.x, ptr.y);
    });
    // なでる：生き物を おしたまま 指を うごかす（2026-10-16）
    this.input.on("pointermove", ptr => {
      const st = this.stroking;
      if (ptr.isDown && !st) { this.scrub(ptr, Math.hypot(ptr.x - ptr.prevPosition.x, ptr.y - ptr.prevPosition.y)); return; }
      if (!st || !ptr.isDown) return;
      const dd = Math.hypot(ptr.x - st.lx, ptr.y - st.ly);
      st.lx = ptr.x; st.ly = ptr.y; st.dist += dd; st.total += dd;
      if (st.dist > 140) { st.dist = 0; this.petOnce(st.f); }
    });
    this.input.on("pointerup", () => this.time.delayedCall(0, () => { this.stroking = null; }));
    const onChange = () => this.refreshNeeds();
    this.game.events.on("shop-changed", onChange);
    this.events.once("shutdown", () => this.game.events.off("shop-changed", onChange));
  }

  pen() {
    if (!this.ex) return store.shop.pens.find(q => q.id === this.penId);
    const e = store.shop[this.ex.f]?.exhibits.find(x => x.id === this.ex.id);
    if (!e) return null;
    const type = { land: "cage", big: "big", cold: "cold", fresh: "tank", sea: "tank" }[e.type]; // 見た目は お店の 柵・水槽と 同じ描き方
    return { id: e.id, type, level: 3, dirty: false, animals: e.animals, water: e.type === "sea" ? "sea" : e.type === "fresh" ? "fresh" : undefined, exType: e.type };
  }
  floorY(z) { return TOP + VH * (this.type === "tank" ? 0.78 + 0.1 * z : 0.62 + 0.22 * z); }

  // ---- 背景（動かない所） ----
  drawBack() {
    const g = this.add.graphics().setDepth(0);
    // AIで描いた背景（tools/gen_scenes.py の pen_*）があれば奥に敷く。水槽は その手前に 光・水草・砂・あわ を重ねて動きを出す
    const artKey = "bg_pen_" + (this.type === "tank" ? (this.fresh ? "fresh" : "sea") : this.type);
    const art = this.textures.exists(artKey);
    if (art) this.add.image(0, TOP, artKey).setOrigin(0).setDisplaySize(W, VH).setDepth(0);
    if (this.type === "tank") {
      const [top, bottom] = this.fresh ? [0x7cc6a6, 0x163f33] : [0x2bb3d6, 0x0b3d62];
      if (!art) g.fillGradientStyle(top, top, bottom, bottom, 1).fillRect(0, TOP, W, VH);
      // 光の筋（ゆっくり明るさが変わる）
      [0, 1, 2, 3].forEach(i => {
        const r = this.add.graphics().setDepth(1).fillStyle(this.fresh ? 0xf6ffd8 : 0xd8fbff, 0.07);
        const x = W * (0.12 + i * 0.25);
        r.fillPoints([{ x: x - 20, y: TOP }, { x: x + 40, y: TOP }, { x: x + 170, y: H }, { x: x + 20, y: H }], true);
        this.tweens.add({ targets: r, alpha: { from: 0.25, to: 1 }, duration: 2600 + i * 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      });
      this.weedBack = this.add.graphics().setDepth(3);
      this.weedFront = this.add.graphics().setDepth(80);
      const n = this.fresh ? 9 : 6;
      this.weeds = [
        ...(art ? [] : Array.from({ length: n }, (_, i) => ({ f: (i + 0.5) / n + rand(-0.04, 0.04), z: 0, h: rand(0.25, this.fresh ? 0.55 : 0.4), ph: rand(0, 6) }))),
        ...[0.03, 0.36, 0.95].map(f => ({ f, z: 1, h: rand(0.28, 0.45), ph: rand(0, 6) })),
      ];
      const sand = this.add.graphics().setDepth(6);
      const wave = (z, amp, k, ph) => { const pts = [{ x: 0, y: H }]; for (let x = 0; x <= W; x += 20) pts.push({ x, y: this.floorY(z) + Math.sin(x / k + ph) * amp }); pts.push({ x: W, y: H }); return pts; };
      if (!art) sand.fillStyle(this.fresh ? 0x7d6e58 : 0xcdb27c, 1).fillPoints(wave(0, 6, 90, 0), true);
      sand.fillStyle(this.fresh ? 0x9c8b6e : 0xe8cf9a, 1).fillPoints(wave(0.7, 8, 140, 1), true);
      // 砂利・石
      for (let i = 0; i < (this.fresh ? 80 : 9); i++) {
        const x = rand(0, W), y = rand(this.floorY(0.75), H - 4), r = this.fresh ? rand(3, 7) : rand(10, 22);
        sand.fillStyle(this.fresh ? [0x5e5446, 0xb3a184, 0x6f6655][i % 3] : 0x9aa7b0, 1).fillEllipse(x, y, r * 2, r * 1.2);
      }
      for (let i = 0; i < 14; i++) {
        const b = this.add.image(0, 0, "bubbles").setDepth(rand(5, 75)).setAlpha(0.6);
        this.bubbles.push({ spr: b, x: rand(0, W), y: rand(TOP, H), sp: rand(30, 70), sz: rand(0.06, 0.12), ph: rand(0, 6) });
      }
      // 汚れているときは水がにごる
      this.murk = this.add.rectangle(0, TOP, W, VH, 0x6b5a2a, 0).setOrigin(0).setDepth(85);
    } else if (art) {
      // 陸の柵は 絵だけ（汚れは下で重ねる）
    } else if (this.type === "cage") {
      g.fillStyle(0xf1e1c4, 1).fillRect(0, TOP, W, VH);
      g.fillStyle(0xe6d2ae, 1).fillRect(0, TOP + VH * 0.5, W, 10);
      g.fillStyle(0xfff6e0, 0.7).fillRoundedRect(W * 0.62, TOP + 40, 300, 170, 12); // 窓の光
      g.lineStyle(8, 0xc9a77a, 1).strokeRoundedRect(W * 0.62, TOP + 40, 300, 170, 12).lineBetween(W * 0.62 + 150, TOP + 40, W * 0.62 + 150, TOP + 210);
      g.fillGradientStyle(0xc89a63, 0xc89a63, 0xa8783f, 0xa8783f, 1).fillRect(0, this.floorY(0) - 30, W, H);
      for (let y = this.floorY(0) - 30; y < H; y += 46) g.lineStyle(2, 0x8d6232, 0.5).lineBetween(0, y, W, y);
      for (let i = 0; i < 160; i++) { // わら
        const x = rand(0, W), y = rand(this.floorY(0.2), H - 6), a = rand(0, Math.PI);
        g.lineStyle(3, [0xe8c86a, 0xd9b452, 0xf3dc8e][i % 3], 0.9).lineBetween(x, y, x + Math.cos(a) * 22, y + Math.sin(a) * 6);
      }
    } else if (this.type === "big") {
      g.fillGradientStyle(0x8fd0f2, 0x8fd0f2, 0xe9f5fb, 0xe9f5fb, 1).fillRect(0, TOP, W, VH * 0.6);
      g.fillStyle(0xa9c98a, 1).fillEllipse(W * 0.25, this.floorY(0) - 10, W * 0.9, 160).fillEllipse(W * 0.8, this.floorY(0), W * 0.8, 120);
      g.fillGradientStyle(0xb6cf73, 0xb6cf73, 0x86a94a, 0x86a94a, 1).fillRect(0, this.floorY(0) - 20, W, H);
      // アカシアの木
      g.fillStyle(0x7a5a3a, 1).fillRect(W * 0.78, this.floorY(0) - 190, 18, 190);
      g.fillStyle(0x6f9a46, 1).fillEllipse(W * 0.78 + 9, this.floorY(0) - 200, 300, 60).fillEllipse(W * 0.78 - 40, this.floorY(0) - 225, 160, 40);
      for (let i = 0; i < 220; i++) { // 草
        const x = rand(0, W), y = rand(this.floorY(0), H);
        g.lineStyle(2, [0x9cbc5a, 0x7e9e3e, 0xc3d685][i % 3], 1).lineBetween(x, y, x + rand(-4, 4), y - rand(8, 18));
      }
      for (let x = 30; x < W; x += 120) g.fillStyle(0x8a6a48, 1).fillRect(x, H - 70, 12, 70); // 手前の柵
      g.fillStyle(0x8a6a48, 1).fillRect(0, H - 60, W, 8);
    } else { // cold：氷と水べ
      g.fillGradientStyle(0xbfe3f5, 0xbfe3f5, 0xeef8fd, 0xeef8fd, 1).fillRect(0, TOP, W, VH);
      g.fillStyle(0xdcecf5, 1).fillTriangle(0, this.floorY(0), 260, TOP + 140, 520, this.floorY(0)).fillTriangle(400, this.floorY(0), 700, TOP + 190, 1000, this.floorY(0));
      g.fillGradientStyle(0x5fb3d9, 0x5fb3d9, 0x2a7aa8, 0x2a7aa8, 1).fillRect(0, this.floorY(0) - 10, W, VH);
      g.fillStyle(0xf7fbfe, 1).fillRoundedRect(-40, this.floorY(0.45), W * 0.62, H, 40);
      g.fillStyle(0xe2eef6, 1).fillRoundedRect(W * 0.1, this.floorY(0.7), W * 0.4, 30, 15);
    }
    this.dirt = this.add.graphics().setDepth(84);
  }

  drawFront() { this.refreshNeeds(); }

  // ---- 生き物 ----
  makeCast(p) {
    const here = p.animals.filter(a => !a.hospitalUntil);
    if (!here.length) text(this, W / 2, TOP + VH * 0.4, "まだ だれも いないよ", 40, this.type === "tank" ? "#ffffff" : "#7a4a1e").setDepth(95);
    here.forEach(a => {
      const d = S.species(a.kind);
      const water = this.type === "tank";
      const bottom = !water || BOTTOM.has(d.name), still = STILL.has(d.name), drift = DRIFT.has(d.name);
      const z = bottom ? rand(0.2, 1) : rand(0, 1);
      const st = S.stage(a, Date.now()), grow = st === "baby" ? 0.6 : st === "young" ? 0.8 : 1; // 赤ちゃんは 小さく（2026-10-16）
      const px = (water ? AQ_PX[d.aquatic.tank] : Math.min(300, 60 + 22 * d.space)) * grow;
      const spr = creature(this, rand(120, W - 120), water ? rand(TOP + VH * 0.2, TOP + VH * 0.6) : this.floorY(z), a.kind, px, S.shineOf(a), S.paintOf(a));
      const k = 0.55 + 0.45 * z;
      if (water && !S.shineOf(a) && !a.sick) {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(this.fresh ? 0x8fbfa4 : 0x7fb6cc), Phaser.Display.Color.ValueToColor(0xffffff), 100, Math.round(z * 100));
        if (spr.texture.key !== "fish") spr.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      }
      if (a.sick) spr.setTint(0xb8c4a0);
      spr.setDepth(10 + z * 60).setInteractive({ useHandCursor: true });
      const f = { a, d, spr, z, k, px, bottom, still, drift, x: spr.x, y: spr.y, vx: rand(-1, 1) || 0.5, vy: 0, ph: rand(0, 6), hop: 0, spin: 0, turn: rand(1, 5), base: spr.scaleX,
        left: (water ? AQUATIC_IMAGES : ANIMAL_IMAGES)[a.kind]?.left ?? true };
      if (st === "baby") f.mark = text(this, 0, 0, "🍼", 22).setDepth(91);
      spr.on("pointerdown", ptr => { this.stroking = { f, lx: ptr.x, ly: ptr.y, dist: 0, total: 0 }; });
      spr.on("pointerup", () => { if (!this.stroking || this.stroking.total < 30) this.poke(f); });
      this.cast.push(f);
    });
  }

  petOnce(f) {
    f.wakeUntil = this.t + 4; // なでると すこし おきる
    burst(this, f.spr.x, f.spr.y - f.px * f.k * 0.3, "heart", 2, 26, 60);
    this.tweens.add({ targets: f, hop: -18, duration: 140, yoyo: true });
    if (this.readonly) return;
    const now = this.pen().animals.find(q => q.id === f.a.id);
    if (!this.water && now && S.needs(now, this.pen()).includes("clean")) { // よごれた子を なでると あわあわ → 3かいで せっけん
      burst(this, f.spr.x, f.spr.y - 20, "bubbles", 3, 30, 60);
      f.soap = (f.soap || 0) + 1;
      if (f.soap >= 3) { f.soap = 0; this.useTool("soap"); }
    }
    const r = S.pet(store.shop, f.a.id, Date.now());
    if (!r.ok) return;
    store.setShop(r.shop);
    sfx.pop();
    if (!r.gained && !f.petFull) { f.petFull = true; floatText(this, clamp(f.spr.x, 200, W - 200), f.spr.y - 80, "きょうは たくさん なでて もらったよ", "#ff7a9a"); }
  }

  // あそぶ：ボール（いぬ・ねこは けいとだま）を出す。ゆびで うごかすと 追いかける。さわると 柵の みんなが げんきに
  toy() {
    if (this.ball) this.ball.destroy();
    const p = this.pen(), yarn = p.animals.some(a => a.kind === "cat");
    const b = text(this, W / 2, this.floorY(0.6) - 20, yarn ? "🧶" : "⚽", 48).setDepth(80).setInteractive({ useHandCursor: true, draggable: true });
    b.on("drag", (_, x, y) => b.setPosition(clamp(x, 40, W - 40), clamp(y, this.floorY(0.1), this.floorY(1) - 10)));
    b.played = false;
    this.ball = b;
  }
  ballHit(f) {
    const b = this.ball;
    if (b.hitAt && this.t - b.hitAt < 0.7) return; // つづけて けらない
    b.hitAt = this.t;
    this.tweens.add({ targets: b, x: clamp(b.x + (f.vx > 0 ? 160 : -160), 40, W - 40), angle: b.angle + 360, duration: 500, ease: "Quad.easeOut" });
    burst(this, f.spr.x, f.spr.y - 40, "star", 2, 24, 50);
    if (b.played || this.readonly) return;
    b.played = true;
    const r = S.play(store.shop, this.penId, Date.now());
    if (!r.ok) return;
    store.setShop(r.shop); sfx.star();
    floatText(this, W / 2, TOP + 80, r.gained ? "たのしかった！ みんな げんき アップ" : "きょうは たくさん あそんだよ", "#2e7d32");
  }

  poke(f) {
    sfx.pop();
    f.wakeUntil = this.t + 4;
    this.tweens.add({ targets: f, hop: -60, duration: 220, yoyo: true, ease: "Quad.easeOut" });
    if (this.type === "tank" && !f.bottom) this.tweens.add({ targets: f, spin: Math.PI * 2, duration: 600, ease: "Cubic.easeOut", onComplete: () => { f.spin = 0; } });
    const a = f.a, now = Date.now();
    const label = `${a.name ? "「" + a.name + "」 " : ""}${S.shineName(a)}${f.d.name} ${a.sex === "m" ? "♂" : "♀"}  ${{ baby: "あかちゃん", young: "こども", adult: "おとな", old: "おとしより" }[S.stage(a, now)]}`;
    floatText(this, clamp(f.spr.x, 200, W - 200), f.spr.y - f.px * f.k * 0.6, label, this.type === "tank" ? "#ffffff" : "#4a2c17");
  }

  // 園の てんじ：あそぶ（陸だけ）と もどる。前を お客さんが ゆっくり 通る
  exhibitBar(p) {
    const items = [...(this.type === "tank" ? [] : [["star", "あそぶ", () => this.toy()]]), ["back", "もどる", () => this.scene.start("Town")]];
    items.forEach(([icon, label, fn], i) => {
      const x = W - 70 - (items.length - 1 - i) * 130;
      button(this, x, H - 60, icon, 56, () => { sfx.pop(); fn(); }).setDepth(101);
      text(this, x, H - 18, label, 17, "#ffffff", { stroke: "#00000080", strokeThickness: 4 }).setDepth(101);
    });
    text(this, 40, TOP + 26, `${EXHIBIT_NAME[p.exType]}　${p.animals.length}ひき`, 22, this.type === "tank" ? "#ffffff" : "#4a2c17", { stroke: this.type === "tank" ? "#00000060" : "#ffffff80", strokeThickness: 4 }).setOrigin(0, 0.5).setDepth(101);
    const pp = this.textures.getTextureKeys().filter(k => k.startsWith("pp_"));
    const walker = () => {
      const fromLeft = Math.random() < 0.5, y = H - 30;
      const im = pp.length ? this.add.image(fromLeft ? -60 : W + 60, y, pp[Math.floor(Math.random() * pp.length)]).setOrigin(0.5, 1) : img(this, fromLeft ? -60 : W + 60, y - 40, ["man", "woman", "boy", "girl"][Math.floor(Math.random() * 4)], 80);
      if (pp.length) im.setScale(170 / im.height).setFlipX(!fromLeft);
      im.setDepth(99).setAlpha(0.92);
      this.tweens.add({ targets: im, x: fromLeft ? W + 60 : -60, duration: 14000 + Math.random() * 6000, onComplete: () => im.destroy() });
    };
    walker();
    this.time.addEvent({ delay: 7000, loop: true, callback: walker });
  }

  // ---- 下の帯：世話のボタン ----
  makeBar(p) {
    const g = this.add.graphics().setDepth(100);
    g.fillStyle(0x000000, 0.28).fillRoundedRect(W / 2 - 430, H - 100, 860, 88, 28);
    const items = [
      ["fork", "エサ", () => this.feedAll()],
      [this.water ? "water" : "soap", this.water ? "みずかえ" : "せっけん", () => this.useTool(this.water ? "water" : "soap")],
      ["broom", "そうじ", () => this.useTool("broom")],
      ...(this.type === "tank" ? [] : [["star", "あそぶ", () => this.toy()]]),
      ["book", "ようす", () => this.scene.start("Shop", { openPen: this.penId })],
      ["back", "もどる", () => this.scene.start("Shop")],
    ];
    const gap = items.length > 5 ? 140 : 170;
    items.forEach(([icon, label, fn], i) => {
      const x = W / 2 - (gap * (items.length - 1)) / 2 + i * gap;
      button(this, x, H - 66, icon, 46, () => { sfx.pop(); fn(); }).setDepth(101);
      text(this, x, H - 24, label, 17, "#ffffff", { stroke: "#00000080", strokeThickness: 4 }).setDepth(101);
    });
    text(this, 40, TOP + 26, `${p.type === "tank" ? S.WATER_NAME[S.waterOf(p)] + "の すいそう" : PENS[p.type].name} Lv${p.level}　ひろさ ${S.usedSpace(p)}/${S.capacity(p)}`, 22, this.type === "tank" ? "#ffffff" : "#4a2c17", { stroke: this.type === "tank" ? "#00000060" : "#ffffff80", strokeThickness: 4 }).setOrigin(0, 0.5).setDepth(101);
    if (this.type === "tank") text(this, W - 40, TOP + 26, "みずを タッチで エサ", 18, "#ffffff").setOrigin(1, 0.5).setDepth(101);
  }

  // おなかが すいている子のエサを まとめて（エサの種類ごとに care を呼ぶ）
  feedAll() {
    const p = this.pen();
    const foods = [...new Set(p.animals.filter(a => !a.hospitalUntil && S.needs(a, p).includes("food")).map(a => S.species(a.kind).food))];
    if (!foods.length) { sfx.no(); floatText(this, W / 2, H - 150, "いまは おなか いっぱい みたい", "#ffffff"); return; }
    let shop = store.shop, fed = 0, last = "notneeded";
    for (const food of foods) { const r = S.care(shop, this.penId, food); last = r.result; if (r.result === "ok") { shop = r.shop; fed++; } }
    if (!fed) { sfx.no(); floatText(this, W / 2, H - 150, MESSAGE[last], "#ffffff"); return; }
    store.setShop(shop);
    sfx.eat();
    if (this.type === "tank") for (let i = 0; i < 4; i++) this.drop(rand(200, W - 200), TOP + 40, false);
    else this.cast.forEach(f => burst(this, f.spr.x, f.spr.y - 40, "heart", 2, 30, 50));
    this.refreshNeeds();
  }

  // 水槽の水をタッチ：エサを落とす（1回ぶんの世話になる）
  feed(x, y) {
    const p = this.pen();
    if (!p.animals.some(a => !a.hospitalUntil)) return;
    this.drop(x, y, true);
  }
  drop(x, y, real) {
    if (real) {
      const r = S.care(store.shop, this.penId, "pellet");
      if (r.result !== "ok") { sfx.no(); floatText(this, x, y, MESSAGE[r.result], "#ffffff"); return; }
      store.setShop(r.shop); sfx.eat(); this.refreshNeeds();
    }
    for (let i = 0; i < 3; i++) {
      const c = this.add.circle(0, 0, 6, this.fresh ? 0xb0743c : 0xc98a4b).setDepth(55);
      this.foods.push({ c, x: x + rand(-24, 24), y: Math.min(y, TOP + VH * 0.3) + rand(-10, 10), life: 8, ph: rand(0, 6) });
    }
  }

  useTool(tool) {
    const r = S.care(store.shop, this.penId, tool);
    if (r.result !== "ok") { sfx.no(); floatText(this, W / 2, H - 150, MESSAGE[r.result], "#ffffff"); return; }
    store.setShop(r.shop);
    sfx.sweep();
    burst(this, W / 2, TOP + VH / 2, tool === "broom" ? "sparkles" : "bubbles", 10, 60, 260);
    this.refreshNeeds();
  }

  // 汚れ・にごり・ほしい物の印を いまの記録に合わせる
  refreshNeeds() {
    const p = this.pen();
    if (!p) return;
    this.dirt.clear();
    // よごれ：指で こすると うすくなり、ぜんぶ消えると そうじ（2026-10-16）。ボタンの そうじも のこす
    if (p.dirty && !this.spots) this.spots = Array.from({ length: 6 }, (_, i) => ({ x: 150 + i * 190 + (i % 2) * 40, y: H - 130 - (i % 3) * 14, r: 14 + (i % 3) * 5, hp: 1 }));
    if (!p.dirty) this.spots = null;
    this.drawSpots();
    if (this.murk) this.murk.setAlpha(p.dirty ? 0.18 : Math.max(0, 0.22 - 0.22 * Math.min(...p.animals.map(a => a.clean).concat(1)) * 1.2));
    for (const f of this.cast) {
      const a = p.animals.find(q => q.id === f.a.id);
      const want = a ? S.needs(a, p).filter(n => n !== "broom" && n !== "vet") : [];
      (f.icons || []).forEach(i => i.destroy());
      f.icons = want.map(n => img(this, 0, 0, { food: "fork", clean: this.water ? "water" : "soap" }[n], 26).setDepth(90));
    }
  }

  drawSpots() {
    this.dirt.clear();
    for (const sp of this.spots || []) if (sp.hp > 0) this.dirt.fillStyle(0x6b4a24, 0.8 * sp.hp).fillCircle(sp.x, sp.y, sp.r).fillStyle(0x6b4a24, 0.5 * sp.hp).fillCircle(sp.x + sp.r * 0.8, sp.y - 4, sp.r * 0.5);
  }
  scrub(ptr, dd) {
    if (!this.spots || this.readonly) return;
    let hit = false;
    for (const sp of this.spots) if (sp.hp > 0 && Math.hypot(ptr.x - sp.x, ptr.y - sp.y) < sp.r + 30) { sp.hp -= dd / 260; hit = true; }
    if (!hit) return;
    if (Math.random() < 0.3) burst(this, ptr.x, ptr.y, "sparkles", 1, 20, 30);
    this.drawSpots();
    if (this.spots.every(sp => sp.hp <= 0)) { this.spots = null; this.useTool("broom"); }
  }

  update(_, dtMs) {
    const d = Math.min(dtMs / 1000, 0.05), s = this;
    s.t += d;
    const h = new Date().getHours();
    s.night = h >= 21 || h < 6; // 夜は ねる（2026-10-16。見た目だけ。世話や あそぶ は いつもどおり）
    if (s.type === "tank") {
      for (const [g, z] of [[s.weedBack, 0], [s.weedFront, 1]]) {
        g.clear();
        for (const w of s.weeds.filter(q => q.z === z)) {
          const bx = w.f * W, by = s.floorY(z === 0 ? 0 : 0.95) + 6, h = w.h * VH, n = 9, pts = [];
          for (let i = 0; i <= n; i++) pts.push({ x: bx + Math.sin(s.t * 1.3 + w.ph + i * 0.5) * i * (z ? 3.2 : 2), y: by - (h * i) / n });
          g.lineStyle(z ? 16 : s.fresh ? 8 : 10, s.fresh ? (z ? 0x4fbf4a : 0x2f8f3a) : (z ? 0x3fbf6f : 0x2a8a63), 1).strokePoints(pts);
        }
      }
      for (const b of s.bubbles) {
        b.y -= b.sp * d; if (b.y < TOP) { b.y = H; b.x = rand(0, W); }
        b.spr.setPosition(b.x + Math.sin(s.t * 2 + b.ph) * 8, b.y).setScale(b.sz * 1.3);
      }
      for (const fd of s.foods) {
        if (fd.y < s.floorY(0.9) - 4) { fd.y += 45 * d; fd.x += Math.sin(s.t * 2 + fd.ph) * 12 * d; } else fd.life -= d;
        fd.c.setPosition(fd.x, fd.y).setAlpha(clamp(fd.life, 0, 1));
      }
      s.foods = s.foods.filter(fd => { if (fd.life <= 0) { fd.c.destroy(); return false; } return true; });
    }
    for (const f of s.cast) this.move(f, d);
  }

  move(f, d) {
    const s = this, water = s.type === "tank", size = f.px * f.k;
    const asleep = s.night && !(f.wakeUntil > s.t) && !(s.ball && s.ball.active);
    if (asleep) { // まるくなって じっと。💤
      f.vx = 0; f.vy = 0;
      if (!f.zz) f.zz = text(s, 0, 0, "💤", 22).setDepth(92);
      f.zz.setVisible(true).setPosition(f.spr.x + size * 0.3, f.spr.y - size * 0.45 + Math.sin(s.t * 2 + f.ph) * 4);
      f.spr.setScale(f.base * f.k * 1.05, f.base * f.k * 0.85);
      return;
    }
    if (f.zz) f.zz.setVisible(false);
    const sp = (water ? 70 : 45) * (0.6 + 0.4 * f.k) * (f.still ? 0.08 : f.drift ? 0.25 : 1);
    let target = null, best = 1e9, chasing = false;
    if (!water && s.ball && s.ball.active && !f.a.sick) { // ボールを 追いかける
      chasing = true;
      const dx = s.ball.x - f.x;
      f.vx += (Math.sign(dx) * sp * 3.5 - f.vx) * 0.1;
      if (Math.abs(dx) < size * 0.35 && Math.abs(s.ball.y - f.y) < 120) this.ballHit(f);
    } else if (water && !f.still) for (const fd of s.foods) { const dd = Math.hypot(fd.x - f.x, fd.y - f.y); if (dd < best) { best = dd; target = fd; } }
    if (target) {
      const dx = target.x - f.x, dy = f.bottom ? 0 : target.y - f.y, n = Math.hypot(dx, dy) || 1;
      f.vx += ((dx / n) * sp * 1.8 - f.vx) * 0.05; f.vy += ((dy / n) * sp * 1.8 - f.vy) * 0.05;
      if (Math.hypot(target.x - f.x, target.y - f.y) < size * 0.5) target.life = 0;
    } else if (!chasing) {
      f.turn -= d;
      if (f.turn < 0) {
        f.turn = rand(2, 6);
        const rest = !water && Math.random() < 0.35; // 陸の動物は ときどき 立ち止まる
        f.vx = rest ? 0 : (Math.random() < 0.5 ? -1 : 1) * sp * rand(0.6, 1);
        const mom = f.mark && s.cast.find(m => m.a.id === f.a.mother); // 赤ちゃんは お母さんの そばへ
        if (mom && Math.abs(mom.x - f.x) > 90) { f.vx = Math.sign(mom.x - f.x) * sp; f.vy = mom.bottom ? 0 : Math.sign(mom.y - f.y) * sp * 0.3; f.turn = 1; }
        f.vy = f.bottom ? 0 : rand(-0.3, 0.3) * sp * (f.drift ? 3 : 1);
      }
    }
    if (s.stroking && s.stroking.f === f) { f.vx = 0; f.vy = 0; } // なでている あいだは じっと している
    f.x += f.vx * d; f.y += f.vy * d;
    if (f.x < size * 0.5) { f.x = size * 0.5; f.vx = Math.abs(f.vx); }
    if (f.x > W - size * 0.5) { f.x = W - size * 0.5; f.vx = -Math.abs(f.vx); }
    const floor = s.floorY(f.z);
    if (f.bottom) f.y = floor - size * 0.35;
    else {
      const top = TOP + VH * 0.12, low = floor - size * 0.6;
      f.y = clamp(f.y, top, low); if (f.y <= top || f.y >= low) f.vy *= -1;
    }
    const bob = f.bottom ? (f.vx ? Math.abs(Math.sin(s.t * 6 + f.ph)) * -3 : 0) : Math.sin(s.t * 2 + f.ph) * 6;
    const dir = f.vx === 0 ? f.spr.flipX : (f.left ? f.vx > 0 : f.vx < 0);
    f.spr.setPosition(f.x, f.y + bob + f.hop * f.k).setScale(f.base * f.k).setFlipX(dir)
      .setRotation((f.bottom ? 0 : clamp(f.vy / 300, -0.3, 0.3) * (f.vx > 0 ? 1 : -1)) + f.spin);
    if (f.mark) f.mark.setPosition(f.spr.x + size * 0.35, f.spr.y - size * 0.4);
    (f.icons || []).forEach((im, j) => im.setPosition(f.spr.x - 14 * (f.icons.length - 1) + j * 28, f.spr.y - size * 0.55 - 8));
  }
}
