export interface BookPage {
  pageNumber: number;
  title?: string;
  content: string[]; // Array of paragraphs
  type: 'text' | 'image' | 'chapter-title';
  imageUrl?: string;
  imageCaption?: string;
}

export interface BookContent {
  title: string;
  author: string;
  pages: BookPage[];
}

export interface GestureState {
  active: boolean;
  deltaX: number; // Cumulative movement in current gesture
  velocity: number;
  direction: 'left' | 'right' | 'none';
}

export enum AppState {
  INIT = 'INIT',
  LOADING_CONTENT = 'LOADING_CONTENT',
  READY = 'READY',
  ERROR = 'ERROR'
}