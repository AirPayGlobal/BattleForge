import { Game } from './game';
import { W, H } from './constants';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function fit(): void {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
window.addEventListener('resize', fit);
fit();

const game = new Game();
// Dev/testing hook
(window as unknown as { __game: Game }).__game = game;

// Fixed-timestep loop (60 updates/sec) with rAF rendering
const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;

function frame(now: number): void {
  acc += Math.min(now - last, 100);
  last = now;
  while (acc >= STEP) {
    game.update();
    acc -= STEP;
  }
  ctx.clearRect(0, 0, W, H);
  game.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
