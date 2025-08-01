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
}

interface ScoreBoardProps {
  gameState: GameState;
}

export const ScoreBoard = ({ gameState }: ScoreBoardProps) => {
  const getCurrentBattingInfo = () => {
    if (gameState.phase === 'toss') return null;
    
    return {
      currentBatsman: gameState.playerBatting ? 'You' : 'Computer',
      currentBowler: gameState.playerBatting ? 'Computer' : 'You',
      battingScore: gameState.playerBatting ? gameState.playerScore : gameState.computerScore,
      bowlingScore: gameState.playerBatting ? gameState.computerScore : gameState.playerScore
    };
  };

  const battingInfo = getCurrentBattingInfo();

  const getTargetProgress = () => {
    if (gameState.currentInnings === 'first' || gameState.target === 0) return 0;
    const currentScore = gameState.playerBatting ? gameState.playerScore : gameState.computerScore;
    return Math.min((currentScore / gameState.target) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Main Scoreboard */}
      <Card className="game-card">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">Scoreboard</h2>
          {gameState.currentInnings === 'second' && (
            <Badge variant="secondary" className="mt-2">
              {gameState.currentInnings.charAt(0).toUpperCase() + gameState.currentInnings.slice(1)} Innings
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Player Score */}
          <div className="text-center p-4 cricket-field rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <User className="w-5 h-5 mr-2 text-primary-foreground" />
              <span className="font-semibold text-primary-foreground">You</span>
              {gameState.playerBatting && gameState.phase !== 'toss' && (
                <Badge variant="secondary" className="ml-2 text-xs">Batting</Badge>
              )}
            </div>
            <div className="text-4xl font-bold text-primary-foreground">
              {gameState.playerScore}
            </div>
            <div className="text-primary-foreground/80 text-sm">runs</div>
          </div>

          {/* Computer Score */}
          <div className="text-center p-4 bg-gradient-to-br from-cricket-ball to-orange-600 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Bot className="w-5 h-5 mr-2 text-cricket-ball-foreground" />
              <span className="font-semibold text-cricket-ball-foreground">AI</span>
              {!gameState.playerBatting && gameState.phase !== 'toss' && (
                <Badge variant="secondary" className="ml-2 text-xs">Batting</Badge>
              )}
            </div>
            <div className="text-4xl font-bold text-cricket-ball-foreground">
              {gameState.computerScore}
            </div>
            <div className="text-cricket-ball-foreground/80 text-sm">runs</div>
          </div>
        </div>

        {/* Target Information */}
        {gameState.currentInnings === 'second' && gameState.target > 0 && (
          <div className="mt-6 p-4 bg-accent/20 rounded-lg">
            <div className="flex items-center justify-center mb-3">
              <Target className="w-5 h-5 mr-2 text-accent-foreground" />
              <span className="font-semibold">Target: {gameState.target}</span>
            </div>
            
            <Progress value={getTargetProgress()} className="mb-2" />
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {gameState.playerBatting ? gameState.playerScore : gameState.computerScore} / {gameState.target}
              </span>
              <span>
                {gameState.target - (gameState.playerBatting ? gameState.playerScore : gameState.computerScore)} needed
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Current Turn Indicator */}
      {gameState.phase !== 'toss' && gameState.phase !== 'gameOver' && (
        <Card className="game-card">
          <div className="text-center">
            <h3 className="font-semibold mb-3">Current Turn</h3>
            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center p-3 rounded-lg transition-all ${
                gameState.isPlayerTurn 
                  ? 'bg-primary text-primary-foreground pulse-animation' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <User className="w-4 h-4 mr-2" />
                You
              </div>
              <div className="text-2xl">VS</div>
              <div className={`flex items-center p-3 rounded-lg transition-all ${
                !gameState.isPlayerTurn 
                  ? 'bg-cricket-ball text-cricket-ball-foreground pulse-animation' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Bot className="w-4 h-4 mr-2" />
                AI
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Game Phase Indicator */}
      <Card className="game-card">
        <div className="text-center">
          <h3 className="font-semibold mb-2">Game Status</h3>
          <Badge 
            variant={gameState.phase === 'gameOver' ? 'destructive' : 'default'}
            className="text-sm px-4 py-2"
          >
            {gameState.phase === 'toss' && 'Toss Time'}
            {gameState.phase === 'batting' && `${gameState.currentInnings.charAt(0).toUpperCase() + gameState.currentInnings.slice(1)} Innings`}
            {gameState.phase === 'bowling' && `${gameState.currentInnings.charAt(0).toUpperCase() + gameState.currentInnings.slice(1)} Innings`}
            {gameState.phase === 'gameOver' && (
              <span className="flex items-center">
                <Trophy className="w-4 h-4 mr-1" />
                Game Complete
              </span>
            )}
          </Badge>
          
          {battingInfo && gameState.phase !== 'gameOver' && (
            <div className="mt-3 text-sm text-muted-foreground">
              <div>{battingInfo.currentBatsman} batting • {battingInfo.currentBowler} bowling</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};