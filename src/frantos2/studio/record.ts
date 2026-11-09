/**
 * Record a canvas to a video file in the browser (MediaRecorder).
 * MP4 where the browser can write it (Chrome 126+, Safari), WebM otherwise.
 */
export function videoFormat() {
  const types = ['video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  const type = typeof MediaRecorder !== 'undefined' ? types.find((x) => MediaRecorder.isTypeSupported(x)) : undefined;
  return type ? { type, ext: type.startsWith('video/mp4') ? 'mp4' : 'webm' } : null;
}

export const canRecord = () => !!videoFormat() && typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype;

/**
 * Records `canvas` for `seconds`. `drive(t)` is called every animation frame with the
 * elapsed fraction 0..1 so the caller can move the camera; it must draw the frame itself.
 */
export async function recordCanvas(canvas: HTMLCanvasElement, seconds: number, drive: (f: number) => void, signal?: AbortSignal, onProgress?: (f: number) => void): Promise<{ blob: Blob; ext: string }> {
  const fmt = videoFormat();
  if (!fmt) throw new Error('recording not supported');
  // push frames explicitly: every drawn frame lands in the file, whatever the compositor does
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
  const manual = typeof track.requestFrame === 'function';
  const live = manual ? stream : canvas.captureStream(30);
  const rec = new MediaRecorder(live, { mimeType: fmt.type, videoBitsPerSecond: 10_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((res) => (rec.onstop = () => res()));
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>((res) => {
    const tick = () => {
      if (signal?.aborted) return res();
      const f = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      drive(f);
      if (manual) track.requestFrame!();
      onProgress?.(f);
      if (f >= 1) return res();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  stream.getTracks().forEach((tr) => tr.stop());
  live.getTracks().forEach((tr) => tr.stop());
  await done;
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
  return { blob: new Blob(chunks, { type: fmt.type.split(';')[0] }), ext: fmt.ext };
}
