/**
 * The world around an object in the studio: light environments made in code (no downloads),
 * a mirror or water floor, a figure for scale, and a logo stuck onto the surface.
 */
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import type { EnvPreset } from '../ws/types';

/** an environment as a little scene: a gradient sky and a few glowing panels, baked by PMREM */
export function envScene(kind: Exclude<EnvPreset, 'room'>): THREE.Scene {
  const sc = new THREE.Scene();
  const skies: Record<typeof kind, [string, string, string]> = {
    sunset: ['#ff9a5a', '#f2c38b', '#2c2a3a'],
    overcast: ['#dfe3e6', '#c9cfd4', '#6c7176'],
    neon: ['#0b0820', '#1a1040', '#05040c'],
    night: ['#0d1626', '#1b2b44', '#04070c'],
  };
  const [horizon, top, ground] = skies[kind];
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(horizon) }, c: { value: new THREE.Color(ground) } },
      vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 a; uniform vec3 b; uniform vec3 c; varying vec3 p; void main(){ float y = p.y; vec3 col = y > 0.0 ? mix(b, a, pow(y, 0.6)) : mix(b, c, pow(-y, 0.4)); gl_FragColor = vec4(col, 1.0); }',
    })
  );
  sc.add(sky);
  const panel = (color: string, intensity: number, w: number, h: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    sc.add(m);
  };
  if (kind === 'sunset') panel('#ffb070', 6, 6, 2, [-8, 1.2, -6]);
  if (kind === 'overcast') panel('#ffffff', 2.2, 14, 6, [0, 10, 0]);
  if (kind === 'neon') {
    panel('#ff2bd6', 7, 1, 8, [-6, 1, 2]);
    panel('#29e1ff', 7, 1, 8, [6, 1, -2]);
    panel('#ffffff', 1.5, 6, 1, [0, 7, 0]);
  }
  if (kind === 'night') {
    panel('#ffd28a', 5, 0.8, 0.8, [-5, 4, 3]);
    panel('#9fc3ff', 2, 8, 0.5, [4, 0.2, -6]);
  }
  return sc;
}

/** a reflecting floor; water is a darker, teal-tinted mirror */
export function reflectorFloor(kind: 'mirror' | 'water', width: number, height: number) {
  const r = new Reflector(new THREE.CircleGeometry(3.2, 96), {
    clipBias: 0.003,
    textureWidth: Math.round(width * 0.6),
    textureHeight: Math.round(height * 0.6),
    color: kind === 'water' ? 0x3d7f86 : 0x9a9a9a,
  });
  return r;
}

/** a flat figure for scale: a standing person (175 cm) or a hand (19 cm), drawn as a soft silhouette */
export function scaleFigure(kind: 'hand' | 'person', heightUnits: number) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = kind === 'person' ? 768 : 384;
  const x = c.getContext('2d')!;
  x.fillStyle = '#2e333a';
  if (kind === 'person') {
    x.beginPath();
    x.arc(128, 70, 46, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.roundRect(68, 126, 120, 330, 52);
    x.fill();
    x.beginPath();
    x.roundRect(78, 420, 46, 340, 22);
    x.roundRect(132, 420, 46, 340, 22);
    x.fill();
    x.beginPath();
    x.roundRect(40, 140, 34, 280, 17);
    x.roundRect(182, 140, 34, 280, 17);
    x.fill();
  } else {
    x.beginPath();
    x.roundRect(58, 170, 150, 200, 60);
    x.fill();
    [[62, 60], [100, 20], [138, 30], [176, 70]].forEach(([fx, fy]) => {
      x.beginPath();
      x.roundRect(fx, fy, 30, 200, 15);
      x.fill();
    });
    x.save();
    x.translate(40, 240);
    x.rotate(-0.7);
    x.beginPath();
    x.roundRect(0, 0, 34, 120, 17);
    x.fill();
    x.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const w = (heightUnits * c.width) / c.height;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, heightUnits), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.88, depthWrite: false }));
  m.userData.width = w;
  return m;
}

/** a decal on the first surface met by a ray from outside, at `angle` (degrees) around and `y` (0–1) up the object */
export function makeDecal(root: THREE.Object3D, tex: THREE.Texture, opts: { size: number; angle: number; y: number }, height: number) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => (o as THREE.Mesh).isMesh && meshes.push(o as THREE.Mesh));
  if (!meshes.length) return null;
  root.updateMatrixWorld(true);
  const a = THREE.MathUtils.degToRad(opts.angle);
  const y = -height / 2 + opts.y * height;
  const from = new THREE.Vector3(Math.sin(a) * 4, y, Math.cos(a) * 4);
  const ray = new THREE.Raycaster(from, new THREE.Vector3(0, y, 0).sub(from).normalize());
  const hit = ray.intersectObjects(meshes, false)[0];
  if (!hit || !hit.face) return null;
  const mesh = hit.object as THREE.Mesh;
  const n = hit.face.normal.clone().transformDirection(mesh.matrixWorld);
  const helper = new THREE.Object3D();
  helper.position.copy(hit.point);
  helper.lookAt(hit.point.clone().add(n));
  const s = opts.size * height;
  const img = tex.image as { width?: number; height?: number } | undefined;
  const ratio = img?.width && img?.height ? img.height / img.width : 1;
  const geo = new DecalGeometry(mesh, hit.point, helper.rotation, new THREE.Vector3(s, s * ratio, s));
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.6, side: THREE.DoubleSide });
  return new THREE.Mesh(geo, mat);
}
