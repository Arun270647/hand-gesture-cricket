import { useEffect, useRef, useState, useCallback } from 'react';

// Dynamic imports for MediaPipe to avoid Netlify issues
let cameraUtils: any = null;
let mpHands: any = null;

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
  const [retryCount, setRetryCount] = useState(0);
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
      console.log(`Starting camera initialization (attempt ${retryCount + 1})...`);
      
      // Add delay for retries to avoid overwhelming the server
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 10000)));
      }
      
      // Request camera permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      console.log('Camera stream obtained successfully');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('Video stream attached to video element');
        
        await new Promise((resolve, reject) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              console.log('Video metadata loaded');
              resolve(true);
            };
            videoRef.current.onerror = reject;
          }
        });
        
        // Set canvas dimensions to match video
        if (canvasRef.current && videoRef.current) {
          const video = videoRef.current;
          canvasRef.current.width = video.videoWidth || 640;
          canvasRef.current.height = video.videoHeight || 480;
          console.log(`Canvas dimensions set to: ${canvasRef.current.width}x${canvasRef.current.height}`);
        }
      }
      
      // Initialize MediaPipe Hands with dynamic imports
      console.log('Loading MediaPipe modules...');
      
      try {
        // Dynamic imports to avoid Netlify issues
        if (!mpHands) {
          mpHands = await import('@mediapipe/hands');
        }
        if (!cameraUtils) {
          cameraUtils = await import('@mediapipe/camera_utils');
        }
        
        console.log('MediaPipe modules loaded successfully');
      } catch (importError) {
        console.error('Failed to load MediaPipe modules:', importError);
        throw new Error('Failed to load MediaPipe. Please check your internet connection and try again.');
      }
      
      const hands = new mpHands.Hands({
        locateFile: (file) => {
          console.log(`Loading MediaPipe file: ${file}`);
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });
      
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Reduced complexity for better performance
        minDetectionConfidence: 0.7, // Higher confidence for better accuracy
        minTrackingConfidence: 0.5
      });
      
      hands.onResults(onResults);
      handsRef.current = hands;
      console.log('MediaPipe Hands initialized successfully');
      
      if (videoRef.current) {
        console.log('Starting camera...');
        let frameCount = 0;
        const camera = new cameraUtils.Camera(videoRef.current, {
          onFrame: async () => {
            // Process every 3rd frame to reduce load and prevent freezing
            frameCount++;
            if (frameCount % 3 === 0 && videoRef.current && handsRef.current) {
              try {
                await handsRef.current.send({ image: videoRef.current });
              } catch (error) {
                console.error('Error processing frame:', error);
              }
            }
          },
          width: 640,
          height: 480
        });
        await camera.start();
        console.log('Camera started successfully');
      }
      
      setIsInitialized(true);
      setError(null);
      console.log('Camera initialization completed successfully');
    } catch (err) {
      console.error('Camera/MediaPipe initialization error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Provide more helpful error messages for common Netlify issues
      if (errorMessage.includes('KC.Hands is not a constructor')) {
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            console.log('Retrying MediaPipe initialization...');
            initializeCamera();
          }, 2000);
          return;
        } else {
          setError('MediaPipe failed to load after multiple attempts. This is a known issue with Netlify. Please try refreshing the page or check your internet connection.');
        }
      } else if (errorMessage.includes('Failed to load MediaPipe')) {
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            console.log('Retrying MediaPipe initialization...');
            initializeCamera();
          }, 2000);
          return;
        } else {
          setError('MediaPipe modules could not be loaded after multiple attempts. Please check your internet connection and try again.');
        }
      } else {
        setError(`Failed to initialize camera: ${errorMessage}`);
      }
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

  const reinitialize = useCallback(() => {
    setRetryCount(0);
    setError(null);
    setIsInitialized(false);
    initializeCamera();
  }, [initializeCamera]);

  return {
    videoRef,
    canvasRef,
    gestureResult,
    isInitialized,
    error,
    reinitialize
  };
};