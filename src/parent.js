// おとなの設定。文字の入力があるので Phaser ではなく HTML で作り、画面の上に重ねる。
import { store } from "./store.js";
import { renamePlace } from "./logic/state.js";
import { extend, remaining, isNight } from "./logic/playclock.js";
import { ANIMALS } from "./data/animals.js";
import { PLACES } from "./data/places.js";

const MINUTES = [10, 15, 20, 30, 45, 60, 0];
const KID_ICONS = ["hamster", "rabbit", "dog", "cat", "penguin", "lion"];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function openParent(scene) {
  const el = document.getElementById("parent");
  store.paused = true;
  scene.game.input.enabled = false;

  function render() {
    const kid = store.kid, shop = store.shop, today = store.today();
    const left = shop ? remaining(shop, today) : 0;
    const leftText = left === Infinity ? "せいげん なし" : `のこり ${Math.ceil(left / 60)} ぷん`;
    el.innerHTML = `
      <div class="p-card">
        <h2>おとなの せってい</h2>
        ${kid ? `
        <section>
          <h3>いまの おみせ</h3>
          <label>なまえ <input id="p-name" value="${esc(kid.name)}" maxlength="10" placeholder="(なまえ なし)"></label>
          <div class="p-icons">${KID_ICONS.map(k => `<button type="button" data-icon="${k}" class="${kid.icon === k ? "on" : ""}" aria-label="${ANIMALS[k].name}"><img src="assets/emoji/${k}.png" alt=""></button>`).join("")}</div>
          <label>1にち に あそぶ じかん
            <select id="p-min">${MINUTES.map(m => `<option value="${m}" ${shop.playMinutes === m ? "selected" : ""}>${m ? m + " ぷん" : "せいげん なし"}</option>`).join("")}</select>
          </label>
          <p class="p-left">きょう: ${leftText}　<button type="button" id="p-ext">あと 10ぷん あそぶ</button></p>
        </section>
        <section>
          <h3>おくりさきの なまえ</h3>
          ${Object.keys(PLACES).map(id => `<label class="p-place"><img src="assets/emoji/${PLACES[id].kind === "zoo" ? "lion" : "dolphin"}.png" alt=""><input data-place="${id}" value="${esc(shop.places[id].name)}" maxlength="20"></label>`).join("")}
        </section>` : ""}
        <section>
          <h3>かぞく</h3>
          <label class="p-check"><input type="checkbox" id="p-sound" ${store.family.settings.sound ? "checked" : ""}> こうかおん</label>
          <ul class="p-kids">${Object.entries(store.family.kids).map(([id, k]) => `<li><img src="assets/emoji/${k.icon}.png" alt=""> ${esc(k.name || "(なまえ なし)")} <button type="button" data-del="${id}">けす</button></li>`).join("")}</ul>
        </section>
        <button type="button" id="p-close" class="p-close">とじる</button>
        <p class="p-credit">絵: Microsoft Fluent Emoji（MIT License）／ Phaser（MIT License）</p>
      </div>`;

    el.querySelector("#p-close").onclick = close;
    el.querySelector("#p-sound").onchange = e => { store.family.settings.sound = e.target.checked; store.persist(); };
    el.querySelectorAll("[data-del]").forEach(b => {
      b.onclick = () => {
        // 1回目は確認に変わるだけ。5秒以内にもう一度押したら消す
        if (b.dataset.armed) { delete store.family.kids[b.dataset.del]; if (!store.kid) store.family.current = Object.keys(store.family.kids)[0] || null; store.persist(); render(); return; }
        b.dataset.armed = "1"; b.textContent = "ほんとうに けす"; b.classList.add("danger");
        setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "けす"; b.classList.remove("danger"); } }, 5000);
      };
    });
    if (!kid) return;
    el.querySelector("#p-name").onchange = e => { kid.name = e.target.value.trim(); store.persist(); };
    el.querySelectorAll("[data-icon]").forEach(b => { b.onclick = () => { kid.icon = b.dataset.icon; store.persist(); render(); }; });
    el.querySelector("#p-min").onchange = e => { store.setShop({ ...store.shop, playMinutes: Number(e.target.value) }); render(); };
    el.querySelector("#p-ext").onclick = () => { store.setShop(extend(store.shop, 10, store.today())); render(); };
    el.querySelectorAll("[data-place]").forEach(i => { i.onchange = () => { store.setShop(renamePlace(store.shop, i.dataset.place, i.value)); }; });
  }

  function close() {
    el.hidden = true;
    el.innerHTML = "";
    store.paused = false;
    scene.game.input.enabled = true;
    // 消した・時間を延ばした、などに合わせて行き先を決め直す
    if (!store.kid) { stopPlay(scene); scene.scene.start("Who"); return; }
    if (scene.scene.key === "Night" && !isNight(store.shop, store.today())) { scene.scene.start("Shop"); return; }
    scene.events.emit("refresh");
  }

  render();
  el.hidden = false;
}

export const PLAY_SCENES = ["Shop", "Departure", "Map", "Scoop", "Zukan"];
export function stopPlay(scene) { for (const k of [...PLAY_SCENES, "Night", "Report"]) if (k !== scene.scene.key && scene.scene.isActive(k)) scene.scene.stop(k); }
