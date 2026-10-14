// 画面の登録と Phaser の設定。並び順が重なり順になる（Clock を最後に置き、夕方の色を一番上にかける）。
import { Boot } from "./scenes/Boot.js";
import { Who } from "./scenes/Who.js";
import { Shop } from "./scenes/Shop.js";
import { Departure } from "./scenes/Departure.js";
import { MapScene } from "./scenes/Map.js";
import { Scoop } from "./scenes/Scoop.js";
import { Night } from "./scenes/Night.js";
import { Clock } from "./scenes/Clock.js";
import { W, H } from "./ui/kit.js";

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#2b6f8f",
  banner: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  input: { activePointers: 2 },
  scene: [Boot, Who, Shop, Departure, MapScene, Scoop, Night, Clock],
});

// オフラインで動くよう、控えを作る係を登録する。手元の開発サーバーでは古い控えが邪魔になるので登録しない
const isDev = ["localhost", "127.0.0.1"].includes(location.hostname);
if (isDev) import("./store.js").then(m => { window.__kas = { game, store: m.store }; }); // 手元での動作確認用
if ("serviceWorker" in navigator && location.protocol === "https:" && !isDev) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
