export const AVATAR_ACTIONS = ["idle", "blink", "smile", "listen", "speak", "wave", "think"] as const;
export type AvatarAction = (typeof AVATAR_ACTIONS)[number];

export type Expression = "neutral" | "smile" | "listen" | "think";

export interface AvatarState {
  expression: Expression;
  eyesClosed: boolean;
  speaking: boolean;
  waving: boolean;
}

export interface PlayOptions {
  /** How long the action lasts before returning to idle. Omit to hold until the next action. */
  durationMs?: number;
}

type Listener = (state: AvatarState) => void;

const INITIAL: AvatarState = { expression: "neutral", eyesClosed: false, speaking: false, waving: false };
const BLINK_MS = 140;
const WAVE_MS = 1800;

/**
 * Renderer-agnostic animation state machine. Renderers (the current SVG face, or a future 3D model)
 * subscribe to state changes and only need to know how to draw an `AvatarState`.
 */
export class AvatarController {
  private state: AvatarState = { ...INITIAL };
  private listeners = new Set<Listener>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private blinkRange: [number, number];
  private running = false;

  constructor(blinkRange: [number, number] = [2500, 6000]) {
    this.blinkRange = blinkRange;
  }

  getState(): AvatarState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /** Starts automatic blinking. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleBlink();
  }

  stop(): void {
    this.running = false;
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  setBlinkRange(range: [number, number]): void {
    this.blinkRange = range;
  }

  play(action: AvatarAction, options: PlayOptions = {}): void {
    switch (action) {
      case "idle":
        this.clear("expression");
        this.clear("speak");
        this.set({ expression: "neutral", speaking: false });
        return;
      case "blink":
        this.set({ eyesClosed: true });
        this.after("blink", BLINK_MS, () => this.set({ eyesClosed: false }));
        return;
      case "smile":
      case "listen":
      case "think":
        this.set({ expression: action });
        this.endAfter("expression", options.durationMs, () => this.set({ expression: "neutral" }));
        return;
      case "speak":
        this.set({ speaking: true });
        this.endAfter("speak", options.durationMs, () => this.set({ speaking: false }));
        return;
      case "wave":
        this.set({ waving: true, expression: "smile" });
        this.after("wave", options.durationMs ?? WAVE_MS, () => this.set({ waving: false, expression: "neutral" }));
        return;
    }
  }

  private scheduleBlink(): void {
    if (!this.running) return;
    const [min, max] = this.blinkRange;
    this.after("autoBlink", min + Math.random() * (max - min), () => {
      this.play("blink");
      this.scheduleBlink();
    });
  }

  private endAfter(key: string, ms: number | undefined, fn: () => void): void {
    if (ms === undefined) this.clear(key);
    else this.after(key, ms, fn);
  }

  private after(key: string, ms: number, fn: () => void): void {
    this.clear(key);
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        fn();
      }, ms),
    );
  }

  private clear(key: string): void {
    const t = this.timers.get(key);
    if (t) clearTimeout(t);
    this.timers.delete(key);
  }

  private set(patch: Partial<AvatarState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }
}
