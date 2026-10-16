// 外の景色に「いまの時刻と天気」をのせる：朝はやわらかい光、夕方は橙、夜は暗い青。くもりは灰色、雨は雨つぶ（ゲームが冬なら雪）。
// 色は掛け算（MULTIPLY）で重ねるので、絵の明るい所ほど色が残る。1分ごとと、天気が変わったときに描き直す。
// 呼んだ時点までに足した物だけが暗くなる（名前の札など読ませたい物は、このあとに足す）。
import { store } from "../store.js";
import { timeOfDay, season } from "../logic/time.js";
import { weatherNow } from "../weather.js";
import { W, H } from "./kit.js";

const TIME_TINT = [[0xfff0d8, 0.25], null, [0xffb070, 0.45], [0x34406e, 0.62]]; // 朝・昼・夕・夜
const CLOUD_TINT = [0xb8c0c8, 0.35];

export function ambient(scene, { top = 84, indoor = false, depth = 0 } = {}) {
  const tint = scene.add.rectangle(0, top, W, H - top, 0xffffff, 0).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(depth);
  const gray = scene.add.rectangle(0, top, W, H - top, 0xffffff, 0).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(depth);
  let fall = null;
  const draw = () => {
    const now = Date.now(), s = store.shop, sea = s ? season(s.startedAt, now) : 0;
    const tod = timeOfDay(now), w = indoor ? 0 : weatherNow(now, sea);
    // 室内は夜でも明かりがつくので、少しだけ暗くする
    const t = TIME_TINT[tod];
    if (t) tint.setFillStyle(t[0], indoor ? t[1] * 0.35 : t[1]); else tint.setFillStyle(0xffffff, 0);
    if (w >= 1) gray.setFillStyle(CLOUD_TINT[0], CLOUD_TINT[1] * (w === 2 ? 1.3 : 1)); else gray.setFillStyle(0xffffff, 0);
    if (fall) { fall.destroy(); fall = null; }
    if (w === 2) fall = precipitation(scene, top, sea === 3);
  };
  draw();
  const timer = scene.time.addEvent({ delay: 60 * 1000, loop: true, callback: draw });
  scene.game.events.on("weather", draw);
  scene.events.once("shutdown", () => { scene.game.events.off("weather", draw); timer.remove(); });
  return { draw };
}

// 雨つぶ（冬は雪）。小さな絵を その場で作り、パーティクルで降らせる
function precipitation(scene, top, snow) {
  const key = snow ? "fx_snow" : "fx_rain";
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    if (snow) g.fillStyle(0xffffff, 0.95).fillCircle(4, 4, 4).generateTexture(key, 8, 8);
    else g.fillStyle(0xdfeefa, 0.7).fillRect(0, 0, 2, 18).generateTexture(key, 2, 18);
    g.destroy();
  }
  return scene.add.particles(0, top - 20, key, {
    x: { min: -100, max: W + 100 }, lifespan: snow ? 7000 : 1200,
    speedY: snow ? { min: 60, max: 110 } : { min: 700, max: 900 }, speedX: snow ? { min: -30, max: 30 } : { min: -80, max: -60 },
    scale: snow ? { min: 0.5, max: 1.2 } : 1, alpha: snow ? 0.9 : 0.6, frequency: snow ? 40 : 12, quantity: snow ? 1 : 2,
  }).setDepth(400);
}
