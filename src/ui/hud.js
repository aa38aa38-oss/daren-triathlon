// 畫面上的文字介面：存活人數、名次、血量、道具欄、擊殺訊息、小地圖、結算畫面
import { ITEMS } from '../game/items.js';
import { STAGES, STAGE_ORDER } from '../config.js';

const $ = (id) => document.getElementById(id);

const VERB = {
  punch: '揍死了', shark: '把 {v} 餵鯊魚了', grenade: '炸飛了', mine: '用水雷炸碎了',
  axe: '砍爆了', chainsaw: '鋸成兩半了', spikes: '刺穿了', fall: '推進血池了',
};
const SOLO = {
  fall: '掉進了血池', grenade: '被炸成肉醬', mine: '踩到水雷', rain: '被血雨溶化了',
  spikes: '踩到釘子死了', punch: '被揍死了',
};

const fmt = (t) => {
  t = Math.max(0, Math.ceil(t));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export class Hud {
  constructor() {
    this.feed = [];
    this.centerT = 0;
    this.splatA = 0;
    this.inkA = 0;
    this.acc = 0;
    this.lastItem = undefined;
    this.mm = $('minimap').getContext('2d');
  }

  onStart(fn) {
    $('startBtn').onclick = () => {
      const n = +document.querySelector('input[name=count]:checked').value;
      $('menu').classList.add('hidden');
      $('hud').classList.remove('hidden');
      fn(n);
    };
    $('againBtn').onclick = () => location.reload();
  }

  stageStart(sim) {
    $('result').classList.add('hidden');
    $('stageName').textContent = sim.track.name;
    this.feed = [];
    this.renderFeed();
    this.lastItem = undefined;
    $('ghostTip').classList.toggle('hidden', !sim.human.ghost);
  }

  message(text, dur = 1.5, cls = '') {
    const c = $('center');
    c.textContent = text;
    c.className = 'show ' + cls;
    this.centerT = dur;
  }

  popup(text) {
    const p = document.createElement('div');
    p.className = 'popup';
    p.textContent = text;
    $('hud').appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }

  killfeed(e) {
    if (e.cause === 'cull') return;
    const v = e.victim, k = e.killer;
    let text;
    if (k) {
      const verb = VERB[e.cause] || '殺了';
      text = verb.includes('{v}') ? `${k.name} ${verb.replace('{v}', v.name)}` : `${k.name} ${verb} ${v.name}`;
    } else text = `${v.name} ${SOLO[e.cause] || '死了'}`;
    const mine = (k && k.isHuman) || v.isHuman;
    this.feed.unshift({ text, mine, t: 5 });
    if (this.feed.length > 6) this.feed.pop();
    this.renderFeed();
  }

  renderFeed() {
    $('killfeed').innerHTML = this.feed
      .map((f) => `<div class="${f.mine ? 'mine' : ''}">💀 ${f.text}</div>`)
      .join('');
  }

  splat(a = 1) {
    this.splatA = Math.min(1, this.splatA + a);
    const s = $('splat');
    const blobs = [];
    for (let i = 0; i < 7; i++) {
      const x = Math.random() * 100, y = Math.random() * 100, r = 8 + Math.random() * 18;
      blobs.push(`radial-gradient(circle at ${x}% ${y}%, rgba(150,0,0,.95) 0, rgba(120,0,0,.85) ${r}%, transparent ${r + 3}%)`);
    }
    s.style.background = blobs.join(',');
  }

  damage() {
    $('vignette').style.opacity = 1;
  }

  ink() {
    this.inkA = 1;
  }

  ghostMode() {
    $('ghostTip').classList.remove('hidden');
    $('btnFfwd').classList.remove('hidden');
  }

  update(dt, sim) {
    this.splatA = Math.max(0, this.splatA - dt * 0.45);
    $('splat').style.opacity = this.splatA;
    this.inkA = Math.max(0, this.inkA - dt * 0.3);
    $('ink').style.opacity = Math.min(1, this.inkA * 1.4);
    const vg = $('vignette');
    vg.style.opacity = Math.max(0, (+vg.style.opacity || 0) - dt * 2);

    if (this.centerT > 0) {
      this.centerT -= dt;
      if (this.centerT <= 0) $('center').className = '';
    }
    for (const f of this.feed) f.t -= dt;
    if (this.feed.length && this.feed[this.feed.length - 1].t <= 0) { this.feed.pop(); this.renderFeed(); }

    const h = sim.human;
    const item = h.alive ? h.item : null;
    const key = item + (h.melee ? h.melee.type : '') + h.ghost;
    if (key !== this.lastItem) {
      this.lastItem = key;
      if (h.ghost) { $('itemIcon').textContent = '🍌'; $('itemName').textContent = '幽靈陷阱'; }
      else if (item) { $('itemIcon').textContent = ITEMS[item].icon; $('itemName').textContent = ITEMS[item].name; }
      else if (h.melee) { $('itemIcon').textContent = ITEMS[h.melee.type].icon; $('itemName').textContent = '揮舞中！'; }
      else { $('itemIcon').textContent = ''; $('itemName').textContent = '撿 ? 箱子'; }
      $('itemSlot').classList.toggle('has', !!item || h.ghost);
    }

    this.acc -= dt;
    if (this.acc > 0) return;
    this.acc = 0.1;

    const tr = sim.track;
    $('timer').textContent = sim.phase === 'countdown' ? fmt(tr.timeLimit) : (sim.timeLeft < 0 ? '血雨！' : fmt(sim.timeLeft));
    $('timer').classList.toggle('warn', sim.timeLeft < 10);
    const alive = sim.aliveCount() + (!h.alive && !h.ghost ? 1 : 0);
    $('alive').textContent = alive;
    $('aliveTarget').textContent = sim.target ? `晉級名額 ${sim.target}` : tr.id === 'run' ? '跑到終點才能進決戰' : '只能活一個';
    $('rank').textContent = h.ghost ? '👻 幽靈' : tr.isArena ? `剩 ${alive} 人` : h.finished ? `已完賽 #${h.finishOrder}` : `名次 ${h.rank}/${alive}`;
    $('kills').textContent = `擊殺 ${h.kills}`;
    $('score').textContent = `分數 ${h.score}`;
    const hpPct = h.alive ? Math.max(0, h.hp / h.maxHp) : 0;
    $('hpBar').style.width = `${hpPct * 100}%`;
    $('hpBar').style.background = hpPct > 0.5 ? '#3ad13a' : hpPct > 0.25 ? '#f0c020' : '#e01010';
    $('hpText').textContent = h.ghost ? '已陣亡' : h.alive ? `${Math.ceil(h.hp)} HP` : `復活中…`;
    this.drawMinimap(sim);
  }

  drawMinimap(sim) {
    const g = this.mm, c = g.canvas, tr = sim.track;
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(0,0,0,.45)';
    g.fillRect(0, 0, c.width, c.height);
    const h = sim.human;
    if (tr.isArena) {
      const cx = c.width / 2, cy = c.width / 2 + 10, sc = (c.width / 2 - 4) / tr.radius;
      g.fillStyle = '#7a0010';
      g.beginPath(); g.arc(cx, cy, tr.radius * sc, 0, 7); g.fill();
      g.fillStyle = '#777';
      g.beginPath(); g.arc(cx, cy, sim.radius * sc, 0, 7); g.fill();
      for (const r of sim.racers) {
        if (!r.alive || r.isHuman) continue;
        g.fillStyle = '#ff4040';
        g.fillRect(cx + r.x * sc - 1.5, cy + r.z * sc - 1.5, 3, 3);
      }
      const hx = h.ghost ? h.ghostX : h.x, hz = h.ghost ? h.ghostZ : h.z;
      g.fillStyle = h.ghost ? '#cde' : '#ffe000';
      g.beginPath(); g.arc(cx + hx * sc, cy + hz * sc, 4, 0, 7); g.fill();
      return;
    }
    const top = 8, bot = c.height - 8, L = tr.length;
    g.strokeStyle = '#aaa';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(c.width / 2, top); g.lineTo(c.width / 2, bot); g.stroke();
    g.fillStyle = '#fff';
    g.fillRect(4, top - 2, c.width - 8, 3);
    for (const r of sim.racers) {
      if (!r.alive || r.isHuman) continue;
      const p = Math.max(0, Math.min(1, -r.z / L));
      const off = (r.x - tr.centerX(r.z)) / (tr.width / 2);
      g.fillStyle = r.finished ? '#8f8' : '#ff4040';
      g.fillRect(c.width / 2 + off * 18 - 1.5, bot - p * (bot - top) - 1.5, 3, 3);
    }
    const hz = h.ghost ? h.ghostZ : h.z, hx = h.ghost ? h.ghostX : h.x;
    const p = Math.max(0, Math.min(1, -hz / L));
    g.fillStyle = h.ghost ? '#cde' : '#ffe000';
    g.beginPath();
    g.arc(c.width / 2 + ((hx - tr.centerX(hz)) / (tr.width / 2)) * 18, bot - p * (bot - top), 5, 0, 7);
    g.fill();
  }

  showResult(sim, onNext) {
    const h = sim.human, tr = sim.track;
    const next = STAGES[STAGE_ORDER[sim.stageIndex + 1]];
    $('resTitle').textContent = `${tr.name} 結束`;
    $('resBody').innerHTML = `
      <div class="row"><span>你的狀態</span><b>${h.ghost ? '👻 已陣亡（幽靈）' : '✅ 晉級'}</b></div>
      <div class="row"><span>本關擊殺</span><b>${h.stageKills}</b></div>
      <div class="row"><span>總擊殺</span><b>${h.kills}</b></div>
      <div class="row"><span>末位爆頭淘汰</span><b>${sim.culledCount} 人</b></div>
      <div class="row"><span>剩餘選手</span><b>${sim.survivorCount()} 人</b></div>
      <div class="row"><span>分數</span><b>${h.score}</b></div>
      <div class="next">下一關：${next.name}</div>`;
    $('result').classList.remove('hidden');
    let left = 8;
    const btn = $('nextBtn');
    const go = () => {
      clearInterval(timer);
      $('result').classList.add('hidden');
      onNext();
    };
    btn.textContent = `下一關（${left}）`;
    const timer = setInterval(() => {
      left--;
      btn.textContent = `下一關（${left}）`;
      if (left <= 0) go();
    }, 1000);
    btn.onclick = go;
  }

  showOver(sim, winner) {
    const h = sim.human;
    const won = winner === h;
    $('hud').classList.add('hidden');
    $('touch').classList.add('hidden');
    $('overTitle').textContent = won ? '🏆 你是唯一的倖存者！' : `💀 你在第 ${h.place || '?'} 名陣亡`;
    $('overTitle').className = won ? 'win' : 'lose';
    $('overBody').innerHTML = `
      <div class="row"><span>冠軍</span><b>${winner ? winner.name : '無人生還'}</b></div>
      <div class="row"><span>你的擊殺</span><b>${h.kills}</b></div>
      <div class="row"><span>死亡次數</span><b>${h.deaths}</b></div>
      <div class="row"><span>總分</span><b>${h.score}</b></div>`;
    $('over').classList.remove('hidden');
  }
}
