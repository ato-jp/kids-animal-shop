// 現実の時計と、ゲームの暦（季節・年齢）のつなぎ。どれも純粋な関数で、時刻はミリ秒（Date.now() の値）。
// 「日付」「時間帯」は端末の現地時刻で決める（日本で遊ぶ前提。タイムゾーンは Date に任せる）。
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
// 現実の4か月＝ゲームの1年（docs/brainstorm-v3.md）。4か月は 365.25/3 日として扱う
export const GAME_YEAR_MS = (365.25 / 3) * DAY;

export const floorHour = t => Math.floor(t / HOUR) * HOUR;

// "2026-10-14" の形。日付が変わったかの判定に使う
export function dateKey(t) {
  const d = new Date(t);
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 時間帯：朝5〜10／昼10〜16／夕16〜19／夜19〜5（design-tables.md）
export const TIMES = ["朝", "昼", "夕", "夜"];
export function timeOfDay(t) {
  const h = new Date(t).getHours();
  if (h >= 5 && h < 10) return 0;
  if (h >= 10 && h < 16) return 1;
  if (h >= 16 && h < 19) return 2;
  return 3;
}

// 季節：始めた月を春とし、現実の1か月ごとに 春→夏→秋→冬 と進む
export const SEASONS = ["春", "夏", "秋", "冬"];
export function season(startedAt, t) {
  const a = new Date(startedAt), b = new Date(t);
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return ((months % 4) + 4) % 4;
}

// ゲームの年齢（年）。born から t までの現実の時間を3倍にしたもの
export const gameYears = (born, t) => Math.max(0, (t - born) / GAME_YEAR_MS);
// ゲームの年齢（日）。犬猫の「生後56日」の判定などに使う
export const gameDays = (born, t) => gameYears(born, t) * 365.25;

// 次の朝7時（入院した子が帰ってくる時刻）
export function nextMorning(t) {
  const d = new Date(t);
  d.setHours(7, 0, 0, 0);
  if (d.getTime() <= t) d.setDate(d.getDate() + 1);
  return d.getTime();
}
