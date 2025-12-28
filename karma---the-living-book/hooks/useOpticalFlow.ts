import { useEffect, useRef, useState } from 'react';

interface UseOpticalFlowProps {
  onGesture: (delta: number) => void;
  onGestureEnd: () => void;
  enabled: boolean;
}

export const useOpticalFlow = ({ onGesture, onGestureEnd, enabled }: UseOpticalFlowProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Optical flow state
  const prevFrameRef = useRef<Uint8Array | null>(null);
  const isActiveRef = useRef(false);
  const motionAccumulator = useRef(0);
  const lastMotionTime = useRef(0);

  // Initialize camera
  useEffect(() => {
    if (!enabled) return;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 320 }, 
            height: { ideal: 240 },
            frameRate: { ideal: 30 }
          } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Camera access denied or unavailable. Gesture control disabled.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [enabled]);

  // Process frames
  useEffect(() => {
    if (!stream || !enabled) return;

    let animationFrameId: number;
    const width = 64; // Low res for performance
    const height = 48;
    
    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas || video.readyState !== 4) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Draw current frame scaled down and mirrored
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width * -1, height);
      ctx.restore();
      
      const frameData = ctx.getImageData(0, 0, width, height);
      const currentFrame = new Uint8Array(frameData.data.length / 4); // Grayscale buffer

      // Convert to grayscale
      for (let i = 0; i < currentFrame.length; i++) {
        const r = frameData.data[i * 4];
        const g = frameData.data[i * 4 + 1];
        const b = frameData.data[i * 4 + 2];
        currentFrame[i] = (r + g + b) / 3;
      }

      if (prevFrameRef.current) {
        let deltaX = 0;
        let validPoints = 0;

        // Sample grid
        for (let y = 10; y < height - 10; y += 4) {
          for (let x = 10; x < width - 10; x += 4) {
            const idx = y * width + x;
            
            // 1. Edge Detection (Gradient Check)
            // Only track pixels that are part of a strong edge (like a hand boundary)
            // Increased threshold to 30 to ignore background noise/wall texture
            const gx = Math.abs(prevFrameRef.current[idx - 1] - prevFrameRef.current[idx + 1]);
            if (gx < 30) continue;

            const prevVal = prevFrameRef.current[idx];
            
            // 2. Center Bias (Stick-to-Zero)
            // Calculate how well the pixel matches if we assume NO movement
            const zeroDiff = Math.abs(currentFrame[idx] - prevVal);
            
            let bestDx = 0;
            let minDiff = zeroDiff;
            
            // Search local window
            for (let dx = -4; dx <= 4; dx++) {
              if (dx === 0) continue;
              
              const currVal = currentFrame[y * width + (x + dx)];
              const diff = Math.abs(currVal - prevVal);
              
              // 3. Noise Gate:
              // Only switch to a new dx if it is SIGNIFICANTLY better than the zero-motion match.
              // If zeroDiff is 20, and diff is 19, that's just noise. Stay at 0.
              // We require at least 20% improvement to consider it movement.
              if (diff < minDiff * 0.8) {
                minDiff = diff;
                bestDx = dx;
              }
            }
            
            if (bestDx !== 0) {
               deltaX += bestDx;
               validPoints++;
            }
          }
        }

        // Only register gesture if we have enough confident points moving in unison
        if (validPoints > 5) {
           const avgDx = deltaX / validPoints;
           
           // Deadzone: Ignore micro-movements (avgDx < 0.5 pixels)
           if (Math.abs(avgDx) > 0.5) {
             const rawInput = avgDx; 
             motionAccumulator.current += rawInput;
             lastMotionTime.current = Date.now();
             isActiveRef.current = true;
             
             // Output with gain
             onGesture(rawInput * 30); 
           }
        }
      }

      // Check for inactivity to snap
      if (isActiveRef.current && Date.now() - lastMotionTime.current > 150) {
        isActiveRef.current = false;
        motionAccumulator.current = 0;
        onGestureEnd();
      }

      prevFrameRef.current = currentFrame;
      animationFrameId = requestAnimationFrame(processFrame);
    };

    animationFrameId = requestAnimationFrame(processFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [stream, enabled, onGesture, onGestureEnd]);

  return { videoRef, canvasRef, error, hasStream: !!stream };
};