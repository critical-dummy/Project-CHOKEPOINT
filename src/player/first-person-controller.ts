import "@babylonjs/core/Collisions/collisionCoordinator";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Scene } from "@babylonjs/core/scene";

export interface FirstPersonController {
  camera: UniversalCamera;
  dispose(): void;
}

const WALK_SPEED = 0.35;
const RUN_SPEED = 0.62;

export function createFirstPersonController(
  canvas: HTMLCanvasElement,
  scene: Scene,
): FirstPersonController {
  const camera = new UniversalCamera(
    "player-camera",
    new Vector3(0, 1.8, 10),
    scene,
  );

  camera.fov = 1.18;
  camera.minZ = 0.05;
  camera.inertia = 0.72;
  camera.angularSensibility = 3600;
  camera.speed = WALK_SPEED;

  camera.keysUp = [87, 38]; // W / ArrowUp
  camera.keysDown = [83, 40]; // S / ArrowDown
  camera.keysLeft = [65, 37]; // A / ArrowLeft
  camera.keysRight = [68, 39]; // D / ArrowRight

  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new Vector3(0.35, 0.9, 0.35);
  camera.ellipsoidOffset = Vector3.Zero();

  // Temporary first-person body proxy. Replace with the animated character
  // rig once the player skeleton and locomotion animation system exist.
  const clothing = new StandardMaterial("view-clothing", scene);
  clothing.diffuseColor = Color3.FromHexString("#343a3d");
  clothing.specularColor = Color3.Black();

  const trousers = new StandardMaterial("view-trousers", scene);
  trousers.diffuseColor = Color3.FromHexString("#55564e");
  trousers.specularColor = Color3.Black();

  const torso = MeshBuilder.CreateBox(
    "view-torso",
    { width: 0.43, height: 0.52, depth: 0.2 },
    scene,
  );
  torso.parent = camera;
  torso.position.set(0, -0.62, 0.5);
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
    leg.position.set(side * 0.13, -1.12, 0.58);
    leg.material = trousers;
    leg.isPickable = false;
    leg.checkCollisions = false;
    return leg;
  });

  const sprintKeys = new Set<string>();
  const updateMovementSpeed = (): void => {
    camera.speed = sprintKeys.size > 0 ? RUN_SPEED : WALK_SPEED;
  };

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

  const requestPointerLock = (): void => {
    if (document.pointerLockElement !== canvas) {
      void canvas.requestPointerLock();
    }
  };

  camera.attachControl(canvas, true);
  canvas.addEventListener("click", requestPointerLock);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onWindowBlur);

  return {
    camera,
    dispose() {
      canvas.removeEventListener("click", requestPointerLock);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
      camera.detachControl();
      camera.dispose();
      torso.dispose();
      legs.forEach((leg) => leg.dispose());
      clothing.dispose();
      trousers.dispose();
    },
  };
}
