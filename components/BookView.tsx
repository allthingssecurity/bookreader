import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Level, Point } from '../types';
import { BookContent, BookPage } from '../karma---the-living-book/types';
import { Book3D } from '../karma---the-living-book/components/Book3D';
import { loadDocxLevels } from '../content/docxLevels';

interface BookViewProps {
  levels?: Level[];
  pointer: Point;
  isPinching: boolean;
  onChapterQuiz?: (chapterIndex: number) => void;
  bookTitle?: string;
}

// Build a minimal book from levels: each chapter -> 2 pages (title + content)
const buildBook = (levels: Level[], bookTitle?: string): { book: BookContent; pagesPerChapter: number } => {
  const pages: BookPage[] = [];
  let pageNo = 1;

  levels.forEach((lvl) => {
    pages.push({ pageNumber: pageNo++, title: lvl.title, content: [], type: 'chapter-title' });

    // Check if content is already an array or a string
    const isHtml = lvl.content && !Array.isArray(lvl.content) && lvl.content.trim().startsWith('<');

    if (isHtml) {
      // For HTML content, wrap it in an array so Book3D can render it
      pages.push({
        pageNumber: pageNo++,
        title: lvl.title,
        content: [lvl.content as string], // Wrap HTML string in array
        type: 'text'
      });
    } else {
      // Check if content is already an array or a string
      let paras: string[];
      if (Array.isArray(lvl.content)) {
        // Add bullets to points if they don't have them
        paras = lvl.content.filter(Boolean).map(p =>
          (p.startsWith('•') || p.startsWith('-') || p.match(/^\d+\./)) ? p : `• ${p}`
        );
      } else {
        // For plain text, split by double line breaks
        paras = lvl.content.split(/\n\n/).map(s => s.trim()).filter(Boolean);
      }

      // Split long paragraphs into smaller chunks that fit on one page
      const finalParas: string[] = [];
      const maxCharsPerPage = 600; // Safe limit to fit on one page

      paras.forEach(para => {
        if (para.length <= maxCharsPerPage) {
          finalParas.push(para);
        } else {
          // Split by sentences
          const sentences = para.split(/(?<=[.!?])\s+/);
          let chunk = '';
          sentences.forEach(sentence => {
            if ((chunk + sentence).length <= maxCharsPerPage) {
              chunk += (chunk ? ' ' : '') + sentence;
            } else {
              if (chunk) finalParas.push(chunk);
              chunk = sentence;
            }
          });
          if (chunk) finalParas.push(chunk);
        }
      });

      // ONE CHUNK PER PAGE
      console.log(`📄 Chapter "${lvl.title}": ${finalParas.length} pages (split from ${paras.length} paragraphs)`);

      // Group paragraphs that fit on one page
      let currentPageContent: string[] = [];
      let currentLength = 0;

      finalParas.forEach((para) => {
        // If adding this paragraph would exceed the limit, push current page and start new one
        if (currentPageContent.length > 0 && currentLength + para.length > maxCharsPerPage) {
          pages.push({
            pageNumber: pageNo++,
            title: lvl.title,
            content: currentPageContent,
            type: 'text'
          });
          currentPageContent = [];
          currentLength = 0;
        }

        currentPageContent.push(para);
        currentLength += para.length;
      });

      // Push the last page if any content remains
      if (currentPageContent.length > 0) {
        pages.push({
          pageNumber: pageNo++,
          title: lvl.title,
          content: currentPageContent,
          type: 'text'
        });
      }
    }
  });
  const book: BookContent = { title: bookTitle || 'North Star – Living Book', author: bookTitle ? 'Your Document' : 'SAP', pages };
  console.log(`📚 Book created with ${pages.length} total pages`);
  return { book, pagesPerChapter: 0 }; // variable per chapter now
};

const BookView: React.FC<BookViewProps> = ({ levels: providedLevels, pointer, isPinching, onChapterQuiz, bookTitle }) => {
  const [levels, setLevels] = useState<Level[]>([]);

  useEffect(() => {
    if (providedLevels) {
      setLevels(providedLevels);
    } else {
      // Load default levels from DOCX
      loadDocxLevels().then(setLevels);
    }
  }, [providedLevels]);

  const { book } = useMemo(() => {
    if (levels.length === 0) {
      return { book: { title: 'Loading...', author: '', pages: [] } };
    }
    return buildBook(levels, bookTitle);
  }, [levels, bookTitle]);

  const [currentPage, setCurrentPage] = useState(0);
  const prevPageRef = useRef(0);
  // Simulated gesture signal for Book3D
  const [gesture, setGesture] = useState<{ value: number; id: number }>({ value: 0, id: 0 });
  const [active, setActive] = useState(false);
  const [detectedSide, setDetectedSide] = useState<'left' | 'right' | null>(null);

  // Flip controller: supports 'swipe' and 'orientation' modes
  const cooldownRef = useRef(0);
  const prevOrientRef = useRef<'front' | 'back' | 'neutral'>('neutral');
  const swipeStateRef = useRef<{ startX: number | null, lastX: number, active: boolean }>({ startX: null, lastX: 0, active: false });
  const holdStartRef = useRef<number | null>(null);
  const latchedRef = useRef(false);
  const triggerFlip = (dir: 'next' | 'prev') => {
    console.log(`📖 Triggering flip: ${dir}, current page: ${currentPage}/${book.pages.length - 1}`);
    setGesture(g => ({ value: dir === 'next' ? -190 : 190, id: g.id + 1 }));
    setActive(true);
    window.setTimeout(() => setActive(false), 120);
  };

  useEffect(() => {
    let raf: number;
    // Side stabilizer: majority over recent frames
    const sideWindow: Array<{ t: number, s: 'left' | 'right' | null }> = [];
    const windowMs = 500;
    const holdMs = 700; // required steady hold before flip

    const loop = () => {
      const now = performance.now();
      const flipMode = ((window as any).__BOOK_FLIP_MODE || 'hand') as 'hand' | 'swipe' | 'orientation';
      if (flipMode === 'orientation') {
        const orient = ((window as any).__HAND_ORIENT || 'neutral') as 'front' | 'back' | 'neutral';
        const fist = !!(window as any).__HAND_FIST;
        if (now >= cooldownRef.current) {
          if (prevOrientRef.current === 'neutral' && orient === 'front' && fist) { triggerFlip('next'); cooldownRef.current = now + 500; }
          else if (prevOrientRef.current === 'neutral' && orient === 'back' && fist) { triggerFlip('prev'); cooldownRef.current = now + 500; }
        }
        if (!fist) prevOrientRef.current = 'neutral'; else prevOrientRef.current = orient;
      } else if (flipMode === 'swipe') {
        // swipe mode: detect horizontal sweep based on pointer.x
        const x = pointer.x;
        const side = (window as any).__HAND_SIDE as ('left' | 'right' | null);
        const state = swipeStateRef.current;
        if (!state.active) {
          state.startX = x; state.lastX = x; state.active = true;
        } else {
          const dx = x - (state.startX || x);
          state.lastX = x;
          if (now >= cooldownRef.current && side) {
            if (side === 'right' && dx > 120) { triggerFlip('next'); cooldownRef.current = now + 500; state.active = false; }
            else if (side === 'left' && dx < -120) { triggerFlip('prev'); cooldownRef.current = now + 500; state.active = false; }
          }
        }
      } else {
        // hand mode: SIMPLIFIED - just use raw hand side directly
        const rawSide = (window as any).__HAND_SIDE as ('left' | 'right' | null);

        // Log occasionally
        if (Math.random() < 0.016) {
          console.log(`👋 Hand tracking: raw=${rawSide}`);
        }

        setDetectedSide(rawSide);

        if (!rawSide) {
          holdStartRef.current = null;
          latchedRef.current = false;
        } else {
          if (!holdStartRef.current) {
            holdStartRef.current = now;
            console.log(`👋 Started hold timer for ${rawSide}`);
          }
          const held = now - holdStartRef.current;
          const cooldownRemaining = Math.max(0, cooldownRef.current - now);

          if (Math.random() < 0.05) { // Log occasionally
            console.log(`⏱️ Hold progress: ${Math.round(held)}ms / 200ms, cooldown: ${Math.round(cooldownRemaining)}ms, latched: ${latchedRef.current}`);
          }

          if (!latchedRef.current && held >= 200 && now >= cooldownRef.current) {
            // Mapping: LEFT hand = forward, RIGHT hand = back (reversed because camera mirrors)
            console.log(`✋ Hand gesture detected: ${rawSide} (held ${Math.round(held)}ms) - Triggering flip`);

            // Use triggerFlip to get animation and sound, just like keyboard
            if (rawSide === 'left') {
              triggerFlip('next');
            } else {
              triggerFlip('prev');
            }

            latchedRef.current = true;
            cooldownRef.current = now + 1000;
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    (window as any).__BOOK_FLIP_MODE = (window as any).__BOOK_FLIP_MODE || 'hand';
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pointer.x]);

  // Keyboard support for debugging/testing
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        console.log('⌨️ Keyboard: Next page');
        triggerFlip('next');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        console.log('⌨️ Keyboard: Prev page');
        triggerFlip('prev');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Scroll (Wheel) Handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (now < cooldownRef.current) return;

      // Threshold for scroll
      if (Math.abs(e.deltaY) > 30) {
        console.log(`🖱️ Wheel scroll: ${e.deltaY > 0 ? 'down (next)' : 'up (prev)'}`);
        if (e.deltaY > 0) {
          triggerFlip('next');
        } else {
          triggerFlip('prev');
        }
        cooldownRef.current = now + 800; // slightly longer cooldown for scroll
      }
    };
    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // Touch Handling
  const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: performance.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = performance.now() - touchStartRef.current.time;

    // Swipe detection (horizontal dominant)
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 2 && dt < 500) {
      if (dx > 0) {
        console.log('👆 Swipe Right -> Prev Page');
        triggerFlip('prev');
      } else {
        console.log('👆 Swipe Left -> Next Page');
        triggerFlip('next');
      }
    }
    // Tap detection (short duration, little movement)
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300) {
      const width = window.innerWidth;
      // Tap left 20% -> Prev, Tap right 20% -> Next
      if (touch.clientX < width * 0.2) {
        triggerFlip('prev');
      } else if (touch.clientX > width * 0.8) {
        triggerFlip('next');
      }
    }

    touchStartRef.current = null;
  };

  const handleTurnComplete = (newPage: number) => {
    prevPageRef.current = currentPage;
    setCurrentPage(newPage);
    // With variable-sized chapters, trigger quiz when we cross from a chapter's last text page to the next chapter title
    const prevPage = book.pages[prevPageRef.current];
    const newPg = book.pages[newPage];
    if (prevPage && newPg) {
      const prevTitle = prevPage.title || '';
      const newTitle = newPg.title || '';
      // Crossing into a new chapter title from a text page
      if (prevPage.type === 'text' && newPg.type === 'chapter-title' && newPage > prevPageRef.current) {
        // Find the chapter index by matching title in level list
        const idx = Math.max(0, levels.findIndex(l => (l.title || '').toLowerCase() === newTitle.toLowerCase()) - 1);
        if (onChapterQuiz) onChapterQuiz(idx >= 0 ? idx : 0);
      }
    }
  };

  return (
    <div
      className="absolute inset-0 z-0 flex items-center justify-center touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Book3D
        content={book}
        gestureSignal={gesture}
        isGestureActive={active}
        onPageTurnComplete={handleTurnComplete}
        currentPage={currentPage}
      />
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/40 text-white px-4 py-2 rounded-full text-sm pointer-events-none flex items-center gap-3">
        <span>Living Book • Page {currentPage + 1} / {book.pages.length}</span>
        {detectedSide && (
          <span className="inline-flex items-center gap-2 ml-2 px-2 py-0.5 bg-white/20 rounded-full">
            <span className="text-xs uppercase tracking-wider font-bold opacity-90">
              {detectedSide === 'left' ? 'Next' : 'Prev'}
            </span>
            <span className="text-xl animate-pulse">{detectedSide === 'left' ? '→' : '←'}</span>
          </span>
        )}
      </div>

      {/* Debug indicator for raw hand side */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/80 text-white px-3 py-1 rounded text-xs font-mono pointer-events-none">
        DEBUG: __HAND_SIDE = {String((window as any).__HAND_SIDE || 'null')}
      </div>
    </div>
  );
};

export default BookView;
