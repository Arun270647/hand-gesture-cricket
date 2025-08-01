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
    const mcp = [2, 5, 9, 13, 17]; // Knuckles for better accuracy
    
    let fingerCount = 0;
    
    // Enhanced thumb detection (check both x and y relative to wrist)
    const wrist = hand.landmark[0];
    const thumbTip = hand.landmark[4];
    const thumbMcp = hand.landmark[2];
    
    // Thumb is extended if tip is farther from wrist than MCP joint
    const thumbWristDist = Math.sqrt(
      Math.pow(thumbTip.x - wrist.x, 2) + Math.pow(thumbTip.y - wrist.y, 2)
    );
    const thumbMcpWristDist = Math.sqrt(
      Math.pow(thumbMcp.x - wrist.x, 2) + Math.pow(thumbMcp.y - wrist.y, 2)
    );
    
    if (thumbWristDist > thumbMcpWristDist * 1.2) {
      fingerCount++;
    }
    
    // Enhanced finger detection for index, middle, ring, pinky
    for (let i = 1; i < 5; i++) {
      const tip = hand.landmark[tips[i]];
      const pip = hand.landmark[pips[i]];
      const mcpJoint = hand.landmark[mcp[i]];
      
      // Check if tip is above PIP and PIP is above MCP (finger extended)
      const tipAbovePip = tip.y < pip.y;
      const pipAboveMcp = pip.y < mcpJoint.y;
      
      // Additional check: tip should be significantly higher than MCP
      const tipMcpDistance = mcpJoint.y - tip.y;
      
      if (tipAbovePip && pipAboveMcp && tipMcpDistance > 0.02) {
        fingerCount++;
      }
    }
    
    return Math.min(Math.max(fingerCount, 0), 5); // Ensure 0-5 range
  }, []);

  const onResults = useCallback((results: any) => {
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Clear canvas with better performance
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const fingerCount = countFingers(results.multiHandLandmarks);
          
          // Only draw landmarks if needed for performance
          if (results.multiHandLandmarks[0].landmark) {
            drawLandmarks(ctx, results.multiHandLandmarks[0].landmark, canvas.width, canvas.height);
          }
          
          // Draw finger count with better styling
          ctx.save();
          ctx.fillStyle = '#FF6B35'; // Cricket ball orange
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 4;
          ctx.font = 'bold 64px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          
          const text = fingerCount.toString();
          const x = canvas.width / 2;
          const y = 40;
          
          // Draw text outline for better visibility
          ctx.strokeText(text, x, y);
          ctx.fillText(text, x, y);
          
          // Draw confidence indicator
          ctx.font = '16px Arial';
          ctx.fillText(`${fingerCount} finger${fingerCount !== 1 ? 's' : ''}`, x, y + 80);
          ctx.restore();
          
          setGestureResult({
            fingerCount,
            landmarks: results.multiHandLandmarks,
            isDetecting: true
          });
        } else {
          // Show "no hand detected" message
          ctx.save();
          ctx.fillStyle = '#888888';
          ctx.font = '24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Show your hand', canvas.width / 2, canvas.height / 2);
          ctx.restore();
          
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
    // Draw key landmarks only for better performance
    ctx.save();
    
    // Draw finger tips with larger circles
    const fingerTips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
    ctx.fillStyle = '#FF6B35'; // Cricket ball orange
    fingerTips.forEach((tipIndex) => {
      const landmark = landmarks[tipIndex];
      const x = landmark.x * width;
      const y = landmark.y * height;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Draw palm center
    const palmCenter = landmarks[0]; // Wrist
    ctx.fillStyle = '#2E7D32'; // Green
    ctx.beginPath();
    ctx.arc(palmCenter.x * width, palmCenter.y * height, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw simplified hand connections for better performance
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 3;
    const mainConnections = [
      [0, 5], [5, 9], [9, 13], [13, 17], [17, 0], // Palm outline
      [5, 8], [9, 12], [13, 16], [17, 20], [1, 4] // To finger tips
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
        const camera = new Camera(videoRef.current, {
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
