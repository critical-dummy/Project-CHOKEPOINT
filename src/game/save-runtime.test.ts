import { describe, expect, it } from "vitest";
import { mergeMissionRecord } from "./save-runtime";

describe("mission completion records", () => {
  it("creates a first completion record", () => {
    const record = mergeMissionRecord(
      "power-restoration",
      125_400,
      null,
      "2026-11-14T12:00:00.000Z",
    );

    expect(record).toEqual({
      missionId: "power-restoration",
      bestTimeMs: 125_400,
      completions: 1,
      lastCompletedAt: "2026-11-14T12:00:00.000Z",
    });
  });

  it("keeps the best time while counting slower replays", () => {
    const previous = mergeMissionRecord("power-restoration", 90_000, null);
    const next = mergeMissionRecord("power-restoration", 110_000, previous);

    expect(next.bestTimeMs).toBe(90_000);
    expect(next.completions).toBe(2);
  });

  it("replaces the best time when a replay is faster", () => {
    const previous = mergeMissionRecord("power-restoration", 90_000, null);
    const next = mergeMissionRecord("power-restoration", 72_500, previous);

    expect(next.bestTimeMs).toBe(72_500);
    expect(next.completions).toBe(2);
  });

  it("clamps negative elapsed values to zero", () => {
    const record = mergeMissionRecord("power-restoration", -500, null);
    expect(record.bestTimeMs).toBe(0);
  });
});
