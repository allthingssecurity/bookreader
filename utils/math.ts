import { Point } from '../types';

export const lerp = (start: number, end: number, factor: number): number => {
  return start + (end - start) * factor;
};

export const distance = (p1: Point, p2: Point): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const clamp = (val: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, val));
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};
