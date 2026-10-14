import { text, W, H } from "../ui/kit.js";

export const EMOJI_KEYS = [
  "hamster", "rabbit", "dog", "cat", "penguin", "lion", "tropical", "fish", "blowfish", "dolphin",
  "sunflower", "carrot", "bone", "canned", "meat", "shrimp", "soap", "broom", "kuri", "star", "heart",
  "sparkles", "bubbles", "zzz", "moon", "truck", "ship", "farmer", "pole", "japan", "back", "plus", "gear",
  "elephant", "leafy", "fork", "water", "sick", "vet", "coin", "cart", "book", "house", "ice", "park", "hammer", "sun", "chart", "no",
];

export class Boot extends Phaser.Scene {
  constructor() { super("Boot"); }
  preload() {
    text(this, W / 2, H / 2, "よみこみちゅう…", 40, "#ffffff");
    for (const k of EMOJI_KEYS) this.load.image(k, `assets/emoji/${k}.png`);
  }
  create() {
    this.scene.launch("Clock");
    this.scene.start("Who");
  }
}
