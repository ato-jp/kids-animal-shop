// 古い版のセーブを移すときだけ使う小物（版3の形）。新しいコードからは使わない。
export const newPen = type => ({ type, level: type ? 1 : 0, dirty: false, animals: [] });
