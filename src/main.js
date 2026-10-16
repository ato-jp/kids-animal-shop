// 画面の登録と Phaser の設定。並び順が重なり順になる。
import { Boot } from "./scenes/Boot.js";
import { Who } from "./scenes/Who.js";
import { Town } from "./scenes/Town.js";
import { Shop } from "./scenes/Shop.js";
import { Market } from "./scenes/Market.js";
import { Station } from "./scenes/Station.js";
import { Vet } from "./scenes/Vet.js";
import { Farm } from "./scenes/Farm.js";
import { Spots } from "./scenes/Spots.js";
import { Fishing } from "./scenes/Fishing.js";
import { Zukan } from "./scenes/Zukan.js";
import { PenView } from "./scenes/PenView.js";
import { Board } from "./scenes/Board.js";
import { Zoo } from "./scenes/Zoo.js";
import { Clock } from "./scenes/Clock.js";
import { W, H } from "./ui/kit.js";

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#2b6f8f",
  banner: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  input: { activePointers: 2 },
  scene: [Boot, Who, Town, Shop, Market, Station, Vet, Farm, Spots, Fishing, Zukan, PenView, Board, Zoo, Clock],
});

// どの画面も 入るとき 0.16秒で ふわっと出す（市販のゲームらしい 切りかえ）
game.events.once("ready", () => {
  for (const sc of game.scene.scenes) if (sc.sys.settings.key !== "Clock") sc.events.on("create", () => sc.cameras.main.fadeIn(160, 255, 248, 236));
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
  // 前の版が 動いていて 新しい版の 控えが できたら、その場で 1回 読みなおす（子どもが 2回 開かなくても 新しい版に なる）
  const had = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (had && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(r => r.update()).catch(() => {});
}
