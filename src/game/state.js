// 建立所有選手的資料。這份資料就是「遊戲狀態」，之後做連線時就是同步這份
const PRE = ['暴躁', '憂鬱', '中二', '佛系', '社畜', '肌肉', '禿頭', '鹹魚', '熬夜', '厭世',
  '狂暴', '嘴砲', '胖胖', '瘦皮', '邪惡', '爆肝', '阿宅', '火爆', '冷血', '傻笑'];
const SUF = ['阿明', '小美', '老王', '阿華', '阿強', '小翠', '志明', '春嬌', '阿伯', '阿姨',
  '小胖', '阿傑', '大頭', '阿呆', '小強', '阿花', '老李', '阿德', '小玉', '阿樂'];
const SKINS = [0xffdbb4, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffe0bd];

function hsl(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function createRacers(n) {
  const racers = [];
  const used = new Set();
  for (let i = 0; i < n; i++) {
    const isHuman = i === 0;
    let name = '你';
    if (!isHuman) {
      do { name = pick(PRE) + pick(SUF); } while (used.has(name) && used.size < 380);
      used.add(name);
    }
    let hue = Math.random();
    if (hue > 0.1 && hue < 0.2) hue += 0.15; // 黃色保留給玩家
    racers.push({
      id: i, isHuman, name,
      color: isHuman ? 0xffd400 : hsl(hue, 0.75, 0.5),
      pants: isHuman ? 0x1b3a8a : hsl(Math.random(), 0.4, 0.25),
      skin: isHuman ? 0xffdbb4 : pick(SKINS),
      alive: true, ghost: false, falling: false,
      x: 0, y: 0, z: 0, h: 0, speed: 0, kx: 0, kz: 0, vy: 0,
      hp: isHuman ? 100 : 60, maxHp: isHuman ? 100 : 60,
      item: null, itemT: 0, melee: null, meleeTick: 0,
      punchCd: 0, punchT: 0, stunT: 0, slowT: 0, blindT: 0, invulnT: 0, hitT: 0,
      finished: false, finishOrder: 0, rank: i + 1,
      kills: 0, stageKills: 0, score: 0, deaths: 0, place: 0, respawnT: 0,
      lastAttacker: null, lastAttackerT: -99,
      anim: Math.random() * 10,
      ghostX: 0, ghostZ: 0, ghostH: 0, ghostCd: 0,
      ai: isHuman ? null : {
        lane: (Math.random() * 2 - 1) * 0.8,
        skill: 0.86 + Math.random() * 0.12,
        aggr: Math.random(),
        think: Math.random() * 0.3,
        target: null,
        itemDelay: 2 + Math.random() * 4,
        laneT: 2 + Math.random() * 4,
      },
    });
  }
  return racers;
}
