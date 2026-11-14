import { describe, expect, it } from "vitest";
import {
  activateRelay,
  completeMission,
  createMissionState,
  getRelayCount,
} from "./mission-state";

describe("mission progression", () => {
  it("requires both relays before the exit unlocks", () => {
    const initial = createMissionState();
    const afterWest = activateRelay(initial, "west");

    expect(getRelayCount(afterWest)).toBe(1);
    expect(afterWest.exitUnlocked).toBe(false);

    const afterEast = activateRelay(afterWest, "east");
    expect(getRelayCount(afterEast)).toBe(2);
    expect(afterEast.exitUnlocked).toBe(true);
  });

  it("does not count an already activated relay twice", () => {
    const state = activateRelay(
      activateRelay(createMissionState(), "west"),
      "west",
    );

    expect(getRelayCount(state)).toBe(1);
  });

  it("cannot complete the mission before the exit is unlocked", () => {
    const initial = createMissionState();
    expect(completeMission(initial)).toBe(initial);
  });

  it("completes only after both relays are active", () => {
    const unlocked = activateRelay(
      activateRelay(createMissionState(), "west"),
      "east",
    );

    expect(completeMission(unlocked).complete).toBe(true);
  });
});
