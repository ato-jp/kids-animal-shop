// 遊んだ時間。日付が変わったら0から数え直す。playMinutes が 0 なら時間制限なし。
// today は "YYYY-MM-DD"（端末の現地時刻）。呼ぶ側が渡す。
export function localDate(d = new Date()) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addPlayed(shop, sec, today) {
  const seconds = (shop.played.date === today ? shop.played.seconds : 0) + sec;
  return { ...shop, played: { date: today, seconds } };
}

export function remaining(shop, today) {
  if (!shop.playMinutes) return Infinity;
  const used = shop.played.date === today ? shop.played.seconds : 0;
  return Math.max(0, shop.playMinutes * 60 - used);
}

export const isNight = (shop, today) => remaining(shop, today) <= 0;
export const isEvening = (shop, today) => remaining(shop, today) <= 120;

// おとなが「もうすこし」を押したとき：今日の遊んだ時間を minutes 分だけ戻す
export function extend(shop, minutes, today) {
  const used = shop.played.date === today ? shop.played.seconds : 0;
  return { ...shop, played: { date: today, seconds: Math.max(0, used - minutes * 60) } };
}
