export const W = 960;
export const H = 540;
export const FLOOR_Y = 470;
export const GRAVITY = 0.65;
export const STAGE_LEFT = 60;
export const STAGE_RIGHT = W - 60;
export const ROUND_TIME = 99;
export const MAX_HEALTH = 100;
export const ROUNDS_TO_WIN = 2;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function rand(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
