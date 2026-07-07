import { FLOOR_Y, rand } from './constants';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  /** Particles that stick to the floor as pools (blood, acid). */
  pools: boolean;
}

export class ParticleSystem {
  private list: Particle[] = [];
  private pools: { x: number; y: number; r: number; color: string }[] = [];

  clear(): void {
    this.list = [];
    this.pools = [];
  }

  emit(
    x: number,
    y: number,
    count: number,
    color: string,
    opts: {
      speed?: number;
      dirX?: number;
      dirY?: number;
      spread?: number;
      size?: number;
      life?: number;
      gravity?: number;
      pools?: boolean;
    } = {},
  ): void {
    const {
      speed = 4,
      dirX = 0,
      dirY = -1,
      spread = 1,
      size = 4,
      life = 40,
      gravity = 0.3,
      pools = false,
    } = opts;
    for (let i = 0; i < count; i++) {
      const a = Math.atan2(dirY, dirX) + rand(-spread, spread);
      const s = rand(speed * 0.3, speed);
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(life * 0.5, life),
        maxLife: life,
        size: rand(size * 0.5, size),
        color,
        gravity,
        pools,
      });
    }
  }

  blood(x: number, y: number, dir: number, amount = 14): void {
    this.emit(x, y, amount, '#c40a0a', {
      speed: 7,
      dirX: dir,
      dirY: -0.8,
      spread: 0.9,
      size: 5,
      life: 55,
      gravity: 0.45,
      pools: true,
    });
    this.emit(x, y, Math.floor(amount / 2), '#7d0505', {
      speed: 4,
      dirX: dir,
      dirY: -1.2,
      spread: 1.2,
      size: 3,
      life: 45,
      gravity: 0.45,
      pools: true,
    });
  }

  sparks(x: number, y: number, color = '#ffe680'): void {
    this.emit(x, y, 10, color, { speed: 6, dirY: -0.4, spread: Math.PI, size: 3, life: 20, gravity: 0.1 });
  }

  iceShards(x: number, y: number, count = 60): void {
    this.emit(x, y, count, '#aef4ff', { speed: 9, dirY: -1, spread: Math.PI, size: 6, life: 70, gravity: 0.35 });
    this.emit(x, y, count / 2, '#38b6ff', { speed: 6, dirY: -1, spread: Math.PI, size: 4, life: 60, gravity: 0.35 });
  }

  flames(x: number, y: number, count = 6): void {
    this.emit(x, y, count, '#ff5a00', { speed: 2.5, dirY: -1, spread: 0.7, size: 7, life: 30, gravity: -0.12 });
    this.emit(x, y, Math.floor(count / 2), '#ffb400', { speed: 2, dirY: -1, spread: 0.6, size: 4, life: 22, gravity: -0.15 });
  }

  acid(x: number, y: number, count = 8): void {
    this.emit(x, y, count, '#4ade30', { speed: 4, dirY: -0.6, spread: 1, size: 5, life: 40, gravity: 0.4, pools: true });
  }

  update(): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life--;
      if (p.pools && p.y >= FLOOR_Y + 4 && p.vy > 0) {
        if (this.pools.length < 120) {
          this.pools.push({ x: p.x, y: FLOOR_Y + rand(4, 14), r: rand(3, 9), color: p.color });
        }
        this.list.splice(i, 1);
        continue;
      }
      if (p.life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const s of this.pools) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r, s.r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / (p.maxLife * 0.6)));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
