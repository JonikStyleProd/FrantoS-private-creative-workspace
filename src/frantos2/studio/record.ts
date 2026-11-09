/**
 * Record a canvas to a video file in the browser (MediaRecorder), or to a GIF frame by frame.
 * MP4 where the browser can write it (Chrome 126+, Safari), WebM otherwise.
 */
export function videoFormat() {
  const types = ['video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  const type = typeof MediaRecorder !== 'undefined' ? types.find((x) => MediaRecorder.isTypeSupported(x)) : undefined;
  return type ? { type, ext: type.startsWith('video/mp4') ? 'mp4' : 'webm' } : null;
}

export const canRecord = () => !!videoFormat() && typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype;

import type { MotionTitle as Title } from '../ws/types';
export type { Title };

/** Draw titles onto a 2D context the size of the frame, with a short fade in and out. */
export function drawTitles(x: CanvasRenderingContext2D, titles: Title[], f: number, w: number, h: number, font: string) {
  for (const tl of titles) {
    if (f < tl.from || f > tl.to || !tl.text.trim()) continue;
    const span = Math.max(0.001, tl.to - tl.from);
    const local = (f - tl.from) / span;
    const a = Math.min(1, local / 0.12, (1 - local) / 0.12);
    const size = Math.round(h * tl.size);
    x.save();
    x.globalAlpha = Math.max(0, a);
    x.font = `800 ${size}px ${font}`;
    x.fillStyle = tl.color;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.shadowColor = 'rgba(0,0,0,.25)';
    x.shadowBlur = size * 0.3;
    const y = tl.pos === 'top' ? h * 0.14 : tl.pos === 'bottom' ? h * 0.84 : h * 0.5;
    const lines = tl.text.split('\n');
    lines.forEach((line, i) => x.fillText(line, w / 2, y + (i - (lines.length - 1) / 2) * size * 1.1 + (1 - a) * size * 0.25));
    x.restore();
  }
}

/**
 * Records `canvas` for `seconds`. `drive(f)` is called every animation frame with the elapsed
 * fraction 0..1 so the caller can move the camera; it must draw the frame itself.
 * With `overlay` the frames go through a 2D canvas first (titles); with `audio` the sound is mixed in.
 */
export async function recordCanvas(
  canvas: HTMLCanvasElement,
  seconds: number,
  drive: (f: number) => void,
  signal?: AbortSignal,
  onProgress?: (f: number) => void,
  extra: { overlay?: (x: CanvasRenderingContext2D, f: number, w: number, h: number) => void; background?: string; audio?: { url: string; offset?: number } } = {}
): Promise<{ blob: Blob; ext: string }> {
  const fmt = videoFormat();
  if (!fmt) throw new Error('recording not supported');
  // what gets recorded: the WebGL canvas itself, or a 2D copy with titles on top
  let source: HTMLCanvasElement = canvas;
  let comp: CanvasRenderingContext2D | null = null;
  if (extra.overlay) {
    source = document.createElement('canvas');
    source.width = canvas.width;
    source.height = canvas.height;
    comp = source.getContext('2d')!;
  }
  // push frames explicitly: every drawn frame lands in the file, whatever the compositor does
  const stream = source.captureStream(0);
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
  const manual = typeof track.requestFrame === 'function';
  const live = manual ? stream : source.captureStream(30);
  // sound: an <audio> element routed into the recording
  let audioEl: HTMLAudioElement | null = null;
  let actx: AudioContext | null = null;
  if (extra.audio) {
    audioEl = new Audio(extra.audio.url);
    audioEl.crossOrigin = 'anonymous';
    actx = new AudioContext();
    const src = actx.createMediaElementSource(audioEl);
    const dest = actx.createMediaStreamDestination();
    src.connect(dest);
    dest.stream.getAudioTracks().forEach((tr) => live.addTrack(tr));
    audioEl.currentTime = extra.audio.offset ?? 0;
  }
  const rec = new MediaRecorder(live, { mimeType: fmt.type, videoBitsPerSecond: 10_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((res) => (rec.onstop = () => res()));
  rec.start(250);
  await audioEl?.play().catch(() => undefined);
  const t0 = performance.now();
  await new Promise<void>((res) => {
    const tick = () => {
      if (signal?.aborted) return res();
      const f = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      drive(f);
      if (comp) {
        comp.clearRect(0, 0, source.width, source.height);
        if (extra.background) {
          comp.fillStyle = extra.background;
          comp.fillRect(0, 0, source.width, source.height);
        }
        comp.drawImage(canvas, 0, 0);
        extra.overlay!(comp, f, source.width, source.height);
      }
      if (manual) track.requestFrame!();
      onProgress?.(f);
      if (f >= 1) return res();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  audioEl?.pause();
  stream.getTracks().forEach((tr) => tr.stop());
  live.getTracks().forEach((tr) => tr.stop());
  await done;
  actx?.close();
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
  return { blob: new Blob(chunks, { type: fmt.type.split(';')[0] }), ext: fmt.ext };
}

/**
 * A looping GIF, frame by frame: every frame is drawn and encoded, so the motion is exact
 * however slow the device is. Kept small (width ≤ 600, ≤ 15 fps) so the file stays shareable.
 */
export async function recordGif(canvas: HTMLCanvasElement, seconds: number, drive: (f: number) => void, opts: { width?: number; fps?: number; signal?: AbortSignal; onProgress?: (f: number) => void; overlay?: (x: CanvasRenderingContext2D, f: number, w: number, h: number) => void; background?: string } = {}): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const fps = opts.fps ?? 15;
  const w = Math.min(opts.width ?? 480, canvas.width);
  const h = Math.round((w * canvas.height) / canvas.width);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  const enc = GIFEncoder();
  const n = Math.max(2, Math.round(seconds * fps));
  for (let i = 0; i < n; i++) {
    if (opts.signal?.aborted) throw new DOMException('aborted', 'AbortError');
    const f = i / n;
    drive(f);
    x.fillStyle = opts.background ?? '#1b1d21';
    x.fillRect(0, 0, w, h);
    x.drawImage(canvas, 0, 0, w, h);
    opts.overlay?.(x, f, w, h);
    const { data } = x.getImageData(0, 0, w, h);
    const palette = quantize(data, 256);
    enc.writeFrame(applyPalette(data, palette), w, h, { palette, delay: Math.round(1000 / fps) });
    opts.onProgress?.(f);
    // let the page breathe between frames
    if (i % 3 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  enc.finish();
  return new Blob([new Uint8Array(enc.bytes())], { type: 'image/gif' });
}
