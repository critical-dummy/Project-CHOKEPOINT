import * as THREE from "three";

export interface TestRange {
  scene: THREE.Scene;
  colliders: THREE.Box3[];
  dispose(): void;
}

export function createTestRange(): TestRange {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#89969a");
  scene.fog = new THREE.Fog("#89969a", 28, 100);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: "#656b62", roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const colliders: THREE.Box3[] = [];
  const materials = [
    new THREE.MeshStandardMaterial({ color: "#777b78", roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ color: "#777064", roughness: 0.96 }),
  ];

  function block(
    position: THREE.Vector3,
    size: THREE.Vector3,
    materialIndex = 0,
  ): void {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      materials[materialIndex],
    );
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    colliders.push(new THREE.Box3().setFromCenterAndSize(position, size));
  }

  // A neutral test environment: walls and static obstacles only.
  block(new THREE.Vector3(0, 1.5, -18), new THREE.Vector3(40, 3, 1));
  block(new THREE.Vector3(-20, 1.5, 0), new THREE.Vector3(1, 3, 36));
  block(new THREE.Vector3(20, 1.5, 0), new THREE.Vector3(1, 3, 36));
  block(new THREE.Vector3(0, 1.5, 18), new THREE.Vector3(40, 3, 1));

  block(new THREE.Vector3(-7, 0.75, -5), new THREE.Vector3(3, 1.5, 3), 1);
  block(new THREE.Vector3(6, 0.6, -9), new THREE.Vector3(4, 1.2, 2), 1);
  block(new THREE.Vector3(8, 1, 5), new THREE.Vector3(2, 2, 5), 0);
  block(new THREE.Vector3(-3, 0.5, 8), new THREE.Vector3(5, 1, 2), 1);

  const grid = new THREE.GridHelper(40, 40, "#a0a7a2", "#858d87");
  grid.position.y = 0.012;
  scene.add(grid);

  scene.add(new THREE.HemisphereLight("#e6edf0", "#53584f", 2.1));
  const sun = new THREE.DirectionalLight("#fff5df", 2.5);
  sun.position.set(-12, 22, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  return {
    scene,
    colliders,
    dispose() {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const mats = Array.isArray(object.material)
            ? object.material
            : [object.material];
          mats.forEach((material) => material.dispose());
        }
      });
    },
  };
}
