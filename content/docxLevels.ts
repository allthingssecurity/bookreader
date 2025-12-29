import { Level } from '../types';

// Thin proxy that reuses the parent's docx parser so both apps stay in sync
export const loadDocxLevels = async (): Promise<Level[]> => {
  try {
    const mod = await import('../../content/docxLevels');
    return (mod as any).loadDocxLevels();
  } catch (e) {
    console.warn('Fallback: docxLevels not found at ../../content/docxLevels. Returning empty list.');
    return [];
  }
};

