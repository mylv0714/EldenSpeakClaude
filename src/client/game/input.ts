// Unified input: keyboard today, touch controls write into the same state (see ui/hud/TouchControls).

export type EdgeAction = 'action' | 'horn' | 'talk';

const KEYMAP: Record<string, string> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  Space: 'handbrake',
  KeyH: 'horn',
};

const EDGE_KEYS: Record<string, EdgeAction> = { KeyE: 'action', KeyF: 'action', Enter: 'action', KeyH: 'horn', KeyT: 'talk' };

export class Input {
  private readonly held = new Set<string>();
  private readonly edges = new Set<EdgeAction>();
  /** Touch joystick vector, -1..1 each axis. */
  joyX = 0;
  joyY = 0;
  touchHandbrake = false;
  touchSprint = false;
  touchHorn = false;
  /** True once any touch control was used; switches driving to "point where you want to go". */
  touchMode = false;

  private onDown = (e: KeyboardEvent) => {
    if (isTyping(e.target)) return;
    const k = KEYMAP[e.code];
    if (k) {
      this.held.add(k);
      this.touchMode = false;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    }
    const edge = EDGE_KEYS[e.code];
    if (edge && !e.repeat) this.edges.add(edge);
  };

  private onUp = (e: KeyboardEvent) => {
    const k = KEYMAP[e.code];
    if (k) this.held.delete(k);
  };

  private onBlur = () => this.held.clear();

  attach(): void {
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
  }

  reset(): void {
    this.held.clear();
    this.edges.clear();
    this.joyX = this.joyY = 0;
    this.touchHandbrake = this.touchSprint = this.touchHorn = false;
  }

  press(action: EdgeAction): void {
    this.edges.add(action);
  }

  consume(action: EdgeAction): boolean {
    return this.edges.delete(action);
  }

  has(key: string): boolean {
    return this.held.has(key);
  }

  /** Keyboard movement vector (not normalized). */
  get keyX(): number {
    return (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0);
  }

  get keyY(): number {
    return (this.held.has('down') ? 1 : 0) - (this.held.has('up') ? 1 : 0);
  }

  get handbrake(): boolean {
    return this.held.has('handbrake') || this.touchHandbrake;
  }

  get sprint(): boolean {
    return this.held.has('sprint') || this.touchSprint;
  }

  get horn(): boolean {
    return this.held.has('horn') || this.touchHorn;
  }
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
