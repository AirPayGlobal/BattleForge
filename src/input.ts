export interface Controls {
  left: string[];
  right: string[];
  up: string[];
  down: string[];
  punch: string[];
  kick: string[];
  block: string[];
}

export const P1_CONTROLS: Controls = {
  left: ['KeyA'],
  right: ['KeyD'],
  up: ['KeyW'],
  down: ['KeyS'],
  punch: ['KeyF'],
  kick: ['KeyG'],
  block: ['KeyH'],
};

export const P2_CONTROLS: Controls = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  punch: ['Comma', 'Numpad1', 'KeyK'],
  kick: ['Period', 'Numpad2', 'KeyL'],
  block: ['Slash', 'Numpad3', 'Semicolon'],
};

export interface FrameInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
  block: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
  upPressed: boolean;
  downPressed: boolean;
  punchPressed: boolean;
  kickPressed: boolean;
}

export function nullInput(): FrameInput {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    punch: false,
    kick: false,
    block: false,
    leftPressed: false,
    rightPressed: false,
    upPressed: false,
    downPressed: false,
    punchPressed: false,
    kickPressed: false,
  };
}

const PREVENT = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Space',
  'Slash',
  'Comma',
  'Period',
]);

export class Keyboard {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private anyKey = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!e.repeat) {
        this.pressed.add(e.code);
        this.anyKey = true;
      }
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.held.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
    });
  }

  isDown(codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  wasPressed(codes: string[]): boolean {
    return codes.some((c) => this.pressed.has(c));
  }

  anyPressed(): boolean {
    return this.anyKey;
  }

  sample(c: Controls): FrameInput {
    return {
      left: this.isDown(c.left),
      right: this.isDown(c.right),
      up: this.isDown(c.up),
      down: this.isDown(c.down),
      punch: this.isDown(c.punch),
      kick: this.isDown(c.kick),
      block: this.isDown(c.block),
      leftPressed: this.wasPressed(c.left),
      rightPressed: this.wasPressed(c.right),
      upPressed: this.wasPressed(c.up),
      downPressed: this.wasPressed(c.down),
      punchPressed: this.wasPressed(c.punch),
      kickPressed: this.wasPressed(c.kick),
    };
  }

  endFrame(): void {
    this.pressed.clear();
    this.anyKey = false;
  }
}
