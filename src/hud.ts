import { W, MAX_HEALTH, ROUNDS_TO_WIN } from './constants';
import type { Fighter } from './fighter';

const BAR_W = 360;
const BAR_H = 22;
const BAR_Y = 24;

export function drawHud(
  ctx: CanvasRenderingContext2D,
  p1: Fighter,
  p2: Fighter,
  timer: number,
  tick: number,
): void {
  drawHealthBar(ctx, 30, p1, false);
  drawHealthBar(ctx, W - 30 - BAR_W, p2, true);

  // Timer
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(W / 2 - 34, BAR_Y - 6, 68, BAR_H + 12);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 2;
  ctx.strokeRect(W / 2 - 34, BAR_Y - 6, 68, BAR_H + 12);
  ctx.fillStyle = timer <= 10 && tick % 40 < 20 ? '#ff3030' : '#ffe680';
  ctx.font = 'bold 26px Impact, "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.max(0, Math.ceil(timer))), W / 2, BAR_Y + BAR_H / 2 + 1);

  // Round win tokens
  drawWinTokens(ctx, 30, p1.roundWins, false);
  drawWinTokens(ctx, W - 30, p2.roundWins, true);
}

function drawHealthBar(ctx: CanvasRenderingContext2D, x: number, f: Fighter, flip: boolean): void {
  const pct = Math.max(0, f.health) / MAX_HEALTH;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(x - 3, BAR_Y - 3, BAR_W + 6, BAR_H + 6);
  // Damage backdrop
  ctx.fillStyle = '#5a0a0a';
  ctx.fillRect(x, BAR_Y, BAR_W, BAR_H);
  // Health fill (drains toward the center of the screen)
  const w = BAR_W * pct;
  const grad = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + BAR_H);
  grad.addColorStop(0, pct > 0.35 ? '#7cf25a' : '#ffd23a');
  grad.addColorStop(1, pct > 0.35 ? '#2a9410' : '#d97a00');
  ctx.fillStyle = grad;
  if (flip) ctx.fillRect(x + (BAR_W - w), BAR_Y, w, BAR_H);
  else ctx.fillRect(x, BAR_Y, w, BAR_H);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 3, BAR_Y - 3, BAR_W + 6, BAR_H + 6);
  // Name
  ctx.fillStyle = '#111';
  ctx.font = 'bold 15px Impact, "Arial Black", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = flip ? 'right' : 'left';
  ctx.fillText(f.def.name, flip ? x + BAR_W - 8 : x + 8, BAR_Y + BAR_H / 2 + 1);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(f.def.name, flip ? x + BAR_W - 9 : x + 7, BAR_Y + BAR_H / 2);
}

function drawWinTokens(ctx: CanvasRenderingContext2D, edgeX: number, wins: number, flip: boolean): void {
  for (let i = 0; i < ROUNDS_TO_WIN; i++) {
    const cx = flip ? edgeX - 12 - i * 26 : edgeX + 12 + i * 26;
    const cy = BAR_Y + BAR_H + 16;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < wins ? '#ffb400' : 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export interface Announcement {
  text: string;
  age: number;
  duration: number;
  size: number;
  color: string;
  bloody: boolean;
}

export function makeAnnouncement(
  text: string,
  duration = 90,
  opts: { size?: number; color?: string; bloody?: boolean } = {},
): Announcement {
  return {
    text,
    age: 0,
    duration,
    size: opts.size ?? 72,
    color: opts.color ?? '#ffe680',
    bloody: opts.bloody ?? false,
  };
}

export function drawAnnouncement(ctx: CanvasRenderingContext2D, a: Announcement, y: number): void {
  const inT = Math.min(1, a.age / 8);
  const outT = Math.max(0, (a.duration - a.age) / 12);
  const alpha = Math.min(inT, outT, 1);
  const scale = 1.6 - 0.6 * inT;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, y);
  ctx.scale(scale, scale);
  ctx.font = `bold ${a.size}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#000';
  ctx.strokeText(a.text, 0, 0);
  const grad = ctx.createLinearGradient(0, -a.size / 2, 0, a.size / 2);
  if (a.bloody) {
    grad.addColorStop(0, '#ff4040');
    grad.addColorStop(0.6, '#b40000');
    grad.addColorStop(1, '#5c0000');
  } else {
    grad.addColorStop(0, '#fff6c0');
    grad.addColorStop(0.5, a.color);
    grad.addColorStop(1, '#b06000');
  }
  ctx.fillStyle = grad;
  ctx.fillText(a.text, 0, 0);
  ctx.restore();
}
