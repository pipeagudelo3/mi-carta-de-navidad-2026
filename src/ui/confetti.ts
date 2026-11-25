// Confeti navideño liviano en un canvas 2D (sin dependencias).

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  round: boolean;
  life: number;
}

const COLORS = ['#e9bf6c', '#f6dc9a', '#d8343f', '#2f9e6e', '#fbf3e4', '#ffffff'];
let pieces: Piece[] = [];
let running = false;
let enabled = true;

export function setConfettiEnabled(on: boolean) {
  enabled = on;
}

export function confetti(originX = 0.5, originY = 0.55, amount = 90) {
  if (!enabled) return;
  const canvas = document.getElementById('confetti') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  for (let i = 0; i < amount; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const sp = 5 + Math.random() * 9;
    pieces.push({
      x: originX * w,
      y: originY * h,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 2,
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() < 0.3,
      life: 1,
    });
  }
  if (running) return;
  running = true;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(2.2, (now - last) / 16.67);
    last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    pieces = pieces.filter((p) => p.life > 0 && p.y < h + 40);
    for (const p of pieces) {
      p.vy += 0.24 * dt;
      p.vx *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= 0.0065 * dt;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 3);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const flip = Math.cos(p.rot * 3);
        ctx.fillRect(-p.size / 2, -p.size * 0.3 * flip, p.size, p.size * 0.6 * flip);
      }
      ctx.restore();
    }
    if (pieces.length) requestAnimationFrame(tick);
    else {
      running = false;
      ctx.clearRect(0, 0, w, h);
    }
  };
  requestAnimationFrame(tick);
}
