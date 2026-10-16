// 起動：絵を読み込み、記録を IndexedDB から読み、子どもの写真を絵として登録してから「だれ？」へ。
import { text, W, H } from "../ui/kit.js";
import { EMOJI_KEYS } from "../data/emoji.js";
import { AQUATIC_IMAGES } from "../data/aquatic_images.js";
import { SCENE_IMAGES } from "../data/scene_images.js";
import { ANIMAL_IMAGES } from "../data/animal_images.js";
import { store } from "../store.js";

export class Boot extends Phaser.Scene {
  constructor() { super("Boot"); }
  preload() {
    text(this, W / 2, H / 2 - 40, "よみこみちゅう…", 40, "#ffffff");
    const bar = this.add.graphics();
    this.load.on("progress", v => bar.clear().fillStyle(0xffffff, 0.25).fillRoundedRect(W / 2 - 300, H / 2 + 20, 600, 22, 11).fillStyle(0xffe28a, 1).fillRoundedRect(W / 2 - 300, H / 2 + 20, Math.max(22, 600 * v), 22, 11));
    for (const k of EMOJI_KEYS) this.load.image(k, `assets/emoji/${k}.png`);
    // 水の生き物の絵（できているものだけ。ない絵は creature() が魚の絵文字で代わりに描く）
    for (const id of Object.keys(AQUATIC_IMAGES)) this.load.image("aq_" + id, `assets/aquatic/${id}.png`);
    // 背景と建物の絵（tools/gen_scenes.py。ない絵は各画面が前の描き方で代わりに出す）
    for (const k of Object.keys(ANIMAL_IMAGES)) this.load.image("an_" + k, `assets/animals/${k}.png`);
    for (const k of SCENE_IMAGES.scenes) this.load.image("bg_" + k, `assets/scenes/${k}.jpg`);
    for (const k of SCENE_IMAGES.buildings) this.load.image("bd_" + k, `assets/buildings/${k}.png`);
    for (const k of SCENE_IMAGES.town || []) this.load.image("tn_" + k, `assets/town/${k}.png`);
    for (const k of SCENE_IMAGES.people || []) this.load.image("pp_" + k, `assets/people/${k}.png`); // お店を歩く お客さん // 町（見下ろし）の建物と飾り
  }
  async create() {
    await store.load();
    const photos = Object.entries(store.family.kids).filter(([, k]) => k.photo);
    await Promise.all(photos.map(([id, k]) => addPhoto(this, id, k.photo)));
    this.scene.launch("Clock");
    this.scene.start("Who");
  }
}

// 写真（data URL）を絵として登録する。登録が終わるまで待つ
export function addPhoto(scene, id, dataUrl) {
  const key = "kid_" + id;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  return new Promise(res => {
    scene.textures.once("addtexture-" + key, res);
    scene.textures.addBase64(key, dataUrl);
    setTimeout(res, 3000);
  });
}
