// tools/build_aquatic.py が docs/design-tables.md と docs/creature-sources.md から書き出す。手で直さない
// area: pond/river/beach/offshore/south/north は釣り場、market は いちば、gift は すいぞくかんからの寄贈
// seasons/times/weathers は src/logic/time.js の番号。tank は要る水槽のレベル（9 は第3弾の大水槽）
export const AQUATIC = [
 {
  "id": "a01",
  "name": "メダカ",
  "kind": "魚",
  "area": "pond",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2
  ],
  "times": [
   1
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "fresh",
  "fact": "はるに みずが あたたかく なると たまごを うむよ。たまごは 10日ほどで かえるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a02",
  "name": "フナ",
  "kind": "魚",
  "area": "pond",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "fresh",
  "fact": "ひげが ない のが コイとの ちがい。はるに あさい ところへ きて たまごを うむよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a03",
  "name": "ザリガニ",
  "kind": "エビ・カニ",
  "area": "pond",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "fresh",
  "fact": "そとの くにから きた いきもの。つかまえたら さいごまで いえで かってね。",
  "noSale": true,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a04",
  "name": "ドジョウ",
  "kind": "魚",
  "area": "pond",
  "rarity": 2,
  "seasons": [
   0,
   1
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 3,
  "water": "fresh",
  "fact": "くちから くうきを すって おなかで いきを する ことが できるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a05",
  "name": "コイ",
  "kind": "魚",
  "area": "pond",
  "rarity": 2,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 10,
  "life": 30,
  "water": "fresh",
  "fact": "くちの まわりに 2たいの ひげが あるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a06",
  "name": "ナマズ",
  "kind": "魚",
  "area": "pond",
  "rarity": 3,
  "seasons": [
   1
  ],
  "times": [
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 50,
  "life": 10,
  "water": "fresh",
  "fact": "ひるは かくれて いて、よるに なると えさを さがして およぐよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a07",
  "name": "ライギョ",
  "kind": "魚",
  "area": "pond",
  "rarity": 3,
  "seasons": [
   1
  ],
  "times": [
   0,
   2
  ],
  "weathers": [
   0
  ],
  "tank": 2,
  "price": 50,
  "life": 10,
  "water": "fresh",
  "fact": "えらの ちかくの とくべつな ところで くうきを すって いきが できるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a08",
  "name": "ニシキゴイ",
  "kind": "魚",
  "area": "pond",
  "rarity": 4,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 300,
  "life": 30,
  "water": "fresh",
  "fact": "にいがたで うまれた いろあざやかな コイ。「およぐ ほうせき」と よばれるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a09",
  "name": "オイカワ",
  "kind": "魚",
  "area": "river",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "fresh",
  "fact": "ゆうがたに みずの うえの むしを ぱくっと たべに くるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a10",
  "name": "ウグイ",
  "kind": "魚",
  "area": "river",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "fresh",
  "fact": "はるに なると からだに オレンジいろの 3ぼんの せんが でるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a11",
  "name": "アユ",
  "kind": "魚",
  "area": "river",
  "rarity": 2,
  "seasons": [
   1,
   2
  ],
  "times": [
   1
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 1,
  "water": "fresh",
  "fact": "うみで そだって、はるに かわを のぼって くるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a12",
  "name": "ヤマメ",
  "kind": "魚",
  "area": "river",
  "rarity": 2,
  "seasons": [
   0,
   1
  ],
  "times": [
   0
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 3,
  "water": "fresh",
  "fact": "からだの よこに だえんの もようが ならぶよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a13",
  "name": "サワガニ",
  "kind": "エビ・カニ",
  "area": "river",
  "rarity": 2,
  "seasons": [
   1
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 3,
  "water": "fresh",
  "fact": "いっしょう かわで くらす カニ。いしの したに かくれて いるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a14",
  "name": "モクズガニ",
  "kind": "エビ・カニ",
  "area": "river",
  "rarity": 2,
  "seasons": [
   2
  ],
  "times": [
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 3,
  "water": "fresh",
  "fact": "はさみに ふさふさの けが はえて いて、もくず（みずくさの くず）みたいに みえるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a15",
  "name": "イワナ",
  "kind": "魚",
  "area": "river",
  "rarity": 3,
  "seasons": [
   0,
   1,
   2
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   1,
   2
  ],
  "tank": 1,
  "price": 50,
  "life": 3,
  "water": "fresh",
  "fact": "ヤマメより もっと かわの うえの ほう、つめたい みずに すむよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a16",
  "name": "ウナギ",
  "kind": "魚",
  "area": "river",
  "rarity": 3,
  "seasons": [
   0,
   1,
   2
  ],
  "times": [
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 50,
  "life": 10,
  "water": "fresh",
  "fact": "うみの とおくで うまれて かわへ やって くる。いま かずが へって いて、だいじに したい さかなだよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": true
 },
 {
  "id": "a17",
  "name": "サクラマス",
  "kind": "魚",
  "area": "river",
  "rarity": 4,
  "seasons": [
   0
  ],
  "times": [
   0
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 300,
  "life": 10,
  "water": "fresh",
  "fact": "ヤマメと おなじ なかま。うみで おおきく そだつと サクラマスに なるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a18",
  "name": "アジ",
  "kind": "魚",
  "area": "beach",
  "rarity": 1,
  "seasons": [
   1,
   2
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "sea",
  "fact": "しっぽの ちかくに 「ぜいご」と いう とげの ような かたい うろこが ならぶよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a19",
  "name": "サバ",
  "kind": "魚",
  "area": "beach",
  "rarity": 1,
  "seasons": [
   1,
   2
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "sea",
  "fact": "せなかに くねくねした もようが あって、おなかは ぎんいろだよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a20",
  "name": "キス",
  "kind": "魚",
  "area": "beach",
  "rarity": 1,
  "seasons": [
   1,
   2
  ],
  "times": [
   1
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "sea",
  "fact": "すなの うみの そこで くらす。「うみの じょおう」と よばれる ことも あるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a21",
  "name": "カサゴ",
  "kind": "魚",
  "area": "beach",
  "rarity": 2,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 3,
  "water": "sea",
  "fact": "ひるは いわの すきまに かくれて、よるに おおきな くちで えものを まるのみ するよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a22",
  "name": "メバル",
  "kind": "魚",
  "area": "beach",
  "rarity": 2,
  "seasons": [
   0,
   1,
   3
  ],
  "times": [
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 3,
  "water": "sea",
  "fact": "はるを つげる さかな。おおきな めで くらい よるに えさを さがすよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a23",
  "name": "フグ",
  "kind": "魚",
  "area": "beach",
  "rarity": 2,
  "seasons": [
   1
  ],
  "times": [
   1
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 3,
  "water": "sea",
  "fact": "からだに つよい どくが ある。つれても たべては いけないよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a24",
  "name": "アナゴ",
  "kind": "魚",
  "area": "beach",
  "rarity": 2,
  "seasons": [
   1
  ],
  "times": [
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 10,
  "life": 10,
  "water": "sea",
  "fact": "ひるは かくれて いて、よるに えさを さがすよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a25",
  "name": "マダコ",
  "kind": "イカ・タコ・貝",
  "area": "beach",
  "rarity": 3,
  "seasons": [
   1
  ],
  "times": [
   1
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 50,
  "life": 1.5,
  "water": "sea",
  "fact": "8ほんの あしで いわに くっつく。ばしょに よっては とっては いけない きまりが あるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a26",
  "name": "クロダイ",
  "kind": "魚",
  "area": "beach",
  "rarity": 4,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 300,
  "life": 10,
  "water": "sea",
  "fact": "なんでも たべる。スイカを たべる ことも あるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a27",
  "name": "スルメイカ",
  "kind": "イカ・タコ・貝",
  "area": "offshore",
  "rarity": 1,
  "seasons": [
   1,
   2
  ],
  "times": [
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 4.5,
  "life": 1,
  "water": "sea",
  "fact": "あかるい ひかりに あつまる イカ。よるの うみで とれるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a28",
  "name": "カワハギ",
  "kind": "魚",
  "area": "offshore",
  "rarity": 2,
  "seasons": [
   2,
   3
  ],
  "times": [
   0,
   1
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 15.0,
  "life": 3,
  "water": "sea",
  "fact": "ざらざらの かわを はいで りょうりする から カワハギと いう なまえに なったよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a29",
  "name": "アオリイカ",
  "kind": "イカ・タコ・貝",
  "area": "offshore",
  "rarity": 2,
  "seasons": [
   2
  ],
  "times": [
   0,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 15.0,
  "life": 10,
  "water": "sea",
  "fact": "はるに うまれて、あきには もう おおきく なって いるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a30",
  "name": "ヒラメ",
  "kind": "魚",
  "area": "offshore",
  "rarity": 3,
  "seasons": [
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 75.0,
  "life": 10,
  "water": "sea",
  "fact": "うまれた ときは めが りょうがわに あるけど、そだつと ひだりに よって くるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a31",
  "name": "マダイ",
  "kind": "魚",
  "area": "offshore",
  "rarity": 3,
  "seasons": [
   0
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 75.0,
  "life": 10,
  "water": "sea",
  "fact": "はるに あさい うみへ きて たまごを うむ。からだは さくらいろ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a32",
  "name": "ブリ",
  "kind": "魚",
  "area": "offshore",
  "rarity": 3,
  "seasons": [
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 3,
  "price": 75.0,
  "life": 20,
  "water": "sea",
  "fact": "いしかわでは おおきく なるにつれて フクラギ、ガンド、ブリと なまえが かわるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a33",
  "name": "ノドグロ",
  "kind": "魚",
  "area": "offshore",
  "rarity": 4,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 450.0,
  "life": 10,
  "water": "sea",
  "fact": "くちの おくが くろい から ノドグロ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a34",
  "name": "ホシザメ",
  "kind": "魚",
  "area": "offshore",
  "rarity": 3,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 3,
  "price": 75.0,
  "life": 20,
  "water": "sea",
  "fact": "からだに しろい ほしの ような てんてん。おとなしい サメだよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a35",
  "name": "クロマグロ",
  "kind": "魚",
  "area": "offshore",
  "rarity": 4,
  "seasons": [
   1,
   2
  ],
  "times": [
   0
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 3,
  "price": 450.0,
  "life": 20,
  "water": "sea",
  "fact": "とても おおきく なる さかな。ちいさい うちは つっても うみに かえす きまりが あるよ。",
  "noSale": false,
  "releaseOnly": true,
  "endangered": false
 },
 {
  "id": "a36",
  "name": "ハリセンボン",
  "kind": "魚",
  "area": "south",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 4.5,
  "life": 3,
  "water": "sea",
  "fact": "とげは 1000ぼんも なくて、300ぼん くらい なんだって。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a37",
  "name": "グルクン（タカサゴ）",
  "kind": "魚",
  "area": "south",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 4.5,
  "life": 3,
  "water": "sea",
  "fact": "おきなわで よく たべられる さかな。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a38",
  "name": "ミノカサゴ",
  "kind": "魚",
  "area": "south",
  "rarity": 2,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 15.0,
  "life": 3,
  "water": "sea",
  "fact": "ひれの トゲに どくが ある。きれいだけど さわっては だめ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a39",
  "name": "ウツボ",
  "kind": "魚",
  "area": "south",
  "rarity": 3,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 75.0,
  "life": 10,
  "water": "sea",
  "fact": "よるに なると いわの すきまから でて えものを さがすよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a40",
  "name": "タマン（ハマフエフキ）",
  "kind": "魚",
  "area": "south",
  "rarity": 3,
  "seasons": [
   0,
   1
  ],
  "times": [
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 75.0,
  "life": 10,
  "water": "sea",
  "fact": "おきなわの うみを だいひょうする さかな。よるの つりで にんき。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a41",
  "name": "アカジンミーバイ（スジアラ）",
  "kind": "魚",
  "area": "south",
  "rarity": 4,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 450.0,
  "life": 10,
  "water": "sea",
  "fact": "あかい からだに あおい てんてん。おきなわの こうきゅうな さかな。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a42",
  "name": "アカマチ（ハマダイ）",
  "kind": "魚",
  "area": "south",
  "rarity": 4,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 450.0,
  "life": 10,
  "water": "sea",
  "fact": "ふかい うみに すむ あかい さかな。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a43",
  "name": "ロウニンアジ",
  "kind": "魚",
  "area": "south",
  "rarity": 4,
  "seasons": [
   1,
   2
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 3,
  "price": 450.0,
  "life": 20,
  "water": "sea",
  "fact": "とても ちからの つよい おおきな アジの なかま。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a44",
  "name": "ホッケ",
  "kind": "魚",
  "area": "north",
  "rarity": 1,
  "seasons": [
   0,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 4.5,
  "life": 3,
  "water": "sea",
  "fact": "あきから はるに きしの ちかくへ たまごを うみに くるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a45",
  "name": "カレイ",
  "kind": "魚",
  "area": "north",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 4.5,
  "life": 3,
  "water": "sea",
  "fact": "めが からだの みぎがわに ある ことが おおいよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a46",
  "name": "アイナメ",
  "kind": "魚",
  "area": "north",
  "rarity": 2,
  "seasons": [
   0,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 15.0,
  "life": 3,
  "water": "sea",
  "fact": "いわの すきまに かくれて くらすよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a47",
  "name": "ニシン",
  "kind": "魚",
  "area": "north",
  "rarity": 3,
  "seasons": [
   0,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 75.0,
  "life": 3,
  "water": "sea",
  "fact": "たくさんで たまごを うみに くると うみが しろく なるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a48",
  "name": "ソイ",
  "kind": "魚",
  "area": "north",
  "rarity": 2,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 15.0,
  "life": 3,
  "water": "sea",
  "fact": "よるに なると げんきに えさを おうよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a49",
  "name": "カラフトマス",
  "kind": "魚",
  "area": "north",
  "rarity": 2,
  "seasons": [
   1
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 15.0,
  "life": 10,
  "water": "sea",
  "fact": "なつに ほっかいどうの うみべに やって くる マスの なかま。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a50",
  "name": "オオカミウオ",
  "kind": "魚",
  "area": "north",
  "rarity": 3,
  "seasons": [
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 75.0,
  "life": 10,
  "water": "sea",
  "fact": "するどい はで かいや ウニを バリバリ くだいて たべるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a51",
  "name": "イトウ",
  "kind": "魚",
  "area": "north",
  "rarity": 4,
  "seasons": [
   0,
   2
  ],
  "times": [
   0
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 3,
  "price": 450.0,
  "life": 20,
  "water": "sea",
  "fact": "にほんでは ほっかいどうにしか いない おおきな さかな。つったら そっと かえすよ。",
  "noSale": false,
  "releaseOnly": true,
  "endangered": false
 },
 {
  "id": "a52",
  "name": "サケ",
  "kind": "魚",
  "area": "north",
  "rarity": 4,
  "seasons": [
   2
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 450.0,
  "life": 10,
  "water": "sea",
  "fact": "うみの ちかくで まって、かわを のぼる じゅんびを するよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a53",
  "name": "グッピー",
  "kind": "魚",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "fresh",
  "fact": "おかあさんの おなかで たまごが かえって、あかちゃんが うまれるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a54",
  "name": "ネオンテトラ",
  "kind": "魚",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "fresh",
  "fact": "からだの よこが あおく ひかって みえるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a55",
  "name": "リュウキン（金魚）",
  "kind": "魚",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "fresh",
  "fact": "きんぎょの ごせんぞは フナ。ちゅうごくで うまれたよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a56",
  "name": "ベタ",
  "kind": "魚",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "fresh",
  "fact": "オスどうしが けんか するので「とうぎょ」と よばれるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a57",
  "name": "エンゼルフィッシュ",
  "kind": "魚",
  "area": "market",
  "rarity": 2,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 3,
  "water": "fresh",
  "fact": "みなみアメリカの アマゾンがわ から きた さかな。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a58",
  "name": "ランチュウ（金魚）",
  "kind": "魚",
  "area": "market",
  "rarity": 2,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 3,
  "water": "fresh",
  "fact": "せびれが なくて、あたまに こぶの ある きんぎょ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a59",
  "name": "ウーパールーパー",
  "kind": "ほか",
  "area": "market",
  "rarity": 2,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 3,
  "water": "fresh",
  "fact": "おとなに なっても こどもの すがたの まま。あしが なくなっても また はえて くるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": true
 },
 {
  "id": "a60",
  "name": "ヤドカリ",
  "kind": "エビ・カニ",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "sea",
  "fact": "おおきく なると あたらしい かいがらへ ひっこしを するよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a61",
  "name": "サザエ",
  "kind": "イカ・タコ・貝",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "sea",
  "fact": "いわに くっついて くらす まきがい。うみで かってに とっては いけないよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a62",
  "name": "チョウチョウウオ",
  "kind": "魚",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "sea",
  "fact": "ふたりで ならんで およぐ ことが おおいよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a63",
  "name": "ツノダシ",
  "kind": "魚",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "sea",
  "fact": "なかまが ほかに いない、この しゅるい だけの さかなだよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a64",
  "name": "ナンヨウハギ",
  "kind": "魚",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "sea",
  "fact": "しっぽの つけねに かくれた トゲが あるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a65",
  "name": "カクレクマノミ",
  "kind": "魚",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "sea",
  "fact": "イソギンチャクの なかで くらす。いちばん おおきい こが おかあさんに なるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a66",
  "name": "ホタルイカ",
  "kind": "イカ・タコ・貝",
  "area": "market",
  "rarity": 2,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 1,
  "water": "sea",
  "fact": "からだが あおじろく ひかる ちいさな イカ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a67",
  "name": "アマエビ",
  "kind": "エビ・カニ",
  "area": "market",
  "rarity": 2,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 3,
  "water": "sea",
  "fact": "うまれた ときは みんな オスで、おおきく なると メスに かわるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a68",
  "name": "ズワイガニ",
  "kind": "エビ・カニ",
  "area": "market",
  "rarity": 2,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 10,
  "life": 3,
  "water": "sea",
  "fact": "いしかわの オスは「かのうガニ」、メスは「こうばこガニ」と よばれるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a69",
  "name": "イソギンチャク",
  "kind": "クラゲ・ヒトデ・ウニ",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "sea",
  "fact": "しょくしゅに ちいさな どくばりが あるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a70",
  "name": "ヒトデ",
  "kind": "クラゲ・ヒトデ・ウニ",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "sea",
  "fact": "うでが とれても また はえて くるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a71",
  "name": "ムラサキウニ",
  "kind": "クラゲ・ヒトデ・ウニ",
  "area": "market",
  "rarity": 1,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 3,
  "life": 3,
  "water": "sea",
  "fact": "うみで かってに とっては いけない。おみせで かおう。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a72",
  "name": "ミズクラゲ",
  "kind": "クラゲ・ヒトデ・ウニ",
  "area": "market",
  "rarity": 2,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 2,
  "price": 10,
  "life": 10,
  "water": "sea",
  "fact": "かさの なかに よっつの わの もようが みえるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a73",
  "name": "タツノオトシゴ",
  "kind": "魚",
  "area": "market",
  "rarity": 3,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 50,
  "life": 3,
  "water": "sea",
  "fact": "オスの おなかの ふくろで たまごが そだって、オスが こどもを うむよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a74",
  "name": "チンアナゴ",
  "kind": "魚",
  "area": "market",
  "rarity": 3,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 50,
  "life": 3,
  "water": "sea",
  "fact": "すなから かおを だして、ながれて くる えさを たべるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a75",
  "name": "シルバーアロワナ",
  "kind": "魚",
  "area": "market",
  "rarity": 4,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 3,
  "price": 300,
  "life": 20,
  "water": "fresh",
  "fact": "みずの うえに とびあがって、はっぱの むしを つかまえるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a76",
  "name": "マンボウ",
  "kind": "魚",
  "area": "gift",
  "rarity": 4,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 3,
  "price": 300,
  "life": 20,
  "water": "sea",
  "fact": "おなかに とても たくさんの たまごを もって いる。でも くわしい ことは まだ なぞ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a77",
  "name": "イルカ",
  "kind": "大きな生き物",
  "area": "gift",
  "rarity": 4,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 9,
  "price": 300,
  "life": 30,
  "water": "sea",
  "fact": "のうを はんぶんずつ ねむらせて、およぎながら ねむるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a78",
  "name": "ジンベエザメ",
  "kind": "魚",
  "area": "gift",
  "rarity": 4,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 9,
  "price": 300,
  "life": 30,
  "water": "sea",
  "fact": "せかいで いちばん おおきな さかな。ちいさな プランクトンを たべるよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": true
 },
 {
  "id": "a79",
  "name": "マンタ",
  "kind": "魚",
  "area": "gift",
  "rarity": 4,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 9,
  "price": 300,
  "life": 30,
  "water": "sea",
  "fact": "おおきな ひれで そらを とぶ ように およぐ エイ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 },
 {
  "id": "a80",
  "name": "ダンゴウオ",
  "kind": "魚",
  "area": "gift",
  "rarity": 3,
  "seasons": [
   0,
   1,
   2,
   3
  ],
  "times": [
   0,
   1,
   2,
   3
  ],
  "weathers": [
   0,
   1,
   2
  ],
  "tank": 1,
  "price": 50,
  "life": 3,
  "water": "sea",
  "fact": "おなかの きゅうばんで いわに ぴたっと くっつくよ。",
  "noSale": false,
  "releaseOnly": false,
  "endangered": false
 }
];
