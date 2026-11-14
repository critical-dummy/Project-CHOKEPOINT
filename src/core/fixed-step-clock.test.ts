import { describe, expect, it, vi } from "vitest";
import { FixedStepClock } from "./fixed-step-clock";

describe("FixedStepClock", () => {
  it("runs updates in fixed-size increments", () => {
    const clock = new FixedStepClock({ stepSeconds: 0.1 });
    const update = vi.fn();

    const result = clock.advance(0.25, update);

    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenNthCalledWith(1, 0.1);
    expect(result.steps).toBe(2);
    expect(result.interpolationAlpha).toBeCloseTo(0.5);
  });

  it("limits unusually long frames and reports discarded time", () => {
    const clock = new FixedStepClock({
      stepSeconds: 0.1,
      maxFrameSeconds: 0.25,
      maxStepsPerFrame: 2,
    });
    const result = clock.advance(1, () => undefined);

    expect(result.steps).toBe(2);
    expect(result.droppedSeconds).toBeGreaterThan(0.7);
  });

  it("rejects invalid time values", () => {
    const clock = new FixedStepClock();

    expect(() => clock.advance(-1, () => undefined)).toThrow(RangeError);
    expect(() => clock.advance(Number.NaN, () => undefined)).toThrow(RangeError);
  });

  it("can be reset between simulation sessions", () => {
    const clock = new FixedStepClock({ stepSeconds: 0.1 });
    clock.advance(0.05, () => undefined);
    clock.reset();

    const result = clock.advance(0.05, () => undefined);
    expect(result.steps).toBe(0);
    expect(result.interpolationAlpha).toBeCloseTo(0.5);
  });
});
