import { FLOOR_Y, GRAVITY, MAX_HEALTH, STAGE_LEFT, STAGE_RIGHT, clamp } from './constants';
import type { Rect } from './constants';
import type { CharacterDef, SpecialEffect } from './characters';
import type { FrameInput } from './input';
import type { ParticleSystem } from './particles';
import { audio } from './audio';

export type FighterState =
  | 'idle'
  | 'walk'
  | 'crouch'
  | 'jump'
  | 'block'
  | 'punch'
  | 'kick'
  | 'uppercut'
  | 'sweep'
  | 'jumpkick'
  | 'special'
  | 'hit'
  | 'launched'
  | 'knockdown'
  | 'getup'
  | 'frozen'
  | 'dizzy'
  | 'dead'
  | 'win';

export interface World {
  particles: ParticleSystem;
  spawnProjectile(f: Fighter): void;
  shake(n: number): void;
}

interface AttackDef {
  total: number;
  activeFrom: number;
  activeTo: number;
  damage: number;
  reach: number;
  hitY: number;
  hitH: number;
  kb: number;
  launch?: boolean;
  knockdown?: boolean;
  heavy?: boolean;
}

const ATTACKS: Partial<Record<FighterState, AttackDef>> = {
  punch: { total: 18, activeFrom: 5, activeTo: 9, damage: 6, reach: 64, hitY: -84, hitH: 30, kb: 3 },
  kick: { total: 26, activeFrom: 8, activeTo: 14, damage: 9, reach: 84, hitY: -72, hitH: 34, kb: 5 },
  uppercut: { total: 34, activeFrom: 7, activeTo: 12, damage: 15, reach: 52, hitY: -100, hitH: 66, kb: 4, launch: true, heavy: true },
  sweep: { total: 32, activeFrom: 10, activeTo: 16, damage: 8, reach: 80, hitY: -20, hitH: 22, kb: 3, knockdown: true },
  jumpkick: { total: 60, activeFrom: 4, activeTo: 30, damage: 10, reach: 68, hitY: -56, hitH: 44, kb: 6, knockdown: true, heavy: true },
};

const SPECIAL_TOTAL = 42;
const SPECIAL_CAST_FRAME = 14;
const GROUND_ACTION_STATES: FighterState[] = ['idle', 'walk', 'crouch', 'block'];

export interface HitInfo {
  damage: number;
  kb: number;
  launch?: boolean;
  knockdown?: boolean;
  heavy?: boolean;
  effect?: SpecialEffect;
}

export class Fighter {
  def: CharacterDef;
  index: number;
  x = 0;
  y = FLOOR_Y;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  health = MAX_HEALTH;
  state: FighterState = 'idle';
  stateTime = 0;
  attackHit = false;
  jumpAttackUsed = false;
  freezeTimer = 0;
  dotTimer = 0;
  controlsEnabled = false;
  wantsBlock = false;
  hitFlash = 0;
  roundWins = 0;
  private motionBuf: { dir: 'down' | 'fwd'; t: number }[] = [];

  // Render modifiers (used by fatality sequences)
  renderAlpha = 1;
  renderScaleY = 1;
  boneMode = false;
  visible = true;

  constructor(def: CharacterDef, index: number) {
    this.def = def;
    this.index = index;
  }

  resetForRound(x: number, facing: 1 | -1): void {
    this.x = x;
    this.y = FLOOR_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.health = MAX_HEALTH;
    this.state = 'idle';
    this.stateTime = 0;
    this.attackHit = false;
    this.jumpAttackUsed = false;
    this.freezeTimer = 0;
    this.dotTimer = 0;
    this.controlsEnabled = false;
    this.wantsBlock = false;
    this.hitFlash = 0;
    this.motionBuf = [];
    this.renderAlpha = 1;
    this.renderScaleY = 1;
    this.boneMode = false;
    this.visible = true;
  }

  get onGround(): boolean {
    return this.y >= FLOOR_Y - 0.5;
  }

  setState(s: FighterState): void {
    this.state = s;
    this.stateTime = 0;
    this.attackHit = false;
  }

  hurtbox(): Rect {
    if (this.state === 'knockdown' || this.state === 'dead' || (this.state === 'getup' && this.stateTime < 15)) {
      return { x: this.x - 34, y: this.y - 26, w: 68, h: 24 };
    }
    if (this.state === 'crouch' || this.state === 'sweep' || this.state === 'uppercut') {
      return { x: this.x - 20, y: this.y - 66, w: 40, h: 66 };
    }
    return { x: this.x - 20, y: this.y - 98, w: 40, h: 98 };
  }

  /** Fighters on the ground getting up cannot be hit. */
  get invulnerable(): boolean {
    return this.state === 'knockdown' || this.state === 'getup' || this.state === 'dead';
  }

  get isBlocking(): boolean {
    return (
      this.wantsBlock &&
      this.onGround &&
      GROUND_ACTION_STATES.includes(this.state)
    );
  }

  activeAttack(): HitInfo & { rect: Rect } | null {
    const a = ATTACKS[this.state];
    if (!a || this.attackHit) return null;
    if (this.stateTime < a.activeFrom || this.stateTime > a.activeTo) return null;
    const x0 = this.facing === 1 ? this.x + 6 : this.x - 6 - a.reach;
    return {
      rect: { x: x0, y: this.y + a.hitY, w: a.reach, h: a.hitH },
      damage: a.damage,
      kb: a.kb,
      launch: a.launch,
      knockdown: a.knockdown,
      heavy: a.heavy,
    };
  }

  update(input: FrameInput, opp: Fighter, world: World): void {
    this.stateTime++;
    if (this.hitFlash > 0) this.hitFlash--;
    this.wantsBlock = this.controlsEnabled && input.block;

    // Acid damage-over-time (never lethal on its own)
    if (this.dotTimer > 0 && this.state !== 'dead') {
      this.dotTimer--;
      if (this.dotTimer % 20 === 0 && this.health > 1) {
        this.health = Math.max(1, this.health - 1);
        world.particles.acid(this.x, this.y - 60, 3);
      }
    }

    // Physics
    this.x = clamp(this.x + this.vx, STAGE_LEFT + 20, STAGE_RIGHT - 20);
    if (!this.onGround || this.vy < 0) {
      this.y += this.vy;
      this.vy += GRAVITY;
      if (this.y >= FLOOR_Y) {
        this.y = FLOOR_Y;
        this.land(world);
      }
    }

    // Face the opponent when neutral on the ground
    if (this.onGround && GROUND_ACTION_STATES.includes(this.state)) {
      this.facing = opp.x >= this.x ? 1 : -1;
    }

    switch (this.state) {
      case 'frozen':
        this.vx = 0;
        this.freezeTimer--;
        if (this.freezeTimer <= 0) this.setState('idle');
        return;
      case 'dead':
      case 'dizzy':
      case 'win':
        this.vx = 0;
        return;
      case 'hit':
        this.vx *= 0.86;
        if (this.stateTime > 16) this.setState('idle');
        return;
      case 'launched':
        // Airborne until landing (handled in land())
        return;
      case 'knockdown':
        this.vx *= 0.85;
        if (this.stateTime > 40) this.setState('getup');
        return;
      case 'getup':
        this.vx = 0;
        if (this.stateTime > 26) this.setState('idle');
        return;
      case 'punch':
      case 'kick':
      case 'uppercut':
      case 'sweep': {
        this.vx = 0;
        const a = ATTACKS[this.state]!;
        if (this.stateTime >= a.total) this.setState('idle');
        return;
      }
      case 'special':
        this.vx = 0;
        if (this.stateTime === SPECIAL_CAST_FRAME) {
          world.spawnProjectile(this);
          audio.special();
        }
        if (this.stateTime >= SPECIAL_TOTAL) this.setState('idle');
        return;
      case 'jump':
      case 'jumpkick':
        if (this.controlsEnabled && this.state === 'jump' && !this.jumpAttackUsed && (input.punchPressed || input.kickPressed)) {
          this.jumpAttackUsed = true;
          this.setState('jumpkick');
          audio.whoosh();
        }
        return;
      default:
        break;
    }

    // ----- Neutral ground states: idle / walk / crouch / block -----
    if (!this.controlsEnabled) {
      this.vx = 0;
      if (this.state !== 'idle') this.setState('idle');
      return;
    }

    this.recordMotion(input);

    if (input.block) {
      this.vx = 0;
      if (this.state !== 'block') this.setState('block');
      return;
    }
    if (this.state === 'block') this.setState('idle');

    if (input.punchPressed) {
      if (input.down) {
        this.setState('uppercut');
        audio.whoosh();
      } else if (this.consumeSpecialMotion()) {
        this.setState('special');
      } else {
        this.setState('punch');
        audio.whoosh();
      }
      this.vx = 0;
      return;
    }

    if (input.kickPressed) {
      this.setState(input.down ? 'sweep' : 'kick');
      audio.whoosh();
      this.vx = 0;
      return;
    }

    if (input.upPressed) {
      this.vy = -this.def.jumpVel;
      this.vx = (input.left ? -1 : input.right ? 1 : 0) * this.def.speed * 1.25;
      this.y -= 1; // leave the ground
      this.jumpAttackUsed = false;
      this.setState('jump');
      audio.jump();
      return;
    }

    if (input.down) {
      this.vx = 0;
      if (this.state !== 'crouch') this.setState('crouch');
      return;
    }
    if (this.state === 'crouch') this.setState('idle');

    const dir = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    if (dir !== 0) {
      const backpedal = dir !== this.facing;
      this.vx = dir * this.def.speed * (backpedal ? 0.72 : 1);
      if (this.state !== 'walk') this.setState('walk');
    } else {
      this.vx = 0;
      if (this.state !== 'idle') this.setState('idle');
    }
  }

  private land(world: World): void {
    this.vy = 0;
    if (this.state === 'launched') {
      this.setState('knockdown');
      world.particles.emit(this.x, FLOOR_Y, 8, '#8a7a5a', { speed: 3, spread: Math.PI, size: 3, life: 20, gravity: 0.2 });
      world.shake(8);
      audio.koSlam();
      this.vx *= 0.5;
    } else if (this.state === 'jump' || this.state === 'jumpkick') {
      this.setState('idle');
      this.vx = 0;
      world.particles.emit(this.x, FLOOR_Y, 4, '#8a7a5a', { speed: 2, spread: Math.PI, size: 2, life: 14, gravity: 0.2 });
    } else if (this.state === 'dead') {
      this.vx = 0;
      world.shake(6);
    }
  }

  private recordMotion(input: FrameInput): void {
    const now = performance.now();
    if (input.downPressed) this.motionBuf.push({ dir: 'down', t: now });
    const fwdPressed = this.facing === 1 ? input.rightPressed : input.leftPressed;
    if (fwdPressed) this.motionBuf.push({ dir: 'fwd', t: now });
    this.motionBuf = this.motionBuf.filter((m) => now - m.t < 700);
  }

  /** Down, Forward within 700ms then punch → special move. */
  private consumeSpecialMotion(): boolean {
    for (let i = 0; i < this.motionBuf.length; i++) {
      if (this.motionBuf[i].dir !== 'down') continue;
      for (let j = i + 1; j < this.motionBuf.length; j++) {
        if (this.motionBuf[j].dir === 'fwd') {
          this.motionBuf = [];
          return true;
        }
      }
    }
    return false;
  }

  hasSpecialMotionReady(): boolean {
    let sawDown = false;
    for (const m of this.motionBuf) {
      if (m.dir === 'down') sawDown = true;
      else if (m.dir === 'fwd' && sawDown) return true;
    }
    return false;
  }

  receiveHit(info: HitInfo, dir: 1 | -1, world: World): { blocked: boolean; damage: number } {
    if (this.isBlocking) {
      const chip = Math.max(1, Math.round(info.damage * 0.2));
      this.health = Math.max(1, this.health - chip);
      this.vx = dir * 4;
      this.hitFlash = 3;
      audio.block();
      world.particles.sparks(this.x + dir * -14, this.y - 70, '#9ecbff');
      return { blocked: true, damage: chip };
    }

    let damage = info.damage;
    const wasFrozen = this.state === 'frozen';
    if (wasFrozen) damage = Math.round(damage * 1.5);

    this.health = clamp(this.health - damage, 0, MAX_HEALTH);
    this.hitFlash = 6;
    world.particles.blood(this.x, this.y - 60 + Math.random() * 20, dir);
    world.shake(info.heavy ? 10 : 4);

    if (info.effect === 'burn') {
      world.particles.flames(this.x, this.y - 60, 10);
      audio.fire();
    } else if (info.effect === 'acid') {
      this.dotTimer = 80;
      world.particles.acid(this.x, this.y - 60, 10);
    } else if (info.effect === 'shock') {
      world.particles.sparks(this.x, this.y - 60, '#c8bfff');
      world.particles.sparks(this.x, this.y - 30, '#ffffff');
    }

    if (info.effect === 'freeze' && !wasFrozen && this.onGround && this.state !== 'dizzy') {
      this.setState('frozen');
      this.freezeTimer = 110;
      this.vx = 0;
      audio.freeze();
      return { blocked: false, damage };
    }

    const airborne = !this.onGround;
    if (info.launch || wasFrozen || airborne) {
      this.setState('launched');
      this.vy = info.launch ? -12 : -7;
      this.vx = dir * 4.5;
      this.y -= 2;
      audio.heavyHit();
    } else if (info.knockdown) {
      this.setState('launched');
      this.vy = -5;
      this.vx = dir * 5;
      this.y -= 2;
      audio.heavyHit();
    } else {
      this.setState('hit');
      this.vx = dir * info.kb;
      audio.hit();
    }
    return { blocked: false, damage };
  }

  // ---------------------------------------------------------------
  // Rendering — the whole fighter is drawn procedurally.
  // ---------------------------------------------------------------

  private pal(): { primary: string; secondary: string; accent: string } {
    if (this.boneMode) return { primary: '#e8e4da', secondary: '#c9c4b8', accent: '#ffffff' };
    if (this.hitFlash > 0) return { primary: '#ffffff', secondary: '#ffd7d7', accent: '#ffffff' };
    return this.def;
  }

  private seg(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    w: number,
    color: string,
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  private limb(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    mx: number,
    my: number,
    ex: number,
    ey: number,
    upperColor: string,
    lowerColor: string,
    w: number,
  ): void {
    this.seg(ctx, sx, sy, mx, my, w, upperColor);
    this.seg(ctx, mx, my, ex, ey, w - 1, lowerColor);
  }

  draw(ctx: CanvasRenderingContext2D, tick: number): void {
    if (!this.visible || this.renderAlpha <= 0) return;
    const c = this.pal();
    const f = this.facing;
    const t = this.stateTime;

    ctx.save();
    ctx.globalAlpha = this.renderAlpha;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x, FLOOR_Y + 10, 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(this.x, this.y);
    if (this.renderScaleY !== 1) ctx.scale(1, this.renderScaleY);

    const X = (v: number) => v * f;

    // Lying-down states
    if (this.state === 'knockdown' || this.state === 'dead' || (this.state === 'getup' && this.stateTime < 13)) {
      this.drawLying(ctx, c, f);
      ctx.restore();
      return;
    }

    if (this.state === 'launched') {
      ctx.rotate(-f * Math.min(1.4, 0.25 + t * 0.06));
      this.drawCompactBody(ctx, c, f);
      ctx.restore();
      return;
    }

    // Pose parameters
    let drop = 0;
    let lean = 0;
    // Limb endpoints in facing-space: [midX, midY, endX, endY]
    let armF: number[] = [10, -66, 20, -78]; // guard
    let armB: number[] = [-2, -64, 10, -72];
    let legF: number[] = [10, -26, 15, 0];
    let legB: number[] = [-8, -26, -15, 0];
    let headDx = 3;

    const bob = Math.sin(tick * 0.1 + this.index * 2) * 1.6;

    switch (this.state) {
      case 'idle':
        drop = 2 + bob;
        break;
      case 'walk': {
        const s = Math.sin(t * 0.28);
        drop = 2 + Math.abs(s) * 2;
        legF = [12 + s * 8, -26, 16 + s * 14, 0];
        legB = [-8 - s * 8, -26, -14 - s * 14, 0];
        armF = [10, -66, 20 + s * 4, -76];
        break;
      }
      case 'crouch':
      case 'block':
        if (this.state === 'crouch') {
          drop = 30;
          legF = [20, -18, 20, 0];
          legB = [-18, -18, -20, 0];
          armF = [12, -50 + 30, 18, -60 + 30];
          armB = [-4, -48 + 30, 8, -56 + 30];
        } else {
          drop = 6;
          armF = [14, -74, 10, -88];
          armB = [12, -62, 16, -76];
        }
        break;
      case 'jump':
        drop = 0;
        legF = [12, -30, 8, -16];
        legB = [-8, -30, -6, -14];
        armF = [14, -70, 24, -84];
        armB = [-6, -68, -14, -82];
        break;
      case 'punch': {
        const p = attackProgress(t, 5, 9, 18);
        lean = 6 * p;
        armF = [16 + 12 * p, -80, 20 + 28 * p, -82];
        armB = [-2, -62, 8, -70];
        legF = [14, -26, 20, 0];
        legB = [-10, -26, -18, 0];
        break;
      }
      case 'kick': {
        const p = attackProgress(t, 8, 14, 26);
        lean = -4 * p;
        legF = [14 + 12 * p, -40 - 14 * p, 18 + 32 * p, -34 - 40 * p];
        legB = [-6, -24, -12, 0];
        armF = [12, -70, 18, -80];
        armB = [-8, -60, -16, -70];
        break;
      }
      case 'uppercut': {
        const p = attackProgress(t, 7, 12, 34);
        drop = 24 * (1 - p);
        lean = 4;
        armF = [18, -50 - 20 * p, 16, -50 - 55 * p];
        armB = [-4, -50, 6, -58];
        legF = [16, -20 - 8 * p, 20, 0];
        legB = [-14, -18, -18, 0];
        break;
      }
      case 'sweep': {
        const p = attackProgress(t, 10, 16, 32);
        drop = 34;
        lean = -8;
        legF = [24 * p + 10, -8, 30 + 26 * p, -2];
        legB = [-12, -14, -16, 0];
        armF = [10, -40 + 34, 20, -46 + 34];
        armB = [-10, -38 + 34, -18, -44 + 34];
        break;
      }
      case 'jumpkick': {
        legF = [22, -44, 40, -28];
        legB = [-6, -34, -12, -18];
        armF = [14, -72, 26, -86];
        armB = [-8, -66, -16, -78];
        break;
      }
      case 'special': {
        const p = Math.min(1, t / SPECIAL_CAST_FRAME);
        lean = 10 * p;
        drop = 4;
        armF = [20 + 8 * p, -74, 24 + 18 * p, -74];
        armB = [16 + 8 * p, -66, 22 + 16 * p, -68];
        legF = [18, -24, 26, 0];
        legB = [-14, -22, -22, 0];
        break;
      }
      case 'hit':
        lean = -12;
        headDx = -4;
        armF = [4, -80, -6, -92];
        armB = [-10, -60, -20, -66];
        legF = [12, -28, 20, -8];
        legB = [-8, -24, -12, 0];
        break;
      case 'frozen':
        drop = 2;
        break;
      case 'dizzy': {
        lean = Math.sin(t * 0.12) * 9;
        drop = 8 + Math.sin(t * 0.2) * 2;
        armF = [12, -58, 16, -50];
        armB = [-6, -56, -12, -48];
        headDx = Math.sin(t * 0.12) * 5;
        break;
      }
      case 'getup':
        drop = 26 * (1 - Math.min(1, (t - 13) / 13));
        break;
      case 'win': {
        const pump = Math.sin(t * 0.15) * 4;
        armF = [14, -92, 10, -108 - pump];
        armB = [-8, -62, -14, -54];
        drop = 2;
        break;
      }
      default:
        break;
    }

    const hipY = -46 + drop;
    const shX = X(lean);
    const shY = -80 + drop * 0.85;

    // Back arm
    this.limb(ctx, shX - X(4), shY + 2, X(armB[0]), armB[1], X(armB[2]), armB[3], c.secondary, c.primary, 9);
    this.fist(ctx, X(armB[2]), armB[3], c.primary);
    // Back leg
    this.limb(ctx, -X(4), hipY, X(legB[0]), legB[1], X(legB[2]), legB[3], c.secondary, c.primary, 10);
    // Torso
    this.seg(ctx, 0, hipY, shX, shY, 21, c.secondary);
    this.seg(ctx, shX * 0.4, hipY - 14, shX, shY, 22, c.primary);
    this.seg(ctx, -8, hipY, 8, hipY, 7, c.accent); // belt
    // Front leg
    this.limb(ctx, X(4), hipY, X(legF[0]), legF[1], X(legF[2]), legF[3], c.secondary, c.primary, 10);
    // Head
    this.drawHead(ctx, shX + X(headDx), shY - 16, c, f);
    // Front arm
    this.limb(ctx, shX + X(4), shY + 2, X(armF[0]), armF[1], X(armF[2]), armF[3], c.secondary, c.primary, 9);
    this.fist(ctx, X(armF[2]), armF[3], c.primary);

    // Special-cast glow
    if (this.state === 'special' && t < SPECIAL_CAST_FRAME + 6) {
      ctx.fillStyle = this.def.accent;
      ctx.shadowColor = this.def.accent;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(X(armF[2]) + X(6), armF[3], 6 + Math.sin(tick * 0.6) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Frozen: ice block overlay
    if (this.state === 'frozen') {
      ctx.fillStyle = 'rgba(140,215,255,0.45)';
      ctx.strokeStyle = 'rgba(220,245,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-28, -104, 56, 106, 8);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.moveTo(-16, -92);
      ctx.lineTo(-6, -60);
      ctx.moveTo(10, -80);
      ctx.lineTo(16, -40);
      ctx.stroke();
    }

    // Dizzy stars
    if (this.state === 'dizzy') {
      for (let i = 0; i < 3; i++) {
        const a = t * 0.12 + (i * Math.PI * 2) / 3;
        ctx.fillStyle = '#ffe680';
        ctx.beginPath();
        ctx.arc(shX + Math.cos(a) * 22, shY - 24 + Math.sin(a) * 7, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private fist(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHead(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    c: { primary: string; secondary: string; accent: string },
    f: number,
  ): void {
    // Hood
    ctx.fillStyle = c.secondary;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    // Mask band
    ctx.fillStyle = c.primary;
    ctx.fillRect(x - 11, y - 3, 22, 7);
    // Eyes
    ctx.fillStyle = this.boneMode ? '#222' : '#ffffff';
    ctx.fillRect(x + f * 2, y - 1, 4, 2.5);
    ctx.fillRect(x + f * 8 - (f === 1 ? 0 : 4), y - 1, 3, 2.5);
    // VOLT's straw hat
    if (this.def.id === 'volt' && !this.boneMode) {
      ctx.fillStyle = c.primary;
      ctx.beginPath();
      ctx.moveTo(x - 17, y - 7);
      ctx.lineTo(x, y - 20);
      ctx.lineTo(x + 17, y - 7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 17, y - 7);
      ctx.lineTo(x + 17, y - 7);
      ctx.stroke();
    }
  }

  private drawLying(ctx: CanvasRenderingContext2D, c: { primary: string; secondary: string; accent: string }, f: number): void {
    // Body flat on the ground, head away from the opponent
    this.seg(ctx, -f * 18, -10, f * 10, -12, 18, c.secondary);
    this.seg(ctx, -f * 10, -11, f * 8, -12, 16, c.primary);
    this.limb(ctx, f * 8, -12, f * 20, -8, f * 32, -6, c.secondary, c.primary, 9);
    this.limb(ctx, f * 6, -14, f * 16, -16, f * 28, -12, c.secondary, c.primary, 8);
    ctx.fillStyle = c.secondary;
    ctx.beginPath();
    ctx.arc(-f * 28, -12, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.primary;
    ctx.fillRect(-f * 28 - 10, -14, 20, 6);
  }

  private drawCompactBody(ctx: CanvasRenderingContext2D, c: { primary: string; secondary: string; accent: string }, f: number): void {
    this.seg(ctx, 0, -40, f * 6, -70, 20, c.secondary);
    this.seg(ctx, f * 3, -55, f * 6, -70, 21, c.primary);
    this.limb(ctx, f * 4, -68, f * 16, -60, f * 22, -48, c.secondary, c.primary, 9);
    this.limb(ctx, -f * 2, -66, -f * 14, -58, -f * 18, -46, c.secondary, c.primary, 9);
    this.limb(ctx, f * 2, -40, f * 12, -24, f * 10, -8, c.secondary, c.primary, 10);
    this.limb(ctx, -f * 2, -40, -f * 10, -26, -f * 14, -10, c.secondary, c.primary, 10);
    this.drawHead(ctx, f * 8, -84, c, f);
  }
}

/** 0→1 ramp toward the active window, holds ~1 through it, eases back. */
function attackProgress(t: number, from: number, to: number, total: number): number {
  if (t < from) return t / from;
  if (t <= to) return 1;
  return Math.max(0, 1 - (t - to) / (total - to));
}
