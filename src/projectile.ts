import type { Rect } from './constants';
import { W } from './constants';
import type { SpecialEffect } from './characters';
import type { ParticleSystem } from './particles';

export class Projectile {
  x: number;
  y: number;
  vx: number;
  ownerIndex: number;
  effect: SpecialEffect;
  damage: number;
  color: string;
  accent: string;
  dead = false;
  age = 0;

  constructor(
    x: number,
    y: number,
    vx: number,
    ownerIndex: number,
    effect: SpecialEffect,
    damage: number,
    color: string,
    accent: string,
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.ownerIndex = ownerIndex;
    this.effect = effect;
    this.damage = damage;
    this.color = color;
    this.accent = accent;
  }

  rect(): Rect {
    return { x: this.x - 16, y: this.y - 12, w: 32, h: 24 };
  }

  update(particles: ParticleSystem): void {
    this.x += this.vx;
    this.age++;
    if (this.x < -40 || this.x > W + 40) this.dead = true;
    // Trails
    if (this.age % 2 === 0) {
      if (this.effect === 'burn') particles.flames(this.x - this.vx * 2, this.y, 2);
      else if (this.effect === 'freeze')
        particles.emit(this.x - this.vx * 2, this.y, 1, '#aef4ff', { speed: 1.5, spread: Math.PI, size: 3, life: 25, gravity: 0.05 });
      else if (this.effect === 'acid')
        particles.emit(this.x - this.vx * 2, this.y + 6, 1, '#4ade30', { speed: 1, dirY: 1, spread: 0.4, size: 3, life: 20, gravity: 0.25 });
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const dir = Math.sign(this.vx) || 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.effect === 'shock') {
      // Jagged lightning bolt
      ctx.strokeStyle = this.accent;
      ctx.lineWidth = 3;
      ctx.shadowColor = this.accent;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      let px = -22 * dir;
      ctx.moveTo(px, 0);
      for (let i = 1; i <= 5; i++) {
        px += 9 * dir;
        ctx.lineTo(px, (i % 2 === 0 ? 1 : -1) * (5 + Math.random() * 5));
      }
      ctx.lineTo(px + 6 * dir, 0);
      ctx.stroke();
    } else {
      const pulse = 1 + Math.sin(this.age * 0.5) * 0.15;
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 15 * pulse);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, this.accent);
      grad.addColorStop(1, this.color);
      ctx.fillStyle = grad;
      ctx.shadowColor = this.accent;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, 13 * pulse, 0, Math.PI * 2);
      ctx.fill();
      if (this.effect === 'burn') {
        // Skull face on the fireball
        ctx.fillStyle = '#1a1a1e';
        ctx.beginPath();
        ctx.arc(4 * dir, -3, 2.5, 0, Math.PI * 2);
        ctx.arc(-3 * dir, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-4, 4, 8, 2);
      }
    }
    ctx.restore();
  }
}
