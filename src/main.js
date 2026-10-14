// 画面の登録と Phaser の設定。並び順が重なり順になる（Clock を最後に置き、夕方の色を一番上にかける）。
import { Boot } from "./scenes/Boot.js";
import { Who } from "./scenes/Who.js";
import { Shop } from "./scenes/Shop.js";
import { Departure } from "./scenes/Departure.js";
import { MapScene } from "./scenes/Map.js";
import { Scoop } from "./scenes/Scoop.js";
import { Night } from "./scenes/Night.js";
import { Clock } from "./scenes/Clock.js";
import { Report } from "./scenes/Report.js";
import { Zukan } from "./scenes/Zukan.js";
import { W, H } from "./ui/kit.js";

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#2b6f8f",
  banner: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  input: { activePointers: 2 },
  scene: [Boot, Who, Shop, Departure, MapScene, Scoop, Zukan, Report, Night, Clock],
});

// 全画面表示。ブラウザは「人が触ったとき」にしか全画面を許さないので、タッチのたびに
// 全画面でなければ切り替える（Silk のように住所欄が残るブラウザ向け。抜けても次のタッチで戻る）。
// ホーム画面から開いて既に全画面のときと、手元の開発中は何もしない。
function goFullscreen() {
  const el = document.documentElement;
  const standalone = matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches;
  if (document.fullscreenElement || standalone || isDevHost() || !el.requestFullscreen) return;
  if (!document.getElementById("parent").hidden) return; // おとなの設定で文字を打っている間は切り替えない
  el.requestFullscreen({ navigationUI: "hide" })
    .then(() => screen.orientation?.lock?.("landscape").catch(() => {}))
    .catch(() => {});
}
function isDevHost() { return ["localhost", "127.0.0.1"].includes(location.hostname); }
document.addEventListener("pointerup", goFullscreen);

// オフラインで動くよう、控えを作る係を登録する。手元の開発サーバーでは古い控えが邪魔になるので登録しない
const isDev = ["localhost", "127.0.0.1"].includes(location.hostname);
if (isDev) import("./store.js").then(m => { window.__kas = { game, store: m.store }; }); // 手元での動作確認用
if ("serviceWorker" in navigator && location.protocol === "https:" && !isDev) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
