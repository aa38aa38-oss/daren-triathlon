// 遊戲的所有關卡設定都在這裡，想調整難度、長度、速度改這個檔案就好

export const STAGES = {
  swim: {
    id: 'swim', name: '第一關：血海游泳', short: '游泳', mode: 'swim',
    speed: 8.5, length: 500, width: 34, timeLimit: 82,
    curve: [22, 0.010, 8, 0.027],
    items: ['shark', 'mine', 'ink'],
  },
  bike: {
    id: 'bike', name: '第二關：死亡單車', short: '單車', mode: 'bike',
    speed: 17, length: 1000, width: 30, timeLimit: 78,
    curve: [40, 0.006, 10, 0.02],
    items: ['axe', 'oil', 'spikes'],
  },
  run: {
    id: 'run', name: '第三關：血腥路跑', short: '跑步', mode: 'run',
    speed: 11, length: 620, width: 28, timeLimit: 68,
    curve: [18, 0.012, 6, 0.035],
    items: ['grenade', 'banana', 'chainsaw'],
  },
  arena: {
    id: 'arena', name: '最終決戰：血池競技場', short: '決戰', mode: 'run', isArena: true,
    speed: 9, timeLimit: 60, radius: 30, minRadius: 6, ringWidth: 3,
    firstDrop: 8, dropInterval: 6,
    items: ['grenade', 'chainsaw', 'banana'],
  },
};

export const STAGE_ORDER = ['swim', 'bike', 'run', 'arena'];

// 每關結束時要留下的人數比例（100 人 → 67 → 34）
export const KEEP_RATIO = { swim: 0.67, bike: 0.34 };

export const SCORE = { kill: 100, death: -150, win: 2000 };
