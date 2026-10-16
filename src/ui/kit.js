// 画面で共通に使う部品。どの画面も 1280×720 の座標で描き、端末の大きさには Phaser が合わせる。
import { sfx } from "../sound/sfx.js";
import { SHINES } from "../data/shine.js";
export const W = 1280, H = 720;
export const FONT = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Noto Sans JP", sans-serif';
export const text = (scene, x, y, str, size = 32, color = "#4a2c17", extra = {}) =>
  scene.add.text(x, y, str, { fontFamily: FONT, fontSize: size + "px", fontStyle: "bold", color, align: "center", ...extra }).setOrigin(0.5);

// 絵を「一辺 px ピクセル」の大きさで置く（元の絵は 256px）
export const img = (scene, x, y, key, px) => scene.add.image(x, y, key).setScale(px / 256);

// 丸い大きなボタン。子どもの指でも外さないよう、見た目より当たりを広げる
export function button(scene, x, y, key, px, onTap, { bg = 0xffffff, ring = 0xf0c27a } = {}) {
  const c = scene.add.container(x, y);
  const r = px * 0.62;
  const g = scene.add.graphics();
  g.fillStyle(bg, 1).fillCircle(0, 0, r).lineStyle(6, ring, 1).strokeCircle(0, 0, r);
  c.add([g, img(scene, 0, 0, key, px)]);
  c.setSize(r * 2.3, r * 2.3).setInteractive({ useHandCursor: true });
  c.on("pointerdown", () => scene.tweens.add({ targets: c, scale: 0.88, duration: 80, yoyo: true }));
  c.on("pointerup", () => onTap());
  return c;
}

export function floatText(scene, x, y, str, color = "#ff7a59") {
  const t = text(scene, x, y, str, 44, color, { stroke: "#ffffff", strokeThickness: 8 }).setDepth(900);
  scene.tweens.add({ targets: t, y: y - 90, alpha: 0, duration: 1100, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
}

export function burst(scene, x, y, key = "heart", n = 6, px = 44, dist = 90) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, s = img(scene, x, y, key, px).setDepth(900);
    scene.tweens.add({ targets: s, x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist - 20, alpha: 0, scale: s.scale * 0.4, duration: 800, ease: "Cubic.easeOut", onComplete: () => s.destroy() });
  }
}

export const coin = n => n.toLocaleString("ja-JP") + "コイン";

export function moneyCounter(scene, x, y) {
  scene.add.graphics().fillStyle(0xffffff, 0.92).fillRoundedRect(x - 10, y - 34, 230, 68, 34);
  const icon = img(scene, x + 30, y, "coin", 52);
  const t = text(scene, x + 62, y + 2, "", 34, "#7a4a1e").setOrigin(0, 0.5);
  return { icon, t, set(n) { t.setText(coin(n)); }, pos: { x: x + 30, y } };
}

// おとなの入口。歯車を3秒長押しすると開く（子どもがうっかり開かないため）
export function parentGate(scene, x, y, onOpen) {
  const g = img(scene, x, y, "gear", 52).setAlpha(0.55).setInteractive();
  const ring = scene.add.graphics().setDepth(950);
  let timer = null, t0 = 0;
  const stop = () => { if (timer) { timer.remove(); timer = null; } ring.clear(); };
  g.on("pointerdown", () => {
    t0 = scene.time.now;
    timer = scene.time.addEvent({ delay: 30, loop: true, callback: () => {
      const p = Math.min(1, (scene.time.now - t0) / 3000);
      ring.clear().lineStyle(8, 0xff7a59, 1).beginPath().arc(x, y, 40, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2).strokePath();
      if (p >= 1) { stop(); onOpen(); }
    } });
  });
  g.on("pointerup", stop);
  g.on("pointerout", stop);
  return g;
}

export const backButton = (scene, onTap) => button(scene, 70, 62, "back", 60, () => { sfx.pop(); onTap(); }, { ring: 0x9fd3e6 });

// ---- 第1弾で足した部品 ----
// 生き物の絵。陸の動物は絵文字、水の生き物は生成した絵（aq_<id>）。まだ絵がない水の生き物は魚の絵文字を色で描き分ける。
// めずらしい色の子は金色がかった色で描く
// shine：キラキラ（"bronze" "silver" "gold" "rainbow"。true は前からの めずらしい色＝ゴールド）。
// 魚の色が 銅色・銀色・金色になり（レインボーは虹色に変わり続ける）、ふちが ぼんやり光り（Glow）、まわりに 光の粒が きらきら出る。
// 色は「掛ける」と元の色とまざる（青い魚×金＝緑）ので、ColorMatrix で 明るさだけの絵にしてから その色で塗る
// 明るさだけの絵にしてから hex の色で塗る（色変わり用）
function paintIt(im, hex) {
  im.enableFilters();
  const r = ((hex >> 16) & 255) / 255 * 1.35, g = ((hex >> 8) & 255) / 255 * 1.35, b = (hex & 255) / 255 * 1.35, L = [0.3, 0.59, 0.11];
  im.filters.internal.addColorMatrix().colorMatrix.set([...L.map(v => v * r), 0, 0, ...L.map(v => v * g), 0, 0, ...L.map(v => v * b), 0, 0, 0, 0, 0, 1, 0]);
}
function starTexture(scene) {
  if (scene.textures.exists("fx_star")) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1).fillTriangle(16, 0, 19, 16, 13, 16).fillTriangle(16, 32, 19, 16, 13, 16).fillTriangle(0, 16, 16, 13, 16, 19).fillTriangle(32, 16, 16, 13, 16, 19).fillCircle(16, 16, 3);
  g.generateTexture("fx_star", 32, 32);
  g.destroy();
}
function sparkle(scene, im, id, px) {
  const sp = SHINES[id];
  if (!sp) return;
  const lv = ["bronze", "silver", "gold", "rainbow"].indexOf(id) + 1;
  // ふちの光（WebGL のときだけ）。レインボーは 光の色が かわり続ける
  if (im.enableFilters) {
    im.enableFilters();
    const cm = im.filters.internal.addColorMatrix().colorMatrix;
    if (sp.paint) {
      const r = ((sp.paint >> 16) & 255) / 255 * 1.3, g = ((sp.paint >> 8) & 255) / 255 * 1.3, b = (sp.paint & 255) / 255 * 1.3, L = [0.3, 0.59, 0.11];
      cm.set([...L.map(v => v * r), 0, 0, ...L.map(v => v * g), 0, 0, ...L.map(v => v * b), 0, 0, 0, 0, 0, 1, 0]);
    }
    let hue = 0;
    const glow = im.filters.internal.addGlow(sp.glow[0], 3 + 2 * lv, 0, 1, false, 10, 8 + 4 * lv);
    let k = 0, t = 0;
    const ev = scene.time.addEvent({ delay: 60, loop: true, callback: () => {
      if (!im.active) { ev.remove(); return; }
      if (!sp.paint) { hue = (hue + 9) % 360; cm.hue(hue); } // レインボー：色合いが ぐるぐる
      t += 0.06; glow.outerStrength = (3 + 2 * lv) * (0.7 + 0.3 * Math.sin(t * 4));
      if (sp.glow.length > 1 && Math.round(t * 10) % 3 === 0) { k = (k + 1) % sp.glow.length; glow.color = sp.glow[k]; }
    } });
  }
  // 光の粒：絵と同じ入れ物（Container）に入れて、絵に ついていかせる。入れ物に入るのは呼んだ側なので 次の瞬間につける
  starTexture(scene);
  scene.time.delayedCall(0, () => {
    if (!im.active) return;
    const em = scene.add.particles(0, 0, "fx_star", {
      follow: im, lifespan: 900, speed: { min: 4, max: 20 }, frequency: 1000 / sp.rate, quantity: 1,
      scale: { start: (px / 32) * (0.1 + 0.03 * lv), end: 0 }, alpha: { start: 1, end: 0 }, tint: sp.glow, blendMode: "ADD",
      emitZone: { type: "random", source: new Phaser.Geom.Circle(0, 0, px * 0.42) },
    });
    if (im.parentContainer) im.parentContainer.add(em); else em.setDepth((im.depth || 0) + 1);
    im.once("destroy", () => em.destroy());
    // 見えなくなったら 粒も止める（図鑑の かげ など）
    scene.events.on("update", function keep() { if (!im.active) { scene.events.off("update", keep); return; } em.emitting = im.visible && im.alpha > 0.5 && !(im.parentContainer && !im.parentContainer.visible); });
  });
}
// morph：色変わりの 塗る色（logic/breed.js の morphPaint）。キラキラで色が変わるときは キラキラが 先
export function creature(scene, x, y, kind, px, shine = false, morph = null) {
  const key = ["an_" + kind, "aq_" + kind, kind].find(k => scene.textures.exists(k)) || "fish";
  const im = img(scene, x, y, key, px);
  const s = shine === true ? "gold" : shine;
  // 絵がまだない水の生き物は 魚の絵文字を 種類ごとの色で代わりに出す
  if (key === "fish" && kind !== "fish") im.setTint(0x6080a0 + ((kind.charCodeAt(1) * 2654435761) % 0x7f7f7f));
  if (s) sparkle(scene, im, s, px);
  if (morph && !(s && SHINES[s]?.paint) && s !== "rainbow" && im.enableFilters) paintIt(im, morph);
  return im;
}

// 子どもの顔：写真があれば写真、なければ動物の絵（写真は Boot で "kid_<id>" として読み込む）
export function kidFace(scene, x, y, id, kid, px) {
  const c = scene.add.container(x, y);
  const r = px / 2;
  c.add(scene.add.graphics().fillStyle(Number(String(kid.color).replace("#", "0x")), 1).fillCircle(0, 0, r + 4).lineStyle(4, 0xffffff, 1).strokeCircle(0, 0, r + 4));
  if (kid.photo && scene.textures.exists("kid_" + id)) {
    const im = scene.add.image(0, 0, "kid_" + id);
    im.setScale(px / Math.max(im.width, im.height));
    const mask = scene.make.graphics({}, false).fillCircle(x, y, r);
    im.setMask(mask.createGeometryMask());
    c.add(im);
  } else c.add(img(scene, 0, 0, kid.icon, px * 0.9));
  return c;
}

export function gauge(scene, g, x, y, w, v) {
  const color = v < 0.3 ? 0xe2553d : v < 0.5 ? 0xf2b53c : 0x6cc070;
  g.fillStyle(0xffffff, 1).fillRoundedRect(x, y - 7, w, 14, 7).fillStyle(color, 1).fillRoundedRect(x, y - 7, Math.max(6, w * v), 14, 7);
}

// 小窓。dim を押すか ← で閉じる。L に部品を足していく
export function panel(scene, title, { w = 1100, h = 620, onClose } = {}) {
  const L = scene.add.container(0, 0).setDepth(600).setScrollFactor(0); // 町を よこに動かしても 小窓は 画面に 固定
  const close = () => { L.destroy(); onClose && onClose(); };
  const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setInteractive();
  dim.on("pointerup", close);
  const hit = scene.add.rectangle(W / 2, H / 2, w, h, 0xffffff, 0).setInteractive();
  const bg = scene.add.graphics().fillStyle(0xfffaf2, 1).fillRoundedRect(W / 2 - w / 2, H / 2 - h / 2, w, h, 36);
  L.add([dim, hit, bg, text(scene, W / 2, H / 2 - h / 2 + 46, title, 36, "#7a4a1e")]);
  L.add(button(scene, W / 2 + w / 2 - 50, H / 2 - h / 2 + 46, "back", 44, close, { ring: 0x9fd3e6 }));
  return { L, close, top: H / 2 - h / 2, left: W / 2 - w / 2, w, h };
}

// 押せる白いカード（小窓の中の一覧に使う）
export function card(scene, L, x, y, w, h, onTap, color = 0xffffff) {
  const g = scene.add.graphics().fillStyle(color, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 20);
  const z = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
  z.on("pointerdown", () => { g.setAlpha(0.7); scene.time.delayedCall(120, () => g.active && g.setAlpha(1)); }); // 押した手ごたえ
  z.on("pointerup", onTap);
  L.add([g, z]);
  return g;
}

// AIで描いた背景（tools/gen_scenes.py の bg_<key>）を上の帯の下いっぱいに敷く。
// veil は白いうすい幕（文字やカードを読みやすくする）。絵がまだなければ何もせず false を返す（各画面が前の描き方で出す）
export function backdrop(scene, key, veil = 0) {
  if (!scene.textures.exists("bg_" + key)) return false;
  scene.add.image(0, 84, "bg_" + key).setOrigin(0).setDisplaySize(W, H - 84);
  if (veil) scene.add.rectangle(0, 84, W, H - 84, 0xffffff, veil).setOrigin(0);
  return true;
}

// はじめての案内：はずむ指（👆）と 短い ふきだし。字が読めない子にも「ここを押す」が分かるように（2026-10-16）
export function guide(scene, x, y, msg, depth = 650) {
  if (scene._guide) scene._guide.destroy();
  if (x == null) { scene._guide = null; return null; }
  const c = scene.add.container(x, y).setDepth(depth);
  const finger = text(scene, 0, 34, "👆", 56);
  const t = text(scene, 0, 92, msg, 20, "#ffffff", { stroke: "#c0392b", strokeThickness: 7 });
  const ring = scene.add.circle(0, 0, 36).setStrokeStyle(5, 0xffe28a, 1);
  const half = t.width / 2 + 10; // 画面の はしで 字が 切れないように ずらす
  if (x + half > W) t.x = W - half - x; else if (x - half < 0) t.x = half - x;
  c.add([ring, finger, t]);
  scene.tweens.add({ targets: finger, y: 20, duration: 420, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  scene.tweens.add({ targets: ring, scale: { from: 0.8, to: 1.3 }, alpha: { from: 1, to: 0 }, duration: 900, repeat: -1 });
  scene._guide = c;
  return c;
}
