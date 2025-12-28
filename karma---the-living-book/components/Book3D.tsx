import React, { useState, useRef, useEffect } from 'react';
import { BookContent } from '../types';
import { soundService } from '../../services/soundService';

interface Book3DProps {
  content: BookContent;
  gestureSignal: { value: number; id: number };
  isGestureActive: boolean;
  onPageTurnComplete: (newPage: number) => void;
  currentPage: number;
}

export const Book3D: React.FC<Book3DProps> = ({
  content,
  gestureSignal,
  isGestureActive,
  onPageTurnComplete,
  currentPage
}) => {
  // Visual state
  const [currentRotation, setCurrentRotation] = useState(0); // 0 to -180
  const [turningDirection, setTurningDirection] = useState<'next' | 'prev' | null>(null);

  // Ref to track accumulated gesture for current turn
  const dragAccumulator = useRef(0);

  // Initialize or reset when page changes strictly via logic
  useEffect(() => {
    dragAccumulator.current = 0;
    setCurrentRotation(0);
    setTurningDirection(null);
  }, [currentPage]);

  // Handle Gesture Physics
  useEffect(() => {
    if (!isGestureActive) return;

    const delta = gestureSignal.value;
    console.log(`📚 Book3D received gesture: delta=${delta}, id=${gestureSignal.id}, currentPage=${currentPage}/${content.pages.length - 1}, turningDirection=${turningDirection}`);
    if (delta === 0) return;

    // Sensitivity factor - reduced slightly to feel "heavier" and less jittery
    // When driven by BookView, delta encodes absolute progression increments. Keep sensitivity 1.
    const sensitivity = 1.0;
    dragAccumulator.current += delta * sensitivity;

    // Determine direction if not set
    // Start Threshold: How much "pull" is needed to lift the page corner.
    // Increased to 10 to further prevent accidental triggers.
    if (!turningDirection) {
      if (dragAccumulator.current <= -10 && currentPage < content.pages.length - 1) {
        console.log(`📚 Setting turningDirection = 'next'`);
        setTurningDirection('next');
      } else if (dragAccumulator.current >= 10 && currentPage > 0) {
        console.log(`📚 Setting turningDirection = 'prev'`);
        setTurningDirection('prev');
      } else {
        console.log(`📚 Cannot set direction: accumulator=${dragAccumulator.current}, bounds check failed`);
      }
    }

    if (turningDirection === 'next') {
      // Clamp between 0 and -180
      // Dragging left (negative) increases rotation towards -180
      let rot = Math.max(-180, Math.min(0, dragAccumulator.current));

      // Add ease-out effect for more natural motion
      const progress = Math.abs(rot) / 180;
      const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
      rot = -180 * eased;

      setCurrentRotation(rot);
    } else if (turningDirection === 'prev') {
      // If prev, we start at -180 (logically) and move to 0.
      let rot = Math.max(-180, Math.min(0, -180 + dragAccumulator.current));

      // Add ease-out effect
      const progress = (180 + rot) / 180;
      const eased = 1 - Math.pow(1 - progress, 3);
      rot = -180 + (180 * eased);

      setCurrentRotation(rot);
    }

  }, [gestureSignal, isGestureActive, currentPage, content.pages.length, turningDirection]);

  // Handle Gesture Release (Snap)
  useEffect(() => {
    if (!isGestureActive && turningDirection) {
      const threshold = -90; // Midpoint

      let targetRot = 0;
      let targetPage = currentPage;

      if (turningDirection === 'next') {
        if (currentRotation < threshold) {
          targetRot = -180;
          targetPage = currentPage + 1;
        } else {
          targetRot = 0;
          targetPage = currentPage; // Snap back
        }
      } else {
        // Prev: Current Rotation is calculating from -180 upwards
        if (currentRotation > threshold) {
          targetRot = 0;
          targetPage = currentPage - 1;
        } else {
          targetRot = -180;
          targetPage = currentPage; // Snap back
        }
      }

      // Animate to target
      let animationFrame: number;
      const animateSnap = () => {
        setCurrentRotation(prev => {
          const diff = targetRot - prev;
          if (Math.abs(diff) < 2) {
            if (targetRot === -180 && turningDirection === 'next') {
              try { soundService.playPageFlip(); } catch { }
              onPageTurnComplete(targetPage);
            } else if (targetRot === 0 && turningDirection === 'prev') {
              try { soundService.playPageFlip(); } catch { }
              onPageTurnComplete(targetPage);
            } else {
              // Snapped back
              setTurningDirection(null);
              dragAccumulator.current = 0;
            }
            return targetRot;
          }
          return prev + diff * 0.22; // Slightly faster, smoother
        });

        // Continue animation if not reached
        if (Math.abs(targetRot - currentRotation) > 0.5) {
          animationFrame = requestAnimationFrame(animateSnap);
        }
      };
      animateSnap();

      return () => cancelAnimationFrame(animationFrame);
    }
  }, [isGestureActive, turningDirection, currentRotation, currentPage, onPageTurnComplete]);

  // RENDER HELPERS
  const renderPageContent = (pageIndex: number, isBack: boolean = false) => {
    if (pageIndex < 0 || pageIndex >= content.pages.length) return null;
    const page = content.pages[pageIndex];

    const isCover = page.type === 'chapter-title';

    return (
      <div className={`w-full h-full p-8 md:p-12 flex flex-col ${isBack ? 'scale-x-[-1]' : ''} bg-[#fdfbf7] text-[#2c2c2c] overflow-hidden relative shadow-inner`}>
        {/* Paper Texture Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] mix-blend-multiply"></div>

        {/* Page Number */}
        <div className="absolute bottom-6 w-full text-center text-xs font-serif text-gray-500 tracking-widest left-0">
          {page.pageNumber}
        </div>

        {isCover ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center border-4 double border-gray-800 m-4 p-4">
            <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-[#1a1a1a] uppercase tracking-widest">{page.title}</h1>
            <div className="w-16 h-1 bg-red-800 mb-8"></div>
            <p className="text-xl italic text-gray-600 font-serif">{content.author}</p>
          </div>
        ) : (
          <>
            {page.title && (
              <h2 className="text-2xl font-bold font-serif mb-4 text-[#5b3a1a] tracking-wide">
                {page.title}
              </h2>
            )}

            <div className="flex-1 font-serif text-[17px] leading-8 text-justify space-y-5 book-content pr-3">
              {/* Subtle paper texture overlay */}
              <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.3\'/%3E%3C/svg%3E")',
                backgroundSize: '200px 200px'
              }} />

              {page.imageUrl && (
                <div className="float-right w-1/2 ml-4 mb-4 bg-white p-2 shadow-sm transform rotate-1 border border-gray-200">
                  <img src={page.imageUrl} alt="Illustration" className="w-full h-auto sepia-[.3]" />
                  {page.imageCaption && <p className="text-xs text-center mt-2 italic text-gray-500">{page.imageCaption}</p>}
                </div>
              )}
              {/* Render HTML content if it starts with < (HTML tag), otherwise render as paragraphs */}
              {page.content.length > 0 && page.content[0] && page.content[0].trim().startsWith('<') ? (
                <div
                  dangerouslySetInnerHTML={{ __html: page.content.join('') }}
                  className="prose prose-sm max-w-none"
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    lineHeight: 'inherit'
                  }}
                />
              ) : (
                page.content.map((para, i) => (
                  <p key={i} className="first:indent-8 hyphens-auto">{para}</p>
                ))
              )}
            </div>
          </>
        )}

        {/* Inner Spine Shadow */}
        <div className={`absolute top-0 bottom-0 w-12 pointer-events-none bg-gradient-to-r ${isBack ? 'from-transparent to-[rgba(0,0,0,0.1)] right-0' : 'from-[rgba(0,0,0,0.1)] to-transparent left-0'}`}></div>
      </div>
    );
  };

  // Determine which pages to show
  let leftStaticIndex = currentPage - 1;
  let rightStaticIndex = currentPage;
  let movingPageIndex = -1; // -1 means none

  if (turningDirection === 'next') {
    movingPageIndex = currentPage;
    rightStaticIndex = currentPage + 1;
  } else if (turningDirection === 'prev') {
    movingPageIndex = currentPage - 1;
    leftStaticIndex = currentPage - 2;
  }

  const movingPageRotation = currentRotation; // -180 to 0
  const rotAbs = Math.min(180, Math.max(0, Math.abs(movingPageRotation)));
  const curlT = rotAbs / 180;

  return (
    <div className="relative w-full max-w-5xl h-[80vh] flex justify-center items-center perspective-2000 select-none">
      <style>{`
        .perspective-2000 { perspective: 2000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .axis-left { transform-origin: left center; }
      `}</style>

      {/* The Book Container */}
      <div className="relative w-full h-full flex justify-center items-center transform-style-3d">

        {/* STATIC LAYER (The pages beneath) */}
        {/* Left Static Page */}
        <div className="absolute w-[45%] h-[90%] left-[5%] top-[5%] bg-[#fdfbf7] shadow-xl border-l border-gray-300 rounded-l-sm overflow-hidden flex z-0">
          {renderPageContent(leftStaticIndex)}
          {/* Thickness simulation for left stack */}
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gray-300"></div>
          {/* Soft shadow cast from turning page */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: turningDirection === 'prev' ? (0.08 * curlT) : (0.04 * curlT),
              background: 'radial-gradient(120% 100% at 100% 50%, rgba(0,0,0,0.25), rgba(0,0,0,0) 60%)'
            }}
          />
        </div>

        {/* Right Static Page */}
        <div className="absolute w-[45%] h-[90%] left-[50%] top-[5%] bg-[#fdfbf7] shadow-xl border-r border-gray-300 rounded-r-sm overflow-hidden flex z-0">
          {renderPageContent(rightStaticIndex)}
          {/* Soft shadow cast from turning page */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: turningDirection === 'next' ? (0.10 * curlT) : (0.05 * curlT),
              background: 'radial-gradient(120% 100% at 0% 50%, rgba(0,0,0,0.28), rgba(0,0,0,0) 60%)'
            }}
          />
        </div>

        {/* MOVING PAGE (The flipper) */}
        {turningDirection && (
          <div
            className="absolute w-[45%] h-[90%] left-[50%] top-[5%] transform-style-3d axis-left z-20 will-change-transform"
            style={{
              transform: `
                rotateY(${movingPageRotation}deg)
                translateZ(${Math.abs(movingPageRotation / 180) * 8}px)
                translateX(${Math.sin((movingPageRotation * Math.PI) / 180) * 3}px)
              `,
              transformOrigin: 'left center',
              transition: isGestureActive ? 'none' : 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              filter: `drop-shadow(${-Math.sin((movingPageRotation * Math.PI) / 180) * 15}px ${Math.abs(Math.sin((movingPageRotation * Math.PI) / 180)) * 8}px ${12 + Math.abs(Math.sin((movingPageRotation * Math.PI) / 180)) * 8}px rgba(0,0,0,${0.25 + curlT * 0.15}))`,
              marginLeft: movingPageRotation < -90 ? '0px' : '-1px'
            }}
          >
            {/* Front of the moving page (Visible when rot > -90) */}
            <div className="absolute inset-0 backface-hidden bg-[#fdfbf7] rounded-r-sm shadow-md overflow-hidden">
              {renderPageContent(movingPageIndex)}
              {/* Dynamic Shine/Shadow based on curl */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(to right, rgba(0,0,0,${rotAbs / 650}), transparent)`
                }}
              />
              {/* Crease highlight near fold */}
              <div
                className="absolute inset-y-0 left-0 w-1/3 pointer-events-none"
                style={{
                  background: `linear-gradient(to right, rgba(255,255,255,${0.25 * curlT}), rgba(255,255,255,0))`
                }}
              />
              {/* Edge highlight */}
              <div className="absolute inset-y-0 right-0 w-[2px] bg-white/50 pointer-events-none" />
            </div>

            {/* Back of the moving page (Visible when rot < -90) */}
            <div
              className="absolute inset-0 backface-hidden bg-[#fdfbf7] rounded-l-sm shadow-md overflow-hidden"
              style={{ transform: 'rotateY(180deg)' }}
            >
              {renderPageContent(movingPageIndex, true)}
              {/* Dynamic Shine/Shadow for back */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(to left, rgba(0,0,0,${(180 - rotAbs) / 650}), transparent)`
                }}
              />
              {/* Back crease shadow */}
              <div
                className="absolute inset-y-0 right-0 w-1/3 pointer-events-none"
                style={{
                  background: `linear-gradient(to left, rgba(0,0,0,${0.20 * curlT}), rgba(0,0,0,0))`
                }}
              />
              {/* Edge highlight */}
              <div className="absolute inset-y-0 left-0 w-[2px] bg-white/40 pointer-events-none" />
            </div>
            {/* Simulated thickness: thin layers */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 rounded-md" style={{ boxShadow: `0 0 0 0.5px rgba(0,0,0,${0.05 + 0.1 * curlT}) inset` }} />
              <div className="absolute inset-0 rounded-md" style={{ boxShadow: `0 0 0 1px rgba(0,0,0,${0.03 + 0.07 * curlT}) inset`, transform: 'translateZ(0.1px)' }} />
            </div>
          </div>
        )}

        {/* Spine visual */}
        <div className="absolute left-1/2 top-[4%] bottom-[4%] w-8 -ml-4 rounded-lg bg-[#3e2723] z-[-1] shadow-2xl transform translate-z-[-5px]"></div>

      </div>
    </div>
  );
};
