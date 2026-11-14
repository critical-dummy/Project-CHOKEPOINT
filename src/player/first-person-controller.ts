import "@babylonjs/core/Collisions/collisionCoordinator";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import type { Scene } from "@babylonjs/core/scene";

export interface FirstPersonController {
  camera: UniversalCamera;
  attachControls(): void;
  detachControls(): void;
  requestPointerLock(): Promise<void>;
  reset(): void;
  dispose(): void;
}

const WALK_SPEED = 0.35;
const RUN_SPEED = 0.58;
const SPAWN_POSITION = new Vector3(0, 1.8, -22);

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

  // The camera viewpoint sits above the collision ellipsoid, as in Babylon's FPS example.
  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new Vector3(0.38, 0.9, 0.38);
  camera.ellipsoidOffset = Vector3.Zero();

  const clothing = new StandardMaterial("view-clothing", scene);
  clothing.diffuseColor = Color3.FromHexString("#343a3d");
  clothing.specularColor = Color3.Black();
  clothing.specularPower = 6;

  const trousers = new StandardMaterial("view-trousers", scene);
  trousers.diffuseColor = Color3.FromHexString("#55564e");
  trousers.specularColor = Color3.Black();
  trousers.specularPower = 4;

  const torso = MeshBuilder.CreateBox(
    "view-torso",
    { width: 0.43, height: 0.52, depth: 0.2 },
    scene,
  );
  torso.parent = camera;
  torso.position.set(0, -0.7, 0.42);
  torso.material = clothing;
  torso.isPickable = false;
  torso.checkCollisions = false;

  const legs = [-1, 1].map((side) => {
    const leg = MeshBuilder.CreateBox(
      `view-leg-${side}`,
      { width: 0.18, height: 0.68, depth: 0.2 },
      scene,
    );
    leg.parent = camera;
    leg.position.set(side * 0.13, -1.19, 0.46);
    leg.material = trousers;
    leg.isPickable = false;
    leg.checkCollisions = false;
    return leg;
  });

  let controlsAttached = false;
  const sprintKeys = new Set<string>();

  function updateMovementSpeed(): void {
    camera.speed = sprintKeys.size > 0 ? RUN_SPEED : WALK_SPEED;
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      sprintKeys.add(event.code);
      updateMovementSpeed();
    }
  };

  const onKeyUp = (event: KeyboardEvent): void => {
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

  return {
    camera,
    attachControls,
    detachControls,
    async requestPointerLock() {
      if (document.pointerLockElement === canvas) return;
      await canvas.requestPointerLock();
    },
    reset() {
      camera.position.copyFrom(SPAWN_POSITION);
      camera.rotation.set(0, 0, 0);
      camera.rotationQuaternion = null;
      sprintKeys.clear();
      updateMovementSpeed();
    },
    dispose() {
      detachControls();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      camera.dispose();
      torso.dispose();
      legs.forEach((leg) => leg.dispose());
      clothing.dispose();
      trousers.dispose();
    },
  };
}
