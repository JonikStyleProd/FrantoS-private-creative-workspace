/**
 * FORM / 01 — the sculptural object behind the demo project.
 * One procedural geometry, three looks:
 *   clay — form before material (white clay, soft light)
 *   v1   — glossy ultramarine lacquer, hard key: the highlight blows out on the upper twist
 *   v2   — satin glaze, broad soft key + warm bounce: the approved version
 * The same module renders the static assets (tools/render-form.html) and the live hero object,
 * so every material of the project shows exactly the same object.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

export type FormLook = 'clay' | 'v1' | 'v2';

export interface FormSceneOptions {
  canvas: HTMLCanvasElement;
  look: FormLook;
  background: string;
  pixelRatio?: number;
  segments?: number; // geometry resolution (lighter on phones)
  transparent?: boolean;
  preserveDrawingBuffer?: boolean;
}

export const FORM_CAMERA = { fov: 24, position: new THREE.Vector3(0, 0.35, 12.2), target: new THREE.Vector3(0, -0.05, 0) };

function buildGeometry(seg = 220) {
  const H = 3.25;
  const R = 0.6;
  const twist = Math.PI * 1.25;
  const n = 7; // superellipse exponent: rounded square
  const uSeg = seg;
  const vSeg = Math.round(seg * 1.1);
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= vSeg; j++) {
    const v = j / vSeg;
    // waist + soft rounded ends
    const waist = 1 - 0.3 * Math.pow(Math.sin(Math.PI * v), 2) + 0.05 * Math.sin(Math.PI * v * 2 + 0.6);
    const e = Math.abs(2 * v - 1);
    const endRound = Math.pow(Math.max(0, 1 - Math.pow(e, 14)), 0.18);
    const s = R * waist * endRound;
    const ang = twist * v - twist / 2;
    const lean = 0.16 * Math.sin(Math.PI * v); // gentle lean so it reads as a figure
    const y = (v - 0.5) * H;
    for (let i = 0; i <= uSeg; i++) {
      const u = (i / uSeg) * Math.PI * 2;
      const cu = Math.cos(u);
      const su = Math.sin(u);
      const r = Math.pow(Math.pow(Math.abs(cu), n) + Math.pow(Math.abs(su), n), -1 / n);
      const lx = r * cu * s;
      const lz = r * su * s;
      const x = lx * Math.cos(ang) - lz * Math.sin(ang) + lean;
      const z = lx * Math.sin(ang) + lz * Math.cos(ang);
      pos.push(x, y, z);
    }
  }
  const row = uSeg + 1;
  for (let j = 0; j < vSeg; j++) {
    for (let i = 0; i < uSeg; i++) {
      const a = j * row + i;
      const b = a + row;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // weld the seam normals (u=0 and u=2π share positions)
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let j = 0; j <= vSeg; j++) {
    const a = j * row;
    const b = a + uSeg;
    const nx = (nrm.getX(a) + nrm.getX(b)) / 2;
    const ny = (nrm.getY(a) + nrm.getY(b)) / 2;
    const nz = (nrm.getZ(a) + nrm.getZ(b)) / 2;
    const l = Math.hypot(nx, ny, nz) || 1;
    nrm.setXYZ(a, nx / l, ny / l, nz / l);
    nrm.setXYZ(b, nx / l, ny / l, nz / l);
  }
  return g;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(20,18,14,0.55)');
  g.addColorStop(0.35, 'rgba(20,18,14,0.28)');
  g.addColorStop(1, 'rgba(20,18,14,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createFormScene(opts: FormSceneOptions) {
  const { canvas, look } = opts;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: !!opts.transparent,
    preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(opts.pixelRatio ?? Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMappingExposure = look === 'v1' ? 1.15 : 1.0;

  const scene = new THREE.Scene();
  if (!opts.transparent) scene.background = new THREE.Color(opts.background);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(FORM_CAMERA.fov, 1, 0.1, 100);
  camera.position.copy(FORM_CAMERA.position);
  camera.lookAt(FORM_CAMERA.target);

  const geo = buildGeometry(opts.segments ?? 220);
  let material: THREE.Material;
  if (look === 'clay') {
    material = new THREE.MeshStandardMaterial({ color: '#e9e5dd', roughness: 0.82, metalness: 0, envMapIntensity: 0.55 });
  } else if (look === 'v1') {
    material = new THREE.MeshPhysicalMaterial({
      color: '#132a9e',
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 0.28,
    });
  } else {
    material = new THREE.MeshPhysicalMaterial({
      color: '#1630a6',
      roughness: 0.3,
      metalness: 0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.32,
    });
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const pivot = new THREE.Group();
  pivot.add(mesh);
  scene.add(pivot);

  // contact shadow
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.4),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false })
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.set(0.12, -1.64, 0.05);
  scene.add(sh);

  function shadowed(l: THREE.DirectionalLight) {
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.radius = 6;
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
    const c = l.shadow.camera as THREE.OrthographicCamera;
    c.left = -2.5; c.right = 2.5; c.top = 2.5; c.bottom = -2.5; c.near = 0.5; c.far = 20;
  }

  // lights per look
  if (look === 'clay') {
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(-4, 5, 4);
    shadowed(key);
    scene.add(key, new THREE.HemisphereLight('#ffffff', '#b9ae9c', 0.55));
  } else if (look === 'v1') {
    // hard, small key from top right → harsh hotspot on the upper twist
    const key = new THREE.SpotLight('#ffffff', 5200, 30, 0.16, 0.05, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.position.set(3.2, 6.5, 5.5);
    key.target.position.set(0, 0.9, 0);
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight('#b8c8ff', 0.35);
    fill.position.set(-5, 1, 2);
    scene.add(fill, new THREE.AmbientLight('#ffffff', 0.08));
  } else {
    RectAreaLightUniformsLib.init();
    const key = new THREE.RectAreaLight('#fff6ea', 7, 4.5, 6);
    key.position.set(-4.2, 2.6, 4.2);
    key.lookAt(0, 0, 0);
    const rim = new THREE.RectAreaLight('#ffd9b0', 3.2, 1.2, 5);
    rim.position.set(3.8, 1.2, -2.6);
    rim.lookAt(0, 0, 0);
    const bounce = new THREE.DirectionalLight('#ffe2c4', 0.35);
    bounce.position.set(2, -3, 3);
    const shade = new THREE.DirectionalLight('#fff6ea', 0.9);
    shade.position.set(-4.2, 2.6, 4.2);
    shadowed(shade);
    scene.add(key, rim, bounce, shade);
  }

  let w = 0;
  let h = 0;
  function setSize(width: number, height: number) {
    w = width;
    h = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // frames are 4:5; wider frames keep the same vertical framing
    camera.fov = FORM_CAMERA.fov * Math.max(1, 0.8 / camera.aspect);
    camera.updateProjectionMatrix();
  }

  function render(rotation = 0.35, tilt = 0) {
    pivot.rotation.y = rotation;
    pivot.rotation.x = tilt;
    renderer.render(scene, camera);
  }

  function dispose() {
    geo.dispose();
    material.dispose();
    env.dispose();
    pmrem.dispose();
    renderer.dispose();
  }

  return { renderer, setSize, render, dispose, get size() { return { w, h }; } };
}
