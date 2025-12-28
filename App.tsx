import React, { useState, useEffect } from 'react';
import WebcamHandler from './components/WebcamHandler';
import BookView from './components/BookView';
import { PdfUpload } from './components/PdfUpload';
import { Level, Point } from './types';
import { Play } from 'lucide-react';

// Minimal types needed
interface GameSettings {
    bookRequirePinch: boolean;
    bookFlipMode: 'hand' | 'swipe' | 'orientation';
}

const DEFAULT_SETTINGS: GameSettings = {
    bookRequirePinch: false,
    bookFlipMode: 'hand'
};

const App: React.FC = () => {
    // Hand tracking state
    const [pointer, setPointer] = useState<Point>({ x: 0, y: 0 });
    const [isPinching, setIsPinching] = useState(false);

    // App state
    const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
    const [pdfLevels, setPdfLevels] = useState<Level[] | null>(null);
    const [pdfFilename, setPdfFilename] = useState<string | null>(null);
    const [mode, setMode] = useState<'upload' | 'read'>('upload');

    // Webcam handler callback
    const handleWebcamUpdate = (p: Point, pinch: boolean) => {
        setPointer(p);
        setIsPinching(pinch);
    };

    const handlePdfLoaded = (levels: Level[], filename: string) => {
        setPdfLevels(levels);
        setPdfFilename(filename);
        setMode('read');
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-slate-900">
            {/* Webcam Handler (Invisible but active) */}
            <WebcamHandler
                onUpdate={handleWebcamUpdate}
                onCalibrationComplete={() => { }}
                isCalibrating={false}
                calibrationData={{ minX: 0, maxX: 1, minY: 0, maxY: 1 }} // Default calibration
            />

            {/* Main Content */}
            {mode === 'upload' && (
                <div className="flex flex-col items-center justify-center h-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 opacity-80" />
                    <div className="z-10 w-full max-w-4xl px-4">
                        <h1 className="text-5xl font-bold text-white text-center mb-12 drop-shadow-lg">
                            Gesture Book Reader
                        </h1>
                        <PdfUpload
                            onPdfLoaded={handlePdfLoaded}
                            onCancel={() => { }}
                        />
                    </div>
                </div>
            )}

            {mode === 'read' && pdfLevels && (
                <>
                    <BookView
                        levels={pdfLevels}
                        pointer={pointer}
                        isPinching={isPinching}
                        bookTitle={pdfFilename || undefined}
                    />

                    {/* Back Button */}
                    <button
                        onClick={() => setMode('upload')}
                        className="absolute top-6 left-6 z-50 px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-lg hover:bg-white/20 transition-all border border-white/20"
                    >
                        ← Upload New PDF
                    </button>
                </>
            )}
        </div>
    );
};

export default App;
