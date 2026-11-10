/**
 * FORM / 01 vessel — procedural geometry and the two-zone material
 * (stone at the base, glaze toward the lip) that the studio edits live.
 */
import * as THREE from 'three';
import type { MaterialVariant } from '../ws/types';

export interface VesselShape {
  twist: number; // fraction of π over the height
  height: number; // height / width
  waist: number; // how much the middle pulls in
}

/** superellipse radius for a rounded square */
const sq = (u: number, n = 3.6) => Math.pow(Math.pow(Math.abs(Math.cos(u)), n) + Math.pow(Math.abs(Math.sin(u)), n), -1 / n);

/**
 * One closed profile swept around the axis: bottom centre → outer wall → rounded rim → inner wall → inner floor.
 * Each profile point carries (radius scale, y, outside?) — `outside` decides whether the stone/glaze gradient applies.
 */
function profile(shape: VesselShape, H: number) {
  const pts: { s: number; y: number; out: boolean }[] = [];
  const R = 0.5;
  const t = 0.045; // wall
  const outerR = (v: number) => {
    // body: a slight belly low down, a soft pinch, a little flare at the lip
    const belly = 0.05 * Math.sin(Math.PI * Math.min(1, v * 1.35));
    const pinch = -shape.waist * Math.pow(Math.sin(Math.PI * v), 2) * 0.6;
    const flare = 0.03 * Math.pow(v, 6);
    return R * (0.96 + belly + pinch + flare);
  };
  // floor, from the centre out, with a rounded foot
  const foot = 0.06;
  for (let k = 0; k <= 6; k++) pts.push({ s: (outerR(0) - foot) * (k / 6), y: 0, out: true });
  for (let k = 1; k <= 8; k++) {
    const a = (k / 8) * (Math.PI / 2);
    pts.push({ s: outerR(0) - foot + Math.sin(a) * foot, y: foot - Math.cos(a) * foot, out: true });
  }
  // outer wall
  const N = 90;
  for (let k = 1; k <= N; k++) {
    const v = k / N;
    const y = foot + v * (H - foot - t);
    pts.push({ s: outerR(y / H), y, out: true });
  }
  // rounded rim
  const top = H - t;
  const rimR = outerR(1);
  for (let k = 1; k <= 10; k++) {
    const a = (k / 10) * Math.PI;
    pts.push({ s: rimR - t + Math.cos(a) * t, y: top + Math.sin(a) * t, out: k < 5 });
  }
  // inner wall down to the inner floor
  const floor = H * 0.14;
  for (let k = 1; k <= 60; k++) {
    const v = 1 - k / 60;
    const y = floor + v * (top - floor);
    pts.push({ s: Math.max(0.02, outerR(y / H) - 2 * t), y, out: false });
  }
  for (let k = 1; k <= 8; k++) pts.push({ s: (outerR(floor / H) - 2 * t) * (1 - k / 8), y: floor, out: false });
  return pts;
}

export function buildVessel(shape: VesselShape, seg = 160) {
  const H = shape.height;
  const prof = profile(shape, H);
  const twist = shape.twist * Math.PI;
  const row = seg + 1;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j < prof.length; j++) {
    const { s, y, out } = prof[j];
    const ang = twist * (y / H) - twist / 2;
    for (let i = 0; i <= seg; i++) {
      const u = (i / seg) * Math.PI * 2;
      const r = sq(u) * s;
      const lx = r * Math.cos(u);
      const lz = r * Math.sin(u);
      pos.push(lx * Math.cos(ang) - lz * Math.sin(ang), y - H / 2, lx * Math.sin(ang) + lz * Math.cos(ang));
      // outside: the gradient follows height; inside is all glaze
      uv.push(i / seg, out ? y / H : 1);
    }
  }
  for (let j = 0; j < prof.length - 1; j++)
    for (let i = 0; i < seg; i++) {
      const a = j * row + i;
      const b = a + row;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let j = 0; j < prof.length; j++) {
    const a = j * row;
    const b = a + seg;
    const nx = (nrm.getX(a) + nrm.getX(b)) / 2;
    const ny = (nrm.getY(a) + nrm.getY(b)) / 2;
    const nz = (nrm.getZ(a) + nrm.getZ(b)) / 2;
    const l = Math.hypot(nx, ny, nz) || 1;
    nrm.setXYZ(a, nx / l, ny / l, nz / l);
    nrm.setXYZ(b, nx / l, ny / l, nz / l);
  }
  return g;
}

/* ───────── material: painted once per variant into canvases ───────── */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const hex = (c: string) => new THREE.Color(c);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-6)));
  return t * t * (3 - 2 * t);
};

const W = 1024;
const Hh = 512;

/** Pores and banding of travertine, shared by every variant (drawn once). */
let pores: HTMLCanvasElement | null = null;
function poreLayer() {
  if (pores) return pores;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = Hh;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff';
  x.fillRect(0, 0, W, Hh);
  const r = rng(7);
  // horizontal banding
  for (let y = 0; y < Hh; y += 2) {
    const v = 0.9 + 0.1 * Math.sin(y * 0.09 + Math.sin(y * 0.013) * 4) + (r() - 0.5) * 0.04;
    x.fillStyle = `rgba(0,0,0,${(1 - v).toFixed(3)})`;
    x.fillRect(0, y, W, 2);
  }
  // elongated pores
  for (let k = 0; k < 1500; k++) {
    const px = r() * W;
    const py = r() * Hh;
    const len = 1.5 + Math.pow(r(), 4) * 22;
    const h = 0.5 + r() * 1.1;
    x.fillStyle = `rgba(60,40,20,${0.25 + r() * 0.45})`;
    x.beginPath();
    x.ellipse(px, py, len, h, 0, 0, Math.PI * 2);
    x.fill();
  }
  pores = c;
  return c;
}

export interface PaintedMaps {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  clearcoatMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

const make = () => {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = Hh;
  return c;
};

/** Paint colour, roughness, clearcoat and bump for a variant into the given canvases. v = 0 at the foot, 1 at the lip. */
function paintInto(col: HTMLCanvasElement, rough: HTMLCanvasElement, coat: HTMLCanvasElement, bump: HTMLCanvasElement, v: MaterialVariant) {
  const cx = col.getContext('2d')!;
  const rx = rough.getContext('2d')!;
  const kx = coat.getContext('2d')!;
  const bx = bump.getContext('2d')!;
  const base = hex(v.baseColor);
  const top = hex(v.topColor);
  const stone = v.base === 'travertine';
  const lo = v.blend - v.softness / 2;
  const hi = v.blend + v.softness / 2;
  // canvas y = 0 is the top of the texture; with flipY the top maps to v = 1 (the lip)
  for (let y = 0; y < Hh; y++) {
    const vv = 1 - y / (Hh - 1);
    const wTop = v.blend >= 1 ? 0 : smooth(lo, hi, vv);
    const pool = 1 - 0.12 * smooth(0.85, 1, vv); // glaze runs darker near the rim
    const c = base.clone().lerp(top.clone().multiplyScalar(pool), wTop);
    cx.fillStyle = `#${c.getHexString()}`;
    cx.fillRect(0, y, W, 1);
    const baseRough = stone ? 0.88 : v.base === 'clay' ? 0.9 : v.roughness;
    const rv = Math.round((baseRough + (v.roughness - baseRough) * wTop) * 255);
    rx.fillStyle = `rgb(0,${rv},0)`;
    rx.fillRect(0, y, W, 1);
    const k = Math.round((v.base === 'glaze' ? v.gloss : v.gloss * wTop) * 255);
    kx.fillStyle = `rgb(${k},${k},${k})`;
    kx.fillRect(0, y, W, 1);
  }
  bx.globalCompositeOperation = 'source-over';
  bx.fillStyle = '#fff';
  bx.fillRect(0, 0, W, Hh);
  if (stone) {
    // pores only where the stone shows: fade them out under the glaze
    const mask = make();
    const mx = mask.getContext('2d')!;
    mx.drawImage(poreLayer(), 0, 0);
    mx.globalCompositeOperation = 'destination-in';
    const g = mx.createLinearGradient(0, 0, 0, Hh);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(Math.max(0, Math.min(1, 1 - hi)), 'rgba(0,0,0,0)');
    g.addColorStop(Math.max(0, Math.min(1, 1 - lo)), 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    mx.fillStyle = g;
    mx.fillRect(0, 0, W, Hh);
    cx.globalCompositeOperation = 'multiply';
    cx.globalAlpha = 0.42;
    cx.drawImage(mask, 0, 0);
    cx.globalAlpha = 1;
    cx.globalCompositeOperation = 'source-over';
    bx.drawImage(mask, 0, 0);
  } else if (v.base === 'clay') {
    const r = rng(3);
    for (let k = 0; k < 4000; k++) {
      cx.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
      cx.fillRect(r() * W, r() * Hh, 1.5, 1.5);
    }
  }
}

/**
 * One material for the vessel, repainted in place. Swapping variants or moving a slider
 * only re-uploads four textures: the shader is compiled once, never again.
 */
export class VesselMaterial {
  readonly material: THREE.MeshPhysicalMaterial;
  private canvases = [make(), make(), make(), make()] as const;
  private maps: PaintedMaps;
  constructor(v: MaterialVariant, private lite = false) {
    const tex = (c: HTMLCanvasElement, srgb = false) => {
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.anisotropy = 4;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const [a, b, c, d] = this.canvases;
    this.maps = { map: tex(a, true), roughnessMap: tex(b), clearcoatMap: tex(c), bumpMap: tex(d) };
    this.material = new THREE.MeshPhysicalMaterial({
      ...this.maps,
      roughness: 1,
      metalness: 0,
      // lite: no clearcoat layer and no bump, the two most expensive parts of the shader
      clearcoat: lite ? 0 : 1,
      bumpScale: 0.35,
      envMapIntensity: 0.6,
      side: THREE.DoubleSide,
    });
    if (lite) {
      this.material.bumpMap = null;
      this.material.clearcoatMap = null;
    }
    this.update(v);
  }
  private photoSrc: string | null = null;
  update(v: MaterialVariant) {
    const [a, b, c, d] = this.canvases;
    paintInto(a, b, c, d, v);
    // material from a photo: the crop tiled twice around and once up, over the painted colour
    const src = v.finish === 'photo' && v.photo ? v.photo : null;
    this.photoSrc = src;
    if (src) {
      const img = new Image();
      img.onload = () => {
        if (this.photoSrc !== src) return;
        const x = a.getContext('2d')!;
        const tw = a.width / 2;
        for (let i = 0; i < 2; i++) x.drawImage(img, i * tw, 0, tw, a.height);
        this.maps.map.needsUpdate = true;
      };
      img.src = src;
    }
    this.material.clearcoatRoughness = Math.max(0.03, v.roughness * 0.7);
    for (const t of Object.values(this.maps)) t.needsUpdate = true;
  }
  dispose() {
    for (const t of Object.values(this.maps)) t.dispose();
    this.material.dispose();
  }
}
