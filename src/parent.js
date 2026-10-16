// おとなの設定（歯車を3秒長押し）。文字の入力やファイルを扱うので Phaser ではなく HTML で重ねる。
// できること：子どもの名前・顔写真・動物の絵／1日に遊ぶ時間・延長／送り先の園の名前／音／子どもを消す／記録の控え。
// 写真は 128px に縮めて端末の中（IndexedDB）にだけ保存し、外へは出さない。
import { store } from "./store.js";
import { renamePlace } from "./logic/shop.js";
import { ANIMALS } from "./data/animals.js";
import { PLACES } from "./data/places.js";
import { addPhoto } from "./scenes/Boot.js";

const KID_ICONS = ["hamster", "rabbit", "dog", "cat", "penguin", "lion"];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// 写真を 128px の丸（PNG）に縮める
export function shrink(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement("canvas"), n = 128, s = Math.min(im.width, im.height);
        c.width = c.height = n;
        // 顔は丸く出すので、ここで丸く切り抜く（まわりは透明。透明を残すため PNG）
        const g = c.getContext("2d");
        g.beginPath(); g.arc(n / 2, n / 2, n / 2, 0, Math.PI * 2); g.clip();
        g.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, n, n);
        res(c.toDataURL("image/png"));
      };
      im.onerror = rej;
      im.src = r.result;
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function openParent(scene) {
  const el = document.getElementById("parent");
  store.paused = true;
  scene.game.input.enabled = false;

  function render() {
    const kid = store.kid, shop = store.shop;
    el.innerHTML = `
      <div class="p-card">
        <h2>おとなの せってい</h2>
        ${kid ? `
        <section>
          <h3>いまの子</h3>
          <label>なまえ <input id="p-name" value="${esc(kid.name)}" maxlength="10" placeholder="(なまえ なし)"></label>
          <label>かおの しゃしん <input id="p-photo" type="file" accept="image/*">${kid.photo ? `<img class="p-photo" src="${kid.photo}" alt="">` : ""}</label>
          ${kid.photo ? `<button type="button" id="p-photo-del">しゃしんを けす</button>` : ""}
          <div class="p-icons">${KID_ICONS.map(k => `<button type="button" data-icon="${k}" class="${kid.icon === k ? "on" : ""}" aria-label="${ANIMALS[k].name}"><img src="assets/emoji/${k}.png" alt=""></button>`).join("")}</div>
        </section>
        <section>
          <h3>おくりさきの なまえ</h3>
          ${Object.keys(PLACES).map(id => `<label class="p-place"><img src="assets/emoji/${PLACES[id].kind === "zoo" ? "lion" : "dolphin"}.png" alt=""><input data-place="${id}" value="${esc(shop.places[id].name)}" maxlength="20"></label>`).join("")}
        </section>` : ""}
        <section>
          <h3>かぞく</h3>
          <label class="p-check"><input type="checkbox" id="p-sound" ${store.family.settings.sound ? "checked" : ""}> こうかおん</label>
          <label class="p-check"><input type="checkbox" id="p-bgm" ${store.family.settings.bgm ? "checked" : ""}> おんがく</label>
          <ul class="p-kids">${Object.entries(store.family.kids).map(([id, k]) => `<li><img src="${k.photo || `assets/emoji/${k.icon}.png`}" alt=""> ${esc(k.name || "(なまえ なし)")} <button type="button" data-del="${id}">けす</button></li>`).join("")}</ul>
        </section>
        <section>
          <h3>きろくの ひかえ</h3>
          <p class="p-note">タブレットの「ダウンロード」に ファイルとして ほぞんします。ときどき パソコンへ うつして おくと あんしんです。しゃしんも ふくみます。</p>
          <button type="button" id="p-export">ひかえを つくる</button>
          <label>ひかえから もどす <input id="p-import" type="file" accept=".json,application/json"></label>
          <p class="p-note" id="p-msg"></p>
        </section>
        <button type="button" id="p-close" class="p-close">とじる</button>
        <p class="p-credit">え: Microsoft Fluent Emoji（MIT License）・Cloudflare Workers AI（FLUX.1 schnell）でつくった え ／ Phaser（MIT License）／ てんき: Open-Meteo</p>
      </div>`;

    const $ = s => el.querySelector(s);
    $("#p-close").onclick = close;
    $("#p-sound").onchange = e => { store.family.settings.sound = e.target.checked; store.persist(); };
    $("#p-bgm").onchange = e => { store.family.settings.bgm = e.target.checked; store.persist(); scene.game.events.emit("bgm"); };
    el.querySelectorAll("[data-del]").forEach(b => {
      b.onclick = () => {
        // 1回目は確認に変わるだけ。5秒以内にもう一度押したら消す
        if (b.dataset.armed) { delete store.family.kids[b.dataset.del]; if (!store.kid) store.family.current = Object.keys(store.family.kids)[0] || null; store.persist(); render(); return; }
        b.dataset.armed = "1"; b.textContent = "ほんとうに けす"; b.classList.add("danger");
        setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "けす"; b.classList.remove("danger"); } }, 5000);
      };
    });
    $("#p-export").onclick = () => {
      const blob = new Blob([store.exportText()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `doubutsu-shop-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      $("#p-msg").textContent = "ひかえを つくりました（ダウンロード）";
    };
    $("#p-import").onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      const ok = await store.importText(await f.text());
      $("#p-msg").textContent = ok ? "もどしました。よみこみなおします…" : "この ファイルは よめませんでした";
      if (ok) setTimeout(() => location.reload(), 800);
    };
    if (!kid) return;
    const id = store.family.current;
    $("#p-name").onchange = e => { kid.name = e.target.value.trim(); store.persist(); };
    $("#p-photo").onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      kid.photo = await shrink(f);
      await store.persist();
      await addPhoto(scene, id, kid.photo);
      render();
    };
    if ($("#p-photo-del")) $("#p-photo-del").onclick = () => { kid.photo = null; store.persist(); render(); };
    el.querySelectorAll("[data-icon]").forEach(b => { b.onclick = () => { kid.icon = b.dataset.icon; store.persist(); render(); }; });
    el.querySelectorAll("[data-place]").forEach(i => { i.onchange = () => store.setShop(renamePlace(store.shop, i.dataset.place, i.value)); });
  }

  function close() {
    el.hidden = true;
    el.innerHTML = "";
    store.paused = false;
    scene.game.input.enabled = true;
    if (!store.kid) { scene.scene.start("Who"); return; }
    scene.scene.restart();
  }

  render();
  el.hidden = false;
}
