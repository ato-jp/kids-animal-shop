// どの画面にも出す上の帯：自分の顔（押すと だれ？）・お金・日付と季節と時刻・天気・町へもどる。
import { store } from "../store.js";
import { W, text, img, button, kidFace, coin, pixelFrame } from "./kit.js";
import { season, timeOfDay, SEASONS } from "../logic/time.js";
import { weatherNow, WEATHER_NAME } from "../weather.js";
import { sfx } from "../sound/sfx.js";

const WEATHER_ICON = ["sun", "cloud", "water"];

export function topBar(scene, { back = true } = {}) {
  if (scene.pixelUI) pixelFrame(scene.add.graphics().setDepth(500), -4, -4, W + 8, 88, 0xf6dfb8, 0x5a3a24); // 町（版3）：ドットの 帯
  else scene.add.graphics().fillStyle(0xf6dfb8, 1).fillRect(0, 0, W, 84).setDepth(500);
  const id = store.family.current, kid = store.kid;
  const face = kidFace(scene, 46, 42, id, kid, 64).setDepth(501).setSize(76, 76).setInteractive({ useHandCursor: true });
  face.on("pointerup", () => { sfx.pop(); scene.scene.start("Who"); });
  scene.add.graphics().setDepth(500).fillStyle(0xffffff, 0.92).fillRoundedRect(92, 12, 250, 60, 30).fillRoundedRect(358, 12, 470, 60, 30);
  img(scene, 122, 42, "coin", 44).setDepth(501);
  const money = text(scene, 150, 44, "", 30, "#7a4a1e").setOrigin(0, 0.5).setDepth(501);
  const wicon = img(scene, 392, 42, "sun", 44).setDepth(501);
  const clock = text(scene, 420, 44, "", 26, "#7a4a1e").setOrigin(0, 0.5).setDepth(501);
  if (back) button(scene, W - 56, 42, "back", 48, () => { sfx.pop(); scene.scene.start("Town"); }, { ring: 0x9fd3e6 }).setDepth(501);

  const draw = () => {
    const s = store.shop, now = Date.now();
    if (!s) return;
    const d = new Date(now), sea = season(s.startedAt, now), w = weatherNow(now, sea);
    money.setText(coin(s.money));
    const wName = w === 2 && sea === 3 ? "ゆき" : WEATHER_NAME[w];
    // アイコン：冬の雨は雪、夜の晴れは月
    wicon.setTexture(w === 2 && sea === 3 ? "ice" : w === 0 && timeOfDay(now) === 3 ? "moon" : scene.textures.exists(WEATHER_ICON[w]) ? WEATHER_ICON[w] : "sun");
    clock.setText(`${SEASONS[sea]}  ${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}  ${wName}`);
  };
  draw();
  const timer = scene.time.addEvent({ delay: 1000, loop: true, callback: draw });
  const onW = () => draw();
  scene.game.events.on("weather", onW);
  scene.events.once("shutdown", () => { timer.remove(); scene.game.events.off("weather", onW); });
  return { draw };
}
