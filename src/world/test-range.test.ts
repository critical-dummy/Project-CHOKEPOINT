import { afterEach, describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { createTestRange } from "./test-range";

describe("createTestRange", () => {
  let engine: NullEngine | undefined;
  let scene: Scene | undefined;

  afterEach(() => {
    scene?.dispose();
    engine?.dispose();
    scene = undefined;
    engine = undefined;
  });

  it("creates the ground and all static environment geometry", () => {
    engine = new NullEngine();
    scene = new Scene(engine);

    createTestRange(scene);

    expect(scene.meshes).toHaveLength(9);
    expect(scene.getMeshByName("test-range-ground")).not.toBeNull();

    const expectedMeshes = [
      "north-boundary",
      "south-boundary",
      "west-boundary",
      "east-boundary",
      "low-block-a",
      "low-block-b",
      "vertical-obstacle",
      "long-obstacle",
    ];

    for (const name of expectedMeshes) {
      expect(scene.getMeshByName(name), `Expected mesh: ${name}`).not.toBeNull();
    }
  });

  it("marks all world geometry as collidable", () => {
    engine = new NullEngine();
    scene = new Scene(engine);

    createTestRange(scene);

    expect(scene.meshes.every((mesh) => mesh.checkCollisions)).toBe(true);
  });

  it("configures a bounded linear-fog environment", () => {
    engine = new NullEngine();
    scene = new Scene(engine);

    createTestRange(scene);

    expect(scene.fogMode).toBe(Scene.FOGMODE_LINEAR);
    expect(scene.fogStart).toBe(30);
    expect(scene.fogEnd).toBe(96);
  });
});
