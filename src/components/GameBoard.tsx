import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

  const [lastMove, setLastMove] = useState<{ player: number; computer: number; sum: number; result: string; } | null>(null);
  const [showTossOptions, setShowTossOptions] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  
  const { videoRef, canvasRef, gestureResult, isInitialized, error, reinitialize } = useHandGesture(isFrozen);

  const gestureResultRef = useRef(gestureResult);
  useEffect(() => {
    gestureResultRef.current = gestureResult;
  }, [gestureResult]);

  const resetGame = () => {
    setGameState({
      phase: 'toss', playerScore: 0, computerScore: 0, playerChoice: null, target: 0,
      currentInnings: 'first', playerBatting: false, isPlayerTurn: true, gameActive: false
    });
    setLastMove(null);
    setShowTossOptions(false);
    setCountdown(null);
    setIsFrozen(false);
    toast("New game started!");
  };

  const startNextTurn = (delay = 1000) => {
    setIsFrozen(false);
    setLastMove(null);
    setTimeout(() => {
      setCountdown(2); // Countdown will show 2, then 1
    }, delay);
  };

  const handleTossChoice = (choice: TossChoice) => {
    setGameState(prev => ({ ...prev, playerChoice: choice, gameActive: true }));
    setCountdown(3);
  };
  
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setIsFrozen(true);
      handleGestureDetected(gestureResultRef.current.fingerCount);
      setCountdown(null);
    }
  }, [countdown]);

  const generateComputerMove = () => Math.floor(Math.random() * 6); // 0-5

  const handleGestureDetected = (playerNumber: number) => {
    if (!gameState.gameActive || playerNumber < 0 || playerNumber > 5) return;
    
    const computerNumber = generateComputerMove();
    const sum = playerNumber + computerNumber;
    const isOdd = sum % 2 !== 0;

    setLastMove({ player: playerNumber, computer: computerNumber, sum, result: isOdd ? 'odd' : 'even' });
    toast.success(`You showed ${playerNumber}, AI showed ${computerNumber}`);

    setTimeout(() => {
      if (gameState.phase === 'toss') {
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
    if (playerNumber === computerNumber) {
        handlePlayerOut();
    } else {
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
    if (countdown !== null) return `Showing number in ${countdown}...`;
    if (isFrozen) return "Processing move...";
    switch (gameState.phase) {
      case 'toss': return gameState.playerChoice ? 'Show your number for the toss' : 'Choose Odd or Even for toss';
      case 'batting': return gameState.playerBatting ? 'You are batting' : 'Computer is batting';
      case 'bowling': return gameState.playerBatting ? 'Computer is bowling' : 'You are bowling';
      case 'gameOver': return 'Game Over';
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
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <CameraView {...{ videoRef, canvasRef, gestureResult, isInitialized, error, reinitialize, isFrozen }} />
              {countdown !== null && countdown > 0 && (
                <div className="text-6xl font-bold text-primary animate-ping">
                  {countdown}
                </div>
              )}
            </div>
            {gameState.phase === 'toss' && !gameState.playerChoice && !showTossOptions && (
              <Card className="game-card text-center"><h3 className="text-xl font-semibold mb-4">Choose for Toss</h3><div className="flex gap-4 justify-center"><Button onClick={() => handleTossChoice('odd')} variant="outline" className="px-8 py-4 text-lg">Odd</Button><Button onClick={() => handleTossChoice('even')} variant="outline" className="px-8 py-4 text-lg">Even</Button></div></Card>
            )}
            {showTossOptions && (
              <Card className="game-card text-center"><h3 className="text-xl font-semibold mb-4">You Won the Toss!</h3><div className="flex gap-4 justify-center"><Button onClick={() => handleBatBowlSelect('bat')} size="lg"><Swords className="mr-2 h-5 w-5" /> Bat</Button><Button onClick={() => handleBatBowlSelect('bowl')} size="lg"><Shield className="mr-2 h-5 w-5" /> Bowl</Button></div></Card>
            )}
            {lastMove && (
              <Card className="game-card"><h3 className="font-semibold mb-3">Last Move</h3><div className="grid grid-cols-3 gap-4 text-center"><div><div className="text-2xl font-bold text-primary">{lastMove.player}</div><div className="text-sm text-muted-foreground">You</div></div><div><div className="text-xl font-semibold">+</div><div className="text-xs text-muted-foreground">Sum: {lastMove.sum}</div></div><div><div className="text-2xl font-bold text-cricket-ball">{lastMove.computer}</div><div className="text-sm text-muted-foreground">AI</div></div></div>{lastMove.result && gameState.phase === 'toss' && (<div className="mt-3 text-center"><Badge variant="secondary">{lastMove.result.toUpperCase()}</Badge></div>)}</Card>
            )}
          </div>
          <div className="space-y-6">
            <ScoreBoard gameState={gameState} lastMove={lastMove} liveFingerCount={gestureResult.fingerCount} tossInProgress={isFrozen} />
            <Card className="game-card text-center"><div className="space-y-4">{gameState.phase === 'gameOver' && (<div className="mb-4"><Trophy className="w-16 h-16 mx-auto mb-2 text-yellow-500" /><h3 className="text-xl font-semibold">{gameState.playerScore > gameState.computerScore ? 'Congratulations, You Won!' : 'Computer Won!'}</h3></div>)}<Button onClick={resetGame} variant="outline" size="lg" className="w-full"><RotateCcw className="w-4 h-4 mr-2" />New Game</Button><div className="text-left text-sm text-muted-foreground mt-4 p-4 bg-muted/50 rounded-lg"><h4 className="font-semibold mb-2">How to Play:</h4><ul className="space-y-1 text-xs"><li>• Show 0-5 fingers to the camera.</li><li>• Odd/Even sum wins the toss.</li><li>• Same numbers = OUT!</li><li>• Score runs when batting.</li></ul></div></div></Card>
          </div>
        </div>
      </div>
    </div>
  );
};