// 「だれ？」：写真（または動物）の顔を押して自分を選び、町へ。字が読めなくても選べる。
// 子どもを足すのは「＋」：カメラ（インカメ）が開き、撮った顔がアイコンになる。撮らずに戻ったときは動物の絵から選ぶ。
// 写真は 128px に縮めて端末の中（IndexedDB）にだけ保存し、外へは出さない。名前は おとなの設定で入れる。
import { store } from "../store.js";
import { addKid } from "../logic/save.js";
import { W, H, text, button, kidFace, parentGate, panel } from "../ui/kit.js";
import { openParent, shrink } from "../parent.js";
import { addPhoto } from "./Boot.js";
import { sfx } from "../sound/sfx.js";

const MAX_KIDS = 4;
const COLORS = ["#ff9f80", "#8fd3ff", "#b9e88f", "#ffd36e"];
const KID_ICONS = ["hamster", "rabbit", "dog", "cat", "penguin", "lion"];

export class Who extends Phaser.Scene {
  constructor() { super("Who"); }
  create() {
    this.cameras.main.setBackgroundColor("#fff3e0");
    text(this, W / 2, 110, "だれが あそぶ？", 60, "#7a4a1e");
    const kids = Object.entries(store.family.kids);
    const items = kids.map(([id, k]) => ({ id, k }));
    if (kids.length < MAX_KIDS) items.push({ add: true });
    const gap = 270, x0 = W / 2 - ((items.length - 1) * gap) / 2;
    items.forEach((it, i) => {
      const x = x0 + i * gap, y = 370;
      if (it.add) { button(this, x, y, "plus", 110, () => { sfx.pop(); this.pickIcon(kids.length); }, { ring: 0xdddddd }); return; }
      const face = kidFace(this, x, y, it.id, it.k, 190);
      face.setSize(210, 210).setInteractive({ useHandCursor: true });
      face.on("pointerup", () => this.enter(it.id));
      text(this, x, y + 140, it.k.name || "", 38, "#7a4a1e");
    });
    parentGate(this, W - 50, H - 50, () => openParent(this));
    this.events.on("refresh", () => this.scene.restart());
  }
  pickIcon(n) {
    // 先にカメラを開く。うしろには動物えらびを出しておき、撮らずに戻ったら そこから選べる
    const P = panel(this, "しゃしんを とるか、どうぶつを えらんでね", { w: 1000, h: 440 });
    const make = (icon, photo) => {
      const r = addKid(store.family, { name: "", icon, color: COLORS[n % COLORS.length] }, Date.now());
      r.family.kids[r.id].photo = photo;
      r.family.current = r.id;
      store.setFamily(r.family);
      return r.id;
    };
    P.L.add(button(this, W / 2 - 375, H / 2 + 20, "boy", 110, () => this.camera(make, P)));
    P.L.add(text(this, W / 2 - 375, H / 2 + 100, "しゃしん", 22, "#7a4a1e"));
    KID_ICONS.forEach((k, i) => {
      P.L.add(button(this, W / 2 - 225 + i * 120, H / 2 + 20, k, 96, () => { sfx.star(); this.enter(make(k, null)); }));
    });
    this.camera(make, P);
  }

  // インカメで撮る（capture="user"）。撮れたら 128px に縮めて その子の顔にする
  camera(make, P) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "user";
    input.onchange = async () => {
      const f = input.files && input.files[0];
      if (!f) return;
      try {
        const photo = await shrink(f);
        const id = make(KID_ICONS[Math.floor(Math.random() * KID_ICONS.length)], photo);
        await addPhoto(this, id, photo);
        P.close();
        sfx.star();
        this.enter(id);
      } catch (e) { sfx.no(); }
    };
    input.click();
  }
  enter(id) {
    sfx.pop();
    store.family.current = id;
    store.persist();
    store.tick();
    this.scene.start("Town");
  }
}
