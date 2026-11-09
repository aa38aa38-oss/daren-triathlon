// 操作：鍵盤（WASD／方向鍵、F 或 J 揍人、空白鍵用道具）＋ 手機觸控（左邊搖桿、右邊按鈕）
const $ = (id) => document.getElementById(id);

export class Input {
  constructor() {
    this.keys = new Set();
    this.edges = { punch: false, item: false, ffwd: false };
    this.stick = { active: false, x: 0, y: 0, id: null };
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.touchUsed = false;

    addEventListener('keydown', (e) => {
      const k = e.code;
      if (k === 'Space' || k.startsWith('Arrow')) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      if (k === 'Space') this.edges.item = true;
      if (k === 'KeyF' || k === 'KeyJ' || k === 'KeyK') this.edges.punch = true;
      if (k === 'Enter') this.edges.ffwd = true;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    this.setupTouch();
  }

  setupTouch() {
    const zone = $('stickZone'), knob = $('knob'), base = $('stickBase');
    const R = 55;
    const move = (e) => {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      this.stick.x = dx / R;
      this.stick.y = dy / R;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    zone.addEventListener('pointerdown', (e) => {
      this.touchUsed = true;
      this.stick.active = true;
      this.stick.id = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      move(e);
    });
    zone.addEventListener('pointermove', (e) => { if (this.stick.active && e.pointerId === this.stick.id) move(e); });
    const end = (e) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick.active = false;
      this.stick.x = this.stick.y = 0;
      knob.style.transform = '';
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    const btn = (id, key) => {
      $(id).addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.touchUsed = true;
        this.edges[key] = true;
      });
    };
    btn('btnPunch', 'punch');
    btn('btnItem', 'item');
    btn('btnFfwd', 'ffwd');
  }

  showTouch() {
    if (this.isTouch) $('touch').classList.remove('hidden');
  }

  // autoRun：手機上不碰搖桿也會自動往前跑（往下拉搖桿是煞車／後退）
  read(autoRun = true) {
    const k = this.keys;
    let thr = 0, steer = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) thr += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) thr -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) steer -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) steer += 1;
    if (this.touchUsed && thr === 0 && steer === 0) {
      steer = Math.abs(this.stick.x) > 0.12 ? this.stick.x : 0;
      if (autoRun) thr = this.stick.y > 0.55 ? -1 : 1;
      else thr = this.stick.active ? -this.stick.y : 0;
    }
    const out = { throttle: thr, steer, punch: this.edges.punch, useItem: this.edges.item, ffwd: this.edges.ffwd };
    this.edges.punch = this.edges.item = this.edges.ffwd = false;
    return out;
  }
}
