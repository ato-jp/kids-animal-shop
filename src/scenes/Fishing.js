// 釣り：手前に自分（うしろ姿）と竿、奥へ水面が遠ざかる。水の中を魚の影が泳ぐ（体の大きい魚ほど大きな影）。
// 水面の ねらった所を押すと そこへ投げる → 近くの影が寄ってきて ウキが沈んだら すぐ押す（合わせ）→ 押している間 リールを巻く。
// 糸の張り（右のゲージ）を みどりの はんいに たもって 引きよせる（計算は logic/fishing.js）。
// 魚が あばれたら 指を 画面の反対がわに置いて巻く（竿を反対に倒す）。魚の体力（左のゲージ）を けずってから 巻きあげる。
// アタリの前に ウキが ちょんちょん動く「前アタリ」がある。そこで押すと にげられる。本当のアタリ（ずぼっと沈む）は 0.6秒だけ。
// 影の中身は「いま この場所・季節・時間帯・天気で釣れる魚」から エサと竿の出やすさで選ぶ（S.rollFish）。
// 影には キラキラ（ブロンズ・シルバー・ゴールド・レインボー）も まじり、水の中で 光るので ねらえる。
// 釣れたら「すいそうに いれる」か「にがす」を選ぶ（いちばへは売らない）。1回の釣りは エサがなくなるか「かえる」まで。行くお金は つりば で払いずみ。
import { store } from "../store.js";
import * as S from "../logic/shop.js";
import { keepToAqua, spotFor } from "../logic/zoo.js";
import { newFight, step, SAFE } from "../logic/fishing.js";
import { AREAS, BAITS, RARITY_NAME, FAR_FROM } from "../data/fish.js";
import { season, timeOfDay } from "../logic/time.js";
import { weatherNow } from "../weather.js";
import { W, H, text, button, creature, burst, coin, floatText } from "../ui/kit.js";
import { sfx } from "../sound/sfx.js";
import { MESSAGE } from "./Shop.js";
import { bgm } from "../sound/bgm.js";
import { ambient } from "../ui/ambient.js";
import { SHINES } from "../data/shine.js";

// 奥行き：wz は 0（手前の岸）〜1（いちばん奥）。wx は -1〜1（左右）
const HORIZON = 262, NEAR_Y = 700;
const toScreen = (wx, wz) => {
  const y = NEAR_Y - (NEAR_Y - HORIZON - 8) * Math.pow(wz, 0.7);
  return { x: W / 2 + wx * 640 * (1 - 0.6 * wz), y, s: 1 - 0.78 * wz };
};
const fromScreen = (x, y) => {
  const wz = Math.pow(Math.min(1, Math.max(0, (NEAR_Y - y) / (NEAR_Y - HORIZON - 8))), 1 / 0.7);
  return { wx: (x - W / 2) / (640 * (1 - 0.6 * wz)), wz };
};
const TIP = { x: 790, y: 420 };                 // 竿の先
const SHADOW_PX = { 1: 90, 2: 150, 3: 230, 9: 300 }; // 手前での影の長さ（要る水槽の大きさ＝体の大きさ）
const rand = (a, b) => a + Math.random() * (b - a);
const MAX_SHADOWS = 6;

export class Fishing extends Phaser.Scene {
  constructor() { super("Fishing"); }
  create({ area, bait, rod }) {
    if (!AREAS[area]) area = "pond";
    bgm.play("fish");
    this.cfg = { area, bait, rod };
    this.state = "ready";
    this.caught = [];
    this.shadows = [];
    this.t = 0;
    const now = Date.now(), sea = season(store.shop.startedAt, now);
    // うみ は 投げた距離で ちかく／おき に分かれる（奥ほど 大物）。いけ・かわ は ひとつ
    const cond = [sea, timeOfDay(now), weatherNow(now, sea)];
    this.lists = area === "sea" ? { near: S.catchable(area, ...cond, "near"), far: S.catchable(area, ...cond, "far") } : { all: S.catchable(area, ...cond) };
    this.listAt = wz => this.lists.all || (wz >= FAR_FROM ? this.lists.far : this.lists.near);
    this.fit = BAITS[bait].fit[area] || 1;
    this.drawWorld();
    ambient(this, { top: 0 });
    this.makeShadowTexture();
    this.shadowLayer = this.add.container(0, 0).setDepth(5);
    for (let i = 0; i < 4; i++) this.spawnShadow();
    this.drawAngler();
    this.line = this.add.graphics().setDepth(40);
    this.float = this.add.container(0, 0).setDepth(30).setVisible(false);
    this.float.add([this.add.ellipse(0, 4, 26, 8, 0x000000, 0.25), this.add.circle(0, -6, 11, 0xff5040).setStrokeStyle(3, 0xffffff), this.add.rectangle(0, -20, 3, 14, 0xffffff)]);
    this.ripples = this.add.graphics().setDepth(29);
    this.hud = text(this, 360, 40, "", 26, "#ffffff", { stroke: "#24435a", strokeThickness: 6 }).setOrigin(0, 0.5).setDepth(60);
    this.msg = text(this, W / 2, 150, "", 40, "#ffffff", { stroke: "#24435a", strokeThickness: 8 }).setDepth(60);
    this.hint = text(this, W / 2, 210, area === "sea" ? "とおくに なげるほど おおものが いるよ" : "みずの ねらった ところを タッチして なげよう", 26, "#ffffff", { stroke: "#24435a", strokeThickness: 6 }).setDepth(60);
    this.gauge = this.add.graphics().setDepth(60);
    button(this, 70, 50, "back", 56, () => { sfx.pop(); this.scene.start("Town"); }, { ring: 0x9fd3e6 }).setDepth(60);
    text(this, 70, 100, "かえる", 18, "#ffffff", { stroke: "#24435a", strokeThickness: 4 }).setDepth(60);
    this.input.on("pointerdown", p => { this.px = p.x; this.press(true, p); });
    this.input.on("pointermove", p => { this.px = p.x; });
    this.input.on("pointerup", () => this.press(false));
    this.px = W / 2;
    // 押す側の合図：👆／ひだりがわ／をタップ！ を3行で。うっすら透かして、指が トントン押す動き
    const st = { stroke: "#c0392b", strokeThickness: 10 };
    this.tapFinger = text(this, 0, -90, "👆", 96);
    this.tapSide = text(this, 0, 10, "", 64, "#ffffff", st);
    this.arrow = this.add.container(W / 2, 400, [this.tapFinger, this.tapSide, text(this, 0, 80, "を タップ！", 48, "#ffffff", st)]).setDepth(61).setAlpha(0).setVisible(false);
    this.tweens.add({ targets: this.tapFinger, y: -60, duration: 260, yoyo: true, repeat: -1, ease: "Quad.easeIn" });
    this.tweens.add({ targets: this.arrow, scale: { from: 0.94, to: 1.06 }, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.rodG = this.add.graphics().setDepth(51);
    this.holding = false;
    this.updateHud();
  }

  // ---- 景色：空・向こう岸・奥へ遠ざかる水面（AIの絵があれば それを敷き、波の線だけ重ねる） ----
  drawWorld() {
    const area = this.cfg.area, col = AREAS[area].color;
    const g = this.add.graphics().setDepth(0);
    if (this.textures.exists("bg_" + AREAS[area].bg)) this.add.image(0, 0, "bg_" + AREAS[area].bg).setOrigin(0).setDisplaySize(W, H).setDepth(0);
    else {
      g.fillGradientStyle(0x9fd2f0, 0x9fd2f0, 0xe6f4fb, 0xe6f4fb, 1).fillRect(0, 0, W, HORIZON);
      // 向こう岸（場所で形を変える）
      const shore = { pond: 0x7aa860, river: 0x4f7f4a, sea: 0x8aa7b5 }[area];
      if (shore) {
        const pts = [{ x: 0, y: HORIZON }];
        for (let x = 0; x <= W; x += 40) pts.push({ x, y: HORIZON - 30 - Math.sin(x / 170 + area.length) * 22 - (area === "river" ? 60 : 0) });
        pts.push({ x: W, y: HORIZON });
        g.fillStyle(shore, 1).fillPoints(pts, true);
      }
      const c = Phaser.Display.Color.ValueToColor(col);
      const far = Phaser.Display.Color.GetColor(Math.min(255, c.red + 70), Math.min(255, c.green + 70), Math.min(255, c.blue + 70));
      const near = Phaser.Display.Color.GetColor(c.red * 0.55, c.green * 0.6, c.blue * 0.7);
      g.fillGradientStyle(far, far, near, near, 1).fillRect(0, HORIZON, W, H - HORIZON);
    }
    // 波の線：奥ほど細かく つまって、手前ほど長く まばら
    this.waves = this.add.graphics().setDepth(2);
    this.waveSeeds = Array.from({ length: 70 }, () => ({ wx: rand(-1.1, 1.1), wz: Math.pow(Math.random(), 0.7), ph: rand(0, 6) }));
    // 手前の岸（自分が立つ所）
    const bank = this.add.graphics().setDepth(45);
    bank.fillStyle(0xb59a6a, 1).fillPoints([{ x: 0, y: H }, { x: 0, y: 650 }, { x: 380, y: 668 }, { x: 900, y: 676 }, { x: W, y: 655 }, { x: W, y: H }], true);
  }

  // 手前の自分（うしろ姿）と竿
  drawAngler() {
    const g = this.add.graphics().setDepth(50);
    g.fillStyle(0x3b4a5a, 1).fillEllipse(560, 735, 300, 170);          // 肩
    g.fillStyle(0x2b2b2b, 1).fillCircle(560, 625, 58);                 // 頭（うしろ）
    g.fillStyle(0xe9c46a, 1).fillEllipse(560, 590, 150, 40).fillEllipse(560, 575, 90, 50); // ぼうし
    g.fillStyle(0x444444, 1).fillCircle(655, 668, 12);                 // リール
  }

  // 魚の影の絵（からだ＋しっぽ。黒く ぼんやり）
  makeShadowTexture() {
    if (this.textures.exists("fx_fishshadow")) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    for (let i = 4; i >= 0; i--) {
      g.fillStyle(0x0b1a26, 0.3).fillEllipse(56, 24, 92 + i * 4, 30 + i * 3);
      g.fillTriangle(10 - i, 24, -4 - i, 8 - i, -4 - i, 40 + i);
    }
    g.generateTexture("fx_fishshadow", 120, 50);
    g.destroy();
  }

  spawnShadow(near) {
    if (this.shadows.length >= MAX_SHADOWS) return;
    const wz = near ? Math.min(1, Math.max(0.15, near.wz + rand(-0.2, 0.2))) : rand(0.15, 0.95);
    const kind = S.rollFish(this.listAt(wz), this.cfg.bait, this.cfg.rod);
    if (!kind) return;
    const d = S.species(kind);
    const spr = this.add.image(0, 0, "fx_fishshadow").setOrigin(0.45, 0.5);
    this.shadowLayer.add(spr);
    const shine = S.rollShine();
    if (shine) spr.setTintFill(SHINES[shine].glow[0]); // キラキラの影は その色
    const sh = { kind, shine, spr, px: SHADOW_PX[d.aquatic.tank] || 70, wx: near ? near.wx + rand(-0.35, 0.35) : rand(-1, 1), wz,
      vx: 0, vz: 0, turn: 0, ph: rand(0, 6), state: "roam", alpha: 0 };
    this.shadows.push(sh);
  }

  updateHud() {
    const n = store.shop.baits[this.cfg.bait] || 0;
    this.hud.setText(`${AREAS[this.cfg.area].name}   ${BAITS[this.cfg.bait].name} のこり ${n}こ   つれた ${this.caught.length}ひき   つりレベル ${S.fishLevel(store.shop)}`);
  }

  // ---- 押したとき：ready ならそこへ投げる / 待っている間は はやすぎ / アタリなら合わせ ----
  press(down, p) {
    this.holding = down;
    if (!down) return;
    if (this.state === "ready" && p) { if (p.y > HORIZON && p.y < 660) this.cast(p.x, p.y); return; }
    if (this.state === "wait") { this.scare(); this.miss("はやすぎた！ さかなが にげたよ"); return; }
    if (this.state === "bite") this.hook();
  }

  cast(x, y) {
    const r = S.useBait(store.shop, this.cfg.bait);
    if (!r.ok) { sfx.no(); this.msg.setText("エサが なくなったよ"); return; }
    store.setShop(r.shop);
    this.updateHud();
    this.hint.setVisible(false);
    this.msg.setText("");
    this.target = fromScreen(x, y);
    this.state = "flying";
    sfx.whoosh?.();
    const to = toScreen(this.target.wx, this.target.wz);
    this.float.setVisible(true).setPosition(TIP.x, TIP.y).setScale(1);
    // 放物線で とんでいく（高さは 距離に合わせる）
    const fly = { k: 0 };
    this.tweens.add({ targets: fly, k: 1, duration: 500 + this.target.wz * 400, ease: "Sine.easeOut",
      onUpdate: () => {
        const k = fly.k;
        this.float.setPosition(TIP.x + (to.x - TIP.x) * k, TIP.y + (to.y - TIP.y) * k - Math.sin(k * Math.PI) * (120 + 200 * this.target.wz)).setScale(1 - (1 - to.s) * k);
      },
      onComplete: () => { sfx.splash(); this.ring(to.x, to.y, to.s); this.state = "wait"; this.wait = 0; this.biter = null; this.nibbles = null; this.fallback = (3 + Math.random() * 6) / this.fit; } });
  }

  ring(x, y, s) {
    const c = this.add.ellipse(x, y, 30 * s, 10 * s).setStrokeStyle(3, 0xffffff, 0.8).setDepth(28);
    this.tweens.add({ targets: c, scaleX: 4, scaleY: 4, alpha: 0, duration: 900, onComplete: () => c.destroy() });
  }

  // はやすぎ・にげられた：近くの影が はなれていく
  scare() {
    for (const sh of this.shadows) {
      if (!this.target || Math.hypot(sh.wx - this.target.wx, (sh.wz - this.target.wz) * 2) > 0.6) continue;
      sh.state = "flee"; sh.vx = Math.sign(sh.wx - this.target.wx || 1) * 0.5; sh.vz = 0.15;
    }
  }

  miss(m) {
    sfx.no();
    this.msg.setText(m);
    this.state = "ready";
    this.float.setVisible(false); this.gauge.clear(); this.line.clear(); this.arrow.setVisible(false); this.rodG.clear();
    this.hint.setVisible(true); this.nibbles = null;
    if (this.biter) { this.biter.state = "flee"; this.biter.vz = 0.2; this.biter = null; }
  }

  hook() {
    const sh = this.biter;
    if (!sh) { this.miss("にげられた…"); return; }
    this.kind = sh.kind;
    this.shine = sh.shine;
    sh.state = "hooked";
    this.fight = newFight(this.kind, this.cfg.rod, { shine: this.shine, level: S.fishLevel(store.shop) });
    this.state = "fight";
    sfx.pop();
    this.msg.setText("おして まく！ あばれたら はんたいがわを おす");
  }

  update(_, dtMs) {
    const dt = Math.min(dtMs / 1000, 0.05);
    this.t += dt;
    this.drawWaves();
    this.moveShadows(dt);
    if (Math.random() < dt * 0.25) this.spawnShadow();
    // 竿：やりとり中は 指のがわへ倒す。糸は 竿の先から ウキまで 少し たるませる
    // 竿：指のがわへ倒す（tilt）。魚が あばれると 竿先が 魚の向きへ 引かれて しなる（bend）。曲がりは 2次ベジェで描く
    const fighting = this.state === "fight", f = this.fight;
    const tilt = fighting && this.holding ? (this.px < W / 2 - 90 ? -60 : this.px > W / 2 + 90 ? 60 : 0) : 0;
    const pull = fighting ? (f.run ? Math.min(1, 0.45 + f.tension * 0.6) : f.tension * 0.35) : 0;
    const shake = fighting && f.run ? Math.sin(this.t * 30) * 4 : 0;
    const bx = fighting ? f.dir * 170 * pull : 0, by = 120 * pull;
    const TIPX = TIP.x + tilt + bx + shake, TIPY = TIP.y + Math.abs(tilt) * 0.3 + by;
    const B0 = { x: 640, y: 690 }, CP = { x: TIP.x + tilt * 0.6, y: TIP.y + 40 + Math.abs(tilt) * 0.2 };
    const rod = [];
    for (let i = 0; i <= 14; i++) { const k = i / 14, a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k; rod.push({ x: a * B0.x + b * CP.x + c * TIPX, y: a * B0.y + b * CP.y + c * TIPY }); }
    this.rodG.clear().lineStyle(9, 0x6b4a2a, 1).strokePoints(rod.slice(0, 8)).lineStyle(5, 0x6b4a2a, 1).strokePoints(rod.slice(7));
    this.line.clear();
    if (this.float.visible) {
      const fx = this.float.x, fy = this.float.y - 10, sag = this.state === "fight" ? 4 : 40;
      const pts = [];
      for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push({ x: TIPX + (fx - TIPX) * k, y: TIPY + (fy - TIPY) * k + Math.sin(k * Math.PI) * sag }); }
      this.line.lineStyle(2, 0xffffff, 0.85).strokePoints(pts);
    }
    // 押す側の合図は やりとり中だけ（ほかの時は かならず消す）
    if (this.state !== "fight" && this.arrow.visible) this.arrow.setVisible(false);
    if (this.state === "wait") this.waitStep(dt);
    else if (this.state === "bite") {
      this.biteLeft -= dt;
      const p = toScreen(this.target.wx, this.target.wz);
      this.float.setPosition(p.x, p.y + 14 * p.s);
      if (this.biteLeft <= 0) this.miss("にげられた…");
    } else if (this.state === "fight") this.fightStep(dt);
  }

  // 待っている間：近くの影が ウキに気づいて寄ってくる。寄りきったら アタリ
  waitStep(dt) {
    const tg = this.target, p = toScreen(tg.wx, tg.wz);
    this.float.setPosition(p.x, p.y + Math.sin(this.t * 3) * 2 * p.s);
    this.wait += dt;
    if (!this.biter) {
      for (const sh of this.shadows) {
        if (sh.state !== "roam") continue;
        const dist = Math.hypot(sh.wx - tg.wx, (sh.wz - tg.wz) * 2);
        if (dist < 0.55 && Math.random() < dt * 0.6 * this.fit) { sh.state = "come"; this.biter = sh; break; }
      }
      // しばらく誰も来なければ、近くに新しい影が来る（待ちすぎ防止）
      if (!this.biter && this.wait > this.fallback) { this.spawnShadow(tg); const sh = this.shadows[this.shadows.length - 1]; if (sh && sh.state === "roam") { sh.state = "come"; this.biter = sh; } }
    } else if (this.nibbles == null && Math.hypot(this.biter.wx - tg.wx, (this.biter.wz - tg.wz) * 2) < 0.05) {
      this.nibbles = Math.floor(Math.random() * 3); this.nibbleT = rand(0.4, 1);
    } else if (this.nibbles != null) {
      this.nibbleT -= dt;
      const dip = this.nibbleT < 0.18 && this.nibbles > 0;
      this.float.y += dip ? 6 * p.s : 0; // ちょんちょん
      if (this.nibbleT <= 0) {
        if (this.nibbles > 0) { this.nibbles--; this.nibbleT = rand(0.5, 1.3); if (Math.random() < 0.5) sfx.pop(); }
        else { this.state = "bite"; this.biteLeft = 0.6; this.nibbles = null; sfx.splash(); this.ring(p.x, p.y, p.s); }
      }
    }
  }

  fightStep(dt) {
    const side = this.px < W / 2 - 90 ? -1 : this.px > W / 2 + 90 ? 1 : 0;
    const r = step(this.fight, dt, { hold: this.holding, side });
    this.fight = r.f;
    const f = this.fight;
    // dist 1 → 投げた所、0 → 手前の岸
    const wz = 0.04 + (this.target.wz - 0.04) * Math.min(1.3, f.dist), wx = this.target.wx * Math.min(1, f.dist) + (f.run ? Math.sin(this.t * 7) * 0.05 : 0);
    const p = toScreen(wx, wz);
    this.float.setPosition(p.x, p.y + (f.run ? Math.sin(this.t * 20) * 4 : 0)).setScale(p.s);
    const sh = this.shadows.find(s => s.state === "hooked");
    if (sh) { sh.wx = wx + (f.run ? Math.sin(this.t * 9) * 0.04 : 0); sh.wz = wz + 0.02; }
    if (f.run && Math.random() < dt * 6) this.ring(p.x + rand(-20, 20) * p.s, p.y, p.s * 0.6);
    // あばれる向きの矢印（反対に引こう）と、竿の かたむき（指のがわ）
    // 矢印は「押すほう」（魚と はんたいがわ）。魚の向きは 竿の しなりで見せる
    if (f.run) { this.tapSide.setText(f.dir > 0 ? "ひだりがわ" : "みぎがわ"); this.arrow.setVisible(true).setAlpha(0.45).setX(W / 2 - f.dir * 300); }
    else this.arrow.setVisible(false);
    this.drawGauge(f);
    if (r.result === "caught") this.land();
    else if (r.result === "broke") this.miss("いとが きれた！");
    else if (r.result === "escaped") this.miss("にげられた…");
  }

  moveShadows(dt) {
    const tg = this.target;
    for (const sh of this.shadows) {
      if (sh.state === "roam") {
        sh.turn -= dt;
        if (sh.turn <= 0) { sh.turn = rand(1.5, 4); sh.vx = rand(-0.12, 0.12); sh.vz = rand(-0.05, 0.05); }
      } else if (sh.state === "come") {
        const dx = tg.wx - sh.wx, dz = tg.wz - sh.wz, n = Math.hypot(dx, dz) || 1;
        sh.vx = (dx / n) * 0.18; sh.vz = (dz / n) * 0.1;
      }
      if (sh.state !== "hooked") { sh.wx += sh.vx * dt; sh.wz = Math.max(0.08, Math.min(1.05, sh.wz + sh.vz * dt)); }
      if (sh.state === "roam" && Math.abs(sh.wx) > 1) sh.vx = -Math.sign(sh.wx) * Math.abs(sh.vx);
      sh.alpha = Math.min(1, sh.alpha + dt * (sh.state === "flee" ? -0.8 : 0.5));
      const p = toScreen(sh.wx, sh.wz), len = sh.px * p.s;
      // キラキラの影は 水の中で光る（めずらしいほど よく光る）
      const sp = sh.shine && SHINES[sh.shine];
      if (sp && sh.state !== "flee" && Math.random() < dt * sp.rate * 0.25) {
        const g = this.add.image(p.x + rand(-20, 20) * p.s, p.y, "sparkles").setScale(0.12 * p.s + 0.04).setDepth(6).setAlpha(0.85);
        g.setTint(sp.glow[Math.floor(Math.random() * sp.glow.length)]);
        this.tweens.add({ targets: g, alpha: 0, y: p.y - 30 * p.s, duration: 700, onComplete: () => g.destroy() });
      }
      sh.spr.setPosition(p.x, p.y + 6 * p.s).setScale(len / 120, (len / 120) * (0.55 + 0.3 * (1 - sh.wz)))
        .setFlipX(sh.vx > 0).setAlpha(Math.max(0, sh.alpha) * (0.6 + 0.3 * (1 - sh.wz))).setRotation(Math.sin(this.t * 3 + sh.ph) * 0.06);
    }
    this.shadows = this.shadows.filter(sh => { if (sh.alpha < 0 || Math.abs(sh.wx) > 1.4) { sh.spr.destroy(); return false; } return true; });
  }

  drawWaves() {
    const g = this.waves.clear();
    for (const w of this.waveSeeds) {
      const p = toScreen(w.wx + Math.sin(this.t * 0.4 + w.ph) * 0.02, w.wz), len = 60 * p.s + 6;
      g.lineStyle(Math.max(1, 3 * p.s), 0xffffff, 0.12 + 0.18 * (1 - w.wz)).lineBetween(p.x - len, p.y, p.x + len, p.y);
    }
  }

  drawGauge(f) {
    const x = 1180, top = 180, h = 380, g = this.gauge.clear();
    g.fillStyle(0xffffff, 0.9).fillRoundedRect(x - 26, top, 52, h, 20);
    g.fillStyle(0x6cc070, 0.8).fillRect(x - 20, top + h * (1 - SAFE[1] / 1.2), 40, h * ((SAFE[1] - SAFE[0]) / 1.2));
    const y = top + h * (1 - Math.min(f.tension, 1.2) / 1.2);
    g.fillStyle(f.tension > SAFE[1] ? 0xe2553d : f.tension < SAFE[0] ? 0xf2b53c : 0x2a6fb5, 1).fillRoundedRect(x - 30, y - 8, 60, 16, 8);
    // 魚の体力（左）：へるほど 寄ってくる
    const hx = 100;
    g.fillStyle(0xffffff, 0.9).fillRoundedRect(hx - 26, top, 52, h, 20);
    g.fillStyle(0xe2553d, 1).fillRoundedRect(hx - 18, top + 8 + (h - 16) * (1 - f.stamina), 36, (h - 16) * f.stamina, 12);
  }

  land() {
    const shop = store.shop, now = Date.now(), d = S.species(this.kind);
    const before = S.fishLevel(shop);
    const r = S.landFish(shop, this.kind, now, Math.random, this.shine);
    store.setShop(r.shop);
    this.caught.push(this.kind);
    this.state = "result";
    this.msg.setText("");
    this.float.setVisible(false); this.gauge.clear(); this.line.clear(); this.arrow.setVisible(false);
    const sh = this.shadows.find(s => s.state === "hooked");
    if (sh) { sh.spr.destroy(); this.shadows = this.shadows.filter(s => s !== sh); }
    this.biter = null;
    sfx.star();
    const L = this.add.container(0, 0).setDepth(600);
    L.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.4).setOrigin(0));
    L.add(this.add.graphics().fillStyle(0xfffaf2, 1).fillRoundedRect(W / 2 - 360, 150, 720, 420, 36));
    L.add(creature(this, W / 2, 290, this.kind, 180, this.shine));
    L.add(text(this, W / 2, 410, (this.shine ? SHINES[this.shine].name + "の " : "") + d.name, 40, this.shine ? "#b8860b" : "#24435a"));
    L.add(text(this, W / 2, 455, RARITY_NAME[d.aquatic.rarity], 22, "#7a4a1e"));
    burst(this, W / 2, 290, "sparkles", this.shine ? 16 : 8, 44, 140);
    if (this.shine) L.add(text(this, W / 2, 190, "キラキラ！", 34, "#ffffff", { stroke: "#b8860b", strokeThickness: 8 }));
    const after = S.fishLevel(r.shop);
    if (after > before) L.add(text(this, W / 2, 610, `つりレベル ${after} に あがった！ いとが きれにくく なったよ`, 24, "#ffffff", { stroke: "#2e7d32", strokeThickness: 6 }));
    const done = msg => { L.destroy(); this.state = "ready"; this.hint.setVisible(true); this.updateHud(); if (msg) floatText(this, W / 2, 300, msg, "#ffffff"); };
    // きまりで放す魚は 放すだけ（どこを押しても とじる）
    if (r.result === "released") {
      L.add(text(this, W / 2, 500, "きまりで うみに かえしたよ（ずかんに のったよ）", 22, "#2e7d32"));
      this.time.delayedCall(600, () => { const z = this.add.zone(0, 0, W, H).setOrigin(0).setInteractive().setDepth(700); z.on("pointerup", () => { z.destroy(); done(); }); });
      return;
    }
    // 水槽に いれる／にがす を えらぶ（2026-10-16。いちばへは売らない）
    const kept = () => {
      const k = S.keepFish(store.shop, this.kind, Date.now(), Math.random, this.shine);
      if (!k.ok) { sfx.no(); return; }
      store.setShop(k.shop); sfx.coin(); done("すいそうに いれたよ！");
    };
    const pick = (x, label, color, fn, on = true, bw = 280) => {
      const g = this.add.graphics().fillStyle(on ? color : 0xdddddd, 1).fillRoundedRect(x - bw / 2, 476, bw, 60, 30);
      const t = text(this, x, 506, label, bw < 280 ? 21 : 24, on ? "#ffffff" : "#999999", on ? { stroke: "#00000040", strokeThickness: 4 } : {});
      const z = this.add.zone(x, 506, bw, 60).setInteractive({ useHandCursor: true });
      L.add([g, t, z]);
      if (on) z.on("pointerup", () => { sfx.pop(); fn(); });
    };
    const toAqua = () => {
      const k = keepToAqua(store.shop, this.kind, Date.now(), Math.random, this.shine);
      if (!k.ok) { sfx.no(); return; }
      store.setShop(k.shop); sfx.coin(); done("すいぞくかんに いれたよ！");
    };
    const aq = !!spotFor(store.shop, "aqua", this.kind); // 合う てんじに 空きが あるときだけ 3つめの ボタン
    this.time.delayedCall(400, () => {
      if (!L.active) return;
      const xs = aq ? [W / 2 - 240, W / 2, W / 2 + 240] : [W / 2 - 160, W / 2 + 160], bw = aq ? 220 : 280;
      pick(xs[0], "すいそうに いれる", 0x2e9d6a, kept, r.canKeep, bw);
      if (aq) pick(xs[1], "すいぞくかんへ", 0x1f6fb2, toAqua, true, bw);
      pick(xs[xs.length - 1], "にがす", 0x5a8fd0, () => done("かえして あげたよ"), true, bw);
      if (!r.canKeep && !aq) L.add(text(this, W / 2, 553, r.why === "nopen" ? "おみせに すいそうを たてると いれられるよ" : MESSAGE[r.why] || "", 16, "#a0522d"));
    });
  }
}
