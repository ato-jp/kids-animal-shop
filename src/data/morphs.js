// 色変わり（第2弾・赤ちゃん。2026-10-16）。生き物ごとに 現実にいる色変わりだけ（出典は docs/creature-sources.md の末尾）。
// base は 絵そのままの色の名前、list は 色変わり（paint は 明るさの絵を塗る色。logic と ui/kit.js の creature）。
// wild は 釣った・いちばで買った子の 色の出かた（合わせて1。書いていない残りは base）。
// 交配では 血統くじ（logic/breed.js）で 親や先祖の色が出る。
import { AQUATIC } from "./aquatic.js";

const aq = name => AQUATIC.find(a => a.name.startsWith(name))?.id;

export const MORPHS = {
  // 柴犬：赤が多く、黒（タン入り）・胡麻・白もいる
  dog: { base: "あか", list: { kuro: { name: "くろ", paint: 0x3a3030 }, goma: { name: "ごま", paint: 0x8a6a48 }, shiro: { name: "しろ", paint: 0xf3eee6 } }, wild: { kuro: 0.1, goma: 0.04, shiro: 0.06 } },
  // 猫：絵は三毛。茶トラ・黒・白
  cat: { base: "みけ", list: { chatora: { name: "ちゃとら", paint: 0xf2a35a }, kuro: { name: "くろ", paint: 0x333338 }, shiro: { name: "しろ", paint: 0xf5f5f5 } }, wild: { chatora: 0.25, kuro: 0.15, shiro: 0.1 } },
  // うさぎ：絵は茶と白。ブラック（セルフ）
  rabbit: { base: "ちゃいろ", list: { kuro: { name: "くろ", paint: 0x3a3634 } }, wild: { kuro: 0.15 } },
  // ハムスター：絵は ゴールデン（うす茶×白）。ブラック
  hamster: { base: "ゴールデン", list: { kuro: { name: "くろ", paint: 0x3a3634 } }, wild: { kuro: 0.08 } },
  // メダカ：野生型（クロメダカ）。ヒメダカ・楊貴妃（朱赤）は改良品種
  [aq("メダカ")]: { base: "メダカ", list: { kuro: { name: "クロメダカ", paint: 0x6f7560 }, hime: { name: "ヒメダカ", paint: 0xffb347 }, youkihi: { name: "ようきひ", paint: 0xff6a3a } }, wild: { kuro: 0.85, hime: 0.12, youkihi: 0.03 } },
  // アメリカザリガニ：赤いのが ふつう。青い子は 色素を作る材料や 遺伝で まれに
  [aq("ザリガニ")]: { base: "あか", list: { ao: { name: "あお", paint: 0x4a7ad0 } }, wild: { ao: 0.02 } },
};

// 赤ちゃんが生まれる生き物（家で増やせる と よく知られている もの）。litter は 1回に生まれる数の いちばん多いとき
export const BREEDS = {
  // どうぶつえんの子（2026-10-16 追加。数は よく知られた1回の出産・産卵の数をもとに ゲーム用に丸めた。出典は未確認）
  penguin: { litter: 2 }, seal: { litter: 1 }, lion: { litter: 3 }, tiger: { litter: 3 }, zebra: { litter: 1 }, giraffe: { litter: 1 }, elephant: { litter: 1 },
  hamster: { litter: 3 }, rabbit: { litter: 2 }, cat: { litter: 2 }, dog: { litter: 2 },
  [aq("メダカ")]: { litter: 3 }, [aq("グッピー")]: { litter: 3 }, [aq("ザリガニ")]: { litter: 3 }, [aq("ウーパールーパー")]: { litter: 2 },
  [aq("リュウキン")]: { litter: 2 }, [aq("ランチュウ")]: { litter: 2 }, [aq("カクレクマノミ")]: { litter: 2 },
};
