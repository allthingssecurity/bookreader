import React, { useEffect, useRef, useState } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { Hands, Results } from '@mediapipe/hands';
import { Point, CalibrationData } from '../types';
import { lerp, distance, clamp } from '../utils/math';
import { PINCH_THRESHOLD } from '../constants';

interface WebcamHandlerProps {
  onUpdate: (point: Point, isPinching: boolean, isHandDetected: boolean) => void;
  calibration: CalibrationData;
  smoothingAmount: number; // 0 to 1
  enabled: boolean;
  screenWidth: number;
  screenHeight: number;
  inputMode?: 'hands' | 'eyes';
  blinkToFire?: boolean;
}

// MediaPipe types are global from the CDN script
declare global {
  interface Window {
    Hands: any;
    FaceMesh: any;
    Camera: any;
  }
}

const WebcamHandler: React.FC<WebcamHandlerProps> = ({
  onUpdate,
  calibration,
  smoothingAmount,
  enabled,
  screenWidth,
  screenHeight,
  inputMode = 'hands',
  blinkToFire = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevPointRef = useRef<Point>({ x: screenWidth / 2, y: screenHeight / 2 });
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const blinkHoldUntilRef = useRef<number>(0);
  const lastBlinkAtRef = useRef<number>(0);
  const aliveRef = useRef<boolean>(false);
  const runIdRef = useRef<symbol | null>(null);

  const screenWidthRef = useRef(screenWidth);
  const screenHeightRef = useRef(screenHeight);

  useEffect(() => {
    screenWidthRef.current = screenWidth;
    screenHeightRef.current = screenHeight;
  }, [screenWidth, screenHeight]);

  useEffect(() => {
    if (!enabled) return;
    if (!videoRef.current) return;

    let camera: any = null;
    let hands: any = null;
    let face: any = null;
    aliveRef.current = true;
    const localRunId = Symbol('webcam-session');
    runIdRef.current = localRunId;

    const onResultsHands = (results: Results) => {
      if (runIdRef.current !== localRunId || !aliveRef.current) return;
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        onUpdate(prevPointRef.current, false, false);
        (window as any).__HAND_ORIENT = 'neutral';
        (window as any).__HAND_FIST = false;
        (window as any).__HAND_SIDE = null;
        return;
      }

      // Use the first hand detected
      const landmarks = results.multiHandLandmarks[0];
      // Handedness (prefer right if present, else left)
      try {
        const anyRes: any = results as any;
        // Prefer the first detected hand's label; mirror-safe
        let side: 'left' | 'right' | null = null;
        const handedArr = (anyRes.multiHandedness || []);
        if (handedArr.length) {
          const lbl = String(handedArr[0]?.label || '').toLowerCase();
          side = (lbl.includes('right')) ? 'right' : (lbl.includes('left')) ? 'left' : null;
        }
        (window as any).__HAND_SIDE = side;
      } catch { }

      // Index finger tip (8)
      const indexTip = landmarks[8];
      // Thumb tip (4)
      const thumbTip = landmarks[4];

      // Calculate pinch distance (using normalized coordinates directly for consistency)
      // Z depth is also available but simple XY distance is often enough for pinch
      const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
      // Make pinch threshold more forgiving for ease-of-use
      const pinch = pinchDist < (PINCH_THRESHOLD * 1.35);

      // Also detect a gentle "grab/closed palm" gesture as shoot
      const wrist = landmarks[0];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      const d = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
      const avgTipToWrist = (d(indexTip, wrist) + d(middleTip, wrist) + d(ringTip, wrist) + d(pinkyTip, wrist)) / 4;
      // Heuristic: closed palm has a smaller average tip-to-wrist distance
      const grab = avgTipToWrist < 0.17; // tuned for normalized coords
      (window as any).__HAND_FIST = !!grab;
      const isPinching = pinch || grab;

      // Map coordinates using calibration (or default 0-1)
      // Mirror X because it's a webcam (selfie view)
      const rawX = 1.0 - indexTip.x;
      const rawY = indexTip.y;

      // Normalize based on calibration window
      // e.g. if minX is 0.1 and maxX is 0.9, we stretch that range to 0-1
      const rangeX = calibration.maxX - calibration.minX;
      const rangeY = calibration.maxY - calibration.minY;

      const normX = (rawX - calibration.minX) / rangeX;
      const normY = (rawY - calibration.minY) / rangeY;

      // Use current dimensions from ref
      const targetX = clamp(normX, 0, 1) * screenWidthRef.current;
      const targetY = clamp(normY, 0, 1) * screenHeightRef.current;

      // Smooth Movement
      // Apply sensitivity scaling (faster cursor reach if configured)
      const centerX = screenWidthRef.current / 2;
      const centerY = screenHeightRef.current / 2;
      const sens = (window as any).__APP_SENS || 1.0;
      const scaledX = centerX + (targetX - centerX) * sens;
      const scaledY = centerY + (targetY - centerY) * sens;

      const smoothedX = lerp(prevPointRef.current.x, scaledX, 1 - smoothingAmount); // higher amount = slower
      const smoothedY = lerp(prevPointRef.current.y, scaledY, 1 - smoothingAmount);

      const newPoint = { x: smoothedX, y: smoothedY };
      prevPointRef.current = newPoint;
      // Simple palm orientation heuristic using depth difference between wrist (0) and palm center (9)
      try {
        const wrist = landmarks[0];
        const palm = landmarks[9];
        const indexBase = landmarks[5];
        const pinkyBase = landmarks[17];
        const dzPalm = palm.z - wrist.z; // palm vs wrist depth
        const spread = Math.hypot(indexBase.x - pinkyBase.x, indexBase.y - pinkyBase.y);
        // Adaptive thresholds: more forgiving when hand is small in frame
        const depthThr = 0.03 + Math.max(0, 0.06 - spread); // ~0.03..0.09
        let orient: 'front' | 'back' | 'neutral' = 'neutral';
        if (dzPalm < -depthThr) orient = 'front';
        else if (dzPalm > depthThr) orient = 'back';
        (window as any).__HAND_ORIENT = orient;
      } catch { }

      onUpdate(newPoint, isPinching, true);
      setIsInitializing(false);
    };

    const onResultsFace = (results: any) => {
      if (runIdRef.current !== localRunId || !aliveRef.current) return;
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        onUpdate(prevPointRef.current, false, false);
        return;
      }
      const lm = results.multiFaceLandmarks[0];
      // Use nose tip/bridge as pointer anchor
      const nose = lm[1] || lm[4] || lm[6];
      if (!nose) {
        onUpdate(prevPointRef.current, false, false);
        return;
      }
      const rawX = 1.0 - nose.x;
      const rawY = nose.y;
      const rangeX = calibration.maxX - calibration.minX;
      const rangeY = calibration.maxY - calibration.minY;
      const normX = (rawX - calibration.minX) / rangeX;
      const normY = (rawY - calibration.minY) / rangeY;
      const targetX = clamp(normX, 0, 1) * screenWidthRef.current;
      const targetY = clamp(normY, 0, 1) * screenHeightRef.current;
      const centerX = screenWidthRef.current / 2;
      const centerY = screenHeightRef.current / 2;
      const sens = (window as any).__APP_SENS || 1.0;
      const scaledX = centerX + (targetX - centerX) * sens;
      const scaledY = centerY + (targetY - centerY) * sens;
      const smoothedX = lerp(prevPointRef.current.x, scaledX, 1 - smoothingAmount);
      const smoothedY = lerp(prevPointRef.current.y, scaledY, 1 - smoothingAmount);
      const newPoint = { x: smoothedX, y: smoothedY };
      prevPointRef.current = newPoint;

      // Blink detection (both eyes)
      // Landmarks: left eye (33,133 corners; 159 upper, 145 lower), right eye (263,362 corners; 386 upper, 374 lower)
      const L_OUT = lm[33], L_IN = lm[133], L_UP = lm[159], L_DN = lm[145];
      const R_OUT = lm[263], R_IN = lm[362], R_UP = lm[386], R_DN = lm[374];
      const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
      const l_h = dist(L_OUT, L_IN) + 1e-6; const l_v = dist(L_UP, L_DN);
      const r_h = dist(R_OUT, R_IN) + 1e-6; const r_v = dist(R_UP, R_DN);
      const l_ratio = l_v / l_h; const r_ratio = r_v / r_h;
      const blink = blinkToFire && l_ratio < 0.20 && r_ratio < 0.20;

      // Hold pinch true briefly on blink for projectile power
      const now = performance.now();
      if (blink && now - lastBlinkAtRef.current > 450) {
        lastBlinkAtRef.current = now;
        blinkHoldUntilRef.current = now + 260;
      }
      const isPinching = blinkHoldUntilRef.current > now;
      onUpdate(newPoint, isPinching, true);
      setIsInitializing(false);
    };

    const isMobile = screenWidth < 768;

    try {
      if (inputMode === 'hands') {
        if (!window.Hands) throw new Error('MediaPipe Hands not loaded');
        hands = new window.Hands({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });

        // Mobile Optimization: Use Lite model (0) and lower complexity
        hands.setOptions({
          maxNumHands: isMobile ? 1 : 2, // Only track 1 hand on mobile
          modelComplexity: isMobile ? 0 : 1, // Lite model on mobile
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults(onResultsHands);

        if (videoRef.current) {
          // Mobile Optimization: Lower resolution and frame skipping
          const targetWidth = isMobile ? 320 : 640;
          const targetHeight = isMobile ? 240 : 480;
          let frameCount = 0;
          const skipFrames = isMobile ? 2 : 0; // Process every 3rd frame on mobile

          camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (!aliveRef.current || runIdRef.current !== localRunId) return;

              // Frame skipping logic
              frameCount++;
              if (frameCount % (skipFrames + 1) !== 0) return;

              try {
                if (videoRef.current) await hands.send({ image: videoRef.current });
              } catch (e) { /* ignore disposed errors */ }
            },
            width: targetWidth, height: targetHeight
          });
          camera.start();
        }
      } else {
        // Eyes mode via FaceMesh
        if (!window.FaceMesh) throw new Error('MediaPipe FaceMesh not loaded');
        face = new window.FaceMesh({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
        face.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        face.onResults(onResultsFace);
        if (videoRef.current) {
          camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (!aliveRef.current || runIdRef.current !== localRunId) return;
              try { if (videoRef.current) await face.send({ image: videoRef.current }); } catch (e) { }
            },
            width: 640, height: 480
          });
          camera.start();
        }
      }
    } catch (err: any) {
      console.error("Camera init error:", err);
      setError(err.message);
      setIsInitializing(false);
    }

    return () => {
      aliveRef.current = false;
      const id = localRunId;
      try { if (camera) camera.stop(); } catch { }
      try { if (hands && runIdRef.current === id) hands.close(); } catch { }
      try { if (face && runIdRef.current === id) face.close(); } catch { }
    };
  }, [enabled, calibration, smoothingAmount, inputMode, blinkToFire]);

  if (!enabled) return null;

  // On mobile, we might want to hide the debug view to save space/confusion
  const isMobile = screenWidth < 768;

  return (
    <>
      {/* 
        Hidden video element for processing.
        IMPORTANT: Do NOT use display:none, as it stops video playback/processing on some mobile browsers (iOS).
        Use opacity:0 and fixed position instead.
      */}
      <video
        ref={videoRef}
        className="fixed top-0 left-0 w-1 h-1 -z-50 opacity-0 pointer-events-none"
        playsInline
        muted
      />

      {/* Mobile Error Toast */}
      {isMobile && error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm z-50 max-w-[90%] text-center shadow-lg backdrop-blur-sm">
          ⚠️ Camera Error: {error}
        </div>
      )}

      {/* Small PIP debug view - Desktop only */}
      {!isMobile && (
        <div className="fixed bottom-4 right-4 w-32 h-24 bg-black rounded-lg border-2 border-slate-700 overflow-hidden opacity-50 hover:opacity-100 transition-opacity z-40 pointer-events-none">
          <video
            ref={(el) => {
              if (el && videoRef.current) el.srcObject = videoRef.current.srcObject;
            }}
            autoPlay
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
          {error && <div className="absolute inset-0 flex items-center justify-center bg-red-500/80 text-white text-xs p-1">{error}</div>}
        </div>
      )}
    </>
  );
};

export default WebcamHandler;
