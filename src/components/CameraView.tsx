import React from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw } from 'lucide-react';

interface CameraViewProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    gestureResult: { fingerCount: number; isDetecting: boolean };
    isInitialized: boolean;
    error: string | null;
    reinitialize: () => void;
    isFrozen: boolean;
}

export const CameraView = ({ videoRef, canvasRef, gestureResult, isInitialized, error, reinitialize, isFrozen }: CameraViewProps) => {

  if (error) {
    return (
      <div className="camera-view w-full max-w-md mx-auto p-6 text-center">
        <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <div className="text-destructive mb-4">
          <p className="font-semibold mb-2">Camera Error</p>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-2 text-muted-foreground">
            This may be due to browser compatibility or network issues. Please try refreshing the page or using a different browser.
          </p>
        </div>
        <Button onClick={reinitialize} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Camera
        </Button>
      </div>
    );
  }

  return (
    <div className="camera-view w-full max-w-md mx-auto flex flex-col gap-4">
      <div className="bg-card/90 backdrop-blur-sm rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {isInitialized ? 'Camera Ready' : 'Initializing...'}
          </span>
          <div className={`w-3 h-3 rounded-full ${isInitialized ? 'bg-success' : 'bg-warning'}`} />
        </div>
        
        {isInitialized && (
          <div className="mt-2 text-center">
            <div className="text-3xl font-bold text-cricket-ball mb-1">
              {gestureResult.fingerCount}
            </div>
            <div className="text-xs text-muted-foreground">
              {gestureResult.isDetecting ? 
                `${gestureResult.fingerCount} finger${gestureResult.fingerCount !== 1 ? 's' : ''}` :
                'Show your hand (0-5 fingers)'}
            </div>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl bg-gray-900 min-h-[360px] flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          style={{ visibility: isInitialized ? 'visible' : 'hidden', opacity: isInitialized ? 0.3 : 0 }}/>
        
        <canvas ref={canvasRef} width={640} height={480}
          className="relative w-full h-auto scale-x-[-1] max-w-full"
          style={{ display: isInitialized ? 'block' : 'none', minHeight: '360px' }}/>
        
        {!isInitialized && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Camera className="w-12 h-12 mx-auto mb-2 animate-pulse" />
              <p>Initializing camera...</p>
            </div>
          </div>
        )}
        
        {isFrozen && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="text-white text-2xl font-bold bg-slate-800/50 p-4 rounded-lg">Captured!</div>
            </div>
        )}
      </div>
    </div>
  );
};