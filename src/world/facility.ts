import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import type { RelayId } from "../game/mission-state";

export interface MissionLevel {
  relayPanels: Record<RelayId, Mesh>;
  gate: Mesh;
  setRelayActive(relay: RelayId): void;
  beginGateOpening(): void;
  update(deltaSeconds: number): void;
  reset(): void;
  isInsideExit(position: Vector3): boolean;
}

const GATE_CLOSED_Y = 1.8;
const GATE_OPEN_Y = 5.9;
const GATE_RAISE_SPEED = 1.8;

export function createMissionLevel(scene: Scene): MissionLevel {
  scene.clearColor = Color3.FromHexString("#202a2c").toColor4(1);
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogColor = Color3.FromHexString("#202a2c");
  scene.fogStart = 35;
  scene.fogEnd = 78;

  const materials = {
    floor: material(scene, "floor-concrete", "#555b58", "#080a09"),
    wall: material(scene, "wall-concrete", "#777c78", "#090b0a"),
    dark: material(scene, "paint-dark", "#343b3c", "#080909"),
    metal: material(scene, "paint-metal", "#747d7d", "#111414"),
    yellow: material(scene, "safety-yellow", "#b18c3d", "#181105"),
    console: material(scene, "console-shell", "#343d3d", "#080a0a"),
    screen: material(scene, "console-screen", "#182c2b", "#07110f"),
    inactive: material(scene, "relay-inactive", "#722f2a", "#44100d"),
    active: material(scene, "relay-active", "#4f9a75", "#236344"),
    exit: material(scene, "exit-marker", "#477b91", "#244e61"),
  };

  const ground = MeshBuilder.CreateGround(
    "facility-floor",
    { width: 30, height: 56, subdivisions: 2 },
    scene,
  );
  ground.material = materials.floor;
  ground.checkCollisions = true;
  ground.receiveShadows = true;

  function box(
    name: string,
    position: Vector3,
    size: Vector3,
    surface: StandardMaterial,
    collision = true,
  ): Mesh {
    const mesh = MeshBuilder.CreateBox(
      name,
      { width: size.x, height: size.y, depth: size.z },
      scene,
    );
    mesh.position.copyFrom(position);
    mesh.material = surface;
    mesh.checkCollisions = collision;
    mesh.receiveShadows = true;
    mesh.isPickable = false;
    return mesh;
  }

  // Exterior walls define one compact indoor maintenance facility.
  box("west-perimeter-wall", new Vector3(-15, 2.5, 0), new Vector3(0.6, 5, 56), materials.wall);
  box("east-perimeter-wall", new Vector3(15, 2.5, 0), new Vector3(0.6, 5, 56), materials.wall);
  box("north-perimeter-wall", new Vector3(0, 2.5, 28), new Vector3(30, 5, 0.6), materials.wall);
  box("south-perimeter-wall", new Vector3(0, 2.5, -28), new Vector3(30, 5, 0.6), materials.wall);

  // A low ceiling and visible structural beams give the space scale.
  box("ceiling", new Vector3(0, 5.35, 0), new Vector3(30, 0.45, 56), materials.dark, false);
  for (const z of [-20, -10, 0, 10, 20]) {
    box(
      `ceiling-beam-${z}`,
      new Vector3(0, 4.95, z),
      new Vector3(29.5, 0.28, 0.38),
      materials.metal,
      false,
    );
  }

  // The exit partition has a central vehicle-width gate opening.
  box("exit-partition-west", new Vector3(-9, 1.8, 15.5), new Vector3(12, 3.6, 0.7), materials.wall);
  box("exit-partition-east", new Vector3(9, 1.8, 15.5), new Vector3(12, 3.6, 0.7), materials.wall);
  box("gate-header", new Vector3(0, 3.75, 15.5), new Vector3(6, 0.35, 0.7), materials.dark, false);

  const gate = box(
    "exit-gate",
    new Vector3(0, GATE_CLOSED_Y, 15.5),
    new Vector3(6, 3.6, 0.55),
    materials.metal,
  );
  gate.isPickable = false;

  // Structural columns, wall ribs, and cable trays break up the long corridor.
  for (const z of [-15, -3, 9]) {
    for (const x of [-12.8, 12.8]) {
      box(
        `support-${x}-${z}`,
        new Vector3(x, 2.35, z),
        new Vector3(0.7, 4.7, 0.7),
        materials.dark,
      );
      box(
        `support-foot-${x}-${z}`,
        new Vector3(x, 0.18, z),
        new Vector3(1.15, 0.36, 1.15),
        materials.yellow,
      );
    }
  }

  for (const x of [-8, 8]) {
    box(
      `cable-tray-${x}`,
      new Vector3(x, 4.48, -1),
      new Vector3(0.55, 0.22, 42),
      materials.metal,
      false,
    );
  }

  const relayPanels = {
    west: createRelay(
      scene,
      "west",
      new Vector3(-11.7, 1.2, -5),
      Math.PI / 2,
      materials.console,
      materials.screen,
      materials.inactive,
    ),
    east: createRelay(
      scene,
      "east",
      new Vector3(11.7, 1.2, 5),
      -Math.PI / 2,
      materials.console,
      materials.screen,
      materials.inactive,
    ),
  };

  // Safety markings around the exit. These are static floor markings, not gameplay hazards.
  const exitPad = MeshBuilder.CreateCylinder(
    "exit-zone",
    { height: 0.035, diameter: 5.2, tessellation: 48 },
    scene,
  );
  exitPad.position.set(0, 0.025, 22.3);
  exitPad.material = materials.exit;
  exitPad.checkCollisions = false;
  exitPad.isPickable = false;

  const exitCenter = MeshBuilder.CreateCylinder(
    "exit-zone-center",
    { height: 0.04, diameter: 3.5, tessellation: 48 },
    scene,
  );
  exitCenter.position.set(0, 0.05, 22.3);
  exitCenter.material = material(scene, "exit-zone-center-material", "#31596a", "#173b4a");
  exitCenter.checkCollisions = false;
  exitCenter.isPickable = false;

  // Environmental lighting: cool overhead work lights with a warmer exit-side lamp.
  const ambient = new HemisphericLight(
    "facility-ambient",
    new Vector3(0, 1, 0),
    scene,
  );
  ambient.intensity = 0.72;
  ambient.diffuse = Color3.FromHexString("#c7d2d0");
  ambient.groundColor = Color3.FromHexString("#343d3c");

  const key = new DirectionalLight(
    "facility-key",
    new Vector3(-0.25, -1, 0.35),
    scene,
  );
  key.position = new Vector3(-8, 12, -10);
  key.intensity = 0.48;

  const lightPositions = [
    new Vector3(-7, 4.4, -16),
    new Vector3(7, 4.4, -16),
    new Vector3(-7, 4.4, -2),
    new Vector3(7, 4.4, -2),
    new Vector3(-7, 4.4, 11),
    new Vector3(7, 4.4, 11),
    new Vector3(0, 4.4, 23),
  ];

  lightPositions.forEach((position, index) => {
    const fixture = box(
      `ceiling-light-fixture-${index}`,
      position.clone().add(new Vector3(0, 0.25, 0)),
      new Vector3(2.6, 0.12, 0.5),
      materials.metal,
      false,
    );
    fixture.isPickable = false;

    const lamp = new PointLight(`facility-lamp-${index}`, position, scene);
    lamp.diffuse = index === 6
      ? Color3.FromHexString("#e5c58b")
      : Color3.FromHexString("#c5d9d9");
    lamp.intensity = index === 6 ? 0.65 : 0.52;
    lamp.range = 13;
  });

  const relayIndicators: Record<RelayId, Mesh> = {
    west: relayPanels.west,
    east: relayPanels.east,
  };

  let openingGate = false;
  let gateOpen = false;

  return {
    relayPanels,
    gate,
    setRelayActive(relay) {
      const indicator = relayIndicators[relay];
      indicator.material = materials.active;
      indicator.metadata = {
        ...indicator.metadata,
        relayActive: true,
      };
    },
    beginGateOpening() {
      if (openingGate || gateOpen) return;
      openingGate = true;
    },
    update(deltaSeconds) {
      if (!openingGate || gateOpen) return;
      const delta = Math.min(deltaSeconds, 0.05);
      gate.position.y = Math.min(
        GATE_OPEN_Y,
        gate.position.y + GATE_RAISE_SPEED * delta,
      );

      // Once the lower edge is safely above head height, the passage is clear.
      if (gate.position.y - 1.8 >= 2.2) {
        gate.checkCollisions = false;
      }
      if (gate.position.y >= GATE_OPEN_Y) {
        gateOpen = true;
        openingGate = false;
        gate.checkCollisions = false;
      }
    },
    reset() {
      openingGate = false;
      gateOpen = false;
      gate.position.y = GATE_CLOSED_Y;
      gate.checkCollisions = true;
      relayPanels.west.material = materials.inactive;
      relayPanels.east.material = materials.inactive;
    },
    isInsideExit(position) {
      const dx = position.x;
      const dz = position.z - 22.3;
      return gateOpen && dx * dx + dz * dz <= 2.0 * 2.0;
    },
  };
}

function material(
  scene: Scene,
  name: string,
  diffuse: string,
  emissive: string,
): StandardMaterial {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = Color3.FromHexString(diffuse);
  result.emissiveColor = Color3.FromHexString(emissive);
  result.specularColor = new Color3(0.08, 0.08, 0.08);
  result.roughness = 0.92;
  return result;
}

function createRelay(
  scene: Scene,
  id: RelayId,
  position: Vector3,
  rotationY: number,
  shellMaterial: StandardMaterial,
  screenMaterial: StandardMaterial,
  inactiveMaterial: StandardMaterial,
): Mesh {
  const housing = MeshBuilder.CreateBox(
    `relay-${id}-housing`,
    { width: 0.9, height: 1.35, depth: 0.5 },
    scene,
  );
  housing.position.copyFrom(position);
  housing.rotation.y = rotationY;
  housing.material = shellMaterial;
  housing.checkCollisions = true;
  housing.isPickable = true;

  const panel = MeshBuilder.CreateBox(
    `relay-${id}-panel`,
    { width: 0.64, height: 0.44, depth: 0.08 },
    scene,
  );
  panel.parent = housing;
  panel.position.set(0, 0.36, -0.29);
  panel.material = screenMaterial;
  panel.isPickable = true;
  panel.checkCollisions = false;
  panel.metadata = {
    interactionId: `relay-${id}`,
    interactionLabel: `${id === "west" ? "West" : "East"} power relay`,
  };

  const indicator = MeshBuilder.CreateSphere(
    `relay-${id}-indicator`,
    { diameter: 0.16, segments: 12 },
    scene,
  );
  indicator.parent = housing;
  indicator.position.set(0, -0.18, -0.31);
  indicator.material = inactiveMaterial;
  indicator.isPickable = false;

  const tag = MeshBuilder.CreateBox(
    `relay-${id}-base`,
    { width: 1.1, height: 0.14, depth: 0.68 },
    scene,
  );
  tag.position.set(position.x, 0.07, position.z);
  tag.material = shellMaterial;
  tag.checkCollisions = true;
  tag.isPickable = false;

  // Store the indicator on the panel so the mission can update one mesh cleanly.
  panel.metadata = {
    ...panel.metadata,
    indicatorMesh: indicator,
    housingMesh: housing,
  };

  return panel;
}
