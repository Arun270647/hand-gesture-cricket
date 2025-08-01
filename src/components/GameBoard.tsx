import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CameraView } from './CameraView';
import { ScoreBoard } from './ScoreBoard';
import { toast } from 'sonner';
import { Trophy, Play, RotateCcw } from 'lucide-react';

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
    phase: 'toss',
    playerScore: 0,
    computerScore: 0,
    playerChoice: null,
    target: 0,
    currentInnings: 'first',
    playerBatting: false,
    isPlayerTurn: true,
    gameActive: false
  });

  const [lastMove, setLastMove] = useState<{
    player: number;
    computer: number;
    sum: number;
    result: string;
  } | null>(null);

  const resetGame = () => {
    setGameState({
      phase: 'toss',
      playerScore: 0,
      computerScore: 0,
      playerChoice: null,
      target: 0,
      currentInnings: 'first',
      playerBatting: false,
      isPlayerTurn: true,
      gameActive: false
    });
    setLastMove(null);
    toast("New game started!");
  };

  const handleTossChoice = (choice: TossChoice) => {
    setGameState(prev => ({ ...prev, playerChoice: choice, gameActive: true }));
  };

  const generateComputerMove = () => {
    return Math.floor(Math.random() * 5) + 1; // 1-5
  };

  const handleGestureDetected = (playerNumber: number) => {
    if (!gameState.gameActive || playerNumber < 1 || playerNumber > 5) return;

    const computerNumber = generateComputerMove();
    const sum = playerNumber + computerNumber;
    const isOdd = sum % 2 === 1;

    setLastMove({
      player: playerNumber,
      computer: computerNumber,
      sum,
      result: isOdd ? 'odd' : 'even'
    });

    if (gameState.phase === 'toss') {
      handleTossResult(isOdd, sum);
    } else {
      handleGameMove(playerNumber, computerNumber, sum, isOdd);
    }
  };

  const handleTossResult = (isOdd: boolean, sum: number) => {
    const playerWonToss = (gameState.playerChoice === 'odd' && isOdd) || 
                         (gameState.playerChoice === 'even' && !isOdd);
    
    toast(playerWonToss ? "You won the toss!" : "Computer won the toss!");
    
    // For simplicity, winner chooses to bat first
    const playerBatting = playerWonToss;
    
    setGameState(prev => ({
      ...prev,
      phase: playerBatting ? 'batting' : 'bowling',
      playerBatting,
      isPlayerTurn: true,
      gameActive: true
    }));

    setTimeout(() => {
      toast(playerBatting ? "You're batting first!" : "You're bowling first!");
    }, 1500);
  };

  const handleGameMove = (playerNumber: number, computerNumber: number, sum: number, isOdd: boolean) => {
    const isOut = (gameState.playerBatting && gameState.isPlayerTurn && playerNumber === computerNumber) ||
                  (!gameState.playerBatting && !gameState.isPlayerTurn && playerNumber === computerNumber);

    if (isOut) {
      handlePlayerOut();
    } else {
      updateScore(playerNumber, computerNumber);
    }
  };

  const handlePlayerOut = () => {
    toast("OUT! Innings completed!");
    
    if (gameState.currentInnings === 'first') {
      // Switch innings
      const target = gameState.playerBatting ? gameState.playerScore + 1 : gameState.computerScore + 1;
      
      setGameState(prev => ({
        ...prev,
        currentInnings: 'second',
        phase: prev.playerBatting ? 'bowling' : 'batting',
        playerBatting: !prev.playerBatting,
        target,
        isPlayerTurn: true
      }));

      setTimeout(() => {
        toast(`Target: ${target} runs!`);
      }, 1500);
    } else {
      // Game over
      endGame();
    }
  };

  const updateScore = (playerNumber: number, computerNumber: number) => {
    const runs = gameState.playerBatting === gameState.isPlayerTurn ? playerNumber : computerNumber;
    
    setGameState(prev => {
      const newPlayerScore = gameState.playerBatting && gameState.isPlayerTurn ? 
        prev.playerScore + runs : prev.playerScore;
      const newComputerScore = !gameState.playerBatting && !gameState.isPlayerTurn ? 
        prev.computerScore + runs : prev.computerScore;

      // Check if target is achieved in second innings
      if (prev.currentInnings === 'second') {
        const chasingScore = prev.playerBatting ? newPlayerScore : newComputerScore;
        if (chasingScore >= prev.target) {
          setTimeout(() => endGame(true), 1000);
        }
      }

      return {
        ...prev,
        playerScore: newPlayerScore,
        computerScore: newComputerScore,
        isPlayerTurn: !prev.isPlayerTurn
      };
    });

    toast(`${runs} run${runs !== 1 ? 's' : ''} scored!`);
  };

  const endGame = (targetReached = false) => {
    setGameState(prev => ({ ...prev, phase: 'gameOver', gameActive: false }));
    
    const playerWon = targetReached ? 
      gameState.playerBatting : 
      gameState.playerScore > gameState.computerScore;

    setTimeout(() => {
      toast(playerWon ? "🎉 You won!" : "💻 Computer won!", {
        duration: 5000
      });
    }, 1000);
  };

  const getGameStatus = () => {
    switch (gameState.phase) {
      case 'toss':
        return 'Choose Odd or Even for toss';
      case 'batting':
        return gameState.playerBatting ? 'You are batting' : 'You are bowling';
      case 'bowling':
        return gameState.playerBatting ? 'You are batting' : 'You are bowling';
      case 'gameOver':
        return 'Game Over';
      default:
        return 'Hand Cricket AI';
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 bounce-in">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-cricket-ball bg-clip-text text-transparent">
            Hand Cricket AI
          </h1>
          <p className="text-muted-foreground">{getGameStatus()}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Camera and Controls */}
          <div className="space-y-6">
            <CameraView
              onGestureDetected={handleGestureDetected}
              isGameActive={gameState.gameActive && gameState.isPlayerTurn}
            />

            {/* Toss Selection */}
            {gameState.phase === 'toss' && !gameState.playerChoice && (
              <Card className="game-card text-center">
                <h3 className="text-xl font-semibold mb-4">Choose for Toss</h3>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => handleTossChoice('odd')}
                    variant="outline"
                    className="px-8 py-4 text-lg"
                  >
                    Odd
                  </Button>
                  <Button
                    onClick={() => handleTossChoice('even')}
                    variant="outline"
                    className="px-8 py-4 text-lg"
                  >
                    Even
                  </Button>
                </div>
              </Card>
            )}

            {/* Last Move Display */}
            {lastMove && (
              <Card className="game-card">
                <h3 className="font-semibold mb-3">Last Move</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{lastMove.player}</div>
                    <div className="text-sm text-muted-foreground">You</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold">+</div>
                    <div className="text-xs text-muted-foreground">Sum: {lastMove.sum}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cricket-ball">{lastMove.computer}</div>
                    <div className="text-sm text-muted-foreground">AI</div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <Badge variant="secondary">{lastMove.result.toUpperCase()}</Badge>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Score and Game Info */}
          <div className="space-y-6">
            <ScoreBoard gameState={gameState} />

            {/* Game Controls */}
            <Card className="game-card text-center">
              <div className="space-y-4">
                {gameState.phase === 'gameOver' && (
                  <div className="mb-4">
                    <Trophy className="w-16 h-16 mx-auto mb-2 text-cricket-ball" />
                    <h3 className="text-xl font-semibold">
                      {gameState.playerScore > gameState.computerScore ? 'You Won!' : 'Computer Won!'}
                    </h3>
                  </div>
                )}

                <Button
                  onClick={resetGame}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Game
                </Button>

                {/* Game Instructions */}
                <div className="text-left text-sm text-muted-foreground mt-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">How to Play:</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Show 1-5 fingers to the camera</li>
                    <li>• Odd/Even sum wins the toss</li>
                    <li>• Same numbers = OUT!</li>
                    <li>• Score runs when batting</li>
                    <li>• Defend when bowling</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};