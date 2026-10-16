// 自分の町（箱庭）版4（2026-10-16 パパ「カイロソフトを 再現して」・docs/town-v3.md）：クォータービュー（ひし形の マスを ななめ上から 見る）。
// ・地面・道・展示の 床・かげ は 1まいの 絵に まとめて描く（軽くするため）。建物・飾り・さく・動物・お客さんは 奥から 手前（z）の じゅんに かさねる
// ・展示の 中を 動物が 歩き、お客さんは 町の 入口（x=0 の へり）の 道から 入って 道を 歩き、展示の 前で 立ちどまって ♡♪ や コイン
// ・1本指で すべらせる、2本指で ひろげる・ちぢめる。もようがえ：うごかす・みち・つちみち・せんろ・けす・かざり・てんじ
// ルールは logic/town.js（置ける所・道の つながり）と logic/zoo.js（展示）。絵は ui/isoart.js
import { store } from "../store.js";
import { W, H, text, img, kidFace, floatText, panel, creature, coin, card, guide, burst, pixelFrame } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { ambient } from "../ui/ambient.js";
import * as A from "../ui/isoart.js";
import { Pix, PX, pixelCreature } from "../ui/pixel.js";
import { shopLevel, species, needs, shineOf, stage } from "../logic/shop.js";
import { boardFor, canFulfill } from "../logic/board.js";
import { mapOf, townSpec, isBuilding, moveTownItem, buyTownDecor, removeTownDecor, canPlaceAt, townCols, roadNet, exhibitOpen } from "../logic/town.js";
import { TOWN_TOP, TOWN_DECOR, EXHIBIT_SIZE } from "../data/town.js";
import { SHINES } from "../data/shine.js";
import { MORPHS } from "../data/morphs.js";
import { LEVELS, ninki, EXHIBITS, FACILITIES, buildExhibit, canBuildMore, zooVisitors, ZOO_FEE } from "../logic/zoo.js";
import { prizeReady } from "../logic/prize.js";
import { eventOn, presentReady, takePresent } from "../logic/events.js";
import { season } from "../logic/time.js";
import { Zoo } from "./Zoo.js";
import { sfx } from "../sound/sfx.js";
import { bgm } from "../sound/bgm.js";

const FLAT = new Set(["road", "rail", "dirt", "gravel"]);
const TOOLS = [["move", "うごかす", "brush"], ["road", "みち", "chart"], ["dirt", "つちみち", "mountain"], ["rail", "せんろ", "truck"], ["erase", "けす", "no"], ["decor", "かざり", "plant"], ["exhibit", "てんじ", "park"], ["done", "おわる", "back"]];
const TOPD = 70; // 地面の 絵の 上の ゆとり（おくの 高い 建物が はみ出す ぶん。ドット）
const zOf = (x, y, w, h) => x + y + (w + h) / 2; // かさねる じゅん（人は マスの まんなか＝x+y+1。くわしくは docs/town-v3.md）

export class Town extends Phaser.Scene {
  constructor() { super("Town"); }
  create({ visit, build } = {}) {
    bgm.play("town");
    this.pixelUI = true;
    this.edit = false; this.tool = "move"; this.placing = null;
    // 兄弟の 町を 見に来たとき（えき の でんしゃ から）：見るだけ。お店・どうぶつえん・すいぞくかん には 入れる
    if (visit && visit !== store.family.current) { store.visitFrom = store.visitFrom || store.family.current; store.family.current = visit; }
    this.visit = !!store.visitFrom;
    this.N = townCols(store.shop);
    this.cameras.main.setBackgroundColor("#9fdcff");
    this.world = this.add.container(0, TOWN_TOP);
    this.groundIm = this.add.image(0, 0, "__DEFAULT").setOrigin(0); // 地面・道・展示の 床（redraw で 描く）
    this.gridL = this.add.container(); this.objL = this.add.container(); this.tagL = this.add.container(); this.fxL = this.add.container();
    this.world.add([this.groundIm, this.gridL, this.objL, this.tagL, this.fxL]);
    const v = this.registry.get("townView");
    if (v && v.N === this.N) this.setView(v.x, v.y, v.z); else this.homeView();
    ambient(this, { depth: 50 }); // 時刻と天気の色（画面に固定）
    topBar(this, { back: false });
    this.levelText = text(this, 1040, 112, "", 20, "#ffffff", { stroke: "#2e4a1e", strokeThickness: 6 }).setDepth(70);
    this.makeButtons();
    this.eventDeco();
    this.visitors = [];
    this.redraw();
    this.setupInput();
    this.time.addEvent({ delay: 1200, loop: true, callback: () => this.spawnVisitor() });
    for (let i = 0; i < 8; i++) this.time.delayedCall(i * 250, () => this.spawnVisitor(true));
    if (this.visit) {
      this.pxButton(W - 60, 42, "back", "えきへ", () => { store.family.current = store.visitFrom; store.visitFrom = null; store.persist(); this.scene.start("Station"); });
      text(this, 40, 112, `${store.kid?.name ? store.kid.name + "の " : ""}まち（みるだけ）`, 22, "#ffffff", { stroke: "#2e4a1e", strokeThickness: 6 }).setOrigin(0, 0.5).setDepth(70);
    } else this.time.delayedCall(300, () => this.showSummary());
    if (build) this.time.delayedCall(200, () => { this.setEdit(true); this.exhibitMenu2(build); });
  }

  // ---- マスと 画面の 位置 ----
  // dot：マス (x, y) の いちばん おくの かど → 地面の 絵の 中の ドット。lc：→ world の 中の ピクセル
  dot(x, y) { return [this.N * 12 + 6 + (x - y) * 12, TOPD + (x + y) * 6]; }
  lc(x, y) { const [a, b] = this.dot(x, y); return [a * PX, b * PX]; }
  get worldW() { return (this.N * 24 + 12) * PX; }
  get worldH() { return (TOPD + this.N * 12 + 16) * PX; }
  fitZoom() { return Math.min(W / this.worldW, (H - TOWN_TOP) / this.worldH); }
  fitView() { const z = this.fitZoom(); this.setView(0, 0, z); }
  // はじめに 見る 所：大通りの 十字路の あたりを 少し 大きく
  homeView() { const z = Math.max(this.fitZoom(), 1.5), [a, b] = this.lc(10, 9); this.setView(W / 2 - a * z, TOWN_TOP + (H - TOWN_TOP) / 2 - b * z, z); }
  setView(x, y, z) {
    const ww = this.worldW * z, wh = this.worldH * z, vh = H - TOWN_TOP;
    this.zoom = z;
    this.world.setScale(z);
    this.tagL?.setVisible(z >= 1); // 名札は 大きく 見るときだけ（町ぜんたいでは かさなって よめない）
    this.world.x = ww <= W ? (W - ww) / 2 : Phaser.Math.Clamp(x, W - ww, 0);
    this.world.y = wh <= vh ? TOWN_TOP + (vh - wh) / 2 : Phaser.Math.Clamp(y, TOWN_TOP + vh - wh, TOWN_TOP);
    this.registry.set("townView", { x: this.world.x, y: this.world.y, z, N: this.N });
  }
  // 画面の 点 → マス（ひし形の 中で 切りすて）
  toCell(p) {
    const lx = (p.x - this.world.x) / this.zoom / PX - (this.N * 12 + 6), ly = (p.y - this.world.y) / this.zoom / PX - TOPD, a = lx / 12, b = ly / 6;
    return [Math.floor((a + b) / 2), Math.floor((b - a) / 2)];
  }
  cellCenter(x, y, w = 1, h = 1) { const [a, b] = this.lc(x + w / 2, y + h / 2); return [this.world.x + a * this.zoom, this.world.y + b * this.zoom]; }
  diamond(g, x, y, w, h) { g.beginPath(); [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].forEach(([a, b], i) => { const [px, py] = this.lc(a, b); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); return g; }

  setupInput() {
    this.input.addPointer(1);
    this.input.on("pointerdown", (p, over) => {
      const ps = this.input.manager.pointers.filter(q => q.isDown);
      if (ps.length >= 2) { const [a, b] = ps; this.pinch = { d: Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y), z: this.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, wx: this.world.x, wy: this.world.y }; this.pan = null; return; }
      if (p.y < 84 || over.length) return; // ボタンの 上は のぞく
      this.pan = { x: p.x, y: p.y, wx: this.world.x, wy: this.world.y, moved: 0 };
      if (this.edit) this.editDown(p);
    });
    this.input.on("pointermove", p => {
      if (this.pinch) {
        const ps = this.input.manager.pointers.filter(q => q.isDown);
        if (ps.length < 2) return;
        const [a, b] = ps, d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y), z = Phaser.Math.Clamp(this.pinch.z * d / this.pinch.d, this.fitZoom() * 0.95, 2.4);
        const k = z / this.pinch.z; // ゆびの まんなかを 中心に
        this.setView(this.pinch.mx - (this.pinch.mx - this.pinch.wx) * k, this.pinch.my - (this.pinch.my - this.pinch.wy) * k, z);
        return;
      }
      if (!this.pan || !p.isDown) return;
      this.pan.moved = Math.max(this.pan.moved, Math.hypot(p.x - this.pan.x, p.y - this.pan.y));
      if (this.edit && this.editMove(p)) return; // 動かす・道を ひく あいだは すべらせない
      if (this.pan.moved > 10) this.setView(this.pan.wx + p.x - this.pan.x, this.pan.wy + p.y - this.pan.y, this.zoom);
    });
    this.input.on("pointerup", p => {
      if (this.pinch) { if (!this.input.manager.pointers.some(q => q.isDown)) this.pinch = null; return; }
      const pan = this.pan; this.pan = null;
      if (!pan) return;
      if (this.edit) { this.editUp(p, pan); return; }
      if (pan.moved > 10) return;
      const hit = this.pick(p);
      hit ? this.tapItem(hit) : this.tap(...this.toCell(p));
    });
  }
  zoomBy(k) { const cx = W / 2, cy = TOWN_TOP + (H - TOWN_TOP) / 2, z = Phaser.Math.Clamp(this.zoom * k, this.fitZoom() * 0.95, 2.4), r = z / this.zoom; this.setView(cx - (cx - this.world.x) * r, cy - (cy - this.world.y) * r, z); }
  // ゆびの 下の 絵（建物・飾り）を 手前から さがす。たかい 建物の 屋根を おしても その 建物に なる
  pick(p) {
    const wx = (p.x - this.world.x) / this.zoom, wy = (p.y - this.world.y) / this.zoom;
    for (let i = this.objL.list.length - 1; i >= 0; i--) {
      const o = this.objL.list[i];
      if (!o.item || !o.texture) continue;
      const lx = wx - o.x, ly = wy - o.y;
      if (lx < 0 || ly < 0 || lx >= o.width || ly >= o.height) continue;
      if (this.textures.getPixelAlpha(Math.floor(lx), Math.floor(ly), o.texture.key) > 0) return o.item;
    }
    return null;
  }

  // ---- ボタン（ドット風・画面に 固定）----
  pxButton(x, y, icon, label, fn, w = 92, h = 64) {
    const c = this.add.container(x, y).setDepth(600);
    const g = pixelFrame(this.add.graphics(), -w / 2, -h / 2, w, h, 0xfff1c9, 0x5a3a24);
    c.add([g, img(this, 0, -8, icon, 34), text(this, 0, 20, label, 13, "#4a2c17")]);
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on("pointerdown", () => { c.setScale(0.92); });
    c.on("pointerup", () => { c.setScale(1); sfx.pop(); fn(); });
    c.on("pointerout", () => c.setScale(1));
    c.bg = g; c.bw = w; c.bh = h;
    return c;
  }
  makeButtons() {
    if (this.visit) return;
    this.editBtn = this.pxButton(W - 60, 42, "brush", "もようがえ", () => this.setEdit(!this.edit));
    // ひろげる・ちぢめる・ぜんぶ見る（上の帯の 中。町を かくさない）
    [["plus", "おおきく", () => this.zoomBy(1.25)], ["no", "ちいさく", () => this.zoomBy(0.8)], ["park", "ぜんぶ", () => this.fitView()]].forEach(([icon, label, fn], i) => {
      this.zoomBtns = [...(this.zoomBtns || []), this.pxButton(870 + i * 84, 42, this.textures.exists(icon) ? icon : "star", label, fn, 78, 64)];
    });
    // もようがえの 道具（下）
    this.toolbar = this.add.container(0, 0).setDepth(600).setVisible(false);
    TOOLS.forEach(([id, label, icon], i) => {
      const b = this.pxButton(W / 2 - 3.5 * 104 + i * 104, H - 44, this.textures.exists(icon) ? icon : "star", label, () => this.pickTool(id), 96, 68);
      b.toolId = id;
      this.toolbar.add(b);
    });
    this.hintText = text(this, W / 2, H - 98, "", 18, "#ffffff", { stroke: "#2e4a1e", strokeThickness: 6 }).setDepth(600);
  }
  setEdit(on) {
    this.edit = on; this.placing = null;
    this.toolbar?.setVisible(on);
    this.pickTool("move", true);
    if (!on) this.hint("");
    this.redraw();
  }
  hint(s) { this.hintText?.setText(s); }
  pickTool(id, quiet = false) {
    if (id === "done") { this.setEdit(false); return; }
    if (id === "decor") { this.decorMenu(); return; }
    if (id === "exhibit") { this.exhibitMenu2(); return; }
    this.tool = id; this.placing = null;
    if (!quiet || this.edit) this.hint({ move: "ゆびで おして うごかせるよ", road: "ゆびで なぞると みちが できるよ（1マス 1コイン）", dirt: "ゆびで なぞると つちの みち（1マス 1コイン）", rail: "ゆびで なぞると せんろ（1マス 2コイン）", erase: "けしたい かざりや みちを おしてね" }[id]);
    this.toolbar?.list.forEach(b => { b.bg.clear(); pixelFrame(b.bg, -b.bw / 2, -b.bh / 2, b.bw, b.bh, b.toolId === id ? 0xffe28a : 0xfff1c9, 0x5a3a24); });
  }

  // ---- 描く ----
  redraw() {
    if (this.N !== townCols(store.shop)) { this.N = townCols(store.shop); this.homeView(); }
    this.map = mapOf(store.shop);
    this.net = roadNet(store.shop);
    this.bakeGround();
    for (const v of this.visitors) this.objL.remove(v.im); // お客さんは のこす
    this.objL.removeAll(true); this.fxL.removeAll(true); this.tagL.removeAll(true); this.gridL.removeAll(true);
    for (const v of this.visitors) this.objL.add(v.im);
    this.animals = [];
    for (const it of this.map.items) if (!FLAT.has(it.kind)) this.drawItem(it);
    if (this.edit) { // マス目
      const g = this.add.graphics().lineStyle(2, 0xffffff, 0.35);
      for (let i = 0; i <= this.N; i++) { g.lineBetween(...this.lc(i, 0), ...this.lc(i, this.N)); g.lineBetween(...this.lc(0, i), ...this.lc(this.N, i)); }
      this.gridL.add(g);
    }
    this.levelText.setText(`おみせ レベル ${shopLevel(store.shop)}`);
    if (this.editBtn) { this.editBtn.bg.clear(); pixelFrame(this.editBtn.bg, -46, -32, 92, 64, this.edit ? 0xffe28a : 0xfff1c9, 0x5a3a24); }
    this.showGuide();
  }
  // 地面（季節）・道・せんろ・つち・じゃり・展示の 床・建物の かげ を 1まいの 絵に
  bakeGround() {
    const sea = season(store.shop.startedAt, Date.now()), N = this.N, p = new Pix(N * 24 + 12, TOPD + N * 12 + 16), P = (x, y) => this.dot(x, y);
    const flats = {};
    for (const it of this.map.items) if (FLAT.has(it.kind)) flats[it.x + "," + it.y] = it.kind;
    A.paintGround(p, P, N, (x, y) => flats[x + "," + y] || "g", sea);
    for (const it of this.map.items) {
      const sp = townSpec(it.kind);
      if (it.kind.startsWith("ex_")) A.paintExhibit(p, P, it.kind.slice(3), it.x, it.y, sp.w, sp.h);
      else if (isBuilding(it.kind)) A.paintShadow(p, P, it.x, it.y, sp.w, sp.h, it.kind === "farm" ? 16 : 12);
    }
    this.groundIm.setTexture("__DEFAULT");
    if (this.textures.exists("town_ground")) this.textures.remove("town_ground");
    this.textures.addCanvas("town_ground", p.canvas(PX));
    this.groundIm.setTexture("town_ground");
  }
  // 絵を おく：マス (x, y) の かど に 絵の (ax, ay) を あわせる
  put(s, x, y, z, item = null) {
    const [px, py] = this.lc(x, y), im = this.add.image(px - s.ax * PX, py - s.ay * PX, s.key).setOrigin(0);
    im.z = z; im.item = item;
    this.objL.add(im);
    return im;
  }
  drawItem(it) {
    const sp = this.specOf(it.kind), z = zOf(it.x, it.y, sp.w, sp.h);
    if (it.kind.startsWith("ex_")) { this.drawExhibit(it, sp); return; }
    const [fx, fy] = this.lc(it.x + sp.w, it.y + sp.h); // いちばん 手前の かど
    if (isBuilding(it.kind)) {
      const im = this.put(A.buildingSprite(this, it.kind, store.shop[it.kind]?.level ?? 0), it.x, it.y, z, it); // どうぶつえん・すいぞくかんは だんかいで 絵が かわる
      const [cx] = this.lc(it.x + sp.w / 2, it.y + sp.h / 2);
      if (it.kind === "shop") this.fxL.add(kidFace(this, im.x + im.width - 26, im.y + 30, store.family.current, store.kid, 30));
      this.tagL.add(this.tag(cx, fy + 6, sp.icon, sp.name));
      if (!this.visit && this.badge(it.kind)) {
        const b = this.add.container(cx, im.y + 8);
        b.add([this.add.rectangle(0, 0, 24, 24, 0xe2553d).setStrokeStyle(3, 0xffffff), text(this, 0, 1, "!", 18, "#ffffff")]);
        this.tweens.add({ targets: b, y: b.y - 8, duration: 450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.fxL.add(b);
      }
      return;
    }
    const s = A.decorSprite(this, it.kind, sp.w, sp.h);
    if (s && A.decorOne(it.kind) && !it.kind.startsWith("p_")) { this.put(s, it.x + 0.5, it.y + 0.5, z, it); return; }
    if (s) { this.put(s, it.x, it.y, z, it); }
    const [cx, cy] = this.lc(it.x + sp.w / 2, it.y + sp.h / 2);
    if (sp.emoji) { const t = text(this, cx, cy - 12, sp.emoji, 30); t.z = z; t.item = it; this.objL.add(t); return; }
    if (it.kind.startsWith("p_")) { const t = img(this, cx, cy - 34, sp.icon, 44 + Math.min(sp.w, sp.h) * 10); t.z = z + 0.01; this.objL.add(t); } // ごほうび：石の 台に しるし
  }
  drawExhibit(it, sp) {
    const ex = store.shop[it.f].exhibits.find(e => e.id === it.id), type = it.kind.slice(3), water = A.WATER_EX.has(type), open = exhibitOpen(store.shop, ex, this.net);
    // 手前の さく（1マスずつ）
    for (let i = 0; i < sp.w; i++) this.put(A.fenceSeg(this, type, "L"), it.x + i, it.y + sp.h, it.x + i + 0.5 + it.y + sp.h, it);
    for (let j = 0; j < sp.h; j++) this.put(A.fenceSeg(this, type, "R"), it.x + sp.w, it.y + j + 1, it.x + sp.w + it.y + j + 0.5, it);
    ex.animals.slice(0, 8).forEach((a, i) => {
      const src = this.textures.exists("an_" + a.kind) ? "an_" + a.kind : this.textures.exists("aq_" + a.kind) ? "aq_" + a.kind : null;
      const big = species(a.kind).space >= 8 ? 24 : species(a.kind).space >= 4 ? 18 : water ? 11 : 14;
      const k = src && pixelCreature(this, src, Math.round(big * (stage(a, Date.now()) === "baby" ? 0.65 : 1)));
      if (!k) return;
      const m = { x0: it.x + 0.35, y0: it.y + 0.35, x1: it.x + sp.w - 0.35, y1: it.y + sp.h - 0.35, water, t: Math.random() * 3, vx: 0, vy: 0 };
      m.x = m.x0 + ((i * 0.37) % 1) * (m.x1 - m.x0); m.y = m.y0 + ((i * 0.61 + 0.2) % 1) * (m.y1 - m.y0);
      m.im = this.add.image(0, 0, k).setOrigin(0.5, 0.9);
      if (shineOf(a)) this.tweens.add({ targets: m.im, alpha: 0.6, duration: 400, yoyo: true, repeat: -1 }); // キラキラ
      this.objL.add(m.im);
      this.placeMover(m);
      this.animals.push(m);
    });
    const [cx, cy] = this.lc(it.x + sp.w / 2, it.y + sp.h / 2), [, fy] = this.lc(it.x + sp.w, it.y + sp.h);
    if (!open && !this.visit) { // 道に つながっていない：おしらせ
      const t = text(this, cx, cy, "みちに つなごう", 13, "#ffffff", { stroke: "#c0392b", strokeThickness: 5 });
      this.tweens.add({ targets: t, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
      this.fxL.add(t);
    }
    this.tagL.add(this.tag(cx, fy + 4, FACILITIES[it.f].icon, ex.animals[0] ? species(ex.animals[0].kind).name : EXHIBITS[type].name, true));
  }
  // うごく物（動物・お客さん）の 絵を マスの 位置へ（足もと＝マスの 中の 点）
  placeMover(m) { const [px, py] = this.lc(m.x, m.y); m.im.setPosition(px, py); m.im.z = m.x + m.y; }
  // 名前の 札（ドット風。小さめ）
  tag(x, y, icon, label, small = false) {
    const c = this.add.container(x, y);
    const t = text(this, 9, 0, label, small ? 11 : 13, "#4a2c17"), w = t.width + 30, h = small ? 18 : 22;
    c.add([pixelFrame(this.add.graphics(), -w / 2, -h / 2, w, h, 0xfffaf0, 0x7a5a3a), img(this, -w / 2 + 11, 0, icon, small ? 14 : 18), t.setX(-w / 2 + 22 + t.width / 2)]);
    c.setAlpha(0.92);
    return c;
  }

  // ---- うごき（動物・お客さん）----
  update(_, dtMs) {
    const d = Math.min(dtMs / 1000, 0.05);
    for (const a of this.animals || []) {
      if (!a.im.active) continue;
      a.t -= d;
      if (a.t < 0) { a.t = 1 + Math.random() * 3; const still = Math.random() < 0.3; a.vx = still ? 0 : (Math.random() - 0.5) * (a.water ? 0.9 : 0.6); a.vy = still ? 0 : (Math.random() - 0.5) * (a.water ? 0.9 : 0.6); }
      a.x = Phaser.Math.Clamp(a.x + a.vx * d, a.x0, a.x1); a.y = Phaser.Math.Clamp(a.y + a.vy * d, a.y0, a.y1);
      this.placeMover(a);
      if (a.water) a.im.y += Math.sin(this.time.now / 300 + a.x * 3) * 2;
      if (a.vx - a.vy) a.im.setFlipX(a.vx - a.vy > 0); // 画面の 右へ うごくとき 右むき
    }
    for (const v of this.visitors || []) this.stepVisitor(v, d);
    this.objL.list.sort((a, b) => a.z - b.z); // おくから 手前へ
  }
  // お客さん：町の 入口（x=0 の へり）の 道から 入って、道を 歩く。となりが 展示なら 立ちどまって ♡♪。やがて 入口へ 帰る
  spawnVisitor(anywhere = false) {
    const total = zooVisitors(store.shop) + 6, max = Math.min(30, 6 + Math.round(total / 10));
    if (!this.net || this.visitors.length >= max || !this.net.size) return;
    const cells = [...this.net].map(k => k.split(",").map(Number)), gate = cells.filter(([x]) => x === 0);
    const start = anywhere || !gate.length ? cells[Math.floor(Math.random() * cells.length)] : gate[Math.floor(Math.random() * gate.length)];
    const vId = Math.floor(Math.random() * 42), s = A.personSprite(this, vId, 0, false);
    for (const f of [0, 1]) for (const b of [false, true]) A.personSprite(this, vId, f, b);
    const im = this.add.image(0, 0, s.key).setOrigin((s.ax + 0.5) * PX / 24, (s.ay + 0.5) * PX / 32);
    this.objL.add(im);
    const v = { im, vId, x: start[0] + 0.5, y: start[1] + 0.5, cx: start[0], cy: start[1], tx: start[0], ty: start[1], prev: null, wait: 0, f: 0, ft: 0, life: 40 + Math.random() * 40, back: false };
    this.placeMover(v);
    this.visitors.push(v);
  }
  stepVisitor(v, d) {
    if (!v.im.active) return;
    v.life -= d;
    if (v.wait > 0) { v.wait -= d; if (v.f) { v.f = 0; v.im.setTexture(`iso_p_${v.vId}_0_${+v.back}`); } return; }
    const gx = v.tx + 0.5, gy = v.ty + 0.5, dx = gx - v.x, dy = gy - v.y, dist = Math.hypot(dx, dy), sp = 0.75 * d;
    if (dist > sp) {
      v.x += (dx / dist) * sp; v.y += (dy / dist) * sp; this.placeMover(v);
      v.back = dx < 0 || dy < 0; v.im.setFlipX(dx > 0 || dy < 0); // 画面の 右へ 行くとき 右むき
      v.ft += d; if (v.ft > 0.2) { v.ft = 0; v.f ^= 1; } v.im.setTexture(`iso_p_${v.vId}_${v.f}_${+v.back}`);
      return;
    }
    v.prev = [v.cx, v.cy]; v.cx = v.tx; v.cy = v.ty;
    if ((v.life < 0 && v.cx === 0) || !this.net.has(v.cx + "," + v.cy)) { v.im.destroy(); this.visitors = this.visitors.filter(q => q !== v); return; } // 帰る（道が けされたら きえる）
    // となりに 展示が あれば ときどき 立ちどまる
    const ex = this.map.items.find(i => i.kind.startsWith("ex_") && this.adjacent(i, v.cx, v.cy));
    if (ex && Math.random() < 0.35) { v.wait = 1.2 + Math.random(); this.bubble(v.im.x, v.im.y - 40, Math.random() < 0.3 ? "coin" : Math.random() < 0.5 ? "♡" : "♪"); }
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [v.cx + a, v.cy + b]).filter(([x, y]) => this.net.has(x + "," + y));
    let opts = nb.filter(([x, y]) => !v.prev || x !== v.prev[0] || y !== v.prev[1]);
    if (v.life < 0) { const home = opts.filter(([x]) => x < v.cx); if (home.length) opts = home; } // 帰りは 入口へ
    const pool = opts.length ? opts : nb, next = pool[Math.floor(Math.random() * pool.length)];
    if (next) { v.tx = next[0]; v.ty = next[1]; }
  }
  adjacent(it, x, y) { const s = townSpec(it.kind); return x >= it.x - 1 && x <= it.x + s.w && y >= it.y - 1 && y <= it.y + s.h && !(x >= it.x && x < it.x + s.w && y >= it.y && y < it.y + s.h); }
  // ふきだし（♡・♪・コイン）。コインの ときは「+」の 数字も うかぶ
  bubble(x, y, what) {
    const c = this.add.container(x, y);
    c.add(pixelFrame(this.add.graphics(), -14, -13, 28, 24, 0xffffff, 0x2a1a10));
    c.add(what === "coin" ? img(this, 0, -1, "coin", 18) : text(this, 0, -1, what, 16, what === "♡" ? "#e2553d" : "#3f8fd8"));
    this.fxL.add(c);
    this.tweens.add({ targets: c, y: y - 16, alpha: 0, delay: 700, duration: 700, onComplete: () => c.destroy() });
    if (what === "coin") {
      const t = text(this, x, y - 24, "+" + ZOO_FEE, 18, "#ffe040", { stroke: "#5a3a10", strokeThickness: 5 });
      this.fxL.add(t);
      this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
    }
  }

  // ---- ふだんの タップ ----
  itemAt(cx, cy) {
    const hits = this.map.items.filter(i => { const s = townSpec(i.kind); return cx >= i.x && cx < i.x + s.w && cy >= i.y && cy < i.y + s.h; });
    return hits.find(i => !FLAT.has(i.kind)) || hits[0] || null;
  }
  tap(cx, cy) { const it = this.itemAt(cx, cy); if (it) this.tapItem(it); }
  tapItem(it) {
    if (it.kind.startsWith("ex_")) { // 展示：小窓（どうぶつえんの 画面と 同じ もの）
      sfx.pop();
      const ex = store.shop[it.f].exhibits.find(e => e.id === it.id);
      if (this.visit) { floatText(this, ...this.cellCenter(it.x, it.y), ex.animals[0] ? species(ex.animals[0].kind).name : "からっぽ", "#ffffff"); return; }
      this.f = it.f; this.exhibitMenu(ex);
      return;
    }
    if (!isBuilding(it.kind)) return;
    sfx.pop();
    const sp = townSpec(it.kind);
    if (this.visit) {
      if (it.kind === "shop") this.scene.start("Shop", { visit: store.family.current });
      else if (it.kind === "zoo" || it.kind === "aqua") this.scene.start("Zoo", { visit: store.family.current, f: it.kind });
      else floatText(this, ...this.cellCenter(it.x, it.y), "みるだけ だよ", "#ffffff");
      return;
    }
    this.scene.start(sp.to, sp.data);
  }

  // ---- もようがえ ----
  editDown(p) {
    const [cx, cy] = this.toCell(p);
    this.drag = null;
    if (this.placing) return;
    if (this.tool === "move") {
      const it = this.pick(p) || this.itemAt(cx, cy);
      if (it && !FLAT.has(it.kind)) this.drag = { it, dx: cx - it.x, dy: cy - it.y, ghost: null };
    } else if (["road", "dirt", "rail"].includes(this.tool)) { this.painted = new Set(); this.paint(cx, cy); this.drag = { paint: true }; }
  }
  editMove(p) {
    if (!this.drag) return false;
    const [cx, cy] = this.toCell(p);
    if (this.drag.paint) { this.paint(cx, cy); return true; }
    const { it } = this.drag, s = townSpec(it.kind), nx = cx - this.drag.dx, ny = cy - this.drag.dy;
    if (!this.drag.ghost) { this.drag.ghost = this.add.graphics(); this.fxL.add(this.drag.ghost); }
    const ok = canPlaceAt(store.shop, nx, ny, s.w, s.h, it.id);
    this.drag.ghost.clear().fillStyle(ok ? 0x9fd3ff : 0xe2553d, 0.5).lineStyle(3, 0xffffff, 1);
    this.diamond(this.drag.ghost, nx, ny, s.w, s.h).fillPath().strokePath();
    this.drag.to = [nx, ny];
    return true;
  }
  editUp(p, pan) {
    const [cx, cy] = this.toCell(p), drag = this.drag; this.drag = null;
    if (drag?.paint) { this.redraw(); return; }
    if (drag?.ghost) {
      drag.ghost.destroy();
      if (drag.to) { const r = moveTownItem(store.shop, drag.it.id, ...drag.to); if (r.ok) { store.setShop(r.shop); sfx.pop(); } else { sfx.no(); floatText(this, p.x, p.y, "そこには おけないよ", "#ffffff"); } }
      this.redraw(); return;
    }
    if (pan.moved > 10) return;
    if (this.placing) { this.place(cx, cy); return; }
    const it = this.itemAt(cx, cy);
    if (this.tool === "erase" && it) {
      if (isBuilding(it.kind) || it.kind.startsWith("ex_")) { sfx.no(); floatText(this, p.x, p.y, it.kind.startsWith("ex_") ? "てんじは なかを からに すると こわせるよ" : "たてものは けせないよ", "#ffffff"); return; }
      const r = removeTownDecor(store.shop, it.id);
      if (r.ok) { store.setShop(r.shop); sfx.pop(); this.redraw(); }
      return;
    }
    if (this.tool === "move" && it && TOWN_DECOR[it.kind] && !FLAT.has(it.kind)) this.decorItemMenu(it);
  }
  paint(cx, cy) {
    const k = cx + "," + cy;
    if (this.painted.has(k)) return;
    this.painted.add(k);
    const r = buyTownDecor(store.shop, this.tool, cx, cy);
    if (r.ok) { store.setShop(r.shop); this.map = mapOf(store.shop); const g = this.diamond(this.add.graphics().fillStyle(0xffffff, 0.6), cx, cy, 1, 1).fillPath(); this.fxL.add(g); this.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() }); }
    else if (r.reason === "nomoney") this.hint("おかねが たりないよ");
  }
  place(cx, cy) {
    const pl = this.placing;
    const r = pl.decor ? buyTownDecor(store.shop, pl.decor, cx, cy) : buildExhibit(store.shop, pl.f, pl.type, cx, cy);
    if (!r.ok) { sfx.no(); floatText(this, ...this.cellCenter(cx, cy), { nomoney: "おかねが たりないよ", noroom: "そこには おけないよ", max: "もう たてられないよ（おおきく しよう）" }[r.reason || r.why] || "おけないよ", "#ffffff"); return; }
    store.setShop(r.shop); sfx.coin(); this.placing = null; this.hint("おいたよ！ ゆびで おして うごかせるよ"); this.redraw();
  }
  decorMenu() {
    const P2 = panel(this, "かざりを えらんで、まちを おしてね", { w: 1100, h: 560 });
    Object.entries(TOWN_DECOR).filter(([k, d]) => !d.prize && !d.event && !FLAT.has(k)).forEach(([k, d], i) => {
      const x = W / 2 - 440 + (i % 6) * 176, y = P2.top + 150 + Math.floor(i / 6) * 150;
      card(this, P2.L, x, y, 160, 136, () => { P2.close(); this.placing = { decor: k }; this.hint(`${d.name}を おく ところを おしてね`); });
      const pk = A.decorSprite(this, k, d.w, d.h);
      P2.L.add([pk ? this.add.image(x, y - 22, pk.key).setScale(Math.min(1.4, 120 / this.textures.get(pk.key).getSourceImage().width)) : img(this, x, y - 22, d.icon, 56), text(this, x, y + 30, d.name, 15, "#4a2c17"), text(this, x, y + 52, coin(d.price) + (d.appeal ? ` にんき+${d.appeal}` : ""), 13, "#c0392b")]);
    });
  }
  // 展示を たてる（どうぶつえん・すいぞくかん の 種類）
  exhibitMenu2(only = null) {
    const P2 = panel(this, "てんじを えらんで、まちを おしてね", { w: 1120, h: 470 });
    const list = ["zoo", "aqua"].filter(f => !only || f === only).flatMap(f => FACILITIES[f].types.map(t => [f, t]));
    list.forEach(([f, type], i) => {
      const x = W / 2 + (i - (list.length - 1) / 2) * 210, y = P2.top + 230, e = EXHIBITS[type], more = canBuildMore(store.shop, f);
      card(this, P2.L, x, y, 196, 270, () => {
        if (!more) { sfx.no(); floatText(this, x, y - 150, `${FACILITIES[f].name}を おおきく すると たてられるよ`, "#ffffff"); return; }
        P2.close(); this.placing = { f, type }; this.hint(`${e.name}を たてる ところを おしてね（みちに となりあう ところ）`);
      }, more ? 0xffffff : 0xe8e0d0);
      const [ew, eh] = EXHIBIT_SIZE[type];
      const ei = A.exhibitIcon(this, type, ew, eh), src = this.textures.get(ei.key).getSourceImage();
      P2.L.add([this.add.image(x, y - 50, ei.key).setScale(Math.min(170 / src.width, 110 / src.height)),
        text(this, x, y + 40, e.name, 15, "#4a2c17", { wordWrap: { width: 180, useAdvancedWrap: true } }), text(this, x, y + 78, coin(e.cost), 16, "#c0392b"),
        text(this, x, y + 104, `${FACILITIES[f].name} あと ${LEVELS[store.shop[f].level].slots - store.shop[f].exhibits.length}`, 12, "#7a6a5a")]);
    });
  }
  decorItemMenu(it) {
    const d = TOWN_DECOR[it.kind];
    const P2 = panel(this, d.name, { w: 600, h: 300 });
    card(this, P2.L, W / 2, H / 2 + 30, 340, 80, () => {
      const r = removeTownDecor(store.shop, it.id);
      if (r.ok) { store.setShop(r.shop); sfx.pop(); P2.close(); this.redraw(); }
    }, 0xffe2d8);
    P2.L.add(text(this, W / 2, H / 2 + 30, d.prize ? "しまう（ずかん から また おけるよ）" : d.event ? "しまう（なくなるよ）" : `しまう（+${coin(Math.floor(d.price / 2))}）`, 20, "#a0522d"));
  }

  // ---- 行事・案内・しるし ----
  eventDeco() {
    const now = Date.now(), e = eventOn(now);
    if (!e) return;
    const tag = text(this, 330, 112, `${e.emoji} きょうは ${e.name}！`, 22, "#ffffff", { stroke: "#c0392b", strokeThickness: 7 }).setDepth(70);
    this.tweens.add({ targets: tag, scale: 1.06, duration: 700, yoyo: true, repeat: -1 });
    const FX = { snow: "❄", petal: "🌸", star: "⭐", fire: "✨", leaf: "🍁" }[e.fx];
    if (FX) for (let i = 0; i < 14; i++) {
      const f = text(this, (i * 97) % W, 80, FX, 18 + (i % 3) * 6).setDepth(52).setAlpha(0.85);
      const fall = () => { f.setPosition(Math.random() * W, 90); this.tweens.add({ targets: f, y: H + 20, x: f.x + (Math.random() * 160 - 80), angle: 360, duration: 6000 + Math.random() * 5000, onComplete: fall }); };
      this.time.delayedCall(i * 500, fall);
    }
    if (!presentReady(store.shop, now) || store.visitFrom) return;
    const box = this.pxButton(540, 112, "gift", "プレゼント", () => {
      const r = takePresent(store.shop, Date.now());
      if (!r.ok) return;
      store.setShop(r.shop); sfx.star(); burst(this, 540, 112, "sparkles", 12, 40, 140); box.destroy();
      const P2 = panel(this, `${e.name}の プレゼント！`, { w: 700, h: 380 });
      P2.L.add([text(this, W / 2, P2.top + 160, e.emoji, 90), text(this, W / 2, P2.top + 270, `${coin(e.coins)}${e.decor ? ` と ${TOWN_DECOR[e.decor].name}（まちに おいたよ）` : ""}`, 20, "#4a2c17")]);
      this.redraw();
    }).setDepth(70);
    this.tweens.add({ targets: box, y: 100, duration: 450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }
  specOf(kind) {
    const sp = townSpec(kind), fac = store.shop[kind];
    if ((kind === "zoo" || kind === "aqua") && fac) return { ...sp, name: `${LEVELS[fac.level].name} ${sp.name}` };
    return sp;
  }
  // はじめての案内：おせわ → つり → すいぞくかんに みせる → おおきく → うる。指は 町の 上（すべらせても ついてくる）
  showGuide() {
    const shop = store.shop;
    if (this.edit || store.visitFrom) { guide(this, null); return; }
    let target = null;
    const aq = shop.aqua, aqEmpty = aq && !aq.exhibits.some(e => e.animals.length), aqNext = aq && LEVELS[aq.level + 1];
    const first = shopLevel(shop) < 1;
    if (first && this.badge("shop")) target = ["shop", "おせわを しよう"];
    else if (first && !shop.fishCount) target = ["fishing", "つりに いこう"];
    else if (aq && aq.level === 0 && aqEmpty && shop.pens.some(p => p.type === "tank" && p.animals.length)) target = ["aqua", "すいぞくかんに みせよう"];
    else if (aq && aq.level === 0 && ninki(shop, "aqua") >= aqNext.need.aqua && shop.money >= aqNext.cost) target = ["aqua", "おおきく しよう"];
    else if (first && !shop.pens.some(p => p.purpose === "sale") && !(shop.earned > 100)) target = ["shop", "うる こを きめよう"];
    if (!target) { guide(this, null); return; }
    const it = this.map.items.find(i => i.kind === target[0]);
    if (!it) { guide(this, null); return; }
    const sp = townSpec(it.kind), g = guide(this, ...this.lc(it.x + sp.w / 2, it.y + sp.h / 2), target[1], 58);
    if (g) this.world.add(g);
  }
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

  // ---- きのうの まとめ・赤ちゃん・売れた子 ----
  showSummary() {
    const y = store.shop.yesterday;
    if (!y || store.shop.summarySeen === y.date) { this.showBirths(); return; }
    const P2 = panel(this, "きのうの おみせ", { w: 820, h: 460, onClose: () => { store.setShop({ ...store.shop, summarySeen: y.date }); this.showBirths(); } });
    const rows = [["park", "けんがくの おきゃくさん", `${y.visitors + (y.zooVisitors || 0)}にん`], ["store", "うれた こ", `${y.sold}ひき`], ["coin", "はいった おかね", `+${coin(y.income)}`],
      ["cart", "つかった おかね", `-${coin(y.expense)}`], ["heart", "おせわ", `${y.care}かい`], ["pole", "つった さかな", `${y.fish}ひき`]];
    rows.forEach(([icon, label, v], i) => {
      const x = W / 2 - 200 + (i % 2) * 400, yy = H / 2 - 80 + Math.floor(i / 2) * 80;
      P2.L.add([img(this, x - 160, yy, icon, 40), text(this, x - 132, yy, label, 17, "#4a2c17").setOrigin(0, 0.5), text(this, x + 180, yy, v, 22, "#2e7d32").setOrigin(1, 0.5)]);
    });
    const net = y.income - y.expense;
    P2.L.add(text(this, W / 2, H / 2 + 170, net >= 0 ? `きのうは +${coin(net)} の もうけ！` : `きのうは ${coin(-net)} の そん。あしたは がんばろう`, 24, net >= 0 ? "#2e7d32" : "#c0392b"));
  }
  showBirths() {
    const list = store.shop.birthsNew || [];
    if (!list.length) { this.showSales(); return; }
    const P2 = panel(this, "どうぶつえんで あかちゃんが うまれたよ！", { w: 900, h: 480, onClose: () => { store.setShop({ ...store.shop, birthsNew: [] }); this.showSales(); } });
    list.slice(-8).forEach((x, i) => {
      const cx = W / 2 - 300 + (i % 4) * 200, cy = H / 2 - 50 + Math.floor(i / 4) * 150;
      P2.L.add(creature(this, cx, cy - 20, x.kind, 70, x.shine, x.morph ? MORPHS[x.kind]?.list[x.morph]?.paint : null));
      P2.L.add(text(this, cx, cy + 38, (x.shine ? SHINES[x.shine].name + "の " : "") + species(x.kind).name, 15, "#4a2c17", { wordWrap: { width: 180 } }));
    });
    sfx.star();
  }
  showSales() {
    const list = store.shop.salesNew || [];
    if (!list.length) return;
    const total = list.reduce((t, x) => t + x.coins, 0);
    const P2 = panel(this, "おきゃくさんが かっていったよ！", { w: 900, h: 480, onClose: () => store.setShop({ ...store.shop, salesNew: [] }) });
    list.slice(-8).forEach((x, i) => {
      const cx = W / 2 - 300 + (i % 4) * 200, cy = H / 2 - 50 + Math.floor(i / 4) * 150;
      P2.L.add(creature(this, cx, cy - 20, x.kind, 80, x.shine));
      P2.L.add(text(this, cx, cy + 38, (x.shine ? SHINES[x.shine].name + "の " : "") + species(x.kind).name, 15, "#4a2c17", { wordWrap: { width: 180 } }));
      P2.L.add(text(this, cx, cy + 60, "+" + coin(x.coins), 16, "#2e7d32"));
    });
    if (list.length > 8) P2.L.add(text(this, W / 2, H / 2 + 150, `ほか ${list.length - 8}ひき`, 18, "#7a4a1e"));
    P2.L.add(text(this, W / 2, H / 2 + 190, `ぜんぶで +${coin(total)}`, 28, "#2e7d32"));
    sfx.coin();
  }
}
// 展示の 小窓は どうぶつえんの 画面と 同じ ものを 使う（this.f と scene.restart で 町に もどる）
for (const m of ["exhibitMenu", "animalMenu", "babyHint"]) Town.prototype[m] = Zoo.prototype[m];
