import { useEffect, useRef, useState, useCallback } from 'react';

interface HandGestureResult {
  fingerCount: number;
  landmarks: any[];
  isDetecting: boolean;
}

export const useHandGesture = () => {
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

  const countFingers = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length === 0) return 0;

    const hand = landmarks[0];
    if (!hand || !hand.landmark) return 0;

    const tips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
    const pips = [3, 6, 10, 14, 18]; // Joints below tips
    
    let fingerCount = 0;
    
    // Thumb (special case - check x coordinate)
    if (hand.landmark[tips[0]].x > hand.landmark[pips[0]].x) {
      fingerCount++;
    }
    
    // Other fingers (check y coordinate)
    for (let i = 1; i < 5; i++) {
      if (hand.landmark[tips[i]].y < hand.landmark[pips[i]].y) {
        fingerCount++;
      }
    }
    
    return Math.min(fingerCount, 5); // Cap at 5 fingers
  }, []);

  const onResults = useCallback((results: any) => {
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const fingerCount = countFingers(results.multiHandLandmarks);
          
          // Draw hand landmarks
          for (const landmarks of results.multiHandLandmarks) {
            drawLandmarks(ctx, landmarks.landmark, canvas.width, canvas.height);
          }
          
          // Draw finger count
          ctx.fillStyle = 'hsl(var(--cricket-ball))';
          ctx.font = 'bold 48px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(fingerCount.toString(), canvas.width / 2, 80);
          
          setGestureResult({
            fingerCount,
            landmarks: results.multiHandLandmarks,
            isDetecting: true
          });
        } else {
          setGestureResult({
            fingerCount: 0,
            landmarks: [],
            isDetecting: false
          });
        }
      }
    }
  }, [countFingers]);

  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    // Draw landmarks
    ctx.fillStyle = 'hsl(var(--cricket-ball))';
    landmarks.forEach((landmark) => {
      const x = landmark.x * width;
      const y = landmark.y * height;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Draw connections
    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.lineWidth = 2;
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [0, 17] // Palm
    ];
    
    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(startPoint.x * width, startPoint.y * height);
      ctx.lineTo(endPoint.x * width, endPoint.y * height);
      ctx.stroke();
    });
  };

  const initializeCamera = useCallback(async () => {
    try {
      console.log('Starting camera initialization...');
      
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
      
      // Initialize MediaPipe Hands
      console.log('Initializing MediaPipe Hands...');
      const { Hands } = await import('@mediapipe/hands');
      const { Camera } = await import('@mediapipe/camera_utils');
      
      const hands = new Hands({
        locateFile: (file) => {
          console.log(`Loading MediaPipe file: ${file}`);
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });
      
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      hands.onResults(onResults);
      handsRef.current = hands;
      console.log('MediaPipe Hands initialized successfully');
      
      if (videoRef.current) {
        console.log('Starting camera...');
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
        console.log('Camera started successfully');
      }
      
      setIsInitialized(true);
      setError(null);
      console.log('Camera initialization completed successfully');
    } catch (err) {
      console.error('Camera/MediaPipe initialization error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to initialize camera: ${errorMessage}`);
    }
  }, [onResults]);

  useEffect(() => {
    initializeCamera();
    
    return () => {
      // Cleanup
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [initializeCamera]);

  return {
    videoRef,
    canvasRef,
    gestureResult,
    isInitialized,
    error,
    reinitialize: initializeCamera
  };
};
