import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2 } from 'lucide-react';

interface PreloaderProps {
  onFinished: () => void;
}

export const Preloader = ({ onFinished }: PreloaderProps) => {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 4000); // Show button after 4 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-background/95 backdrop-blur-sm text-center">
      <div className="mb-4">
        <Gamepad2 className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Welcome to Hand Cricket AI!</h1>
        <p className="text-muted-foreground">Get ready to play cricket with your hands.</p>
      </div>
      
      <Card className="w-full max-w-md text-left bg-transparent border-border/50 shadow-lg">
          <CardHeader>
              <CardTitle className="text-2xl font-bold">How to Play</CardTitle>
          </CardHeader>
          <CardContent>
              <ul className="space-y-4 text-sm">
                  <li>
                      <p className="font-bold text-base">1. Toss</p>
                      <p className="text-muted-foreground">Choose 'Odd' or 'Even', then show a number using your fingers in the webcam from 0 to 5. Winner decides to bat or bowl.</p>
                  </li>
                  <li>
                      <p className="font-bold text-base">2. Batting/Bowling</p>
                      <p className="text-muted-foreground">Show a number (0-5) each turn.</p>
                  </li>
                  <li>
                      <p className="font-bold text-base">3. OUT!</p>
                      <p className="text-muted-foreground">If your number matches the AI's, the batsman is out!</p>
                  </li>
              </ul>
          </CardContent>
      </Card>

      <div className="mt-8">
        {showButton && (
          <Button onClick={onFinished} size="lg" className="animate-pulse">
            Let's Play!
          </Button>
        )}
      </div>
    </div>
  );
};