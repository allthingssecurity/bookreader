export const COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#3b82f6', // blue-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
];

export const BALLOON_BASE_SPEED = {
  chill: 0.25,
  easy: 0.4,
  medium: 0.8,
  hard: 1.2
} as const;

export const SPAWN_RATE = {
  chill: 2200,
  easy: 1800,
  medium: 1300,
  hard: 900
} as const;

// Hand tracking constants
export const PINCH_THRESHOLD = 0.05; // Normalized distance
export const PINCH_COOLDOWN = 300; // ms

// Visuals
export const MAX_PARTICLES = 50;
export const CLOUD_COUNT = 5;
