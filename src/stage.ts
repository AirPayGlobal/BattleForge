import { W, H, FLOOR_Y, rand } from './constants';

export interface StageDef {
  id: string;
  name: string;
  skyTop: string;
  skyBottom: string;
  moon: boolean;
  floorColor: string;
  floorEdge: string;
}

export const STAGES: StageDef[] = [
  {
    id: 'pit',
    name: 'THE PIT',
    skyTop: '#050510',
    skyBottom: '#25103a',
    moon: true,
    floorColor: '#3a3244',
    floorEdge: '#181320',
  },
  {
    id: 'throne',
    name: 'THRONE OF BONES',
    skyTop: '#0d0505',
    skyBottom: '#3a1408',
    moon: false,
    floorColor: '#46342a',
    floorEdge: '#20140e',
  },
  {
    id: 'grove',
    name: 'DEAD GROVE',
    skyTop: '#03100a',
    skyBottom: '#123a20',
    moon: true,
    floorColor: '#2c3a2c',
    floorEdge: '#101c10',
  },
];

interface Star {
  x: number;
  y: number;
  r: number;
  tw: number;
}

export class Stage {
  def: StageDef;
  private stars: Star[] = [];
  private torchX = [130, W - 130];

  constructor(def: StageDef) {
    this.def = def;
    for (let i = 0; i < 60; i++) {
      this.stars.push({ x: rand(0, W), y: rand(0, FLOOR_Y - 160), r: rand(0.5, 1.8), tw: rand(0, Math.PI * 2) });
    }
  }

  draw(ctx: CanvasRenderingContext2D, tick: number): void {
    const d = this.def;
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    sky.addColorStop(0, d.skyTop);
    sky.addColorStop(1, d.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, FLOOR_Y);

    // Stars
    for (const s of this.stars) {
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(tick * 0.02 + s.tw));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Moon
    if (d.moon) {
      ctx.fillStyle = '#e8e3d0';
      ctx.shadowColor = '#e8e3d0';
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(W - 180, 90, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.arc(W - 192, 80, 10, 0, Math.PI * 2);
      ctx.arc(W - 165, 100, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Far silhouettes
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    if (d.id === 'pit') {
      // Jagged mountains and spikes
      ctx.beginPath();
      ctx.moveTo(0, FLOOR_Y - 90);
      for (let x = 0; x <= W; x += 80) {
        ctx.lineTo(x + 40, FLOOR_Y - 90 - 60 * pseudoNoise(x));
        ctx.lineTo(x + 80, FLOOR_Y - 90);
      }
      ctx.lineTo(W, FLOOR_Y);
      ctx.lineTo(0, FLOOR_Y);
      ctx.fill();
      // Spikes rising from the pit below the bridge
      ctx.fillStyle = 'rgba(10,5,15,0.9)';
      for (let x = 30; x < W; x += 55) {
        const h = 26 + 22 * pseudoNoise(x * 3);
        ctx.beginPath();
        ctx.moveTo(x - 10, H);
        ctx.lineTo(x, FLOOR_Y + 42 - h + 40);
        ctx.lineTo(x + 10, H);
        ctx.fill();
      }
    } else if (d.id === 'throne') {
      // Pillars
      for (const px of [80, 300, 660, 880]) {
        ctx.fillRect(px - 22, FLOOR_Y - 250, 44, 250);
        ctx.fillRect(px - 30, FLOOR_Y - 262, 60, 16);
      }
      // Throne silhouette
      ctx.beginPath();
      ctx.moveTo(W / 2 - 70, FLOOR_Y);
      ctx.lineTo(W / 2 - 70, FLOOR_Y - 140);
      ctx.lineTo(W / 2 - 40, FLOOR_Y - 190);
      ctx.lineTo(W / 2, FLOOR_Y - 150);
      ctx.lineTo(W / 2 + 40, FLOOR_Y - 190);
      ctx.lineTo(W / 2 + 70, FLOOR_Y - 140);
      ctx.lineTo(W / 2 + 70, FLOOR_Y);
      ctx.fill();
    } else {
      // Dead trees
      for (const tx of [110, 260, 700, 850]) {
        ctx.save();
        ctx.translate(tx, FLOOR_Y);
        ctx.fillRect(-8, -180, 16, 180);
        ctx.rotate(-0.5);
        ctx.fillRect(-5, -230, 10, 90);
        ctx.rotate(1);
        ctx.fillRect(-5, -215, 10, 80);
        ctx.restore();
      }
    }

    // Torches
    for (const tx of this.torchX) {
      ctx.fillStyle = '#241a10';
      ctx.fillRect(tx - 5, FLOOR_Y - 130, 10, 130);
      const flick = Math.sin(tick * 0.35 + tx) * 3 + Math.sin(tick * 0.13 + tx * 2) * 2;
      const fg = ctx.createRadialGradient(tx, FLOOR_Y - 140, 2, tx, FLOOR_Y - 140, 26 + flick);
      fg.addColorStop(0, '#fff3b0');
      fg.addColorStop(0.4, '#ff9a00');
      fg.addColorStop(1, 'rgba(255,90,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(tx, FLOOR_Y - 140, 26 + flick, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floor
    const fl = ctx.createLinearGradient(0, FLOOR_Y, 0, H);
    fl.addColorStop(0, d.floorColor);
    fl.addColorStop(1, d.floorEdge);
    ctx.fillStyle = fl;
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    // Floor plank lines
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    for (let x = 40; x < W; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, FLOOR_Y + 4);
      ctx.lineTo(x - 30, H);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_Y + 2);
    ctx.lineTo(W, FLOOR_Y + 2);
    ctx.stroke();
  }
}

function pseudoNoise(x: number): number {
  return Math.abs(Math.sin(x * 12.9898) * 43758.5453) % 1;
}
