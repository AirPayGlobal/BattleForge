import {
  W,
  H,
  FLOOR_Y,
  MAX_HEALTH,
  ROUNDS_TO_WIN,
  ROUND_TIME,
  clamp,
  overlaps,
  pick,
  rand,
} from './constants';
import { CHARACTERS } from './characters';
import { Keyboard, P1_CONTROLS, P2_CONTROLS, nullInput } from './input';
import type { FrameInput } from './input';
import { Fighter } from './fighter';
import type { World } from './fighter';
import { Projectile } from './projectile';
import { ParticleSystem } from './particles';
import { Cpu } from './ai';
import { Stage, STAGES } from './stage';
import { drawHud, drawAnnouncement, makeAnnouncement } from './hud';
import type { Announcement } from './hud';
import { audio } from './audio';

type Phase =
  | 'title'
  | 'mode'
  | 'select'
  | 'vs'
  | 'intro'
  | 'fight'
  | 'roundEnd'
  | 'finishHim'
  | 'fatality'
  | 'matchEnd';

const P1_START = 280;
const P2_START = W - 280;
const FATALITY_RANGE = 160;

export class Game implements World {
  kb = new Keyboard();
  particles = new ParticleSystem();
  projectiles: Projectile[] = [];
  stage: Stage = new Stage(pick(STAGES));

  phase: Phase = 'title';
  phaseTime = 0;
  tick = 0;
  paused = false;

  mode: '1p' | '2p' = '1p';
  menuIndex = 0;

  cursor: [number, number] = [0, 1];
  selected: [boolean, boolean] = [false, false];
  private previews: Fighter[] = CHARACTERS.map((c) => new Fighter(c, 0));

  fighters: [Fighter, Fighter] | null = null;
  cpu = new Cpu(1);
  round = 1;
  timerFrames = ROUND_TIME * 60;

  announcements: Announcement[] = [];
  shakeAmt = 0;

  finishTimer = 0;
  fatalityTime = 0;
  fatalityWinner: Fighter | null = null;
  fatalityLoser: Fighter | null = null;
  lightningFlash = 0;
  redFlash = 0;

  comboCount: [number, number] = [0, 0];
  comboShow: [number, number] = [0, 0];

  // ---- World interface -------------------------------------------------

  spawnProjectile(f: Fighter): void {
    if (this.phase === 'fatality') return;
    if (this.projectiles.some((p) => p.ownerIndex === f.index)) return;
    this.projectiles.push(
      new Projectile(
        f.x + f.facing * 34,
        f.y - 76,
        f.facing * f.def.projectileSpeed,
        f.index,
        f.def.effect,
        f.def.projectileDamage,
        f.def.primary,
        f.def.accent,
      ),
    );
  }

  shake(n: number): void {
    this.shakeAmt = Math.max(this.shakeAmt, n);
  }

  // ---- Helpers ----------------------------------------------------------

  private announce(text: string, duration = 90, opts: Parameters<typeof makeAnnouncement>[2] = {}): void {
    this.announcements.push(makeAnnouncement(text, duration, opts));
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseTime = 0;
  }

  private get pair(): [Fighter, Fighter] {
    if (!this.fighters) throw new Error('fighters not initialized');
    return this.fighters;
  }

  private startMatch(): void {
    const [i1, i2] = this.cursor;
    const p1 = new Fighter(CHARACTERS[i1], 0);
    const p2 = new Fighter(CHARACTERS[i2], 1);
    this.fighters = [p1, p2];
    this.stage = new Stage(pick(STAGES));
    this.round = 1;
    this.cpu = new Cpu(1);
    this.startRound();
  }

  private startRound(): void {
    const [p1, p2] = this.pair;
    p1.resetForRound(P1_START, 1);
    p2.resetForRound(P2_START, -1);
    this.projectiles = [];
    this.particles.clear();
    this.timerFrames = ROUND_TIME * 60;
    this.comboCount = [0, 0];
    this.comboShow = [0, 0];
    this.cpu.reset();
    this.cpu.difficulty = 0.7 + this.round * 0.3;
    this.setPhase('intro');
  }

  // ---- Update -----------------------------------------------------------

  update(): void {
    this.tick++;

    if (this.kb.wasPressed(['KeyM'])) audio.toggleMute();
    if (this.kb.wasPressed(['KeyP']) && ['fight', 'intro', 'finishHim'].includes(this.phase)) {
      this.paused = !this.paused;
    }
    if (this.paused) {
      this.kb.endFrame();
      return;
    }

    this.phaseTime++;
    this.shakeAmt *= 0.85;
    if (this.lightningFlash > 0) this.lightningFlash--;
    if (this.redFlash > 0) this.redFlash--;
    for (const a of this.announcements) a.age++;
    this.announcements = this.announcements.filter((a) => a.age < a.duration);
    this.particles.update();

    switch (this.phase) {
      case 'title':
        if (this.kb.anyPressed()) {
          audio.ensure();
          audio.startMusic();
          audio.menuSelect();
          this.setPhase('mode');
        }
        break;
      case 'mode':
        this.updateModeMenu();
        break;
      case 'select':
        this.updateSelect();
        break;
      case 'vs':
        if (this.phaseTime > 140 || this.confirmPressed()) this.startMatch();
        break;
      case 'intro':
        this.updateIntro();
        break;
      case 'fight':
        this.updateFight();
        break;
      case 'roundEnd':
        this.updateRoundEnd();
        break;
      case 'finishHim':
        this.updateFinishHim();
        break;
      case 'fatality':
        this.updateFatality();
        break;
      case 'matchEnd':
        this.updateMatchEnd();
        break;
    }

    this.kb.endFrame();
  }

  private confirmPressed(): boolean {
    return this.kb.wasPressed(['Enter', 'Space', 'KeyF', 'Comma', 'Numpad1']);
  }

  private updateModeMenu(): void {
    if (this.kb.wasPressed(['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown'])) {
      this.menuIndex = 1 - this.menuIndex;
      audio.menuMove();
    }
    if (this.confirmPressed()) {
      this.mode = this.menuIndex === 0 ? '1p' : '2p';
      this.selected = [false, false];
      this.cursor = [0, 1];
      audio.menuSelect();
      this.setPhase('select');
    }
    if (this.kb.wasPressed(['Escape'])) this.setPhase('title');
  }

  private updateSelect(): void {
    if (this.kb.wasPressed(['Escape'])) {
      this.setPhase('mode');
      return;
    }
    const n = CHARACTERS.length;
    if (!this.selected[0]) {
      if (this.kb.wasPressed(P1_CONTROLS.left)) {
        this.cursor[0] = (this.cursor[0] + n - 1) % n;
        audio.menuMove();
      }
      if (this.kb.wasPressed(P1_CONTROLS.right)) {
        this.cursor[0] = (this.cursor[0] + 1) % n;
        audio.menuMove();
      }
      if (this.kb.wasPressed([...P1_CONTROLS.punch, 'Enter'])) {
        this.selected[0] = true;
        audio.menuSelect();
        this.phaseTime = 0;
      }
      return;
    }
    if (this.mode === '1p') {
      // CPU roulette pick
      if (!this.selected[1]) {
        if (this.phaseTime % 6 === 0) {
          this.cursor[1] = Math.floor(Math.random() * n);
          audio.menuMove();
        }
        if (this.phaseTime > 55) {
          this.selected[1] = true;
          audio.menuSelect();
        }
      } else if (this.phaseTime > 90) {
        this.setPhase('vs');
      }
      return;
    }
    // 2P pick
    if (!this.selected[1]) {
      if (this.kb.wasPressed(P2_CONTROLS.left)) {
        this.cursor[1] = (this.cursor[1] + n - 1) % n;
        audio.menuMove();
      }
      if (this.kb.wasPressed(P2_CONTROLS.right)) {
        this.cursor[1] = (this.cursor[1] + 1) % n;
        audio.menuMove();
      }
      if (this.kb.wasPressed(P2_CONTROLS.punch)) {
        this.selected[1] = true;
        audio.menuSelect();
        this.phaseTime = 0;
      }
    } else if (this.phaseTime > 40) {
      this.setPhase('vs');
    }
  }

  private updateIntro(): void {
    const [p1, p2] = this.pair;
    this.updateFighters(nullInput(), nullInput());
    if (this.phaseTime === 20) {
      this.announce(`ROUND ${this.round}`, 70);
      audio.announce(`round ${this.round}`);
    }
    if (this.phaseTime === 90) {
      this.announce('FIGHT!', 50, { size: 96, bloody: true });
      audio.announce('fight!');
    }
    if (this.phaseTime >= 100) {
      p1.controlsEnabled = true;
      p2.controlsEnabled = true;
      this.setPhase('fight');
    }
  }

  private sampleInputs(): [FrameInput, FrameInput] {
    const [p1, p2] = this.pair;
    const i1 = this.kb.sample(P1_CONTROLS);
    const i2 =
      this.mode === '1p'
        ? this.cpu.update(p2, p1, this.projectiles, this.phase === 'finishHim' && p1.health <= 0)
        : this.kb.sample(P2_CONTROLS);
    return [i1, i2];
  }

  private updateFighters(i1: FrameInput, i2: FrameInput): void {
    const [p1, p2] = this.pair;
    p1.update(i1, p2, this);
    p2.update(i2, p1, this);

    // Push apart when overlapping on the ground
    const solid = (f: Fighter) => f.onGround && !['knockdown', 'getup', 'dead'].includes(f.state);
    if (solid(p1) && solid(p2)) {
      const dx = p2.x - p1.x;
      const minDist = 40;
      if (Math.abs(dx) < minDist) {
        const sign = dx === 0 ? 1 : Math.sign(dx);
        const push = (minDist - Math.abs(dx)) / 2;
        p1.x = clamp(p1.x - sign * push, 80, W - 80);
        p2.x = clamp(p2.x + sign * push, 80, W - 80);
      }
    }
  }

  private updateProjectiles(allowFinish: boolean): void {
    const [p1, p2] = this.pair;
    for (const p of this.projectiles) {
      p.update(this.particles);
      const target = p.ownerIndex === 0 ? p2 : p1;
      if (!p.dead && !target.invulnerable && overlaps(p.rect(), target.hurtbox())) {
        p.dead = true;
        const dir = (Math.sign(p.vx) || 1) as 1 | -1;
        const res = target.receiveHit({ damage: p.damage, kb: 6, effect: p.effect, heavy: true }, dir, this);
        this.particles.sparks(p.x, p.y, p.accent);
        if (!res.blocked) this.registerHit(p.ownerIndex === 0 ? 0 : 1);
        if (allowFinish && this.phase === 'finishHim' && target === this.finishLoser()) {
          this.finalKO();
        }
      }
    }
    // Projectiles cancel each other
    const live = this.projectiles.filter((p) => !p.dead);
    if (live.length === 2 && overlaps(live[0].rect(), live[1].rect())) {
      live[0].dead = true;
      live[1].dead = true;
      this.particles.sparks((live[0].x + live[1].x) / 2, live[0].y, '#ffffff');
      audio.block();
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  private resolveMelee(onHit?: (attacker: Fighter, victim: Fighter) => void): void {
    const [p1, p2] = this.pair;
    const pairs: [Fighter, Fighter][] = [
      [p1, p2],
      [p2, p1],
    ];
    for (const [att, vic] of pairs) {
      const atk = att.activeAttack();
      if (!atk || vic.invulnerable) continue;
      if (!overlaps(atk.rect, vic.hurtbox())) continue;
      att.attackHit = true;
      const res = vic.receiveHit(atk, att.facing, this);
      if (!res.blocked) {
        this.registerHit(att.index as 0 | 1);
        onHit?.(att, vic);
      }
    }
  }

  private registerHit(attackerIndex: 0 | 1): void {
    this.comboCount[attackerIndex]++;
    if (this.comboCount[attackerIndex] >= 2) this.comboShow[attackerIndex] = 70;
  }

  private updateComboTracking(): void {
    const [p1, p2] = this.pair;
    const victims: [Fighter, Fighter] = [p2, p1];
    for (let i = 0; i < 2; i++) {
      const v = victims[i];
      if (!['hit', 'launched', 'frozen', 'knockdown'].includes(v.state)) this.comboCount[i] = 0;
      if (this.comboShow[i] > 0) this.comboShow[i]--;
    }
  }

  private updateFight(): void {
    const [p1, p2] = this.pair;
    const [i1, i2] = this.sampleInputs();
    this.updateFighters(i1, i2);
    this.updateProjectiles(false);
    this.resolveMelee();
    this.updateComboTracking();

    this.timerFrames--;

    if (p1.health <= 0 || p2.health <= 0) {
      const winner = p1.health <= 0 ? p2 : p1;
      const loser = p1.health <= 0 ? p1 : p2;
      winner.roundWins++;
      winner.controlsEnabled = false;
      loser.controlsEnabled = false;
      if (winner.roundWins >= ROUNDS_TO_WIN) {
        this.finishTimer = 420;
        this.setPhase('finishHim');
        this.announce('FINISH HIM!', 130, { size: 84, bloody: true });
        audio.announce('finish him!');
        winner.controlsEnabled = true;
      } else {
        this.koRound(winner, loser);
      }
      return;
    }

    if (this.timerFrames <= 0) {
      p1.controlsEnabled = false;
      p2.controlsEnabled = false;
      this.announce('TIME UP', 80);
      if (p1.health === p2.health) {
        this.announce('DRAW', 90, { size: 60 });
        this.setPhase('roundEnd');
        return;
      }
      const winner = p1.health > p2.health ? p1 : p2;
      winner.roundWins++;
      this.announce(`${winner.def.name} WINS`, 130, { size: 64 });
      audio.announce(`${winner.def.name} wins`);
      this.setPhase('roundEnd');
    }
  }

  private koRound(winner: Fighter, loser: Fighter): void {
    if (!['launched', 'knockdown'].includes(loser.state)) {
      loser.setState('launched');
      loser.vy = -9;
      loser.vx = winner.facing * 5;
      loser.y -= 2;
    }
    this.particles.blood(loser.x, loser.y - 60, winner.facing, 30);
    audio.koSlam();
    this.shake(14);
    this.announce(`${winner.def.name} WINS`, 140, { size: 64 });
    if (winner.health >= MAX_HEALTH) {
      this.announce('FLAWLESS VICTORY', 140, { size: 40, color: '#7cf25a' });
      audio.announce('flawless victory');
    } else {
      audio.announce(`${winner.def.name} wins`);
    }
    this.setPhase('roundEnd');
  }

  private updateRoundEnd(): void {
    this.updateFighters(nullInput(), nullInput());
    this.updateProjectiles(false);
    if (this.phaseTime < 170) return;
    const [p1, p2] = this.pair;
    if (p1.roundWins >= ROUNDS_TO_WIN || p2.roundWins >= ROUNDS_TO_WIN) {
      this.enterMatchEnd(p1.roundWins >= ROUNDS_TO_WIN ? p1 : p2);
    } else {
      this.round++;
      this.startRound();
    }
  }

  private finishWinner(): Fighter {
    const [p1, p2] = this.pair;
    return p1.health > 0 ? p1 : p2;
  }

  private finishLoser(): Fighter {
    const [p1, p2] = this.pair;
    return p1.health > 0 ? p2 : p1;
  }

  private updateFinishHim(): void {
    const winner = this.finishWinner();
    const loser = this.finishLoser();
    this.finishTimer--;

    // Once the loser recovers from the KO hit, they stand dazed
    if (['idle', 'walk', 'hit', 'frozen', 'crouch', 'block'].includes(loser.state)) {
      loser.setState('dizzy');
    }

    const [i1raw, i2raw] = this.sampleInputs();
    let winnerInput = winner.index === 0 ? i1raw : i2raw;

    // Fatality trigger: special motion + punch, close to the victim
    const dist = Math.abs(winner.x - loser.x);
    if (
      loser.state === 'dizzy' &&
      winnerInput.punchPressed &&
      winner.hasSpecialMotionReady() &&
      dist < FATALITY_RANGE &&
      ['idle', 'walk', 'crouch', 'block'].includes(winner.state)
    ) {
      this.startFatality(winner, loser);
      return;
    }

    const i1 = winner.index === 0 ? winnerInput : nullInput();
    const i2 = winner.index === 1 ? winnerInput : nullInput();
    this.updateFighters(i1, i2);
    this.updateProjectiles(true);
    if (this.phase !== 'finishHim') return; // projectile finished it

    this.resolveMelee((att, vic) => {
      if (vic === loser) this.finalKO();
    });
    if (this.phase !== 'finishHim') return;

    if (this.finishTimer <= 0 && loser.state === 'dizzy') {
      // Mercy expired — the loser collapses on their own
      this.finalKO();
    }
  }

  private finalKO(): void {
    const winner = this.finishWinner();
    const loser = this.finishLoser();
    if (!['launched', 'knockdown'].includes(loser.state)) {
      loser.setState('launched');
      loser.vy = -9;
      loser.vx = winner.facing * 5;
      loser.y -= 2;
    }
    this.particles.blood(loser.x, loser.y - 60, winner.facing, 34);
    audio.koSlam();
    this.shake(14);
    winner.controlsEnabled = false;
    this.announce(`${winner.def.name} WINS`, 140, { size: 64 });
    if (winner.health >= MAX_HEALTH) {
      this.announce('FLAWLESS VICTORY', 140, { size: 40, color: '#7cf25a' });
      audio.announce('flawless victory');
    } else {
      audio.announce(`${winner.def.name} wins`);
    }
    this.setPhase('roundEnd');
  }

  private startFatality(winner: Fighter, loser: Fighter): void {
    this.fatalityWinner = winner;
    this.fatalityLoser = loser;
    this.fatalityTime = 0;
    winner.controlsEnabled = false;
    winner.facing = loser.x >= winner.x ? 1 : -1;
    winner.setState('special');
    this.projectiles = [];
    this.setPhase('fatality');
  }

  private updateFatality(): void {
    const winner = this.fatalityWinner!;
    const loser = this.fatalityLoser!;
    const t = ++this.fatalityTime;
    const kind = winner.def.effect;

    // Keep fighters simulated (no input)
    this.updateFighters(nullInput(), nullInput());
    if (winner.state === 'idle') winner.setState('win');

    if (kind === 'burn') {
      if (t === 12) audio.fire();
      if (t > 12 && t < 95) {
        this.particles.flames(loser.x + rand(-16, 16), loser.y - rand(0, 90), 4);
        this.shake(2);
      }
      if (t === 60) loser.boneMode = true;
      if (t === 95) {
        loser.setState('dead');
        this.particles.emit(loser.x, loser.y - 40, 30, '#555049', { speed: 3, spread: Math.PI, size: 3, life: 50, gravity: 0.2 });
      }
      if (t === 120) this.fatalityBanner(winner);
      if (t >= 270) this.enterMatchEnd(winner);
    } else if (kind === 'freeze') {
      if (t === 8) {
        loser.setState('frozen');
        loser.freezeTimer = 9999;
        audio.freeze();
      }
      if (t === 62) winner.setState('uppercut');
      if (t === 74) {
        loser.visible = false;
        this.particles.iceShards(loser.x, loser.y - 50, 90);
        this.particles.blood(loser.x, loser.y - 50, winner.facing, 18);
        audio.shatter();
        this.shake(16);
      }
      if (t === 105) this.fatalityBanner(winner);
      if (t >= 255) this.enterMatchEnd(winner);
    } else if (kind === 'shock') {
      if (t === 15 || t === 40 || t === 65) {
        audio.thunder();
        this.lightningFlash = 12;
        this.shake(10);
      }
      if (t > 15 && t < 88) loser.boneMode = t % 12 < 6;
      if (t === 88) {
        loser.visible = false;
        this.particles.blood(loser.x, loser.y - 50, 1, 30);
        this.particles.blood(loser.x, loser.y - 50, -1, 30);
        this.particles.emit(loser.x, loser.y - 50, 20, '#e8e4da', { speed: 8, spread: Math.PI, size: 4, life: 60, gravity: 0.4, pools: false });
        audio.koSlam();
        this.shake(18);
      }
      if (t === 115) this.fatalityBanner(winner);
      if (t >= 265) this.enterMatchEnd(winner);
    } else {
      // acid
      if (t === 14) audio.fire();
      if (t > 14 && t < 110) {
        this.particles.acid(loser.x + rand(-22, 22), loser.y - 105, 3);
        loser.renderScaleY = Math.max(0.04, 1 - (t - 14) / 90);
      }
      if (t === 110) {
        loser.visible = false;
        this.particles.acid(loser.x, loser.y - 6, 26);
      }
      if (t === 130) this.fatalityBanner(winner);
      if (t >= 275) this.enterMatchEnd(winner);
    }
  }

  private fatalityBanner(winner: Fighter): void {
    this.announce('FATALITY', 150, { size: 100, bloody: true });
    this.announce(winner.def.fatalityName, 150, { size: 30, color: '#ff8080' });
    this.redFlash = 20;
    audio.announce('fatality');
  }

  private enterMatchEnd(winner: Fighter): void {
    if (this.phase === 'fatality') {
      this.announce(`${winner.def.name} WINS`, 140, { size: 64 });
      audio.announce(`${winner.def.name} wins`);
    }
    winner.setState('win');
    winner.controlsEnabled = false;
    this.setPhase('matchEnd');
  }

  private updateMatchEnd(): void {
    this.updateFighters(nullInput(), nullInput());
    if (this.phaseTime < 40) return;
    if (this.confirmPressed()) {
      // Rematch: same fighters, fresh match
      const [p1, p2] = this.pair;
      p1.roundWins = 0;
      p2.roundWins = 0;
      this.startMatch();
    }
    if (this.kb.wasPressed(['Escape'])) {
      this.selected = [false, false];
      this.fighters = null;
      this.setPhase('select');
    }
  }

  // ---- Drawing ----------------------------------------------------------

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.shakeAmt > 0.5) {
      ctx.translate(rand(-this.shakeAmt, this.shakeAmt), rand(-this.shakeAmt, this.shakeAmt));
    }

    this.stage.draw(ctx, this.tick);

    if (this.fighters) {
      const [p1, p2] = this.fighters;
      // Draw the fighter in a "background" state first
      const order = ['dead', 'knockdown'].includes(p1.state) ? [p1, p2] : [p2, p1];
      order[0].draw(ctx, this.tick);
      order[1].draw(ctx, this.tick);
      for (const p of this.projectiles) p.draw(ctx);
    }

    this.particles.draw(ctx);

    // Shock fatality lightning
    if (this.lightningFlash > 0 && this.fatalityLoser) {
      this.drawLightning(ctx, this.fatalityLoser.x, this.fatalityLoser.y - 90);
      ctx.fillStyle = `rgba(255,255,255,${this.lightningFlash / 30})`;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }
    if (this.redFlash > 0) {
      ctx.fillStyle = `rgba(180,0,0,${this.redFlash / 60})`;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }

    ctx.restore();

    // ---- UI layers (not shaken) ----
    switch (this.phase) {
      case 'title':
        this.drawTitle(ctx);
        break;
      case 'mode':
        this.drawModeMenu(ctx);
        break;
      case 'select':
        this.drawSelect(ctx);
        break;
      case 'vs':
        this.drawVs(ctx);
        break;
      default: {
        const [p1, p2] = this.pair;
        drawHud(ctx, p1, p2, this.timerFrames / 60, this.tick);
        this.drawCombos(ctx);
        if (this.phase === 'matchEnd') this.drawMatchEnd(ctx);
        if (this.phase === 'fight' && this.round === 1 && this.timerFrames > (ROUND_TIME - 7) * 60) {
          this.drawControlsHint(ctx);
        }
        break;
      }
    }

    let ay = H * 0.34;
    for (const a of this.announcements) {
      drawAnnouncement(ctx, a, ay);
      ay += 74;
    }

    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      this.bigText(ctx, 'PAUSED', W / 2, H / 2, 60, '#ffe680');
      this.smallText(ctx, 'P TO RESUME — M TO MUTE', W / 2, H / 2 + 50, 16, '#aaa');
    }
  }

  private drawLightning(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.strokeStyle = '#e6dcff';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#8f7bff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    let px = x + rand(-60, 60);
    let py = 0;
    ctx.moveTo(px, py);
    while (py < y) {
      py += rand(20, 45);
      px += rand(-26, 26);
      ctx.lineTo(px, Math.min(py, y));
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private bigText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string): void {
    ctx.font = `bold ${size}px Impact, "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, size / 10);
    ctx.strokeStyle = '#000';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  private smallText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string): void {
    ctx.font = `${size}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  private drawTitle(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    // Dragon-style emblem
    const cx = W / 2;
    const cy = H * 0.32;
    ctx.beginPath();
    ctx.arc(cx, cy, 86, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0d0d';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#c9a227';
    ctx.stroke();
    // Stylized flame in the emblem
    ctx.fillStyle = '#ff5a00';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 56);
    ctx.quadraticCurveTo(cx + 44, cy - 10, cx + 12, cy + 48);
    ctx.quadraticCurveTo(cx + 4, cy + 16, cx - 16, cy + 44);
    ctx.quadraticCurveTo(cx - 40, cy - 8, cx, cy - 56);
    ctx.fill();
    ctx.fillStyle = '#ffb400';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30);
    ctx.quadraticCurveTo(cx + 20, cy, cx + 4, cy + 34);
    ctx.quadraticCurveTo(cx - 2, cy + 10, cx - 12, cy + 30);
    ctx.quadraticCurveTo(cx - 20, cy - 2, cx, cy - 30);
    ctx.fill();

    this.bigText(ctx, 'KOMBAT FORGE', W / 2, H * 0.6, 84, '#ffb400');
    this.smallText(ctx, 'A  M O R T A L   K O M B A T   S T Y L E   F I G H T E R', W / 2, H * 0.6 + 56, 15, '#c9a227');
    if (this.tick % 70 < 45) {
      this.bigText(ctx, 'PRESS ANY KEY', W / 2, H * 0.83, 28, '#ffffff');
    }
    this.smallText(ctx, 'M: MUTE   P: PAUSE', W / 2, H - 18, 13, '#666');
  }

  private drawModeMenu(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    this.bigText(ctx, 'CHOOSE YOUR DESTINY', W / 2, H * 0.24, 52, '#ffb400');
    const items = ['1 PLAYER  —  VS CPU', '2 PLAYERS  —  LOCAL VERSUS'];
    for (let i = 0; i < items.length; i++) {
      const y = H * 0.46 + i * 70;
      const active = this.menuIndex === i;
      if (active) {
        ctx.fillStyle = 'rgba(255,90,0,0.18)';
        ctx.fillRect(W / 2 - 280, y - 26, 560, 52);
        ctx.strokeStyle = '#ff5a00';
        ctx.lineWidth = 2;
        ctx.strokeRect(W / 2 - 280, y - 26, 560, 52);
      }
      this.bigText(ctx, items[i], W / 2, y, 30, active ? '#ffe680' : '#888');
    }
    this.smallText(ctx, 'W/S OR ARROWS TO MOVE — F / ENTER TO SELECT', W / 2, H * 0.78, 15, '#aaa');
  }

  private drawSelect(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    this.bigText(ctx, 'CHOOSE YOUR FIGHTER', W / 2, 70, 48, '#ffb400');

    const n = CHARACTERS.length;
    const boxW = 160;
    const gap = 40;
    const totalW = n * boxW + (n - 1) * gap;
    const x0 = (W - totalW) / 2;
    const boxY = 130;
    const boxH = 210;

    for (let i = 0; i < n; i++) {
      const bx = x0 + i * (boxW + gap);
      const c = CHARACTERS[i];
      ctx.fillStyle = 'rgba(20,20,30,0.9)';
      ctx.fillRect(bx, boxY, boxW, boxH);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, boxY, boxW, boxH);

      // Preview figure
      const pv = this.previews[i];
      pv.x = bx + boxW / 2;
      pv.y = boxY + boxH - 26;
      pv.facing = 1;
      pv.state = 'idle';
      pv.draw(ctx, this.tick);

      this.bigText(ctx, c.name, bx + boxW / 2, boxY + boxH + 26, 22, c.primary);
      this.smallText(ctx, c.title, bx + boxW / 2, boxY + boxH + 48, 12, '#999');

      // Cursors
      if (this.cursor[0] === i) {
        ctx.strokeStyle = '#ff3030';
        ctx.lineWidth = 4;
        ctx.strokeRect(bx - 4, boxY - 4, boxW + 8, boxH + 8);
        this.bigText(ctx, this.selected[0] ? 'P1 ✓' : 'P1', bx + 26, boxY + 16, 18, '#ff3030');
      }
      if ((this.selected[0] || this.mode === '2p') && this.cursor[1] === i) {
        ctx.strokeStyle = '#38b6ff';
        ctx.lineWidth = 4;
        ctx.strokeRect(bx - 10, boxY - 10, boxW + 20, boxH + 20);
        const label = this.mode === '1p' ? (this.selected[1] ? 'CPU ✓' : 'CPU') : this.selected[1] ? 'P2 ✓' : 'P2';
        this.bigText(ctx, label, bx + boxW - 30, boxY + 16, 18, '#38b6ff');
      }
    }

    const hint = this.mode === '2p' ? 'P1: A/D + F      P2: ←/→ + ,' : 'A/D TO MOVE — F TO SELECT';
    this.smallText(ctx, hint, W / 2, H - 44, 16, '#aaa');
    this.smallText(ctx, 'ESC: BACK', W / 2, H - 22, 13, '#666');
  }

  private drawVs(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    const c1 = CHARACTERS[this.cursor[0]];
    const c2 = CHARACTERS[this.cursor[1]];

    // Big preview figures
    const pv1 = this.previews[this.cursor[0]];
    const pv2 = this.previews[this.cursor[1]];
    ctx.save();
    ctx.translate(W * 0.25, H * 0.62);
    ctx.scale(1.8, 1.8);
    pv1.x = 0;
    pv1.y = 0;
    pv1.facing = 1;
    pv1.state = 'win';
    pv1.stateTime = this.tick;
    pv1.draw(ctx, this.tick);
    ctx.restore();
    ctx.save();
    ctx.translate(W * 0.75, H * 0.62);
    ctx.scale(-1.8, 1.8);
    pv2.x = 0;
    pv2.y = 0;
    pv2.facing = 1;
    pv2.state = 'idle';
    pv2.draw(ctx, this.tick);
    ctx.restore();

    this.bigText(ctx, c1.name, W * 0.25, H * 0.75, 42, c1.primary);
    this.bigText(ctx, c2.name, W * 0.75, H * 0.75, 42, c2.primary);
    const pulse = 1 + Math.sin(this.tick * 0.15) * 0.12;
    ctx.save();
    ctx.translate(W / 2, H * 0.45);
    ctx.scale(pulse, pulse);
    this.bigText(ctx, 'VS', 0, 0, 90, '#ff3030');
    ctx.restore();
    this.smallText(ctx, `${c1.title}  —  ${c2.title}`, W / 2, H * 0.88, 14, '#999');
  }

  private drawControlsHint(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, H - 66, W, 66);
    this.smallText(
      ctx,
      'P1: A/D MOVE  W JUMP  S CROUCH  F PUNCH  G KICK  H BLOCK    SPECIAL: TAP ↓ THEN → THEN PUNCH',
      W / 2,
      H - 44,
      14,
      '#ddd',
    );
    this.smallText(
      ctx,
      this.mode === '2p'
        ? 'P2: ARROWS MOVE/JUMP/CROUCH  , PUNCH  . KICK  / BLOCK    UPPERCUT: CROUCH + PUNCH   SWEEP: CROUCH + KICK'
        : 'UPPERCUT: CROUCH + PUNCH    SWEEP: CROUCH + KICK    JUMP KICK: PUNCH/KICK IN AIR',
      W / 2,
      H - 22,
      14,
      '#999',
    );
  }

  private drawCombos(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < 2; i++) {
      if (this.comboShow[i] > 0 && this.comboCount[i] >= 2) {
        const x = i === 0 ? 120 : W - 120;
        this.bigText(ctx, `${this.comboCount[i]} HITS!`, x, 110, 30, '#ff8030');
      }
    }
  }

  private drawMatchEnd(ctx: CanvasRenderingContext2D): void {
    if (this.phaseTime < 60) return;
    const [p1, p2] = this.pair;
    const winner = p1.roundWins >= ROUNDS_TO_WIN ? p1 : p2;
    this.bigText(ctx, `"${winner.def.winQuote}"`, W / 2, H * 0.62, 26, '#dddddd');
    if (this.tick % 60 < 40) {
      this.smallText(ctx, 'F / ENTER: REMATCH      ESC: CHARACTER SELECT', W / 2, H * 0.9, 16, '#ffe680');
    }
  }
}
