import React from 'react';
import { useHandGesture } from '@/hooks/useHandGesture';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw } from 'lucide-react';

interface CameraViewProps {
  onGestureDetected: (fingerCount: number) => void;
  isGameActive: boolean;
}

export const CameraView = ({ onGestureDetected, isGameActive }: CameraViewProps) => {
  const { videoRef, canvasRef, gestureResult, isInitialized, error, reinitialize } = useHandGesture();
  const [lastDetectedNumber, setLastDetectedNumber] = React.useState<number>(0);
  const [detectionTimer, setDetectionTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [confirmationProgress, setConfirmationProgress] = React.useState(0);

  // Enhanced gesture detection with smoother confirmation
  React.useEffect(() => {
    if (isGameActive && gestureResult.isDetecting && gestureResult.fingerCount > 0) {
      const currentNumber = gestureResult.fingerCount;
      
      if (currentNumber === lastDetectedNumber && currentNumber > 0) {
        // Same number detected, start/continue confirmation timer
        if (!detectionTimer) {
          let progress = 0;
          const timer = setInterval(() => {
            progress += 10;
            setConfirmationProgress(progress);
            
            if (progress >= 100) {
              onGestureDetected(currentNumber);
              clearInterval(timer);
              setDetectionTimer(null);
              setConfirmationProgress(0);
              setLastDetectedNumber(0);
            }
          }, 100); // 1 second total (100ms * 10)
          
          setDetectionTimer(timer);
        }
      } else {
        // Different number detected, reset timer
        if (detectionTimer) {
          clearInterval(detectionTimer);
          setDetectionTimer(null);
        }
        setConfirmationProgress(0);
        setLastDetectedNumber(currentNumber);
      }
    } else {
      // No gesture detected, clear timer
      if (detectionTimer) {
        clearInterval(detectionTimer);
        setDetectionTimer(null);
      }
      setConfirmationProgress(0);
      setLastDetectedNumber(0);
    }
    
    return () => {
      if (detectionTimer) {
        clearInterval(detectionTimer);
      }
    };
  }, [isGameActive, gestureResult, lastDetectedNumber, detectionTimer, onGestureDetected]);

  if (error) {
    return (
      <div className="camera-view w-full max-w-md mx-auto p-6 text-center">
        <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={reinitialize} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Camera
        </Button>
      </div>
    );
  }

  return (
    <div className="camera-view relative w-full max-w-md mx-auto">
      <div className="relative overflow-hidden rounded-xl bg-gray-900 min-h-[360px] flex items-center justify-center">
        {/* Video Element - Hidden but used for processing */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          style={{ 
            visibility: isInitialized ? 'visible' : 'hidden',
            opacity: isInitialized ? 0.3 : 0 
          }}
        />
        
        {/* Canvas Overlay for Gesture Recognition */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="relative w-full h-auto scale-x-[-1] max-w-full"
          style={{ 
            display: isInitialized ? 'block' : 'none',
            minHeight: '360px'
          }}
        />
        
        {/* Loading State */}
        {!isInitialized && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Camera className="w-12 h-12 mx-auto mb-2 animate-pulse" />
              <p>Initializing camera...</p>
            </div>
          </div>
        )}
        
        {/* Gesture Status Overlay */}
        <div className="absolute top-4 left-4 right-4">
          <div className="bg-card/90 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {isInitialized ? 'Camera Ready' : 'Initializing...'}
              </span>
              <div className={`w-3 h-3 rounded-full ${
                isInitialized ? 'bg-success' : 'bg-warning'
              }`} />
            </div>
            
            {gestureResult.isDetecting ? (
              <div className="mt-2 text-center">
                <div className="text-3xl font-bold text-cricket-ball mb-1">
                  {gestureResult.fingerCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  {gestureResult.fingerCount === 0 ? 'No fingers detected' : 
                   gestureResult.fingerCount === 1 ? '1 finger' : 
                   `${gestureResult.fingerCount} fingers`}
                </div>
                
                {/* Confirmation Progress Bar */}
                {isGameActive && confirmationProgress > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-cricket-ball h-2 rounded-full transition-all duration-100"
                        style={{ width: `${confirmationProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Hold steady... {Math.round(confirmationProgress)}%
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 text-center text-muted-foreground text-sm">
                Show your hand (1-5 fingers)
              </div>
            )}
          </div>
        </div>
        
        {/* Game Status */}
        {isGameActive && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-primary/90 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-primary-foreground font-medium">
                Show your number (1-5)
              </div>
              <div className="text-primary-foreground/80 text-sm">
                Hold for 1 second to confirm
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};