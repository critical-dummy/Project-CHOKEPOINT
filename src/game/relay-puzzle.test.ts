import { describe, expect, it } from "vitest";
import {
  cycleRelaySelection,
  getRelayPattern,
  isRelayPatternMatched,
} from "./relay-puzzle";

describe("relay synchronization puzzle", () => {
  it("provides a different fixed pattern for each relay", () => {
    expect(getRelayPattern("west")).toEqual([2, 0, 1]);
    expect(getRelayPattern("east")).toEqual([1, 2, 0]);
  });

  it("cycles one selector without mutating the previous selection", () => {
    const start = [0, 0, 0] as const;
    const next = cycleRelaySelection(start, 1);

    expect(next).toEqual([0, 1, 0]);
    expect(start).toEqual([0, 0, 0]);
  });

  it("leaves the selection unchanged for an invalid slot", () => {
    const start = [0, 1, 2] as const;
    expect(cycleRelaySelection(start, 3)).toEqual([0, 1, 2]);
  });

  it("only accepts the exact target pattern", () => {
    expect(isRelayPatternMatched("west", [2, 0, 1])).toBe(true);
    expect(isRelayPatternMatched("west", [1, 0, 1])).toBe(false);
    expect(isRelayPatternMatched("east", [1, 2, 0])).toBe(true);
    expect(isRelayPatternMatched("east", [2, 0, 1])).toBe(false);
  });
});
