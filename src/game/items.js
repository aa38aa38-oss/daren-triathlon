// 道具清單。power 越高越強，名次越後面越容易抽到強道具
export const ITEMS = {
  shark:    { name: '召喚鯊魚', icon: '🦈', power: 1.0 },
  mine:     { name: '水雷',     icon: '💣', power: 0.35 },
  ink:      { name: '章魚墨汁', icon: '🐙', power: 0.55 },
  axe:      { name: '斧頭',     icon: '🪓', power: 0.9 },
  oil:      { name: '油漬',     icon: '🛢️', power: 0.25 },
  spikes:   { name: '釘刺路障', icon: '📌', power: 0.5 },
  grenade:  { name: '手榴彈',   icon: '🧨', power: 1.0 },
  banana:   { name: '香蕉皮',   icon: '🍌', power: 0.2 },
  chainsaw: { name: '電鋸',     icon: '⚙️', power: 0.85 },
};

// f：0 = 第一名，1 = 最後一名
export function rollItem(list, f) {
  const weights = list.map((id) => {
    const p = ITEMS[id].power;
    return Math.max(0.05, p * (0.25 + 1.75 * f) + (1 - p) * (1.4 - f));
  });
  let sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}
