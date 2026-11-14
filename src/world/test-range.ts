import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";

export function createTestRange(scene: Scene): void {
  scene.clearColor.set(0.54, 0.59, 0.6, 1);
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogColor = Color3.FromHexString("#89969a");
  scene.fogStart = 30;
  scene.fogEnd = 96;

  const groundMaterial = new StandardMaterial("range-ground-material", scene);
  groundMaterial.diffuseColor = Color3.FromHexString("#656b62");
  groundMaterial.specularColor = Color3.Black();

  const concreteMaterial = new StandardMaterial("range-concrete-material", scene);
  concreteMaterial.diffuseColor = Color3.FromHexString("#777b78");
  concreteMaterial.specularColor = Color3.Black();

  const earthMaterial = new StandardMaterial("range-earth-material", scene);
  earthMaterial.diffuseColor = Color3.FromHexString("#777064");
  earthMaterial.specularColor = Color3.Black();

  const ground = MeshBuilder.CreateGround(
    "test-range-ground",
    { width: 120, height: 120, subdivisions: 2 },
    scene,
  );
  ground.material = groundMaterial;
  ground.checkCollisions = true;
  ground.receiveShadows = true;

  function block(
    name: string,
    position: Vector3,
    dimensions: Vector3,
    material = concreteMaterial,
  ): void {
    const mesh = MeshBuilder.CreateBox(
      name,
      {
        width: dimensions.x,
        height: dimensions.y,
        depth: dimensions.z,
      },
      scene,
    );
    mesh.position.copyFrom(position);
    mesh.material = material;
    mesh.checkCollisions = true;
    mesh.receiveShadows = true;
  }

  // Neutral geometry for validating movement and collision behavior.
  block("north-boundary", new Vector3(0, 1.5, 28), new Vector3(40, 3, 1));
  block("south-boundary", new Vector3(0, 1.5, -18), new Vector3(40, 3, 1));
  block("west-boundary", new Vector3(-20, 1.5, 5), new Vector3(1, 3, 46));
  block("east-boundary", new Vector3(20, 1.5, 5), new Vector3(1, 3, 46));

  block("low-block-a", new Vector3(-7, 0.75, 0), new Vector3(3, 1.5, 3), earthMaterial);
  block("low-block-b", new Vector3(6, 0.6, -7), new Vector3(4, 1.2, 2), earthMaterial);
  block("vertical-obstacle", new Vector3(8, 1, 10), new Vector3(2, 2, 5));
  block("long-obstacle", new Vector3(-3, 0.5, 17), new Vector3(5, 1, 2), earthMaterial);
}
