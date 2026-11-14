import * as THREE from "three";
import "./style.css";

const viewport = document.querySelector<HTMLDivElement>("#viewport");
const status = document.querySelector<HTMLParagraphElement>("#runtime-status");

if (!viewport || !status) {
  throw new Error("Required application elements are missing.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color("#171b1e");

const camera = new THREE.PerspectiveCamera(
  55,
  viewport.clientWidth / Math.max(viewport.clientHeight, 1),
  0.1,
  100,
);
camera.position.set(3.5, 2.5, 5);
camera.lookAt(0, 0, 0);

const grid = new THREE.GridHelper(12, 24, "#667078", "#343b40");
scene.add(grid);

const referenceGeometry = new THREE.BoxGeometry(1, 1, 1);
const referenceMaterial = new THREE.MeshStandardMaterial({
  color: "#8b969d",
  roughness: 0.78,
  metalness: 0.08,
});
const referenceObject = new THREE.Mesh(referenceGeometry, referenceMaterial);
referenceObject.position.y = 0.5;
scene.add(referenceObject);

const ambient = new THREE.HemisphereLight("#dce6ed", "#252a2e", 2.1);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight("#ffffff", 2.2);
keyLight.position.set(4, 7, 3);
scene.add(keyLight);

let renderer: THREE.WebGPURenderer | THREE.WebGLRenderer | undefined;
let animationFrame = 0;
let disposed = false;

async function initializeRenderer(): Promise<void> {
  try {
    const webgpuAvailable =
      typeof navigator !== "undefined" && "gpu" in navigator;

    if (webgpuAvailable) {
      const candidate = new THREE.WebGPURenderer({ antialias: true });
      await candidate.init();
      renderer = candidate;
      status.textContent = "Renderer: WebGPU";
    } else {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      status.textContent = "Renderer: WebGL fallback";
    }

    if (disposed || !renderer) {
      renderer?.dispose();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    viewport.appendChild(renderer.domElement);

    const resizeObserver = new ResizeObserver(() => {
      if (!renderer || disposed) return;
      const width = Math.max(viewport.clientWidth, 1);
      const height = Math.max(viewport.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(viewport);

    const render = (): void => {
      if (!renderer || disposed) return;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();

    window.addEventListener(
      "pagehide",
      () => {
        disposed = true;
        window.cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        renderer?.dispose();
        referenceGeometry.dispose();
        referenceMaterial.dispose();
      },
      { once: true },
    );
  } catch (error) {
    console.error("Renderer initialization failed:", error);
    status.textContent =
      "Renderer unavailable. Check browser graphics support and console.";
  }
}

void initializeRenderer();
