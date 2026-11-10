/**
 * The studio viewport: one three.js scene that the editor and the showroom share.
 * Renders on demand (only while something moves), pauses when the tab is hidden.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { LightPreset, MaterialVariant, SceneExtras, StageProp, StudioObject } from '../ws/types';
import { envScene, makeDecal, reflectorFloor, scaleFigure } from './sceneExtras';
import { buildVessel, VesselMaterial } from './vessel';
import { isLite } from '../glass/perf';

export type ViewMode = 'render' | 'clay' | 'wire';
export interface Pose {
  az: number;
  el: number;
  zoom: number;
}

export interface ObjectScene {
  setObject(o: StudioObject, modelUrl?: string, quality?: 'draft' | 'full'): Promise<void>;
  setVariant(v: MaterialVariant, quality?: 'draft' | 'full'): void;
  setLight(l: StudioObject['light']): void;
  setLens(mm: number): void;
  setTurntable(on: boolean, seconds?: number): void;
  setView(v: ViewMode): void;
  resetCamera(): void;
  /** a still at the given size, with or without the studio background */
  render(w: number, h: number, opts?: { background?: string | null; type?: string; quality?: number }): Promise<Blob>;
  /** a quick thumbnail from the current view */
  snapshot(w: number, h: number, opts?: { background?: string | null; type?: string; quality?: number }): Promise<Blob>;
  exportGLB(): Promise<Blob>;
  /** what the object stands on */
  setStage(kind: StageProp | undefined): void;
  /** an environment map from an .hdr file (null = the studio room) */
  setHDRI(url: string | null): Promise<void>;
  /** split view: the left part shows `a`, the right part the current variant */
  setCompare(a: MaterialVariant | null, split?: number): void;
  getPose(): Pose;
  setPose(p: Pose): void;
  /** environment, floor, figure for scale, logo on the surface */
  setExtras(e: SceneExtras | undefined): void;
  /** the point on the object under a screen position (client px), in scene units */
  pick(clientX: number, clientY: number): [number, number, number] | null;
  /** where a scene point sits on the canvas (px from its top-left), and whether the object hides it */
  project(p: [number, number, number]): { x: number; y: number; hidden: boolean } | null;
  /** called after every drawn frame (annotation dots follow the camera) */
  onFrame(cb: () => void): () => void;
  /** draw one frame now (recording drives the camera itself) */
  draw(): void;
  /** keep full resolution while recording, and paint the backdrop into the frames (video has no transparency) */
  setRecording(on: boolean, background?: StudioObject['background']): void;
  canvas: HTMLCanvasElement;
  resize(): void;
  dispose(): void;
  onInteract(cb: () => void): void;
}

const toBlob = (c: HTMLCanvasElement, type = 'image/png', quality?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('render failed'))), type, quality));

/** the studio backdrop as a texture: the same radial falloff the page draws in CSS */
function backdrop(bg: StudioObject['background'], w: number, h: number): THREE.Texture | THREE.Color {
  if (bg.kind === 'color') return new THREE.Color(bg.color);
  const color = bg.kind === 'transparent' ? '#1b1d21' : bg.color;
  if (bg.kind === 'transparent') return new THREE.Color(color);
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.max(2, Math.round((512 * h) / Math.max(1, w)));
  const x = c.getContext('2d')!;
  const mid = new THREE.Color(color).lerp(new THREE.Color('#1a1612'), 0.45);
  const g = x.createRadialGradient(c.width / 2, c.height * 0.4, 0, c.width / 2, c.height * 0.4, Math.hypot(c.width, c.height) * 0.62);
  g.addColorStop(0, color);
  g.addColorStop(0.62, `#${mid.getHexString()}`);
  g.addColorStop(1, '#0e0c0b');
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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
  // without a GPU (software WebGL) every pixel costs processor time: fewer pixels, no MSAA, no shadow maps
  const lite = isLite();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(opts.pixelRatio ?? (lite ? 0.75 : Math.min(window.devicePixelRatio, 1.5)));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  // the light and the object only change on edits: orbiting never needs a new shadow map
  renderer.shadowMap.autoUpdate = false;
  const reshadow = () => {
    renderer.shadowMap.needsUpdate = true;
    dirty = true;
  };

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  let hdriEnv: THREE.Texture | null = null;
  scene.environment = roomEnv;

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
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 12;
  key.shadow.blurSamples = 10;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  key.shadow.camera.left = key.shadow.camera.bottom = -1.5;
  key.shadow.camera.right = key.shadow.camera.top = 1.5;
  key.shadow.bias = -0.0004;
  const fill = new THREE.HemisphereLight('#fff8ef', '#6b5a4a', 0.5);
  const rim = new THREE.DirectionalLight('#ffffff', 0);
  scene.add(key, key.target, fill, rim);

  const holder = new THREE.Group();
  const props = new THREE.Group();
  scene.add(holder, props);
  let propH = 0;
  let stageKind: StageProp = 'none';
  const stone = new THREE.MeshStandardMaterial({ color: '#e2dbcf', roughness: 0.86, metalness: 0 });
  const wall = new THREE.MeshStandardMaterial({ color: '#d9d1c4', roughness: 0.95, side: THREE.BackSide });
  let mesh: THREE.Object3D | null = null;
  let vesselMat: VesselMaterial | null = null;
  let compareMat: VesselMaterial | null = null;
  let split = 0.5;
  let recording = false;
  let fitD = 4;
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
    const fitH = ((Math.max(height, figH) + propH) * 2.15) / 2 / Math.tan(fov / 2);
    const fitW = (((aspect < 0.8 ? 1.75 : 2.6) + figW * 1.6) / aspect) / 2 / Math.tan(fov / 2);
    const d = Math.max(fitH, fitW);
    fitD = d;
    const dir = camera.position.clone().sub(target);
    if (dir.lengthSq() < 1e-6) dir.set(0.35, 0.28, 1);
    dir.normalize().multiplyScalar(d);
    camera.position.copy(target).add(dir);
    controls.minDistance = d * 0.45;
    controls.maxDistance = d * 2.2;
    camera.far = Math.max(50, d * 4);
    camera.updateProjectionMatrix();
    dirty = true;
  }
  let lens = 85;
  let figH = 0;
  let figW = 0;

  function placeLights() {
    const a = THREE.MathUtils.degToRad(light.angle);
    const k = light.intensity;
    const p = light.preset as LightPreset;
    const dist = 5;
    key.color.set('#fff4e8');
    rim.color.set('#ffffff');
    scene.environment = p === 'hdri' && hdriEnv ? hdriEnv : envFor(extras?.env);
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
    } else if (p === 'morning') {
      key.position.set(Math.sin(a) * dist, 1.5, Math.cos(a) * dist);
      key.color.set('#fff0d6');
      key.intensity = 2.1 * k;
      key.shadow.radius = 18;
      fill.intensity = 0.5 * k;
      rim.color.set('#dfe9ff');
      rim.intensity = 0.25 * k;
      scene.environmentIntensity = 0.7;
    } else if (p === 'sunset') {
      key.position.set(Math.sin(a) * dist, 0.85, Math.cos(a) * dist);
      key.color.set('#ffae6e');
      key.intensity = 2.8 * k;
      key.shadow.radius = 9;
      fill.intensity = 0.22 * k;
      rim.color.set('#8fa6ff');
      rim.intensity = 0.55 * k;
      scene.environmentIntensity = 0.35;
    } else if (p === 'gallery') {
      key.position.set(Math.sin(a) * 1.4, 5.5, Math.cos(a) * 1.4);
      key.color.set('#fffaf2');
      key.intensity = 2.6 * k;
      key.shadow.radius = 7;
      fill.intensity = 0.6 * k;
      rim.intensity = 0.2 * k;
      scene.environmentIntensity = 0.95;
    } else if (p === 'hdri') {
      key.position.set(Math.sin(a) * dist, 3.5, Math.cos(a) * dist);
      key.intensity = 0.7 * k;
      key.shadow.radius = 16;
      fill.intensity = 0.05 * k;
      rim.intensity = 0;
      scene.environmentIntensity = 1.1 * k;
    } else {
      key.position.set(Math.sin(a + Math.PI) * dist, 2.4, Math.cos(a + Math.PI) * dist);
      key.intensity = 2.6 * k;
      key.shadow.radius = 10;
      fill.intensity = 0.2 * k;
      rim.intensity = 1.2 * k;
      scene.environmentIntensity = 0.4;
    }
    rim.position.set(-Math.sin(a) * dist, 2, -Math.cos(a) * dist);
    key.target.position.set(0, -height / 2 + 0.3, 0);
    reshadow();
  }
  void stageKind;

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
    for (const x of modelMats) x.m.dispose();
    modelMats = [];
    mesh = null;
  }

  function applyStage(kind: StageProp = 'none') {
    stageKind = kind;
    props.children.slice().forEach((c) => {
      props.remove(c);
      (c as THREE.Mesh).geometry?.dispose();
    });
    const base = -height / 2;
    propH = 0;
    if (kind === 'plinth') {
      propH = 0.42;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, propH, 96), stone);
      m.position.y = base - propH / 2;
      props.add(m);
    } else if (kind === 'block') {
      propH = 0.3;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, propH, 1.1, 1, 1, 1), stone);
      m.position.y = base - propH / 2;
      props.add(m);
    } else if (kind === 'arch') {
      // a curved wall behind the object and a floor that meets it: a small set
      const r = 1.7;
      const wallM = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 3.2, 96, 1, true, Math.PI * 0.5, Math.PI), wall);
      wallM.position.set(0, base + 1.6, 0.4);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(r, 96), new THREE.MeshStandardMaterial({ color: '#e6dfd3', roughness: 0.9 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, base - 0.004, 0.4);
      floor.userData.noShadow = true;
      props.add(wallM, floor);
    }
    props.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) (m.castShadow = kind !== 'arch'), (m.receiveShadow = kind !== 'arch');
    });
    const floorY = base - propH;
    blob.position.y = catcher.position.y = floorY + 0.001;
    blob.visible = kind === 'none' || lite;
    target.set(0, -propH / 2, 0);
    controls.target.copy(target);
    key.target.position.set(0, base + 0.3, 0);
    reshadow();
  }

  /* imported models: every mesh gets its own copy of its material, so the variant can recolour it in place */
  interface ModelMat {
    m: THREE.MeshStandardMaterial;
    map: THREE.Texture | null;
    color: THREE.Color;
    roughness: number;
    metalness: number;
    env: number;
    u: { uTint: { value: THREE.Color }; uAmount: { value: number } };
  }
  let modelMats: ModelMat[] = [];
  // imported models compare A/B by repainting between the two halves of one frame
  let modelV: MaterialVariant | null = null;
  let compareModelV: MaterialVariant | null = null;
  function prepModel(root: THREE.Object3D) {
    modelMats = [];
    root.traverse((x) => {
      const mesh = x as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      if (!(src as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial) return;
      const m = src.clone();
      mesh.material = m;
      const u = { uTint: { value: new THREE.Color('#ffffff') }, uAmount: { value: 0 } };
      // recolour keeps the texture's light and shade (its luminance) and swaps its colour for the tint
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTint = u.uTint;
        sh.uniforms.uAmount = u.uAmount;
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uTint;\nuniform float uAmount;')
          .replace(
            '#include <map_fragment>',
            '#include <map_fragment>\n{ float l = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)); float lt = mix(0.26, 0.95, sqrt(l)); vec3 r = lt < 0.5 ? uTint * (2.0 * lt) : mix(uTint, vec3(1.0), (2.0 * lt - 1.0) * 0.7); diffuseColor.rgb = mix(diffuseColor.rgb, r, uAmount); }',
          );
      };
      modelMats.push({ m, map: m.map, color: m.color.clone(), roughness: m.roughness, metalness: m.metalness, env: m.envMapIntensity, u });
    });
  }
  let photoTex: { src: string; tex: THREE.Texture } | null = null;
  const photoFor = (src: string) => {
    if (photoTex?.src === src) return photoTex.tex;
    photoTex?.tex.dispose();
    const tex = new THREE.TextureLoader().load(src, () => (dirty = true));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    photoTex = { src, tex };
    return tex;
  };
  function paintModel(v: MaterialVariant, mark = true) {
    const mode = v.finish ?? 'original';
    for (const x of modelMats) {
      const hadMap = !!x.m.map;
      if (mode === 'photo' && v.photo) {
        x.m.map = photoFor(v.photo);
        x.m.color.set('#ffffff');
        x.u.uAmount.value = 0;
        x.m.roughness = Math.max(0.04, v.roughness * (1 - v.gloss * 0.45));
        x.m.metalness = v.metal ?? 0;
      } else if (mode === 'original') {
        x.m.map = x.map;
        x.m.color.copy(x.color);
        x.m.roughness = x.roughness;
        x.m.metalness = x.metalness;
        x.m.envMapIntensity = x.env;
        x.u.uAmount.value = 0;
      } else {
        x.m.roughness = Math.max(0.04, v.roughness * (1 - v.gloss * 0.45));
        x.m.metalness = v.metal ?? 0;
        x.m.envMapIntensity = 0.6 + v.gloss * 1.1;
        if (mode === 'solid' || !x.map) {
          x.m.map = null;
          x.m.color.set(v.topColor);
          x.u.uAmount.value = 0;
        } else {
          x.m.map = x.map;
          x.m.color.set('#ffffff');
          x.u.uTint.value.set(v.topColor);
          x.u.uAmount.value = v.tint ?? 1;
        }
      }
      if (hadMap !== !!x.m.map) x.m.needsUpdate = true;
    }
    if (mark) dirty = true;
  }

  async function setObject(o: StudioObject, modelUrl?: string, quality: 'draft' | 'full' = 'full') {
    clear();
    if (o.source.kind === 'vessel') {
      height = o.source.height;
      const geo = buildVessel({ twist: o.source.twist, height: o.source.height, waist: o.source.waist }, quality === 'draft' || lite ? 72 : window.innerWidth < 700 ? 110 : 150);
      const v = o.variants.find((x) => x.id === o.variantId) ?? o.variants[0];
      if (!vesselMat) vesselMat = new VesselMaterial(v, lite);
      else if (quality === 'full') vesselMat.update(v);
      const m = new THREE.Mesh(geo, vesselMat.material);
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
      prepModel(root);
      modelV = o.variants.find((x) => x.id === o.variantId) ?? o.variants[0];
      paintModel(modelV);
      mesh = root;
    }
    if (mesh) holder.add(mesh);
    blob.scale.setScalar(Math.max(0.8, height * 0.9));
    applyStage(o.stage);
    light = o.light;
    lens = o.camera.lens;
    placeLights();
    if (!keepCamera) frame(lens);
    keepCamera = true;
    applyView();
    applyExtras(o.extras);
    reshadow();
  }
  let keepCamera = false;

  /* ───────── extras ───────── */
  let extras: SceneExtras | undefined;
  const envs = new Map<string, THREE.Texture>();
  function envFor(k?: SceneExtras['env']) {
    if (!k || k === 'room') return roomEnv;
    if (!envs.has(k)) envs.set(k, pmrem.fromScene(envScene(k), 0.02).texture);
    return envs.get(k)!;
  }
  const extraGroup = new THREE.Group();
  scene.add(extraGroup);
  let decalKey = '';
  let decalTex: THREE.Texture | null = null;
  function applyExtras(e: SceneExtras | undefined) {
    extras = e;
    extraGroup.children.slice().forEach((c) => {
      extraGroup.remove(c);
      const m = c as THREE.Mesh & { dispose?: () => void };
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose?.();
      m.dispose?.();
    });
    const floorY = blob.position.y;
    // floor
    catcher.visible = true;
    if (e?.floor === 'mirror' || e?.floor === 'water') {
      // without a GPU a real reflection doubles the work: a polished floor stands in for it
      const f = lite
        ? new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshStandardMaterial({ color: e.floor === 'water' ? '#1f4f57' : '#2a2c30', roughness: 0.08, metalness: 0.7 }))
        : reflectorFloor(e.floor, canvas.width || 1024, canvas.height || 768);
      f.rotation.x = -Math.PI / 2;
      f.position.y = floorY - 0.002;
      extraGroup.add(f);
    }
    // figure for scale
    figH = 0;
    figW = 0;
    target.x = 0;
    if (e?.scale && e.scale !== 'none' && mesh) {
      const real = e.scale === 'person' ? 175 : 19;
      const h = height * (real / Math.max(1, e.sizeCm ?? 30));
      const fig = scaleFigure(e.scale, h);
      const box = new THREE.Box3().setFromObject(mesh);
      const half = Math.max(0.3, (box.max.x - box.min.x) / 2);
      figW = fig.userData.width as number;
      fig.position.set(-(half + figW / 2 + 0.12), floorY + h / 2, 0);
      extraGroup.add(fig);
      figH = h;
      target.x = -(figW / 2 + 0.06);
    }
    controls.target.copy(target);
    // logo on the surface
    const d = e?.decal;
    const key = d && mesh ? `${d.src.length}:${d.src.slice(-40)}:${d.size}:${d.angle}:${d.y}` : '';
    if (d && mesh) {
      const build = (tex: THREE.Texture) => {
        if (decalKey !== key || !mesh) return;
        const m = makeDecal(mesh, tex, d, height);
        if (m) extraGroup.add(m);
        dirty = true;
      };
      decalKey = key;
      if (decalTex && (decalTex.userData.src as string) === d.src) build(decalTex);
      else {
        decalTex?.dispose();
        decalTex = null;
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          const w = img.naturalWidth || 512;
          const h = img.naturalHeight || 512;
          const k = 1024 / Math.max(w, h);
          c.width = Math.round(w * k);
          c.height = Math.round(h * k);
          c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
          const tx = new THREE.CanvasTexture(c);
          tx.colorSpace = THREE.SRGBColorSpace;
          tx.userData.src = d.src;
          decalTex = tx;
          build(tx);
        };
        img.src = d.src;
      }
    } else decalKey = '';
    placeLights();
    frame(lens);
    reshadow();
  }

  const frameListeners = new Set<() => void>();
  const ray = new THREE.Raycaster();
  const ndc = (cx: number, cy: number) => {
    const r = canvas.getBoundingClientRect();
    return new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  };

  function setVariant(v: MaterialVariant, _quality: 'draft' | 'full' = 'full') {
    if (!mesh) return;
    if (!(mesh as THREE.Mesh).isMesh) {
      modelV = v;
      paintModel(v);
      return;
    }
    if (!vesselMat) return;
    vesselMat.update(v);
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

  function draw() {
    const m = mesh as THREE.Mesh | null;
    if (compareMat && vesselMat && m?.isMesh && view === 'render') {
      const size = renderer.getSize(new THREE.Vector2());
      const x = Math.round(size.x * split);
      renderer.setScissorTest(true);
      m.material = compareMat.material;
      renderer.setScissor(0, 0, x, size.y);
      renderer.render(scene, camera);
      m.material = vesselMat.material;
      renderer.setScissor(x, 0, size.x - x, size.y);
      renderer.render(scene, camera);
      renderer.setScissorTest(false);
    } else if (compareModelV && modelV && m && !m.isMesh && view === 'render') {
      const size = renderer.getSize(new THREE.Vector2());
      const x = Math.round(size.x * split);
      renderer.setScissorTest(true);
      paintModel(compareModelV, false);
      renderer.setScissor(0, 0, x, size.y);
      renderer.render(scene, camera);
      paintModel(modelV, false);
      renderer.setScissor(x, 0, size.x - x, size.y);
      renderer.render(scene, camera);
      renderer.setScissorTest(false);
    } else renderer.render(scene, camera);
  }

  // Adaptive resolution: while frames keep coming (orbit, turntable) and the GPU can't keep
  // up, render fewer pixels; climb back once it has headroom. Stills always render at full size.
  const maxRatio = opts.pixelRatio ?? (lite ? 0.75 : Math.min(window.devicePixelRatio, 1.5));
  let ratio = maxRatio;
  let last = 0;
  let slow = 0;
  let fast = 0;
  const adapt = (now: number) => {
    const dt = last ? now - last : 16;
    last = now;
    if (dt > 120 || recording) return; // a pause, not a slow frame; recording keeps full size
    if (dt > 24) (slow++, (fast = 0));
    else if (dt < 18) (fast++, (slow = 0));
    if (slow > 8 && ratio > 0.5) {
      ratio = Math.max(0.5, ratio - 0.25);
      slow = 0;
      renderer.setPixelRatio(ratio);
      resize();
    } else if (fast > 90 && ratio < maxRatio) {
      ratio = Math.min(maxRatio, ratio + 0.25);
      fast = 0;
      renderer.setPixelRatio(ratio);
      resize();
    }
  };

  renderer.setAnimationLoop((now: number) => {
    if (!running) return;
    const moved = controls.update();
    if (recording) return; // the recorder draws its own frames
    if (moved || dirty || controls.autoRotate) {
      draw();
      frameListeners.forEach((f) => f());
      dirty = false;
      adapt(now);
    } else last = 0;
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
      // Everything up to toBlob runs in one task, so the browser never composites the
      // resized canvas: the visible view is restored and redrawn before the next paint.
      const prevSize = renderer.getSize(new THREE.Vector2());
      const prevRatio = renderer.getPixelRatio();
      const prevAspect = camera.aspect;
      const bg = o.background ?? null;
      scene.background = bg ? new THREE.Color(bg) : null;
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      out.getContext('2d')!.drawImage(canvas, 0, 0, w, h);
      scene.background = null;
      renderer.setPixelRatio(prevRatio);
      renderer.setSize(prevSize.x, prevSize.y, false);
      camera.aspect = prevAspect;
      camera.updateProjectionMatrix();
      draw();
      return toBlob(out, o.type, o.quality);
    },
    async snapshot(w, h, o = {}) {
      // a thumbnail cropped from what is on screen: no second render, nothing flickers
      const cw = canvas.width;
      const ch = canvas.height;
      const a = w / h;
      const sw = Math.min(cw, ch * a * 0.62);
      const sh = sw / a;
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const x = out.getContext('2d')!;
      if (o.background) {
        x.fillStyle = o.background;
        x.fillRect(0, 0, w, h);
      }
      draw();
      x.drawImage(canvas, (cw - sw) / 2, (ch - sh) / 2, sw, sh, 0, 0, w, h);
      return toBlob(out, o.type, o.quality);
    },
    async exportGLB() {
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
      const out = (await new GLTFExporter().parseAsync(holder, { binary: true })) as ArrayBuffer;
      return new Blob([out], { type: 'model/gltf-binary' });
    },
    setStage(kind) {
      queueMicrotask(() => applyExtras(extras));
      applyStage(kind);
      frame(lens);
    },
    async setHDRI(url) {
      if (!url) {
        hdriEnv?.dispose();
        hdriEnv = null;
      } else {
        const { RGBELoader } = await import('three/examples/jsm/loaders/RGBELoader.js');
        const tex = await new RGBELoader().loadAsync(url);
        tex.mapping = THREE.EquirectangularReflectionMapping;
        const next = pmrem.fromEquirectangular(tex).texture;
        tex.dispose();
        hdriEnv?.dispose();
        hdriEnv = next;
      }
      placeLights();
    },
    setCompare(a, s = 0.5) {
      split = s;
      if (mesh && !(mesh as THREE.Mesh).isMesh) {
        compareModelV = a;
        if (!a && modelV) paintModel(modelV);
        dirty = true;
        return;
      }
      if (!a) {
        compareMat?.dispose();
        compareMat = null;
      } else if (!compareMat) compareMat = new VesselMaterial(a, lite);
      else compareMat.update(a);
      dirty = true;
    },
    getPose() {
      const off = camera.position.clone().sub(target);
      const d = off.length();
      return { az: THREE.MathUtils.radToDeg(Math.atan2(off.x, off.z)), el: THREE.MathUtils.radToDeg(Math.asin(off.y / d)), zoom: fitD / d };
    },
    setPose(pz) {
      const d = fitD / Math.max(0.2, pz.zoom);
      const az = THREE.MathUtils.degToRad(pz.az);
      const el = THREE.MathUtils.degToRad(pz.el);
      camera.position.set(target.x + d * Math.cos(el) * Math.sin(az), target.y + d * Math.sin(el), target.z + d * Math.cos(el) * Math.cos(az));
      camera.lookAt(target);
      dirty = true;
    },
    draw,
    setRecording(on, bg) {
      recording = on;
      const old = scene.background;
      if (old && (old as THREE.Texture).isTexture) (old as THREE.Texture).dispose();
      scene.background = on && bg ? backdrop(bg, canvas.clientWidth, canvas.clientHeight) : null;
      if (on && ratio !== maxRatio) {
        ratio = maxRatio;
        renderer.setPixelRatio(ratio);
        resize();
      }
      dirty = true;
    },
    canvas,
    resize,
    onInteract(cb) {
      listeners.push(cb);
    },
    setExtras(e) {
      applyExtras(e);
    },
    pick(cx, cy) {
      if (!mesh) return null;
      ray.setFromCamera(ndc(cx, cy), camera);
      const hit = ray.intersectObject(mesh, true)[0];
      return hit ? [hit.point.x, hit.point.y, hit.point.z].map((v) => Math.round(v * 1000) / 1000) as [number, number, number] : null;
    },
    project(p) {
      const v = new THREE.Vector3(...p);
      const d = v.distanceTo(camera.position);
      const sp = v.clone().project(camera);
      if (sp.z > 1) return null;
      let hidden = false;
      if (mesh) {
        ray.set(camera.position, v.clone().sub(camera.position).normalize());
        const hit = ray.intersectObject(mesh, true)[0];
        hidden = !!hit && hit.distance < d - 0.03;
      }
      return { x: ((sp.x + 1) / 2) * canvas.clientWidth, y: ((1 - sp.y) / 2) * canvas.clientHeight, hidden };
    },
    onFrame(cb) {
      frameListeners.add(cb);
      return () => frameListeners.delete(cb);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      controls.dispose();
      clear();
      stone.dispose();
      wall.dispose();
      vesselMat?.dispose();
      compareMat?.dispose();
      hdriEnv?.dispose();
      envs.forEach((t) => t.dispose());
      decalTex?.dispose();
      photoTex?.tex.dispose();
      roomEnv.dispose();
      pmrem.dispose();
      renderer.dispose();
      // give the WebGL context back once the canvas has left the page: browsers keep only a handful,
      // software ones are expensive. A canvas that stays (React re-running an effect) keeps its context for the next scene.
      window.setTimeout(() => {
        if (!canvas.isConnected) renderer.forceContextLoss();
      }, 0);
    },
  };
}
