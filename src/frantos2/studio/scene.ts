/**
 * The studio viewport: one three.js scene that the editor and the showroom share.
 * Renders on demand (only while something moves), pauses when the tab is hidden.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { LightPreset, MaterialVariant, StudioObject } from '../ws/types';
import { buildVessel, vesselMaterial } from './vessel';

export type ViewMode = 'render' | 'clay' | 'wire';

export interface ObjectScene {
  setObject(o: StudioObject, modelUrl?: string): Promise<void>;
  setVariant(v: MaterialVariant): void;
  setLight(l: StudioObject['light']): void;
  setLens(mm: number): void;
  setTurntable(on: boolean, seconds?: number): void;
  setView(v: ViewMode): void;
  resetCamera(): void;
  /** a still at the given size, with or without the studio background */
  render(w: number, h: number, opts?: { background?: string | null; type?: string; quality?: number }): Promise<Blob>;
  exportGLB(): Promise<Blob>;
  resize(): void;
  dispose(): void;
  onInteract(cb: () => void): void;
}

const softShadow = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(12,10,8,0.6)');
  g.addColorStop(0.4, 'rgba(12,10,8,0.28)');
  g.addColorStop(1, 'rgba(12,10,8,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export function createObjectScene(canvas: HTMLCanvasElement, opts: { interactive?: boolean; pixelRatio?: number } = {}): ObjectScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(opts.pixelRatio ?? Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  const target = new THREE.Vector3(0, 0, 0);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI / 2 + 0.05;
  controls.enabled = opts.interactive !== false;

  // ground: a soft contact shadow plus a shadow catcher for the key light
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.22 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.receiveShadow = true;
  scene.add(blob, catcher);

  // lights
  const key = new THREE.DirectionalLight('#fff4e8', 2.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 12;
  key.shadow.blurSamples = 16;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  key.shadow.camera.left = key.shadow.camera.bottom = -1.5;
  key.shadow.camera.right = key.shadow.camera.top = 1.5;
  key.shadow.bias = -0.0004;
  const fill = new THREE.HemisphereLight('#fff8ef', '#6b5a4a', 0.5);
  const rim = new THREE.DirectionalLight('#ffffff', 0);
  scene.add(key, key.target, fill, rim);

  const holder = new THREE.Group();
  scene.add(holder);
  let mesh: THREE.Object3D | null = null;
  let vesselMat: THREE.MeshPhysicalMaterial | null = null;
  let height = 1.25;
  let view: ViewMode = 'render';
  let light: StudioObject['light'] = { preset: 'softbox', angle: -35, intensity: 1 };
  const clayMat = new THREE.MeshStandardMaterial({ color: '#ece6da', roughness: 0.85 });
  const wireMat = new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.55 });
  const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  let dirty = true;
  let running = true;
  const listeners: (() => void)[] = [];
  controls.addEventListener('change', () => (dirty = true));
  controls.addEventListener('start', () => listeners.forEach((f) => f()));

  function frame(lens: number) {
    camera.setFocalLength(lens);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const aspect = camera.aspect || 1;
    const fitH = (height * 2.15) / 2 / Math.tan(fov / 2);
    const fitW = ((aspect < 0.8 ? 1.75 : 2.6) / aspect) / 2 / Math.tan(fov / 2);
    const d = Math.max(fitH, fitW);
    const dir = camera.position.clone().sub(target);
    if (dir.lengthSq() < 1e-6) dir.set(0.35, 0.28, 1);
    dir.normalize().multiplyScalar(d);
    camera.position.copy(target).add(dir);
    controls.minDistance = d * 0.45;
    controls.maxDistance = d * 2.2;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  let lens = 85;

  function placeLights() {
    const a = THREE.MathUtils.degToRad(light.angle);
    const k = light.intensity;
    const p = light.preset as LightPreset;
    const dist = 5;
    if (p === 'softbox') {
      key.position.set(Math.sin(a) * dist, 3.2, Math.cos(a) * dist);
      key.intensity = 1.6 * k;
      key.shadow.radius = 14;
      fill.intensity = 0.65 * k;
      rim.intensity = 0.35 * k;
      scene.environmentIntensity = 0.85;
    } else if (p === 'window') {
      key.position.set(Math.sin(a) * dist, 1.8, Math.cos(a) * dist);
      key.color.set('#e8f0ff');
      key.intensity = 2.4 * k;
      key.shadow.radius = 22;
      fill.intensity = 0.35 * k;
      rim.intensity = 0.15 * k;
      scene.environmentIntensity = 0.6;
    } else if (p === 'spot') {
      key.position.set(Math.sin(a) * 2.2, 5, Math.cos(a) * 2.2);
      key.intensity = 4.2 * k;
      key.shadow.radius = 2;
      fill.intensity = 0.08 * k;
      rim.intensity = 0;
      scene.environmentIntensity = 0.25;
    } else {
      key.position.set(Math.sin(a + Math.PI) * dist, 2.4, Math.cos(a + Math.PI) * dist);
      key.intensity = 2.6 * k;
      key.shadow.radius = 10;
      fill.intensity = 0.2 * k;
      rim.intensity = 1.2 * k;
      scene.environmentIntensity = 0.4;
    }
    if (p !== 'window') key.color.set('#fff4e8');
    rim.position.set(-Math.sin(a) * dist, 2, -Math.cos(a) * dist);
    key.target.position.set(0, -height / 2 + 0.3, 0);
    dirty = true;
  }

  function applyView() {
    holder.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (!originals.has(m)) originals.set(m, m.material);
      m.material = view === 'render' ? originals.get(m)! : view === 'clay' ? clayMat : wireMat;
    });
    dirty = true;
  }

  function clear() {
    if (!mesh) return;
    holder.remove(mesh);
    mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
    originals.clear();
    mesh = null;
  }

  async function setObject(o: StudioObject, modelUrl?: string) {
    clear();
    if (o.source.kind === 'vessel') {
      height = o.source.height;
      const geo = buildVessel({ twist: o.source.twist, height: o.source.height, waist: o.source.waist }, window.innerWidth < 700 ? 110 : 170);
      const v = o.variants.find((x) => x.id === o.variantId) ?? o.variants[0];
      vesselMat?.dispose();
      vesselMat = vesselMaterial(v);
      const m = new THREE.Mesh(geo, vesselMat);
      m.castShadow = true;
      m.receiveShadow = true;
      mesh = m;
    } else if (modelUrl) {
      const gltf = await new GLTFLoader().loadAsync(modelUrl);
      const root = gltf.scene;
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const s = 1.25 / Math.max(size.y, size.x, size.z, 1e-6);
      root.scale.setScalar(s);
      box.setFromObject(root);
      const c = box.getCenter(new THREE.Vector3());
      root.position.sub(c);
      height = box.getSize(new THREE.Vector3()).y;
      root.traverse((x) => {
        const m = x as THREE.Mesh;
        if (m.isMesh) (m.castShadow = true), (m.receiveShadow = true);
      });
      mesh = root;
    }
    if (mesh) holder.add(mesh);
    blob.position.y = catcher.position.y = -height / 2 + 0.001;
    blob.scale.setScalar(Math.max(0.8, height * 0.9));
    target.set(0, 0, 0);
    controls.target.copy(target);
    light = o.light;
    lens = o.camera.lens;
    placeLights();
    frame(lens);
    applyView();
  }

  function setVariant(v: MaterialVariant) {
    if (!vesselMat || !mesh) return;
    const next = vesselMaterial(v);
    for (const k of ['map', 'roughnessMap', 'clearcoatMap', 'bumpMap'] as const) vesselMat[k]?.dispose();
    vesselMat.dispose();
    vesselMat = next;
    originals.set(mesh as THREE.Mesh, next);
    if (view === 'render') (mesh as THREE.Mesh).material = next;
    dirty = true;
  }

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (!fitted) (frame(lens), (fitted = true));
    else camera.updateProjectionMatrix();
    dirty = true;
  };
  let fitted = false;
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const onVis = () => {
    running = document.visibilityState === 'visible';
    dirty = true;
  };
  document.addEventListener('visibilitychange', onVis);

  renderer.setAnimationLoop(() => {
    if (!running) return;
    const moved = controls.update();
    if (moved || dirty || controls.autoRotate) {
      renderer.render(scene, camera);
      dirty = false;
    }
  });

  return {
    setObject,
    setVariant,
    setLight(l) {
      light = l;
      placeLights();
    },
    setLens(mm) {
      lens = mm;
      frame(mm);
    },
    setTurntable(on, seconds = 12) {
      controls.autoRotate = on;
      controls.autoRotateSpeed = 60 / Math.max(2, seconds);
      dirty = true;
    },
    setView(v) {
      view = v;
      applyView();
    },
    resetCamera() {
      camera.position.set(0.35, 0.28, 1);
      frame(lens);
    },
    async render(w, h, o = {}) {
      const prevSize = renderer.getSize(new THREE.Vector2());
      const prevRatio = renderer.getPixelRatio();
      const prevAspect = camera.aspect;
      const prevPos = camera.position.clone();
      const bg = o.background ?? null;
      scene.background = bg ? new THREE.Color(bg) : null;
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      const blobOut = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('render failed'))), o.type ?? 'image/png', o.quality));
      scene.background = null;
      renderer.setPixelRatio(prevRatio);
      renderer.setSize(prevSize.x, prevSize.y, false);
      camera.aspect = prevAspect;
      camera.position.copy(prevPos);
      camera.updateProjectionMatrix();
      dirty = true;
      return blobOut;
    },
    async exportGLB() {
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
      const out = (await new GLTFExporter().parseAsync(holder, { binary: true })) as ArrayBuffer;
      return new Blob([out], { type: 'model/gltf-binary' });
    },
    resize,
    onInteract(cb) {
      listeners.push(cb);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      controls.dispose();
      clear();
      vesselMat?.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
