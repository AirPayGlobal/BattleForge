import type { FrameInput } from './input';
import { nullInput } from './input';
import type { Fighter } from './fighter';
import type { Projectile } from './projectile';

interface CpuStep {
  input: Partial<FrameInput>;
  frames: number;
}

/**
 * CPU controller. Emits FrameInput just like a human player, including
 * performing the down→forward motion for special moves.
 */
export class Cpu {
  private queue: CpuStep[] = [];
  private current: CpuStep | null = null;
  difficulty: number;

  constructor(difficulty = 1) {
    this.difficulty = difficulty;
  }

  reset(): void {
    this.queue = [];
    this.current = null;
  }

  update(self: Fighter, opp: Fighter, projectiles: Projectile[], finishMode: boolean): FrameInput {
    if (this.current && this.current.frames > 0) {
      this.current.frames--;
      return this.materialize(this.current.input);
    }
    this.current = this.queue.shift() ?? null;
    if (this.current) {
      const inp = this.materialize(this.current.input);
      this.current.frames--;
      return inp;
    }
    this.think(self, opp, projectiles, finishMode);
    return this.materialize({});
  }

  private materialize(partial: Partial<FrameInput>): FrameInput {
    return { ...nullInput(), ...partial };
  }

  private push(input: Partial<FrameInput>, frames: number): void {
    this.queue.push({ input, frames });
  }

  private towards(self: Fighter, opp: Fighter): Partial<FrameInput> {
    return opp.x > self.x ? { right: true } : { left: true };
  }

  private away(self: Fighter, opp: Fighter): Partial<FrameInput> {
    return opp.x > self.x ? { left: true } : { right: true };
  }

  private specialMotion(self: Fighter, opp: Fighter): void {
    const fwd: Partial<FrameInput> = opp.x > self.x ? { right: true, rightPressed: true } : { left: true, leftPressed: true };
    this.push({ down: true, downPressed: true }, 4);
    this.push(fwd, 4);
    this.push({ punch: true, punchPressed: true }, 2);
    this.push({}, 10);
  }

  private think(self: Fighter, opp: Fighter, projectiles: Projectile[], finishMode: boolean): void {
    const dist = Math.abs(opp.x - self.x);
    const d = this.difficulty;
    const r = Math.random();

    if (finishMode) {
      // Walk into range and perform the fatality motion
      if (dist > 110) this.push(this.towards(self, opp), 10);
      else this.specialMotion(self, opp);
      return;
    }

    // React to incoming projectiles
    const incoming = projectiles.find(
      (p) => p.ownerIndex !== self.index && Math.abs(p.x - self.x) < 300 && Math.sign(self.x - p.x) === Math.sign(p.vx),
    );
    if (incoming && Math.random() < 0.35 + d * 0.25) {
      if (r < 0.5) {
        this.push({ up: true, upPressed: true, ...this.towards(self, opp) }, 6);
        this.push({}, 20);
      } else {
        this.push({ block: true }, 34);
      }
      return;
    }

    // Punish a dizzy/frozen opponent
    if (opp.state === 'frozen' || opp.state === 'dizzy') {
      if (dist > 90) {
        this.push(this.towards(self, opp), 8);
      } else {
        this.push({ down: true, punch: true, punchPressed: true }, 3); // uppercut
        this.push({}, 20);
      }
      return;
    }

    // Anti-air: opponent jumping in close
    if (!opp.onGround && dist < 150 && Math.random() < 0.3 + d * 0.3) {
      this.push({ down: true, punch: true, punchPressed: true }, 3);
      this.push({}, 24);
      return;
    }

    // Block reaction when the opponent starts an attack in range
    const oppAttacking = ['punch', 'kick', 'sweep', 'uppercut'].includes(opp.state);
    if (oppAttacking && dist < 130 && Math.random() < 0.15 + d * 0.25) {
      this.push({ block: true }, 26);
      return;
    }

    if (dist > 340) {
      if (r < 0.35 + d * 0.1) this.specialMotion(self, opp);
      else if (r < 0.75) this.push(this.towards(self, opp), 22);
      else if (r < 0.9) {
        this.push({ up: true, upPressed: true, ...this.towards(self, opp) }, 6);
        this.push({ kick: true, kickPressed: true }, 3);
        this.push({}, 24);
      } else this.push({}, 14);
      return;
    }

    if (dist > 150) {
      if (r < 0.5) this.push(this.towards(self, opp), 16);
      else if (r < 0.68) {
        this.push({ up: true, upPressed: true, ...this.towards(self, opp) }, 6);
        this.push({ kick: true, kickPressed: true }, 3);
        this.push({}, 22);
      } else if (r < 0.82) this.specialMotion(self, opp);
      else this.push({ down: true }, 12);
      return;
    }

    // Close range
    if (r < 0.26) {
      this.push({ punch: true, punchPressed: true }, 3);
      this.push({}, 8 + Math.floor(Math.random() * 8));
    } else if (r < 0.48) {
      this.push({ kick: true, kickPressed: true }, 3);
      this.push({}, 10 + Math.floor(Math.random() * 8));
    } else if (r < 0.62) {
      this.push({ down: true, kick: true, kickPressed: true }, 3); // sweep
      this.push({}, 16);
    } else if (r < 0.74) {
      this.push({ down: true, punch: true, punchPressed: true }, 3); // uppercut
      this.push({}, 18);
    } else if (r < 0.86) {
      this.push({ block: true }, 20);
    } else {
      this.push(this.away(self, opp), 12);
    }
  }
}
