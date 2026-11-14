import { afterEach, describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { createMissionLevel } from "./facility";

describe("maintenance facility mission level", () => {
  let engine: NullEngine | undefined;
  let scene: Scene | undefined;

  afterEach(() => {
    scene?.dispose();
    engine?.dispose();
    scene = undefined;
    engine = undefined;
  });

  function createLevel() {
    engine = new NullEngine();
    scene = new Scene(engine);
    return createMissionLevel(scene);
  }

  it("creates the level, both relay panels, and the closed exit gate", () => {
    const level = createLevel();

    expect(scene?.getMeshByName("facility-floor")?.checkCollisions).toBe(true);
    expect(scene?.getMeshByName("west-perimeter-wall")?.checkCollisions).toBe(true);
    expect(level.gate.checkCollisions).toBe(true);
    expect(level.relayPanels.west.metadata?.interactionId).toBe("relay-west");
    expect(level.relayPanels.east.metadata?.interactionId).toBe("relay-east");
    expect(level.relayPositions.west.x).toBeCloseTo(-14.35, 2);
    expect(level.relayPositions.east.x).toBeCloseTo(14.35, 2);
    expect(level.exitPosition.z).toBeCloseTo(22.3, 2);
  });

  it("opens the exit only after the opening animation completes", () => {
    const level = createLevel();
    const exitPosition = new Vector3(0, 1.8, 22.3);

    expect(level.isInsideExit(exitPosition)).toBe(false);
    level.beginGateOpening();

    for (let frame = 0; frame < 150; frame += 1) {
      level.update(1 / 60);
    }

    expect(level.gate.position.y).toBeCloseTo(5.9, 2);
    expect(level.gate.checkCollisions).toBe(false);
    expect(level.isInsideExit(exitPosition)).toBe(true);
  });

  it("restores the gate and relay visuals when the mission restarts", () => {
    const level = createLevel();
    level.setRelayActive("west");
    level.setRelayActive("east");
    level.beginGateOpening();

    for (let frame = 0; frame < 150; frame += 1) {
      level.update(1 / 60);
    }

    level.reset();

    expect(level.gate.position.y).toBeCloseTo(1.8, 2);
    expect(level.gate.checkCollisions).toBe(true);
    expect(level.relayPanels.west.metadata?.relayActive).toBe(false);
    expect(level.relayPanels.east.metadata?.relayActive).toBe(false);
    expect(level.isInsideExit(exitPositionForTest)).toBe(false);
  });
});

const exitPositionForTest = new Vector3(0, 1.8, 22.3);
