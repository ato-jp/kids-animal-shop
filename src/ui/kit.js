// 画面で共通に使う部品。どの画面も 1280×720 の座標で描き、端末の大きさには Phaser が合わせる。
import { sfx } from "../sound/sfx.js";

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

export const yen = n => n.toLocaleString("ja-JP") + "えん";

export function moneyCounter(scene, x, y) {
  scene.add.graphics().fillStyle(0xffffff, 0.92).fillRoundedRect(x - 10, y - 34, 230, 68, 34);
  const icon = img(scene, x + 30, y, "coin", 52);
  const t = text(scene, x + 62, y + 2, "", 34, "#7a4a1e").setOrigin(0, 0.5);
  return { icon, t, set(n) { t.setText(yen(n)); }, pos: { x: x + 30, y } };
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
