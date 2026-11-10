import { useSyncExternalStore } from 'react';

/**
 * Graphics quality. When the browser renders without a GPU (Chrome with hardware acceleration off,
 * a missing driver: "Microsoft Basic Render Driver", SwiftShader, llvmpipe) every blur and every 3D
 * frame is drawn by the processor. Then FrantoS switches to "lite": no backdrop blur, no blurred
 * backdrops, simpler 3D. The choice can be forced in Settings.
 */
export type Quality = 'auto' | 'full' | 'lite';
const KEY = 'frantos-quality';
const ls = new Set<() => void>();

export interface GpuInfo {
  renderer: string;
  software: boolean;
}

let gpu: GpuInfo | null = null;
export function gpuInfo(): GpuInfo {
  if (gpu) return gpu;
  let renderer = 'unknown';
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) renderer = 'no-webgl';
    else {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    renderer = 'unknown';
  }
  gpu = { renderer, software: /swiftshader|basic render|llvmpipe|softpipe|software|warp|no-webgl/i.test(renderer) };
  return gpu;
}

let pref: Quality = 'auto';
try {
  const s = localStorage.getItem(KEY);
  if (s === 'full' || s === 'lite') pref = s;
} catch {
  /* private mode */
}

export const isLite = () => pref === 'lite' || (pref === 'auto' && gpuInfo().software);

function apply() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.gfx = isLite() ? 'lite' : 'full';
}
if (typeof window !== 'undefined') apply();

export function setQuality(q: Quality) {
  pref = q;
  try {
    localStorage.setItem(KEY, q);
  } catch {
    /* private mode */
  }
  apply();
  ls.forEach((f) => f());
}

export function useQuality() {
  const lite = useSyncExternalStore(
    (f) => (ls.add(f), () => ls.delete(f)),
    () => isLite(),
    () => false
  );
  return { lite, pref, gpu: typeof window === 'undefined' ? null : gpuInfo(), setQuality };
}

/** A phone or tablet: focusing an input there pops the keyboard over the dialog, so focus only on tap. */
export const touchFirst = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches;
