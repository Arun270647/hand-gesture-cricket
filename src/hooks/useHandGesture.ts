import { useEffect, useRef, useState, useCallback } from 'react';

interface HandGestureResult {
  fingerCount: number;
  landmarks: any[];
  isDetecting: boolean;
}

export const useHandGesture = (isFrozen: boolean, enabled: boolean) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gestureResult, setGestureResult] = useState<HandGestureResult>({
    fingerCount: 0,
    landmarks: [],
    isDetecting: false
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handsRef = useRef<any>(null);

  const countFingers = useCallback((results: any) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return 0;
  
    const handLandmarks = results.multiHandLandmarks[0];
    const tipIds = [4, 8, 12, 16, 20];
    let fingerCount = 0;
  
    const wrist = handLandmarks[0];
    const middleFingerMcp = handLandmarks[9];
    if (wrist.y < middleFingerMcp.y) {
        return 0; 
    }

    const handedness = results.multiHandedness[0]?.label || 'Right';

    if (handedness === 'Right') {
        if (handLandmarks[tipIds[0]].x < handLandmarks[tipIds[0] - 1].x && handLandmarks[tipIds[0]].x < handLandmarks[tipIds[0] - 2].x) {
            fingerCount++;
        }
    } else {
        if (handLandmarks[tipIds[0]].x > handLandmarks[tipIds[0] - 1].x && handLandmarks[tipIds[0]].x > handLandmarks[tipIds[0] - 2].x) {
            fingerCount++;
        }
    }

    for (let i = 1; i < 5; i++) {
      if (handLandmarks[tipIds[i]].y < handLandmarks[tipIds[i] - 2].y) {
        fingerCount++;
      }
    }
  
    return fingerCount;
  }, []);

  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            if (!isFrozen) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const fingerCount = countFingers(results);
                
                if (results.multiHandLandmarks[0]) {
                    drawLandmarks(ctx, results.multiHandLandmarks[0], canvas.width, canvas.height);
                }
                
                setGestureResult({
                    fingerCount,
                    landmarks: results.multiHandLandmarks,
                    isDetecting: true
                });
            } else {
                setGestureResult(prev => ({ ...prev, fingerCount: 0, isDetecting: false }));
            }
        }
    }
  }, [countFingers, isFrozen]);

  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    ctx.save();
    const fingerTips = [4, 8, 12, 16, 20];
    ctx.fillStyle = '#FF6B35';
    fingerTips.forEach((tipIndex) => {
      const landmark = landmarks[tipIndex];
      const x = landmark.x * width;
      const y = landmark.y * height;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    const palmCenter = landmarks[0];
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(palmCenter.x * width, palmCenter.y * height, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 3;
    const mainConnections = [
      [0, 5], [5, 9], [9, 13], [13, 17], [17, 0],
      [5, 8], [9, 12], [13, 16], [17, 20], [1, 4]
    ];
    
    mainConnections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(startPoint.x * width, startPoint.y * height);
      ctx.lineTo(endPoint.x * width, endPoint.y * height);
      ctx.stroke();
    });
    
    ctx.restore();
  };

  const initializeCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise((resolve) => {
          if(videoRef.current) videoRef.current.onloadedmetadata = () => resolve(true);
        });
        
        if (canvasRef.current && videoRef.current) {
          const video = videoRef.current;
          canvasRef.current.width = video.videoWidth || 640;
          canvasRef.current.height = video.videoHeight || 480;
        }
      }
      
      const { Hands } = await import('@mediapipe/hands');
      const { Camera } = await import('@mediapipe/camera_utils');
      
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      hands.onResults(onResults);
      handsRef.current = hands;
      
      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && handsRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });
        await camera.start();
      }
      
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to initialize camera: ${errorMessage}`);
    }
  }, [onResults, countFingers]);

  useEffect(() => {
    if (enabled) {
      initializeCamera();
    }
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [initializeCamera, enabled]);

  return {
    videoRef,
    canvasRef,
    gestureResult,
    isInitialized,
    error,
    reinitialize: initializeCamera
  };
};