// 簡單的事件系統：遊戲邏輯只負責「發生了什麼事」，畫面、音效、介面各自去聽
const handlers = {};

export const events = {
  on(name, fn) {
    (handlers[name] ||= []).push(fn);
  },
  emit(name, data) {
    const list = handlers[name];
    if (list) for (const fn of list) fn(data);
  },
};
