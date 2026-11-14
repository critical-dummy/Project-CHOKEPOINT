import "@babylonjs/core/Collisions/collisionCoordinator";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import type { Scene } from "@babylonjs/core/scene";

export interface FirstPersonController {
  camera: UniversalCamera;
  attachControls(): void;
  detachControls(): void;
  requestPointerLock(): Promise<void>;
  updateBody(): void;
  reset(): void;
  dispose(): void;
}

const WALK_SPEED = 0.075;
const RUN_SPEED = 0.12;
const PLAYER_EYE_HEIGHT = 1.8;
const SPAWN_POSITION = new Vector3(0, PLAYER_EYE_HEIGHT, -22);

export function createFirstPersonController(
  canvas: HTMLCanvasElement,
  scene: Scene,
): FirstPersonController {
  const camera = new UniversalCamera(
    "player-camera",
    SPAWN_POSITION.clone(),
    scene,
  );

  camera.fov = 1.12;
  camera.minZ = 0.05;
  camera.maxZ = 110;
  camera.inertia = 0.78;
  camera.angularSensibility = 2600;
  camera.speed = WALK_SPEED;

  camera.keysUp = [87, 38]; // W / ArrowUp
  camera.keysDown = [83, 40]; // S / ArrowDown
  camera.keysLeft = [65, 37]; // A / ArrowLeft
  camera.keysRight = [68, 39]; // D / ArrowRight

  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new Vector3(0.38, 0.9, 0.38);
  camera.ellipsoidOffset = new Vector3(0, -0.9, 0);

  // The body exists in world space, so looking down reveals the player's body
  // instead of a viewmodel that rotates with the camera pitch.
  const bodyRoot = new TransformNode("player-body", scene);

  const clothing = new StandardMaterial("view-clothing", scene);
  clothing.diffuseColor = Color3.FromHexString("#343a3d");
  clothing.specularColor = Color3.Black();
  clothing.specularPower = 6;

  const trousers = new StandardMaterial("view-trousers", scene);
  trousers.diffuseColor = Color3.FromHexString("#55564e");
  trousers.specularColor = Color3.Black();
  trousers.specularPower = 4;

  const bootsMaterial = new StandardMaterial("view-boots", scene);
  bootsMaterial.diffuseColor = Color3.FromHexString("#242a2b");
  bootsMaterial.specularColor = Color3.Black();
  bootsMaterial.specularPower = 3;

  const torso = MeshBuilder.CreateBox(
    "player-body-torso",
    { width: 0.43, height: 0.55, depth: 0.24 },
    scene,
  );
  torso.parent = bodyRoot;
  torso.position.set(0, 1.28, 0);
  torso.material = clothing;
  torso.isPickable = false;
  torso.checkCollisions = false;

  const legs = [-1, 1].map((side) => {
    const leg = MeshBuilder.CreateBox(
      `player-body-leg-${side}`,
      { width: 0.19, height: 0.78, depth: 0.23 },
      scene,
    );
    leg.parent = bodyRoot;
    leg.position.set(side * 0.13, 0.55, 0.03);
    leg.material = trousers;
    leg.isPickable = false;
    leg.checkCollisions = false;
    return leg;
  });

  const boots = [-1, 1].map((side) => {
    const boot = MeshBuilder.CreateBox(
      `player-body-boot-${side}`,
      { width: 0.2, height: 0.13, depth: 0.31 },
      scene,
    );
    boot.parent = bodyRoot;
    boot.position.set(side * 0.13, 0.09, 0.08);
    boot.material = bootsMaterial;
    boot.isPickable = false;
    boot.checkCollisions = false;
    return boot;
  });

  let controlsAttached = false;
  const sprintKeys = new Set<string>();

  function updateMovementSpeed(): void {
    camera.speed = sprintKeys.size > 0 ? RUN_SPEED : WALK_SPEED;
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!controlsAttached) return;
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      sprintKeys.add(event.code);
      updateMovementSpeed();
    }
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    if (!controlsAttached) return;
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      sprintKeys.delete(event.code);
      updateMovementSpeed();
    }
  };

  const onWindowBlur = (): void => {
    sprintKeys.clear();
    updateMovementSpeed();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onWindowBlur);

  function attachControls(): void {
    if (controlsAttached) return;
    camera.attachControl(canvas, true);
    controlsAttached = true;
  }

  function detachControls(): void {
    if (!controlsAttached) return;
    camera.detachControl();
    controlsAttached = false;
    sprintKeys.clear();
    updateMovementSpeed();
  }

  function updateBody(): void {
    bodyRoot.position.set(
      camera.position.x,
      camera.position.y - PLAYER_EYE_HEIGHT,
      camera.position.z,
    );
    bodyRoot.rotation.y = camera.rotation.y;
  }

  updateBody();

  return {
    camera,
    attachControls,
    detachControls,
    async requestPointerLock() {
      if (document.pointerLockElement === canvas) return;
      await canvas.requestPointerLock();
    },
    updateBody,
    reset() {
      camera.position.copyFrom(SPAWN_POSITION);
      camera.rotation.set(0, 0, 0);
      camera.rotationQuaternion = null;
      sprintKeys.clear();
      updateMovementSpeed();
      updateBody();
    },
    dispose() {
      detachControls();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      camera.dispose();
      bodyRoot.dispose(false, false);
      clothing.dispose();
      trousers.dispose();
      bootsMaterial.dispose();
    },
  };
}
