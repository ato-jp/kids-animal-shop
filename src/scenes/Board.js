// けいじばん：コルクの板に 依頼の紙が4まい。兄弟で 早いもの勝ち、1人1日2つまで（ルールは logic/board.js）。
import { store } from "../store.js";
import * as S from "../logic/shop.js";
import { boardFor, canFulfill, fulfill, takenBy, doneToday, BOARD_LIMIT } from "../logic/board.js";
import { W, H, text, card, creature, floatText, coin, burst } from "../ui/kit.js";
import { topBar } from "../ui/topbar.js";
import { sfx } from "../sound/sfx.js";
import { bgm } from "../sound/bgm.js";

const VERB = { show: "を みせて", give: "を ゆずって", catch: "を きょう つって きて" };
const HINT = { show: "おみせに いれば かなえられるよ", give: "はんばいよう の さくや すいそうに いれてね", catch: "きょう つったら かなえられるよ" };

export class Board extends Phaser.Scene {
  constructor() { super("Board"); }
  create() {
    bgm.play("town");
    const g = this.add.graphics();
    // コルクの板と 木のわく
    g.fillStyle(0x6b4a2a, 1).fillRoundedRect(40, 110, W - 80, H - 140, 18);
    g.fillStyle(0xc89a63, 1).fillRect(62, 132, W - 124, H - 184);
    for (let k = 0; k < 900; k++) g.fillStyle([0xb3854f, 0xd4a872, 0xa87a46][k % 3], 0.5).fillCircle(62 + ((k * 97) % (W - 124)), 132 + ((k * 53) % (H - 184)), 1.5 + (k % 3));
    topBar(this);
    const now = Date.now(), id = store.family.current;
    text(this, W / 2, 162, `きょうの いらい（ひとり ${BOARD_LIMIT}つまで・はやいもの がち）　きょう やった：${doneToday(store.family, id, now)}`, 20, "#ffffff", { stroke: "#4a2c17", strokeThickness: 6 });
    boardFor(now).forEach((req, i) => this.note(req, 210 + i * 287, 410, i));
  }

  note(req, x, y, i) {
    const now = Date.now(), id = store.family.current;
    const why = canFulfill(store.family, id, req, now), by = takenBy(store.family, req, now);
    const c = this.add.container(x, y).setRotation(((i % 2) * 2 - 1) * 0.03);
    const paper = this.add.graphics();
    paper.fillStyle(0x000000, 0.18).fillRect(-118, -158, 244, 330);
    paper.fillStyle(by ? 0xe9e6dc : 0xfffbea, 1).fillRect(-122, -164, 244, 330);
    paper.fillStyle(0xe2553d, 1).fillCircle(0, -150, 9).fillStyle(0xffffff, 0.6).fillCircle(-3, -153, 3); // ピン
    c.add(paper);
    c.add(text(this, 0, -118, `${req.who} より`, 15, "#7a6a5a"));
    c.add(creature(this, 0, -40, req.kind, 110));
    c.add(text(this, 0, 36, S.species(req.kind).name + VERB[req.type], 19, "#4a2c17", { wordWrap: { width: 220, useAdvancedWrap: true } }));
    c.add(text(this, 0, 86, `おれい ${coin(req.reward)}`, 20, "#2e7d32"));
    const label = by ? (by === id ? "かなえたよ！" : `${store.family.kids[by]?.name || "きょうだい"}が かなえたよ`) : why === "ok" ? "かなえる" : why === "limit" ? "きょうは もう いっぱい" : "まだ";
    const color = by ? 0xd9d9d9 : why === "ok" ? 0x2e9d6a : 0xe8d9b8;
    const btn = this.add.graphics().fillStyle(color, 1).fillRoundedRect(-100, 112, 200, 44, 22);
    c.add([btn, text(this, 0, 134, label, 18, why === "ok" && !by ? "#ffffff" : "#7a4a1e")]);
    const z = this.add.zone(x, y + 134, 200, 44).setInteractive({ useHandCursor: true });
    z.on("pointerup", () => {
      if (by) return;
      if (why !== "ok") { sfx.no(); floatText(this, x, y - 190, why === "limit" ? "きょうは もう 2つ かなえたよ。また あした" : HINT[req.type], "#ffffff"); return; }
      const r = fulfill(store.family, id, req, Date.now());
      if (!r.ok) { sfx.no(); return; }
      store.setFamily(r.family);
      sfx.coin(); burst(this, x, y - 40, "sparkles", 10, 40, 120);
      floatText(this, x, y - 190, `ありがとう！ +${coin(req.reward)}`, "#ffffff");
      this.time.delayedCall(700, () => this.scene.restart());
    });
  }
}
