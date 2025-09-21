import React, { useState, useEffect, useRef } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { soundService } from './services/soundService';
import { authService } from './services/authService';
import GameBoard from './components/GameBoard';
import PlayerInfo from './components/PlayerInfo';
import Modal from './components/Modal';
import HelpModal from './components/HelpModal';
import GoogleSignInModal from './components/GoogleSignInModal';
import { AiChatTooltip } from './components/AiChatTooltip';
import { AnimatedMenuBackground } from './components/AnimatedMenuBackground';
import { GameState, GameMode, Difficulty, AiType, StartPosition } from './types';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const App: React.FC = () => {
  const gameLogic = useGameLogic();
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showGoogleSignIn, setShowGoogleSignIn] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [boardSize, setBoardSize] = useState(400);
  const boardRef = useRef<HTMLDivElement>(null);

  // Initialize sound service when the app mounts
  useEffect(() => {
    soundService.init();
  }, []);

  // Set up authentication state listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(setIsAuthenticated);
    return unsubscribe;
  }, []);

  // Handle board sizing
  useEffect(() => {
    const updateBoardSize = () => {
      if (boardRef.current) {
        const container = boardRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const size = Math.min(containerWidth, containerHeight) - 32;
        setBoardSize(Math.max(300, size));
      }
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, [gameLogic.gameState]);

  // Hide splash screen after app loads
  useEffect(() => {
    const timer = setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 500);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleStartGame = (
    mode: GameMode,
    difficulty: Difficulty,
    p1Name: string,
    p2Name: string,
    aiType: AiType,
    duration: number,
    startPos: StartPosition,
    wallsCount: number
  ) => {
    if (mode === GameMode.PVC && aiType === AiType.GEMINI && !isAuthenticated) {
      setShowGoogleSignIn(true);
      return;
    }
    gameLogic.startGame(mode, difficulty, p1Name, p2Name, aiType, duration, startPos, wallsCount);
  };

  const handleGoogleSignIn = async () => {
    await authService.signIn();
    setShowGoogleSignIn(false);
  };

  if (gameLogic.gameState === GameState.MENU) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <AnimatedMenuBackground />
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header */}
          <header className="flex justify-between items-center p-4 md:p-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => soundService.toggleMute()}
                className="p-2 rounded-full bg-purple-600/20 hover:bg-purple-600/40 transition-colors"
                aria-label={soundService.isMuted ? 'Unmute' : 'Mute'}
              >
                {soundService.isMuted ? (
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowHelp(true)}
                className="p-2 rounded-full bg-cyan-600/20 hover:bg-cyan-600/40 transition-colors"
                aria-label="Help"
              >
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full bg-purple-600/20 hover:bg-purple-600/40 transition-colors"
                aria-label="Settings"
              >
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
            <div className="text-center mb-12">
              <h1 className="text-6xl md:text-8xl font-magic text-white text-glow-purple mb-4 tracking-wider">
                Maze Magic
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                A strategic maze game where players race to reach the opposite side while placing magical walls to block their opponent's path.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
              <GameModeCard
                title="Player vs Player"
                description="Challenge a friend in local multiplayer"
                icon="👥"
                color="cyan"
                onClick={() => handleStartGame(GameMode.PVP, Difficulty.MEDIUM, 'Player 1', 'Player 2', AiType.LOCAL, 60, StartPosition.CENTER, 10)}
              />
              <GameModeCard
                title="Player vs AI"
                description="Test your skills against intelligent AI"
                icon="🤖"
                color="pink"
                onClick={() => handleStartGame(GameMode.PVC, Difficulty.MEDIUM, 'Player', 'AI', AiType.LOCAL, 60, StartPosition.CENTER, 10)}
              />
              <GameModeCard
                title="Online Match"
                description="Play against players worldwide"
                icon="🌐"
                color="green"
                onClick={() => gameLogic.handleFindMatch('Player', 60, StartPosition.CENTER, 10)}
              />
            </div>
          </main>
        </div>

        {/* Modals */}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        {showGoogleSignIn && (
          <GoogleSignInModal
            onSignIn={handleGoogleSignIn}
            onCancel={() => setShowGoogleSignIn(false)}
          />
        )}
      </div>
    );
  }

  // Game UI for other states
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex flex-col">
      {/* Game Header */}
      <header className="flex justify-between items-center p-4">
        <button
          onClick={gameLogic.returnToMenu}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          ← Menu
        </button>
        <div className="text-center">
          <div className="text-white font-bold">
            Game Time: {formatTime(gameLogic.gameTime)}
          </div>
          <div className="text-gray-300 text-sm">
            Turn: {formatTime(gameLogic.turnTime)}
          </div>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="p-2 rounded-full bg-cyan-600/20 hover:bg-cyan-600/40 transition-colors"
        >
          <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </header>

      {/* Game Content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        {/* Left Panel - Player Info */}
        <aside className="lg:w-64 space-y-4">
          {gameLogic.players[1] && (
            <PlayerInfo
              player={gameLogic.players[1]}
              size="md"
            />
          )}
          {gameLogic.players[2] && (
            <PlayerInfo
              player={gameLogic.players[2]}
              reverse
              size="md"
            />
          )}
        </aside>

        {/* Center - Game Board */}
        <section className="flex-1 flex items-center justify-center" ref={boardRef}>
          <div style={{ width: boardSize, height: boardSize }}>
            <GameBoard
              players={gameLogic.players}
              walls={gameLogic.walls}
              selectedPiece={gameLogic.selectedPiece}
              validMoves={gameLogic.validMoves}
              isPlacingWall={gameLogic.isPlacingWall}
              wallPreview={gameLogic.wallPreview}
              onCellClick={gameLogic.handleCellClick}
              onWallPreview={gameLogic.handleWallPreview}
              onCancelWallPreview={gameLogic.cancelWallPlacement}
              currentPlayerId={gameLogic.currentPlayerId}
              boardPixelSize={boardSize}
            />
          </div>
        </section>

        {/* Right Panel - Game Controls */}
        <aside className="lg:w-64 space-y-4">
          {gameLogic.isMyTurn && !gameLogic.winner && (
            <div className="magical-container rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-3">Your Turn</h3>
              <div className="space-y-2">
                <button
                  onClick={gameLogic.togglePlacingWall}
                  disabled={!gameLogic.players[gameLogic.currentPlayerId]?.wallsLeft}
                  className={`w-full py-2 px-4 rounded-lg font-bold transition-all ${
                    gameLogic.isPlacingWall
                      ? 'bg-orange-600 text-white'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {gameLogic.isPlacingWall ? 'Cancel Wall' : 'Place Wall'}
                </button>
                {gameLogic.wallPreview && (
                  <button
                    onClick={gameLogic.confirmWallPlacement}
                    className="w-full py-2 px-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
                  >
                    Confirm Wall
                  </button>
                )}
              </div>
            </div>
          )}

          {gameLogic.aiThinking && (
            <div className="magical-container rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
                <span className="text-white">AI is thinking...</span>
              </div>
              {gameLogic.lastAiAction && (
                <AiChatTooltip message={gameLogic.lastAiAction.reasoning} />
              )}
            </div>
          )}
        </aside>
      </main>

      {/* Modals */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {gameLogic.winner && (
        <Modal title="Game Over!" onClose={gameLogic.returnToMenu}>
          <div className="text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h3 className="text-2xl font-bold text-white">
              {gameLogic.winner.name} Wins!
            </h3>
            <p className="text-gray-300">
              Game completed in {formatTime(gameLogic.gameTime)}
            </p>
            <button
              onClick={gameLogic.returnToMenu}
              className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors"
            >
              Return to Menu
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Game Mode Card Component
const GameModeCard: React.FC<{
  title: string;
  description: string;
  icon: string;
  color: 'cyan' | 'pink' | 'green';
  onClick: () => void;
}> = ({ title, description, icon, color, onClick }) => {
  const colorClasses = {
    cyan: 'button-glow-cyan hover:shadow-cyan-400/50',
    pink: 'button-glow-pink hover:shadow-pink-500/50',
    green: 'button-glow-green hover:shadow-green-400/50',
  };

  return (
    <button
      onClick={onClick}
      className={`magical-container rounded-2xl p-6 text-center transition-all duration-300 hover:scale-105 ${colorClasses[color]} button-glow`}
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-300 text-sm leading-relaxed">{description}</p>
    </button>
  );
};

export default App;