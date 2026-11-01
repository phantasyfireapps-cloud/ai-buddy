import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AVATAR_ACTIONS, AvatarController } from "./AvatarController";

describe("AvatarController", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("supports all named actions", () => {
    expect(AVATAR_ACTIONS).toEqual(["idle", "blink", "smile", "listen", "speak", "wave", "think"]);
  });

  it("blinks automatically once started", () => {
    const c = new AvatarController([1000, 1000]);
    const seen: boolean[] = [];
    c.subscribe((s) => seen.push(s.eyesClosed));
    c.start();
    vi.advanceTimersByTime(1000);
    expect(c.getState().eyesClosed).toBe(true);
    vi.advanceTimersByTime(140);
    expect(c.getState().eyesClosed).toBe(false);
    c.stop();
  });

  it("holds expressions until idle, or for a duration", () => {
    const c = new AvatarController();
    c.play("listen");
    vi.advanceTimersByTime(10_000);
    expect(c.getState().expression).toBe("listen");
    c.play("idle");
    expect(c.getState().expression).toBe("neutral");
    c.play("smile", { durationMs: 500 });
    vi.advanceTimersByTime(499);
    expect(c.getState().expression).toBe("smile");
    vi.advanceTimersByTime(1);
    expect(c.getState().expression).toBe("neutral");
  });

  it("speaks and waves temporarily", () => {
    const c = new AvatarController();
    c.play("speak", { durationMs: 1000 });
    c.play("wave");
    expect(c.getState()).toMatchObject({ speaking: true, waving: true });
    vi.advanceTimersByTime(2000);
    expect(c.getState()).toMatchObject({ speaking: false, waving: false });
  });

  it("unsubscribes listeners", () => {
    const c = new AvatarController();
    const fn = vi.fn();
    const off = c.subscribe(fn);
    off();
    c.play("think");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
