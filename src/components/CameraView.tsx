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

  // Auto-detect gesture when game is active and fingers are detected
  React.useEffect(() => {
    if (isGameActive && gestureResult.isDetecting && gestureResult.fingerCount > 0) {
      const timer = setTimeout(() => {
        onGestureDetected(gestureResult.fingerCount);
      }, 1000); // 1 second delay to confirm gesture
      
      return () => clearTimeout(timer);
    }
  }, [isGameActive, gestureResult, onGestureDetected]);

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
      <div className="relative overflow-hidden rounded-xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          style={{ visibility: 'hidden' }}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-auto scale-x-[-1] gesture-overlay"
        />
        
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
            
            {gestureResult.isDetecting && (
              <div className="mt-2 text-center">
                <div className="text-2xl font-bold text-cricket-ball">
                  {gestureResult.fingerCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  {gestureResult.fingerCount === 0 ? 'No fingers detected' : 
                   gestureResult.fingerCount === 1 ? '1 finger' : 
                   `${gestureResult.fingerCount} fingers`}
                </div>
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