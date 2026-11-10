/** Easing curves a motion designer reaches for, each with a live preview and ready to copy as CSS or code. */
export const CURVES: { id: string; label: string; v: [number, number, number, number]; use: string }[] = [
  { id: 'standard', label: 'Standard', v: [0.2, 0, 0, 1], use: 'Most UI movement' },
  { id: 'emphasized', label: 'Emphasized', v: [0.05, 0.7, 0.1, 1], use: 'Big entrances' },
  { id: 'decelerate', label: 'Decelerate', v: [0, 0, 0, 1], use: 'Things arriving on screen' },
  { id: 'accelerate', label: 'Accelerate', v: [0.3, 0, 1, 1], use: 'Things leaving the screen' },
  { id: 'frantos', label: 'FrantoS glide', v: [0.22, 1, 0.36, 1], use: 'Soft, confident arrivals' },
  { id: 'expo-out', label: 'Expo out', v: [0.16, 1, 0.3, 1], use: 'Fast start, long settle' },
  { id: 'quart-in-out', label: 'Quart in-out', v: [0.76, 0, 0.24, 1], use: 'Camera moves, slides' },
  { id: 'back-out', label: 'Back out', v: [0.34, 1.56, 0.64, 1], use: 'A small overshoot, playful' },
  { id: 'anticipate', label: 'Anticipate', v: [0.36, 0, 0.66, -0.56], use: 'A wind-up before the move' },
  { id: 'linear', label: 'Linear', v: [0, 0, 1, 1], use: 'Loops, progress, rotation' },
];
