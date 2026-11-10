/**
 * Beats of a track, in the browser: an onset envelope (rises in short-time energy), its tempo by
 * autocorrelation between 70 and 180 BPM, then a beat grid placed where the onsets line up best.
 * Good enough to cut a story on the music; not a DJ tool.
 */
export async function findBeats(file: Blob): Promise<{ bpm: number; beats: number[]; duration: number }> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AC();
  let buf: AudioBuffer;
  try {
    buf = await ac.decodeAudioData(await file.arrayBuffer());
  } finally {
    ac.close();
  }
  const sr = buf.sampleRate;
  const data = buf.getChannelData(0);
  const hop = 512;
  const n = Math.floor(data.length / hop);
  // energy per hop, then the positive change: where a hit starts
  const energy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * hop; j < (i + 1) * hop; j++) s += data[j] * data[j];
    energy[i] = Math.sqrt(s / hop);
  }
  const onset = new Float32Array(n);
  for (let i = 1; i < n; i++) onset[i] = Math.max(0, energy[i] - energy[i - 1]);
  // tempo: the lag where the onset curve repeats itself most strongly
  const fps = sr / hop;
  const minLag = Math.round((60 / 180) * fps);
  const maxLag = Math.round((60 / 70) * fps);
  let best = minLag;
  let bestScore = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = lag; i < n; i++) s += onset[i] * onset[i - lag];
    if (s > bestScore) {
      bestScore = s;
      best = lag;
    }
  }
  const period = best / fps;
  // phase: shift the grid to sit on the strongest onsets
  let phase = 0;
  let phaseScore = -1;
  for (let k = 0; k < best; k++) {
    let s = 0;
    for (let i = k; i < n; i += best) s += onset[i];
    if (s > phaseScore) {
      phaseScore = s;
      phase = k;
    }
  }
  const beats: number[] = [];
  for (let tt = phase / fps; tt < buf.duration; tt += period) beats.push(Math.round(tt * 1000) / 1000);
  return { bpm: Math.round(60 / period), beats, duration: buf.duration };
}

/** durations that end every frame on a beat: `every` beats per frame, starting on the first beat */
export function fitToBeats(frames: number, beats: number[], every: number): number[] {
  const out: number[] = [];
  const start = beats[0] ?? 0;
  // past the end of the track the grid carries on at the same tempo
  const period = beats.length > 1 ? (beats[beats.length - 1] - beats[0]) / (beats.length - 1) : 0.5;
  const beatAt = (k: number) => beats[k] ?? start + k * period;
  let prev = start;
  for (let i = 0; i < frames; i++) {
    const end = beatAt((i + 1) * every);
    out.push(Math.max(0.25, Math.round((end - prev) * 1000) / 1000));
    prev = end;
  }
  // the first frame also covers the lead-in before the first beat
  if (out.length) out[0] = Math.round((out[0] + start) * 1000) / 1000;
  return out;
}
