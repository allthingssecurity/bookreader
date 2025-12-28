export interface Point {
  x: number;
  y: number;
}

export interface Balloon {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  wobbleOffset: number;
  wobbleSpeed: number;
  isPopped: boolean;
  scoreValue: number;
  hp?: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface GameSettings {
  sensitivity: number;
  smoothing: number; // 0.1 to 0.9
  spawnRate: number; // ms between spawns
  difficulty: 'chill' | 'easy' | 'medium' | 'hard';
  soundEnabled: boolean;
  useMouseFallback: boolean;
  mode?: 'classic' | 'themed';
  challenge?: 'standard' | 'slingshot';
  role?: 'architect' | 'developer' | 'manager';
  inputMode?: 'hands' | 'eyes' | 'mouse';
  blinkToFire?: boolean;
  bookRequirePinch?: boolean;
  bookFlipMode?: 'hand' | 'swipe' | 'orientation';
}

export interface CalibrationData {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export enum GameState {
  MENU,
  CALIBRATION,
  PLAYING,
  QUIZ,
  LEVEL_INTRO,
  SUMMARY,
  GAME_OVER
}

export interface QuizQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
}

export interface Level {
  id: string;
  title: string;
  content: string | string[];
  questions: QuizQuestion[];
  tips?: string[];
}
