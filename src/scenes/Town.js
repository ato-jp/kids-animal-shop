// 自分の町（箱庭）版3（2026-10-16 パパ決定・docs/town-v3.md）：カイロソフト風の ドット絵。1マス32px、建物・飾り・道・展示を 置く。
// ・地面と 道は 1まいの 絵に まとめて描く（軽くするため）。建物・飾り・展示は 奥から 手前の じゅんに ならべる
// ・展示の 中を 動物が 歩き、お客さんは 町の 左はしの 道から 入って 道を 歩き、展示の 前で 立ちどまって ♡ や ♪ を 出す
// ・1本指で すべらせる、2本指で ひろげる・ちぢめる。もようがえ：うごかす・みち・つちみち・せんろ・けす・かざり・てんじ
// ルールは logic/town.js（置ける所・道の つながり）と logic/zoo.js（展示）。絵は ui/pixel.js
import { store } from "../store.js";
import { W, H, text, img, kidFace, floatText, panel, creature, coin, card, guide, burst, pixelFrame } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { ambient } from "../ui/ambient.js";
import * as P from "../ui/pixel.js";
import { shopLevel, species, needs, shineOf, stage } from "../logic/shop.js";
import { boardFor, canFulfill } from "../logic/board.js";
import { mapOf, townSpec, isBuilding, moveTownItem, buyTownDecor, removeTownDecor, canPlaceAt, townCols, roadNet, exhibitOpen } from "../logic/town.js";
import { TOWN_TILE as T, TOWN_TOP, TOWN_ROWS, TOWN_DECOR, EXHIBIT_SIZE } from "../data/town.js";
import { SHINES } from "../data/shine.js";
import { MORPHS } from "../data/morphs.js";
import { LEVELS, ninki, EXHIBITS, FACILITIES, buildExhibit, canBuildMore, zooVisitors } from "../logic/zoo.js";
import { prizeReady } from "../logic/prize.js";
import { eventOn, presentReady, takePresent } from "../logic/events.js";
import { season } from "../logic/time.js";
import { Zoo } from "./Zoo.js";
import { sfx } from "../sound/sfx.js";
import { bgm } from "../sound/bgm.js";

const FLAT = new Set(["road", "rail", "dirt", "gravel"]);
const WALKABLE = new Set(["road", "dirt", "gravel"]);
const TOOLS = [["move", "うごかす", "brush"], ["road", "みち", "chart"], ["dirt", "つちみち", "mountain"], ["rail", "せんろ", "truck"], ["erase", "けす", "no"], ["decor", "かざり", "plant"], ["exhibit", "てんじ", "park"], ["done", "おわる", "back"]];

export class Town extends Phaser.Scene {
  constructor() { super("Town"); }
  create({ visit, build } = {}) {
    bgm.play("town");
    this.pixelUI = true;
    this.edit = false; this.tool = "move"; this.placing = null;
    // 兄弟の 町を 見に来たとき（えき の でんしゃ から）：見るだけ。お店・どうぶつえん・すいぞくかん には 入れる
    if (visit && visit !== store.family.current) { store.visitFrom = store.visitFrom || store.family.current; store.family.current = visit; }
    this.visit = !!store.visitFrom;
    this.cols = townCols(store.shop);
    this.cameras.main.setBackgroundColor("#3f7f3a");
    this.world = this.add.container(0, TOWN_TOP);
    this.groundIm = this.add.image(0, 0, "__DEFAULT").setOrigin(0); // 地面と 道（redraw で 描く）
    this.shadowL = this.add.container(); this.objL = this.add.container(); this.walkL = this.add.container(); this.fxL = this.add.container();
    this.world.add([this.groundIm, this.shadowL, this.objL, this.walkL, this.fxL]);
    const v = this.registry.get("townView") || { x: 0, y: TOWN_TOP, z: 1 };
    this.setView(v.x, v.y, v.z);
    ambient(this, { depth: 50 }); // 時刻と天気の色（画面に固定）
    topBar(this, { back: false });
    this.levelText = text(this, 1040, 112, "", 20, "#ffffff", { stroke: "#2e4a1e", strokeThickness: 6 }).setDepth(70);
    this.makeButtons();
    this.eventDeco();
    this.visitors = [];
    this.redraw();
    this.setupInput();
    this.time.addEvent({ delay: 1200, loop: true, callback: () => this.spawnVisitor() });
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 300, () => this.spawnVisitor(true));
    if (this.visit) {
      this.pxButton(W - 60, 42, "back", "えきへ", () => { store.family.current = store.visitFrom; store.visitFrom = null; store.persist(); this.scene.start("Station"); });
      text(this, 40, 112, `${store.kid?.name ? store.kid.name + "の " : ""}まち（みるだけ）`, 22, "#ffffff", { stroke: "#2e4a1e", strokeThickness: 6 }).setOrigin(0, 0.5).setDepth(70);
    } else this.time.delayedCall(300, () => this.showSummary());
    if (build) this.time.delayedCall(200, () => { this.setEdit(true); this.exhibitMenu2(build); });
  }

  // ---- 見える はんい（すべらせる・ひろげる）----
  setView(x, y, z) {
    const ww = this.cols * T * z, wh = TOWN_ROWS * T * z, vh = H - TOWN_TOP;
    this.zoom = z;
    this.world.setScale(z);
    this.world.x = ww <= W ? (W - ww) / 2 : Phaser.Math.Clamp(x, W - ww, 0);
    this.world.y = wh <= vh ? TOWN_TOP + (vh - wh) / 2 : Phaser.Math.Clamp(y, TOWN_TOP + vh - wh, TOWN_TOP);
    this.registry.set("townView", { x: this.world.x, y: this.world.y, z });
  }
  toCell(p) { return [Math.floor((p.x - this.world.x) / this.zoom / T), Math.floor((p.y - this.world.y) / this.zoom / T)]; }
  cellCenter(x, y, w = 1, h = 1) { return [this.world.x + (x + w / 2) * T * this.zoom, this.world.y + (y + h / 2) * T * this.zoom]; }

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
        const [a, b] = ps, d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y), z = Phaser.Math.Clamp(this.pinch.z * d / this.pinch.d, 0.6, 2.2);
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
      this.tap(...this.toCell(p));
    });
  }
  zoomBy(k) { const cx = W / 2, cy = TOWN_TOP + (H - TOWN_TOP) / 2, z = Phaser.Math.Clamp(this.zoom * k, 0.6, 2.2), r = z / this.zoom; this.setView(cx - (cx - this.world.x) * r, cy - (cy - this.world.y) * r, z); }

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
    // ひろげる・ちぢめる・もとに もどす（上の帯の 中。町を かくさない）
    [["plus", "おおきく", () => this.zoomBy(1.25)], ["no", "ちいさく", () => this.zoomBy(0.8)], ["park", "もとに", () => this.setView(0, TOWN_TOP, 1)]].forEach(([icon, label, fn], i) => {
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
    this.cols = townCols(store.shop);
    this.map = mapOf(store.shop);
    this.net = roadNet(store.shop);
    this.bakeGround();
    this.shadowL.removeAll(true); this.objL.removeAll(true);
    this.animals = [];
    // 奥（上）から 手前（下）の じゅん
    const items = this.map.items.filter(i => !FLAT.has(i.kind)).sort((a, b) => (a.y + townSpec(a.kind).h) - (b.y + townSpec(b.kind).h) || a.x - b.x);
    for (const it of items) this.drawItem(it);
    if (this.edit) { // マス目
      const g = this.add.graphics(); g.lineStyle(1, 0xffffff, 0.35);
      for (let x = 0; x <= this.cols; x++) g.lineBetween(x * T, 0, x * T, TOWN_ROWS * T);
      for (let y = 0; y <= TOWN_ROWS; y++) g.lineBetween(0, y * T, this.cols * T, y * T);
      this.shadowL.add(g);
    }
    this.levelText.setText(`おみせ レベル ${shopLevel(store.shop)}`);
    if (this.editBtn) { this.editBtn.bg.clear(); pixelFrame(this.editBtn.bg, -46, -32, 92, 64, this.edit ? 0xffe28a : 0xfff1c9, 0x5a3a24); }
    this.showGuide();
  }
  // 地面（季節）と 道・せんろ・つち・じゃり を 1まいの 絵に
  bakeGround() {
    const sea = season(store.shop.startedAt, Date.now()), cw = this.cols * T, chh = TOWN_ROWS * T;
    const cv = document.createElement("canvas"); cv.width = cw; cv.height = chh;
    const c = cv.getContext("2d"); c.imageSmoothingEnabled = false;
    const src = k => this.textures.get(k).getSourceImage();
    for (let y = 0; y < TOWN_ROWS; y++) for (let x = 0; x < this.cols; x++) c.drawImage(src(P.groundTile(this, sea, (x * 7 + y * 13 + ((x * y) % 5)) % 6)), x * T, y * T);
    const flats = {};
    for (const it of this.map.items) if (FLAT.has(it.kind)) flats[it.x + "," + it.y] = it.kind;
    for (const [k, kind] of Object.entries(flats)) {
      const [x, y] = k.split(",").map(Number), same = (dx, dy) => flats[(x + dx) + "," + (y + dy)] === kind || (kind !== "rail" && WALKABLE.has(flats[(x + dx) + "," + (y + dy)]));
      const key = kind === "road" ? P.roadTile(this, { up: same(0, -1), down: same(0, 1), left: same(-1, 0), right: same(1, 0) })
        : kind === "rail" ? P.railTile(this, flats[(x - 1) + "," + y] === "rail" || flats[(x + 1) + "," + y] === "rail" || !(flats[x + "," + (y - 1)] === "rail" || flats[x + "," + (y + 1)] === "rail"))
          : P.decorTex(this, kind);
      c.drawImage(src(key), x * T, y * T, T, T);
    }
    this.groundIm.setTexture("__DEFAULT");
    if (this.textures.exists("town_ground")) this.textures.remove("town_ground");
    this.textures.addCanvas("town_ground", cv);
    this.groundIm.setTexture("town_ground");
  }
  // かげ：同じ絵を 黒く うすく ひらたくして 右下へ
  shadow(key, x, y) {
    const s = this.add.image(x + 10, y - 2, key).setOrigin(0, 1).setTint(0x1e2a12).setTintMode(Phaser.TintModes.FILL).setAlpha(0.22);
    s.setScale(1, 0.32);
    this.shadowL.add(s);
  }
  drawItem(it) {
    const sp = this.specOf(it.kind), x0 = it.x * T, y0 = it.y * T, w = sp.w * T, h = sp.h * T, bottom = y0 + h;
    if (it.kind.startsWith("ex_")) { this.drawExhibit(it, sp, x0, y0, w, h); return; }
    if (isBuilding(it.kind)) {
      const a = P.buildingArt(this, it.kind, sp.w, sp.h);
      this.shadow(a.key, x0, bottom);
      const im = this.add.image(x0, bottom, a.key).setOrigin(0, 1);
      this.objL.add(im);
      if (a.sign && this.textures.exists(sp.icon)) this.objL.add(this.add.image(x0 + w / 2, bottom - im.height + a.sign.y * P.PX, sp.icon).setDisplaySize(18, 18));
      if (it.kind === "shop") this.objL.add(kidFace(this, x0 + w - 8, bottom - im.height + 14, store.family.current, store.kid, 30));
      this.objL.add(this.tag(x0 + w / 2, bottom + 10, sp.icon, sp.name));
      if (!this.visit && this.badge(it.kind)) {
        const b = this.add.container(x0 + w - 6, bottom - im.height + 4);
        b.add([this.add.rectangle(0, 0, 22, 22, 0xe2553d).setStrokeStyle(3, 0xffffff), text(this, 0, 1, "!", 18, "#ffffff")]);
        this.tweens.add({ targets: b, y: b.y - 8, duration: 450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.objL.add(b);
      }
      return;
    }
    const pk = P.decorTex(this, it.kind);
    if (pk) { this.shadow(pk, x0, bottom); this.objL.add(this.add.image(x0, bottom, pk).setOrigin(0, 1)); return; }
    if (sp.emoji) { this.objL.add(text(this, x0 + w / 2, y0 + h / 2, sp.emoji, Math.min(w, h) * 0.85)); return; }
    // ごほうびの 飾り：石の 台に しるし
    const g = this.add.graphics(); pixelFrame(g, x0 + 2, bottom - 14, w - 4, 12, 0xc0c6ce, 0x6a6e76); this.objL.add(g);
    this.objL.add(img(this, x0 + w / 2, bottom - 14 - Math.min(w, h) * 0.32, sp.icon, Math.min(w, h) * 0.8));
  }
  drawExhibit(it, sp, x0, y0, w, h) {
    const ex = store.shop[it.f].exhibits.find(e => e.id === it.id), type = it.kind.slice(3);
    const key = P.exhibitTex(this, type, sp.w, sp.h);
    this.objL.add(this.add.image(x0, y0 + h, key).setOrigin(0, 1));
    const water = type === "fresh" || type === "sea" || type === "cold", open = exhibitOpen(store.shop, ex, this.net);
    ex.animals.slice(0, 8).forEach((a, i) => {
      const src = this.textures.exists("an_" + a.kind) ? "an_" + a.kind : this.textures.exists("aq_" + a.kind) ? "aq_" + a.kind : null;
      const big = species(a.kind).space >= 8 ? 26 : species(a.kind).space >= 4 ? 20 : water ? 13 : 16;
      const k = src && P.pixelCreature(this, src, Math.round(big * (stage(a, Date.now()) === "baby" ? 0.65 : 1)));
      if (!k) return;
      const im = this.add.image(x0 + 14 + ((i * 37) % Math.max(1, w - 28)), y0 + 16 + ((i * 23) % Math.max(1, h - 30)), k);
      if (shineOf(a)) this.tweens.add({ targets: im, alpha: 0.6, duration: 400, yoyo: true, repeat: -1 }); // キラキラ
      this.objL.add(im);
      this.animals.push({ im, x0: x0 + 10, y0: y0 + 12, x1: x0 + w - 10, y1: y0 + h - 8, vx: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 12), vy: 0, t: Math.random() * 3, water });
    });
    if (!open && !this.visit) { // 道に つながっていない：おしらせ
      const t = text(this, x0 + w / 2, y0 + h / 2, "みちに つなごう", 13, "#ffffff", { stroke: "#c0392b", strokeThickness: 5 });
      this.tweens.add({ targets: t, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
      this.objL.add(t);
    }
    this.objL.add(this.tag(x0 + w / 2, y0 + h + 8, FACILITIES[it.f].icon, ex.animals[0] ? species(ex.animals[0].kind).name : EXHIBITS[type].name, true));
  }
  // 名前の 札（ドット風。小さめ）
  tag(x, y, icon, label, small = false) {
    const c = this.add.container(x, y);
    const t = text(this, 9, 0, label, small ? 11 : 13, "#4a2c17"), w = t.width + 30, h = small ? 18 : 22;
    c.add([pixelFrame(this.add.graphics(), -w / 2, -h / 2, w, h, 0xfffaf0, 0x7a5a3a), img(this, -w / 2 + 11, 0, icon, small ? 14 : 18), t.setX(-w / 2 + 22 + t.width / 2)]);
    c.setAlpha(0.95);
    return c;
  }

  // ---- うごき（動物・お客さん）----
  update(_, dtMs) {
    const d = Math.min(dtMs / 1000, 0.05);
    for (const a of this.animals || []) {
      if (!a.im.active) continue;
      a.t -= d;
      if (a.t < 0) { a.t = 1 + Math.random() * 3; a.vx = Math.random() < 0.3 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 14); a.vy = (Math.random() - 0.5) * (a.water ? 14 : 8); }
      a.im.x = Phaser.Math.Clamp(a.im.x + a.vx * d, a.x0, a.x1); a.im.y = Phaser.Math.Clamp(a.im.y + a.vy * d, a.y0, a.y1);
      if (a.vx) a.im.setFlipX(a.vx > 0);
    }
    for (const v of this.visitors || []) this.stepVisitor(v, d);
  }
  // お客さん：町の 左はしの 道から 入って、道を 歩く。となりが 展示なら 立ちどまって ♡♪。やがて 左はしへ 帰る
  spawnVisitor(anywhere = false) {
    const total = zooVisitors(store.shop) + 6, max = Math.min(26, 4 + Math.round(total / 12));
    if (!this.net || this.visitors.length >= max || !this.net.size) return;
    const cells = [...this.net].map(k => k.split(",").map(Number)), gate = cells.filter(([x]) => x === 0);
    const start = anywhere || !gate.length ? cells[Math.floor(Math.random() * cells.length)] : gate[Math.floor(Math.random() * gate.length)];
    const vId = Math.floor(Math.random() * 60);
    P.personTex(this, vId, 1);
    const im = this.add.image(start[0] * T + T / 2, start[1] * T + T - 4, P.personTex(this, vId, 0)).setOrigin(0.5, 1);
    this.walkL.add(im);
    this.visitors.push({ im, vId, cx: start[0], cy: start[1], tx: start[0], ty: start[1], prev: null, wait: 0, f: 0, ft: 0, life: 40 + Math.random() * 40 });
  }
  stepVisitor(v, d) {
    if (!v.im.active) return;
    v.life -= d;
    if (v.wait > 0) { v.wait -= d; return; }
    const gx = v.tx * T + T / 2, gy = v.ty * T + T - 4, dx = gx - v.im.x, dy = gy - v.im.y, dist = Math.hypot(dx, dy), sp = 34 * d;
    if (dist > sp) { v.im.x += (dx / dist) * sp; v.im.y += (dy / dist) * sp; if (dx) v.im.setFlipX(dx < 0); v.ft += d; if (v.ft > 0.2) { v.ft = 0; v.f ^= 1; v.im.setTexture(`pxp_${v.vId}_${v.f}`); } return; }
    v.prev = [v.cx, v.cy]; v.cx = v.tx; v.cy = v.ty;
    if ((v.life < 0 && v.cx === 0) || !this.net.has(v.cx + "," + v.cy)) { v.im.destroy(); this.visitors = this.visitors.filter(q => q !== v); return; } // 帰る（道が けされたら きえる）
    // となりに 展示が あれば ときどき 立ちどまる
    const ex = this.map.items.find(i => i.kind.startsWith("ex_") && this.adjacent(i, v.cx, v.cy));
    if (ex && Math.random() < 0.35) { v.wait = 1.2 + Math.random(); this.bubble(v.im.x, v.im.y - 30, Math.random() < 0.25 ? "coin" : Math.random() < 0.5 ? "♡" : "♪"); }
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [v.cx + a, v.cy + b]).filter(([x, y]) => this.net.has(x + "," + y));
    let opts = nb.filter(([x, y]) => !v.prev || x !== v.prev[0] || y !== v.prev[1]);
    if (v.life < 0) { const left = opts.filter(([x]) => x < v.cx); if (left.length) opts = left; } // 帰りは 左へ
    const pool = opts.length ? opts : nb, next = pool[Math.floor(Math.random() * pool.length)];
    if (next) { v.tx = next[0]; v.ty = next[1]; }
  }
  adjacent(it, x, y) { const s = townSpec(it.kind); return x >= it.x - 1 && x <= it.x + s.w && y >= it.y - 1 && y <= it.y + s.h && !(x >= it.x && x < it.x + s.w && y >= it.y && y < it.y + s.h); }
  bubble(x, y, what) {
    const c = this.add.container(x, y);
    c.add(pixelFrame(this.add.graphics(), -13, -12, 26, 22, 0xffffff, 0x5a3a24));
    c.add(what === "coin" ? img(this, 0, -1, "coin", 18) : text(this, 0, -1, what, 16, what === "♡" ? "#e2553d" : "#3f8fd8"));
    this.fxL.add(c);
    this.tweens.add({ targets: c, y: y - 16, alpha: 0, delay: 600, duration: 700, onComplete: () => c.destroy() });
  }

  // ---- ふだんの タップ ----
  itemAt(cx, cy) {
    const hits = this.map.items.filter(i => { const s = townSpec(i.kind); return cx >= i.x && cx < i.x + s.w && cy >= i.y && cy < i.y + s.h; });
    return hits.find(i => !FLAT.has(i.kind)) || hits[0] || null;
  }
  tap(cx, cy) {
    const it = this.itemAt(cx, cy);
    if (!it) return;
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
      const it = this.itemAt(cx, cy);
      if (it && !FLAT.has(it.kind)) this.drag = { it, dx: cx - it.x, dy: cy - it.y, ghost: null };
    } else if (["road", "dirt", "rail"].includes(this.tool)) { this.painted = new Set(); this.paint(cx, cy); this.drag = { paint: true }; }
  }
  editMove(p) {
    if (!this.drag) return false;
    const [cx, cy] = this.toCell(p);
    if (this.drag.paint) { this.paint(cx, cy); return true; }
    const { it } = this.drag, s = townSpec(it.kind), nx = cx - this.drag.dx, ny = cy - this.drag.dy;
    if (!this.drag.ghost) { this.drag.ghost = this.add.rectangle(0, 0, s.w * T, s.h * T, 0x9fd3ff, 0.45).setOrigin(0).setStrokeStyle(3, 0xffffff); this.fxL.add(this.drag.ghost); }
    const ok = canPlaceAt(store.shop, nx, ny, s.w, s.h, it.id);
    this.drag.ghost.setPosition(nx * T, ny * T).setFillStyle(ok ? 0x9fd3ff : 0xe2553d, 0.45);
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
    if (r.ok) { store.setShop(r.shop); this.map = mapOf(store.shop); const g = this.add.rectangle(cx * T, cy * T, T, T, 0xffffff, 0.5).setOrigin(0); this.fxL.add(g); this.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() }); }
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
      const pk = P.decorTex(this, k);
      P2.L.add([pk ? this.add.image(x, y - 22, pk).setScale(1.4) : img(this, x, y - 22, d.icon, 56), text(this, x, y + 30, d.name, 15, "#4a2c17"), text(this, x, y + 52, coin(d.price) + (d.appeal ? ` にんき+${d.appeal}` : ""), 13, "#c0392b")]);
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
      P2.L.add([this.add.image(x, y - 50, P.exhibitTex(this, type, ew, eh)).setScale(Math.min(150 / (ew * T), 110 / (eh * T + 12))),
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
    const sp = townSpec(it.kind), g = guide(this, (it.x + sp.w / 2) * T, (it.y + sp.h / 2) * T, target[1], 58);
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
