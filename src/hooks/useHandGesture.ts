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
  const cameraRef = useRef<any>(null);

  const frameHistoryRef = useRef<number[]>([]);
  
  // Helper function to find the most frequent value in an array
  const mode = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const frequencyMap: { [key: number]: number } = {};
    for (const num of arr) {
      frequencyMap[num] = (frequencyMap[num] || 0) + 1;
    }
    let maxCount = -1;
    let modeValue = arr[0];
    for (const key in frequencyMap) {
      if (frequencyMap[key] > maxCount) {
        maxCount = frequencyMap[key];
        modeValue = parseInt(key, 10);
      }
    }
    return modeValue;
  };

  const countFingers = useCallback((results: any) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return 0;
    
    // Step 4: Improve Lighting / Confidence Handling
    const confidence = results.multiHandedness[0]?.score || 0;
    if (confidence < 0.7) {
      console.log("Detection confidence too low, ignoring.");
      return -1;
    }

    const handLandmarks = results.multiHandLandmarks[0];
    let fingerCount = 0;
    const fingerStates: boolean[] = [false, false, false, false, false];
  
    // Step 7: Edge Case Fixes - Handle partially visible hand
    if (handLandmarks.length < 21) {
      return 0; 
    }

    const wrist = handLandmarks[0];
    const tipIds = [4, 8, 12, 16, 20];
    const pipIds = [2, 6, 10, 14, 18];

    const handedness = results.multiHandedness[0]?.label || 'Right';

    if (handedness === 'Right') {
        fingerStates[0] = handLandmarks[tipIds[0]].x < handLandmarks[tipIds[0] - 1].x && handLandmarks[tipIds[0]].x < handLandmarks[tipIds[0] - 2].x;
    } else {
        fingerStates[0] = handLandmarks[tipIds[0]].x > handLandmarks[tipIds[0] - 1].x && handLandmarks[tipIds[0]].x > handLandmarks[tipIds[0] - 2].x;
    }
    
    if (fingerStates[0]) fingerCount++;

    // Step 2: Validate Landmark Logic
    for (let i = 1; i < 5; i++) {
        const fingerTip = handLandmarks[tipIds[i]];
        const fingerPip = handLandmarks[pipIds[i]];
        
        const distanceFromWrist = Math.sqrt(
            Math.pow(fingerTip.x - wrist.x, 2) +
            Math.pow(fingerTip.y - wrist.y, 2)
        );
        const distanceFromPip = Math.sqrt(
            Math.pow(fingerTip.x - fingerPip.x, 2) +
            Math.pow(fingerTip.y - fingerPip.y, 2)
        );

        // Example condition for finger being up
        if (distanceFromWrist > distanceFromPip * 1.5) {
            fingerStates[i] = true;
            fingerCount++;
        } else {
            fingerStates[i] = false;
        }
    }
    
    console.log("Detected Finger States:", fingerStates);
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
                const rawCount = countFingers(results);
                
                if (rawCount !== -1) {
                    // Step 3: Add Stability Filter
                    const maxFrameHistorySize = 5;
                    frameHistoryRef.current.push(rawCount);
                    if (frameHistoryRef.current.length > maxFrameHistorySize) {
                        frameHistoryRef.current.shift();
                    }
                    
                    const finalCount = mode(frameHistoryRef.current);
                    
                    console.log("Raw Landmarks Output:", results.multiHandLandmarks[0]);
                    console.log("Final Count:", finalCount);
                    
                    if (results.multiHandLandmarks[0]) {
                        drawLandmarks(ctx, results.multiHandLandmarks[0], canvas.width, canvas.height);
                    }
                    
                    setGestureResult({
                        fingerCount: finalCount,
                        landmarks: results.multiHandLandmarks,
                        isDetecting: true
                    });
                } else if (results.multiHandLandmarks[0]) {
                    drawLandmarks(ctx, results.multiHandLandmarks[0], canvas.width, canvas.height);
                }
            } else {
                frameHistoryRef.current = [];
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

  const loadMediaPipeModules = async () => {
    try {
      // Load MediaPipe modules with better error handling
      const cameraUtils = await import('@mediapipe/camera_utils');
      const mpHands = await import('@mediapipe/hands');
      
      // Validate that the modules loaded correctly
      if (!cameraUtils || !mpHands) {
        throw new Error('MediaPipe modules failed to load');
      }
      
      return { cameraUtils, mpHands };
    } catch (error) {
      console.error('Failed to load MediaPipe modules:', error);
      throw new Error(`MediaPipe modules could not be loaded: ${error.message}`);
    }
  };

  const initializeCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Get user media first
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
          if(videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve(true);
          }
        });
        
        if (canvasRef.current && videoRef.current) {
          const video = videoRef.current;
          canvasRef.current.width = video.videoWidth || 640;
          canvasRef.current.height = video.videoHeight || 480;
        }
      }

      // Load MediaPipe modules dynamically
      const { cameraUtils, mpHands } = await loadMediaPipeModules();
      
      // More robust way to access the Hands constructor
      let HandsConstructor = null;
      
      // Try multiple ways to access the constructor
      if (typeof mpHands.Hands === 'function') {
        HandsConstructor = mpHands.Hands;
      } else if (typeof (mpHands as any).default === 'function') {
        HandsConstructor = (mpHands as any).default;
      } else if (typeof (mpHands as any).default?.Hands === 'function') {
        HandsConstructor = (mpHands as any).default.Hands;
      } else if (typeof (window as any).Hands === 'function') {
        // Fallback to global if available
        HandsConstructor = (window as any).Hands;
      }
      
      if (!HandsConstructor) {
        throw new Error('Hands constructor not found. MediaPipe may not be properly loaded.');
      }

      const hands = new HandsConstructor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
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
        // More robust way to access the Camera constructor
        let CameraConstructor = null;
        
        if (typeof cameraUtils.Camera === 'function') {
          CameraConstructor = cameraUtils.Camera;
        } else if (typeof (cameraUtils as any).default === 'function') {
          CameraConstructor = (cameraUtils as any).default;
        } else if (typeof (cameraUtils as any).default?.Camera === 'function') {
          CameraConstructor = (cameraUtils as any).default.Camera;
        } else if (typeof (window as any).Camera === 'function') {
          // Fallback to global if available
          CameraConstructor = (window as any).Camera;
        }
        
        if (!CameraConstructor) {
          throw new Error('Camera constructor not found. MediaPipe camera utils may not be properly loaded.');
        }

        const camera = new CameraConstructor(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && handsRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });
        
        cameraRef.current = camera;
        await camera.start();
      }
      
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      console.error('Camera initialization error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to initialize camera: ${errorMessage}`);
      setIsInitialized(false);
    }
  }, [onResults]);

  useEffect(() => {
    if (enabled) {
      initializeCamera();
    }
    
    return () => {
      // Cleanup camera
      if (cameraRef.current && cameraRef.current.stop) {
        try {
          cameraRef.current.stop();
        } catch (e) {
          console.warn('Error stopping camera:', e);
        }
      }
      
      // Cleanup video stream
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