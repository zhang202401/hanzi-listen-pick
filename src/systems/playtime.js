/**
 * 用眼健康：累计游玩时长 + 休息提醒。
 * - 时长为本次打开页面期间累计（暂停/选卡/死亡不计入），跨局累加
 * - AAP 建议 2-5 岁每天屏幕约 1 小时、连续专注 5-15 分钟；
 *   默认每累计 20 分钟弹一次"休息一下眼睛"提醒，家长设置可关闭/调整
 */
let playedMs = 0;

export function addPlayTime(ms) {
  playedMs += ms;
}

export function getPlayTime() {
  return playedMs;
}

export function resetPlayTime() {
  playedMs = 0;
}

/** 休息提醒是否开启（家长设置可关） */
export function isRestReminderOn() {
  try {
    return localStorage.getItem('hanzi-survivors-rest-reminder') !== '0';
  } catch (e) {
    return true;
  }
}

/** 休息提醒间隔（分钟），默认 20 */
export function restIntervalMin() {
  try {
    const v = Number(localStorage.getItem('hanzi-survivors-rest-min'));
    return v >= 5 && v <= 60 ? v : 20;
  } catch (e) {
    return 20;
  }
}

export function setRestIntervalMin(min) {
  try {
    localStorage.setItem('hanzi-survivors-rest-min', String(min));
  } catch (e) { /* ignore */ }
}

export function setRestReminderOn(on) {
  try {
    localStorage.setItem('hanzi-survivors-rest-reminder', on ? '1' : '0');
  } catch (e) { /* ignore */ }
}
