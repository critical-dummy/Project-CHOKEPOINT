import * as THREE from "three";

export interface FirstPersonController {
  camera: THREE.PerspectiveCamera;
  object: THREE.Group;
  update(deltaSeconds: number): void;
  dispose(): void;
}

const PLAYER_HEIGHT = 1.72;
const PLAYER_RADIUS = 0.32;
const WALK_SPEED = 4.2;
const RUN_SPEED = 6.2;
const GRAVITY = 20;
const JUMP_SPEED = 6.4;

export function createFirstPersonController(
  colliders: THREE.Box3[],
): FirstPersonController {
  const object = new THREE.Group();
  object.position.set(0, 0, 10);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 180);
  camera.position.y = PLAYER_HEIGHT - 0.12;
  object.add(camera);

  // Simplified body parts remain attached to the camera rig and enter view
  // naturally when the player looks down. This is a visual placeholder.
  const body = new THREE.Group();
  body.position.set(0, -0.48, -0.04);
  camera.add(body);

  const clothing = new THREE.MeshStandardMaterial({
    color: "#343a3d",
    roughness: 0.95,
  });
  const trousers = new THREE.MeshStandardMaterial({
    color: "#55564e",
    roughness: 1,
  });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.25), clothing);
  torso.position.set(0, -0.03, -0.18);
  body.add(torso);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.19, 0.72, 0.22),
      trousers,
    );
    leg.position.set(side * 0.14, -0.57, -0.1);
    body.add(leg);
  }

  const keys = new Set<string>();
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  let yaw = 0;
  let pitch = 0;
  let grounded = true;
  let disposed = false;

  const element = document.querySelector<HTMLElement>("#viewport");
  if (!element) throw new Error("Viewport element is missing.");

  const onKeyDown = (event: KeyboardEvent): void => {
    keys.add(event.code);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
  };
  const onKeyUp = (event: KeyboardEvent): void => keys.delete(event.code);
  const onMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== element) return;
    yaw -= event.movementX * 0.002;
    pitch -= event.movementY * 0.002;
    pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2 + 0.03, Math.PI / 2 - 0.03);
    object.rotation.y = yaw;
    camera.rotation.x = pitch;
  };
  const onClick = (): void => {
    if (document.pointerLockElement !== element) void element.requestPointerLock();
  };
  const onBlur = (): void => keys.clear();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("blur", onBlur);
  element.addEventListener("click", onClick);

  function collidesAt(position: THREE.Vector3): boolean {
    const min = new THREE.Vector3(
      position.x - PLAYER_RADIUS,
      position.y,
      position.z - PLAYER_RADIUS,
    );
    const max = new THREE.Vector3(
      position.x + PLAYER_RADIUS,
      position.y + PLAYER_HEIGHT,
      position.z + PLAYER_RADIUS,
    );
    const bounds = new THREE.Box3(min, max);
    return colliders.some((collider) => bounds.intersectsBox(collider));
  }

  return {
    camera,
    object,
    update(deltaSeconds) {
      if (disposed) return;
      const delta = Math.min(deltaSeconds, 0.05);

      forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      direction.set(0, 0, 0);

      if (keys.has("KeyW")) direction.add(forward);
      if (keys.has("KeyS")) direction.sub(forward);
      if (keys.has("KeyD")) direction.add(right);
      if (keys.has("KeyA")) direction.sub(right);
      if (direction.lengthSq() > 0) direction.normalize();

      const speed = keys.has("ShiftLeft") || keys.has("ShiftRight")
        ? RUN_SPEED
        : WALK_SPEED;
      const targetX = direction.x * speed;
      const targetZ = direction.z * speed;
      const response = grounded ? 13 : 4;
      velocity.x = THREE.MathUtils.damp(velocity.x, targetX, response, delta);
      velocity.z = THREE.MathUtils.damp(velocity.z, targetZ, response, delta);

      if (keys.has("Space") && grounded) {
        velocity.y = JUMP_SPEED;
        grounded = false;
      }
      velocity.y -= GRAVITY * delta;

      const nextX = object.position.clone();
      nextX.x += velocity.x * delta;
      if (!collidesAt(nextX)) object.position.x = nextX.x;
      else velocity.x = 0;

      const nextZ = object.position.clone();
      nextZ.z += velocity.z * delta;
      if (!collidesAt(nextZ)) object.position.z = nextZ.z;
      else velocity.z = 0;

      const nextY = object.position.clone();
      nextY.y += velocity.y * delta;
      if (nextY.y <= 0) {
        object.position.y = 0;
        velocity.y = 0;
        grounded = true;
      } else if (!collidesAt(nextY)) {
        object.position.y = nextY.y;
        grounded = false;
      } else {
        velocity.y = 0;
        grounded = true;
      }
    },
    dispose() {
      disposed = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("blur", onBlur);
      element.removeEventListener("click", onClick);
      if (document.pointerLockElement === element) document.exitPointerLock();
      clothing.dispose();
      trousers.dispose();
      torso.geometry.dispose();
      for (const child of body.children) {
        if (child instanceof THREE.Mesh && child !== torso) child.geometry.dispose();
      }
    },
  };
}
