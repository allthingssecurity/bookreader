import React, { useState, useEffect } from 'react';
import { fetchBookContent } from './services/geminiService';
import { useOpticalFlow } from './hooks/useOpticalFlow';
import { Book3D } from './components/Book3D';
import { BookContent, AppState } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INIT);
  const [bookContent, setBookContent] = useState<BookContent | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Gesture state passed to visualizer
  // We use an object with ID to force updates even if value is constant
  const [gestureSignal, setGestureSignal] = useState<{ value: number; id: number }>({ value: 0, id: 0 });
  const [isGestureActive, setIsGestureActive] = useState(false);

  // Load Content
  useEffect(() => {
    const load = async () => {
      setAppState(AppState.LOADING_CONTENT);
      try {
        const content = await fetchBookContent();
        setBookContent(content);
        setAppState(AppState.READY);
      } catch (e) {
        console.error(e);
        setAppState(AppState.ERROR);
      }
    };
    load();
  }, []);

  // Gesture Handlers
  const handleGesture = (delta: number) => {
    if (appState !== AppState.READY) return;
    setGestureSignal({ value: delta, id: Date.now() });
    setIsGestureActive(true);
  };

  const handleGestureEnd = () => {
    setIsGestureActive(false);
    // Give time for snap animation to trigger before resetting visual helpers if any
  };

  const { videoRef, canvasRef, error: cameraError } = useOpticalFlow({
    onGesture: handleGesture,
    onGestureEnd: handleGestureEnd,
    enabled: appState === AppState.READY
  });

  const handlePageTurnComplete = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Keyboard Fallback for testing
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleGesture(-30); // Simulate Left Swipe (Next)
      if (e.key === 'ArrowLeft') handleGesture(30);  // Simulate Right Swipe (Prev)
      setTimeout(handleGestureEnd, 100);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [appState]);

  // Debug string
  let gestureStatus = "AWAITING GESTURE";
  if (isGestureActive) {
    if (gestureSignal.value < 0) gestureStatus = "SWIPING LEFT (NEXT)";
    else if (gestureSignal.value > 0) gestureStatus = "SWIPING RIGHT (PREV)";
    else gestureStatus = "DETECTED";
  }

  return (
    <div className="relative min-h-screen bg-[#111] text-[#e5e5e5] overflow-hidden flex flex-col items-center justify-center">
      
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2a2a2a_0%,_#000_100%)] z-0"></div>
      
      {/* Header / Meta */}
      <div className="absolute top-4 left-4 z-50 opacity-50 hover:opacity-100 transition-opacity pointer-events-none">
        <h1 className="text-xl font-cinzel text-amber-500">Karma</h1>
        <p className="text-xs text-gray-400">Gesture Controlled Interactive Book</p>
        <p className="text-[10px] text-gray-500 mt-1 max-w-[200px]">
          Swipe hand Left (Next) or Right (Prev).
        </p>
        {cameraError && <p className="text-red-500 text-xs mt-2">{cameraError}</p>}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-center items-center">
        {appState === AppState.LOADING_CONTENT && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-serif italic text-amber-100/70">Binding the pages of Karma...</p>
          </div>
        )}

        {appState === AppState.ERROR && (
          <div className="text-center p-8 border border-red-900 bg-red-900/20 rounded-lg">
            <h2 className="text-2xl text-red-400 mb-2">Failed to materialize book</h2>
            <p className="text-gray-400">The karmic particles could not assemble.</p>
          </div>
        )}

        {appState === AppState.READY && bookContent && (
          <Book3D 
            content={bookContent}
            gestureSignal={gestureSignal}
            isGestureActive={isGestureActive}
            onPageTurnComplete={handlePageTurnComplete}
            currentPage={currentPage}
          />
        )}
      </div>

      {/* Debug/Gesture Feedback Visuals */}
      <div className="absolute bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
        {/* Hidden processing elements */}
        <video ref={videoRef} className="opacity-0 absolute w-1 h-1" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="opacity-0 absolute w-1 h-1" width="64" height="48" />
        
        {/* Gesture Indicator */}
        <div className={`
          flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono transition-colors duration-300
          ${isGestureActive ? 'bg-amber-900/80 text-amber-100' : 'bg-gray-800/50 text-gray-500'}
        `}>
          <div className={`w-2 h-2 rounded-full ${isGestureActive ? 'bg-amber-400 animate-pulse' : 'bg-gray-600'}`}></div>
          {gestureStatus}
        </div>
      </div>

    </div>
  );
};

export default App;