import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { User, Bot, Target, Trophy } from 'lucide-react';

interface GameState {
  phase: 'toss' | 'batting' | 'bowling' | 'gameOver';
  playerScore: number;
  computerScore: number;
  target: number;
  currentInnings: 'first' | 'second';
  playerBatting: boolean;
  isPlayerTurn: boolean;
  playerChoice: 'odd' | 'even' | null;
}

interface ScoreBoardProps {
  gameState: GameState;
  lastMove: { player: number; computer: number } | null;
  liveFingerCount: number;
  tossInProgress: boolean;
}

export const ScoreBoard = ({ gameState, lastMove, liveFingerCount, tossInProgress }: ScoreBoardProps) => {
  const getTargetProgress = () => {
    if (gameState.currentInnings === 'first' || gameState.target === 0) return 0;
    const currentScore = gameState.playerBatting ? gameState.playerScore : gameState.computerScore;
    return Math.min((currentScore / gameState.target) * 100, 100);
  };

  const getPlayerDisplayNumber = () => {
    if (gameState.phase === 'toss' && gameState.playerChoice) {
      if (lastMove) return lastMove.player;
      return liveFingerCount;
    }
    return gameState.playerScore;
  };

  const getPlayerDisplayLabel = () => {
    if (gameState.phase === 'toss' && gameState.playerChoice) {
      return 'Your Number';
    }
    return 'runs';
  };

  const getComputerDisplayNumber = () => {
    if (gameState.phase === 'toss' && lastMove) {
      if (lastMove.computer === 0) return '...';
      return lastMove.computer;
    }
    return gameState.computerScore;
  };

  const getComputerDisplayLabel = () => {
    if (gameState.phase === 'toss' && lastMove) {
      return 'AI Number';
    }
    return 'runs';
  };

  return (
    <div className="space-y-6">
      <Card className="game-card">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">
            {gameState.phase === 'toss' && (lastMove || tossInProgress) ? 'Toss Result' : 'Scoreboard'}
          </h2>
          {gameState.phase !== 'toss' && (
            <Badge variant="secondary" className="mt-2">
              {gameState.currentInnings.charAt(0).toUpperCase() + gameState.currentInnings.slice(1)} Innings
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-4 cricket-field rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <User className="w-5 h-5 mr-2 text-primary-foreground" />
              <span className="font-semibold text-primary-foreground">You</span>
              {gameState.playerBatting && gameState.phase !== 'toss' && (
                <Badge variant="secondary" className="ml-2 text-xs">Batting</Badge>
              )}
            </div>
            <div className="text-4xl font-bold text-primary-foreground">
              {getPlayerDisplayNumber()}
            </div>
            <div className="text-primary-foreground/80 text-sm">
              {getPlayerDisplayLabel()}
            </div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-cricket-ball to-orange-600 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Bot className="w-5 h-5 mr-2 text-cricket-ball-foreground" />
              <span className="font-semibold text-cricket-ball-foreground">AI</span>
              {!gameState.playerBatting && gameState.phase !== 'toss' && (
                <Badge variant="secondary" className="ml-2 text-xs">Batting</Badge>
              )}
            </div>
            <div className="text-4xl font-bold text-cricket-ball-foreground">
              {getComputerDisplayNumber()}
            </div>
            <div className="text-cricket-ball-foreground/80 text-sm">
              {getComputerDisplayLabel()}
            </div>
          </div>
        </div>

        {gameState.currentInnings === 'second' && gameState.target > 0 && (
          <div className="mt-6 p-4 bg-accent/20 rounded-lg">
            <div className="flex items-center justify-center mb-3">
              <Target className="w-5 h-5 mr-2 text-accent-foreground" />
              <span className="font-semibold">Target: {gameState.target}</span>
            </div>
            
            <Progress value={getTargetProgress()} className="mb-2" />
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {(gameState.playerBatting ? gameState.playerScore : gameState.computerScore)} / {gameState.target -1}
              </span>
              <span>
                {Math.max(0, gameState.target - (gameState.playerBatting ? gameState.playerScore : gameState.computerScore))} needed
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};