/**
 * The studio viewport: one three.js scene that the editor and the showroom share.
 * Renders on demand (only while something moves), pauses when the tab is hidden.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { LightPreset, MaterialVariant, StudioObject } from '../ws/types';
import { buildVessel, VesselMaterial } from './vessel';

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
  /** an environment map from an .hdr file (null = the studio room) */
  setHDRI(url: string | null): Promise<void>;
  /** split view: the left part shows `a`, the right part the current variant */
  setCompare(a: MaterialVariant | null, split?: number): void;
  getPose(): Pose;
  setPose(p: Pose): void;
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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(opts.pixelRatio ?? Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
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
  scene.add(holder);
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
    const fitH = (height * 2.15) / 2 / Math.tan(fov / 2);
    const fitW = ((aspect < 0.8 ? 1.75 : 2.6) / aspect) / 2 / Math.tan(fov / 2);
    const d = Math.max(fitH, fitW);
    fitD = d;
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
    key.color.set('#fff4e8');
    rim.color.set('#ffffff');
    scene.environment = p === 'hdri' && hdriEnv ? hdriEnv : roomEnv;
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

  async function setObject(o: StudioObject, modelUrl?: string, quality: 'draft' | 'full' = 'full') {
    clear();
    if (o.source.kind === 'vessel') {
      height = o.source.height;
      const geo = buildVessel({ twist: o.source.twist, height: o.source.height, waist: o.source.waist }, quality === 'draft' ? 72 : window.innerWidth < 700 ? 110 : 150);
      const v = o.variants.find((x) => x.id === o.variantId) ?? o.variants[0];
      if (!vesselMat) vesselMat = new VesselMaterial(v);
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
    if (!keepCamera) frame(lens);
    keepCamera = true;
    applyView();
    reshadow();
  }
  let keepCamera = false;

  function setVariant(v: MaterialVariant, _quality: 'draft' | 'full' = 'full') {
    if (!vesselMat || !mesh) return;
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
    } else renderer.render(scene, camera);
  }

  // Adaptive resolution: while frames keep coming (orbit, turntable) and the GPU can't keep
  // up, render fewer pixels; climb back once it has headroom. Stills always render at full size.
  const maxRatio = opts.pixelRatio ?? Math.min(window.devicePixelRatio, 1.5);
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
    if (slow > 8 && ratio > 0.75) {
      ratio = Math.max(0.75, ratio - 0.25);
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
      if (!a) {
        compareMat?.dispose();
        compareMat = null;
      } else if (!compareMat) compareMat = new VesselMaterial(a);
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
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      controls.dispose();
      clear();
      vesselMat?.dispose();
      compareMat?.dispose();
      hdriEnv?.dispose();
      roomEnv.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
