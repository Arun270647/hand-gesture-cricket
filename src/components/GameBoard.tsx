import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CameraView } from './CameraView';
import { ScoreBoard } from './ScoreBoard';
import { toast } from 'sonner';
import { Trophy, RotateCcw, Swords, Shield } from 'lucide-react';
import { useHandGesture } from '@/hooks/useHandGesture';

type GamePhase = 'toss' | 'batting' | 'bowling' | 'gameOver';
type TossChoice = 'odd' | 'even';

interface GameState {
  phase: GamePhase;
  playerScore: number;
  computerScore: number;
  playerChoice: TossChoice | null;
  target: number;
  currentInnings: 'first' | 'second';
  playerBatting: boolean;
  isPlayerTurn: boolean;
  gameActive: boolean;
}

export const GameBoard = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'toss', playerScore: 0, computerScore: 0, playerChoice: null, target: 0,
    currentInnings: 'first', playerBatting: false, isPlayerTurn: true, gameActive: false
  });
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [lastMove, setLastMove] = useState<{ player: number; computer: number; sum: number; result: string; } | null>(null);
  const [showTossOptions, setShowTossOptions] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  
  const { videoRef, canvasRef, gestureResult, isInitialized, error, reinitialize } = useHandGesture(isFrozen, hasGameStarted);

  const gestureResultRef = useRef(gestureResult);
  useEffect(() => {
    gestureResultRef.current = gestureResult;
  }, [gestureResult]);

  // Always-fresh ref for gameState so countdown effect never reads stale phase
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Only start countdown once camera is fully ready — prevents reading
  // empty frameHistory during toss (root cause of toss detection failure)
  useEffect(() => {
    if (hasGameStarted && gameState.playerChoice && isInitialized && countdown === null) {
      setCountdown(3);
    }
  }, [hasGameStarted, gameState.playerChoice, isInitialized]);

  const resetGame = () => {
    window.location.reload();
  };

  const startNextTurn = (delay = 1000) => {
    setIsFrozen(false);
    setLastMove(null);
    setTimeout(() => {
      setCountdown(2);
    }, delay);
  };

  const handleTossChoice = (choice: TossChoice) => {
    setHasGameStarted(true);
    setGameState(prev => ({ ...prev, playerChoice: choice, gameActive: true }));
  };
  
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setIsFrozen(true);
      const current = gestureResultRef.current;
      // Debug log: surface detection state at capture moment
      console.log(`[Toss Capture] fingerCount=${current.fingerCount} | isDetecting=${current.isDetecting} | isStable=${current.isStable} | stabilityMs=${current.stabilityCount}`);
      if (!current.isDetecting) {
        console.warn('[Toss Capture] No hand detected at capture — defaulting to 0');
      }
      handleGestureDetected(current.fingerCount);
      setCountdown(null);
    }
  }, [countdown]);

  const generateComputerMove = () => Math.floor(Math.random() * 6);

  const handleGestureDetected = (playerNumber: number) => {
    // Use ref so we always read the live phase, not a closure-captured one
    const currentPhase = gameStateRef.current.phase;
    if (!gameStateRef.current.gameActive || playerNumber < 0 || playerNumber > 5) return;

    const computerNumber = generateComputerMove();
    const sum = playerNumber + computerNumber;
    const isOdd = sum % 2 !== 0;

    setLastMove({ player: playerNumber, computer: computerNumber, sum, result: isOdd ? 'odd' : 'even' });
    toast.success(`You showed ${playerNumber}, AI showed ${computerNumber}`);

    setTimeout(() => {
      if (currentPhase === 'toss') {
        handleTossResult(isOdd);
      } else {
        handleGameMove(playerNumber, computerNumber);
      }
    }, 1500);
  };

  const handleTossResult = (isOdd: boolean) => {
    const playerWonToss = (gameState.playerChoice === 'odd' && isOdd) || (gameState.playerChoice === 'even' && !isOdd);
    if (playerWonToss) {
      toast.success("You won the toss! Please choose to bat or bowl.");
      setShowTossOptions(true);
    } else {
      toast.error("Computer won the toss!");
      setTimeout(() => {
        toast("Computer has chosen to bat.");
        setGameState(prev => ({ ...prev, phase: 'bowling', playerBatting: false, isPlayerTurn: true }));
        startNextTurn();
      }, 2000);
    }
  };

  const handleBatBowlSelect = (choice: 'bat' | 'bowl') => {
    const isBatting = choice === 'bat';
    toast(`You have chosen to ${choice}. Your turn!`);
    setGameState(prev => ({ ...prev, phase: isBatting ? 'batting' : 'bowling', playerBatting: isBatting, isPlayerTurn: true }));
    setShowTossOptions(false);
    startNextTurn();
  };
  
  const handleGameMove = (playerNumber: number, computerNumber: number) => {
    if (playerNumber === computerNumber) handlePlayerOut();
    else {
      updateScore(playerNumber, computerNumber);
      startNextTurn();
    }
  };

  const handlePlayerOut = () => {
    toast.error("OUT! Innings completed!");
    if (gameState.currentInnings === 'first') {
      const target = (gameState.playerBatting ? gameState.playerScore : gameState.computerScore) + 1;
      setGameState(prev => ({
        ...prev, currentInnings: 'second', phase: prev.playerBatting ? 'bowling' : 'batting',
        playerBatting: !prev.playerBatting, target, isPlayerTurn: true
      }));
      setTimeout(() => {
        toast.info(`Target to win: ${target} runs!`);
        startNextTurn();
      }, 1500);
    } else {
      endGame();
    }
  };

  const updateScore = (playerNumber: number, computerNumber: number) => {
    const runs = gameState.playerBatting ? playerNumber : computerNumber;
    setGameState(prev => {
      const newPlayerScore = prev.playerBatting ? prev.playerScore + runs : prev.playerScore;
      const newComputerScore = !prev.playerBatting ? prev.computerScore + runs : prev.computerScore;
      if (prev.currentInnings === 'second') {
        const chasingScore = prev.playerBatting ? newPlayerScore : newComputerScore;
        if (chasingScore >= prev.target) {
          setTimeout(() => endGame(true), 500);
          return { ...prev, playerScore: newPlayerScore, computerScore: newComputerScore };
        }
      }
      return { ...prev, playerScore: newPlayerScore, computerScore: newComputerScore };
    });
    toast.success(`${runs} run${runs !== 1 ? 's' : ''}!`);
  };

  const endGame = (targetReached = false) => {
    const playerWon = targetReached ? gameState.playerBatting : gameState.playerScore > gameState.computerScore;
    setGameState(prev => ({ ...prev, phase: 'gameOver', gameActive: false }));
    setTimeout(() => toast(playerWon ? "🎉 Congratulations, You won!" : "💻 Computer won!", { duration: 5000 }), 1000);
  };
  
  const getGameStatus = () => {
    if (showTossOptions) return "Choose to bat or bowl.";
    if (!isInitialized && hasGameStarted) return "Initializing Camera...";
    if (countdown !== null && countdown > 0) {
      // Step 7: UI feedback — warn if hand not stable during countdown
      if (gestureResult.isDetecting && !gestureResult.isStable) {
        return `Hold your hand steady... (${countdown})`;
      }
      return `Showing number in ${countdown}...`;
    }
    if (isFrozen) return "Processing move...";
    switch (gameState.phase) {
      case 'toss': return gameState.playerChoice ? 'Show your number for the toss' : 'Choose Odd or Even for toss';
      default: return 'Hand Cricket AI';
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 bounce-in">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-cricket-ball bg-clip-text text-transparent">
            Hand Cricket AI
          </h1>
          <p className="text-muted-foreground">{getGameStatus()}</p>
        </div>
        {hasGameStarted ? (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <CameraView {...{ videoRef, canvasRef, gestureResult, isInitialized, error, reinitialize, isFrozen }} />
              {showTossOptions && (
                <Card className="game-card text-center"><h3 className="text-xl font-semibold mb-4">You Won the Toss!</h3><div className="flex gap-4 justify-center"><Button onClick={() => handleBatBowlSelect('bat')} size="lg"><Swords className="mr-2 h-5 w-5" /> Bat</Button><Button onClick={() => handleBatBowlSelect('bowl')} size="lg"><Shield className="mr-2 h-5 w-5" /> Bowl</Button></div></Card>
              )}
              {lastMove && (
                <Card className="game-card"><h3 className="font-semibold mb-3">Last Move</h3><div className="grid grid-cols-3 gap-4 text-center"><div><div className="text-2xl font-bold text-primary">{lastMove.player}</div><div className="text-sm text-muted-foreground">You</div></div><div><div className="text-xl font-semibold">+</div><div className="text-xs text-muted-foreground">Sum: {lastMove.sum}</div></div><div><div className="text-2xl font-bold text-cricket-ball">{lastMove.computer}</div><div className="text-sm text-muted-foreground">AI</div></div></div>{lastMove.result && gameState.phase === 'toss' && (<div className="mt-3 text-center"><Badge variant="secondary">{lastMove.result.toUpperCase()}</Badge></div>)}</Card>
              )}
            </div>
            <div className="space-y-6">
              <ScoreBoard gameState={gameState} lastMove={lastMove} liveFingerCount={gestureResult.fingerCount} tossInProgress={isFrozen} />
              {countdown !== null && countdown > 0 && (
                <Card className="text-center p-4 rounded-lg bg-card shadow-lg">
                    <div className="text-3xl font-bold text-primary animate-pulse">
                        Show Number
                    </div>
                    <div className="text-lg text-muted-foreground">
                        in {countdown}
                    </div>
                </Card>
              )}
              <Card className="game-card text-center"><div className="space-y-4">{gameState.phase === 'gameOver' && (<div className="mb-4"><Trophy className="w-16 h-16 mx-auto mb-2 text-yellow-500" /><h3 className="text-xl font-semibold">{gameState.playerScore > gameState.computerScore ? 'Congratulations, You Won!' : 'Computer Won!'}</h3></div>)}<Button onClick={resetGame} variant="outline" size="lg" className="w-full"><RotateCcw className="w-4 h-4 mr-2" />New Game</Button></div></Card>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center mt-16">
            <Card className="game-card text-center w-full max-w-md animate-in fade-in zoom-in-95">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Choose for Toss</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 justify-center">
                        <Button onClick={() => handleTossChoice('odd')} variant="outline" className="px-8 py-4 text-lg">Odd</Button>
                        <Button onClick={() => handleTossChoice('even')} variant="outline" className="px-8 py-4 text-lg">Even</Button>
                    </div>
                </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};