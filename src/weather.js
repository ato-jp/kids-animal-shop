// 天気：晴れ(0)・くもり(1)・雨(2) の種類だけ 石川県能美市の現実の天気から取る（docs/brainstorm-v3.md）。
// 暑さ寒さはゲームの季節で決め、ゲームが冬なら雨は雪として描く。外へ出るのは能美市の決まった座標だけ。
// 1時間に1回まで取りに行き、つながらないときは「その日・その季節らしい天気」をゲームが決める。
import { hash } from "./logic/rng.js";
import { dateKey } from "./logic/time.js";

// 能美市役所あたり（緯度・経度。小数2けたに丸めて送る）
const LAT = 36.45, LON = 136.55;
const URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=weather_code&timezone=Asia%2FTokyo`;
export const WEATHER_NAME = ["はれ", "くもり", "あめ"];

// Open-Meteo の天気コード（WMO）→ 3種類
export function fromCode(code) {
  if (code <= 1) return 0;
  if (code <= 48) return 1;
  return 2; // 霧雨・雨・雪・にわか雨・雷雨
}

// つながらないときの天気。日付と季節で決まる（同じ日なら何度開いても同じ）
const RAINY = [0.3, 0.35, 0.3, 0.4]; // 季節ごとの雨の割合（仮）
export function fallback(t, sea) {
  const r = hash("weather", dateKey(t), new Date(t).getHours() >> 2);
  return r < RAINY[sea] ? 2 : r < RAINY[sea] + 0.3 ? 1 : 0;
}

let cache = { at: 0, kind: null };
export async function currentWeather(now, sea) {
  if (cache.kind != null && now - cache.at < 60 * 60 * 1000) return cache.kind;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 5000);
    const res = await fetch(URL, { signal: ctl.signal });
    clearTimeout(timer);
    const kind = fromCode((await res.json()).current.weather_code);
    cache = { at: now, kind };
    return kind;
  } catch (e) {
    return fallback(now, sea);
  }
}
export const weatherNow = (now, sea) => (cache.kind != null && now - cache.at < 2 * 60 * 60 * 1000 ? cache.kind : fallback(now, sea));
