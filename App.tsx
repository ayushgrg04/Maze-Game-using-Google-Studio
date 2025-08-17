import React, { useState, useEffect } from 'react';
import useGameLogic from './hooks/useGameLogic';
import GameBoard from './components/GameBoard';
import PlayerInfo from './components/PlayerInfo';
import Modal from './components/Modal';
import HelpModal from './components/HelpModal';
import GoogleSignInModal from './components/GoogleSignInModal';
import { AiChatTooltip } from './components/AiChatTooltip';
import { GameState, GameMode, Difficulty, Player, AiType, StartPosition } from './types';
import { authService } from './services/authService';

const TurnIndicator: React.FC<{player: Player}> = ({ player }) => (
    <div className="magical-container rounded-full px-4 py-2 flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: player.color, boxShadow: `0 0 6px ${player.color}` }}></div>
        <span className="font-semibold text-gray-200">{player.name}'s Turn</span>
    </div>
);

const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);

const TurnTimer: React.FC<{ turnTime: number; player: Player | undefined }> = ({ turnTime, player }) => {
    const turnTimeColor = !player ? 'text-gray-200' : 'text-white';
    const turnTimeClasses = `text-2xl font-bold transition-colors ${turnTime <= 10 ? 'text-red-400 animate-pulse' : turnTimeColor}`;

    return (
        <div className="text-center">
            <p className="text-sm font-medium text-gray-400">TURN TIME</p>
            <p className={turnTimeClasses} style={player ? {textShadow: `0 0 8px ${player.color}`} : {}}>{formatTime(turnTime)}</p>
        </div>
    );
};

const MenuBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--dark-bg-start)] to-[var(--dark-bg-end)]"></div>
      <div className="absolute inset-0 filter blur-sm brightness-60 scale-110">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vmin] h-[80vmin] max-w-lg max-h-lg"
        >
          <div
            className="relative grid h-full w-full rounded-2xl"
            style={{
              gridTemplateColumns: `repeat(9, 1fr)`,
              gridTemplateRows: `repeat(9, 1fr)`,
              gap: `5px`,
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, rgba(0,0,0,0) 70%)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            {/* Intersections */}
            {Array.from({ length: 8 * 8 }).map((_, i) => (
              <div
                key={`dot-bg-${i}`}
                className="rounded-full"
                style={{
                  gridRow: Math.floor(i / 8) + 2,
                  gridColumn: (i % 8) + 2,
                  justifySelf: 'start',
                  alignSelf: 'start',
                  width: '6px',
                  height: '6px',
                  backgroundColor: 'var(--glow-purple)',
                  opacity: 0.4,
                  boxShadow: '0 0 8px var(--glow-purple)',
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}
            {/* Player pieces */}
            <div className="absolute w-[10%] h-[10%] rounded-full" style={{ top: '5%', left: '45%', backgroundColor: '#ec4899', boxShadow: '0 0 15px #ec4899' }} />
            <div className="absolute w-[10%] h-[10%] rounded-full" style={{ bottom: '5%', left: '45%', backgroundColor: '#3b82f6', boxShadow: '0 0 15px #3b82f6' }} />
            
            {/* Walls */}
            <div className="absolute rounded-full" style={{ top: '33%', left: '22%', width:'22%', height: '8px',  backgroundColor: '#ec4899', boxShadow: '0 0 10px #ec4899' }} />
            <div className="absolute rounded-full" style={{ bottom: '22%', right: '22%', width:'8px', height: '22%', backgroundColor: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
    const {
        gameState, gameMode, difficulty, aiType, players, walls, currentPlayerId, winner,
        selectedPiece, validMoves, isPlacingWall, aiThinking, lastAiAction, apiError, gameTime, turnTime,
        showRateLimitModal, wallPlacementError, setShowRateLimitModal, configuredTurnTime, startPosition,
        wallPreview, onlineGameId, onlinePlayerId, onlineRequestTimeout, initialWalls,
        isMyTurn, pendingJoinId,
        startGame, handleCellClick, handleWallPreview, confirmWallPlacement, cancelWallPlacement,
        togglePlacingWall, returnToMenu, handleCreateOnlineGame, handleJoinOnlineGame, handleFindMatch, handleCancelFindMatch, handleCancelCreateGame,
        cancelAuth, cancelJoin,
    } = useGameLogic();

    type MenuScreen = 'main' | 'local_setup' | 'online_setup';
    const [menuScreen, setMenuScreen] = useState<MenuScreen>('main');
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [errorToast, setErrorToast] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    
    useEffect(() => {
        if (lastAiAction?.reasoning) {
            setAiMessage(lastAiAction.reasoning);
            const timer = setTimeout(() => setAiMessage(null), 6000);
            return () => clearTimeout(timer);
        }
    }, [lastAiAction]);

    useEffect(() => {
        const message = apiError || wallPlacementError;
        if (message) {
            setErrorToast(message);
            const timer = setTimeout(() => setErrorToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [apiError, wallPlacementError]);
    
    useEffect(() => {
        const starsContainer = document.getElementById('stars-container');
        if (starsContainer) {
          starsContainer.style.display = gameState === GameState.MENU ? 'none' : 'block';
        }
      }, [gameState]);


    const renderMenu = () => {
        const playerName = sessionStorage.getItem('playerName') || 'Player 1';

        switch(menuScreen) {
            case 'main':
                return <MainMenu onNavigate={setMenuScreen} />;
            case 'local_setup':
                return (
                    <LocalGameSetup 
                      playerName={playerName}
                      onStartGame={(mode, diff, p1Name, type, duration, startPos, walls) => startGame(mode, diff, p1Name, type, duration, startPos, walls)}
                      onBack={() => setMenuScreen('main')}
                    />
                );
            case 'online_setup':
                return (
                    <OnlineGameSetup
                        playerName={playerName}
                        onCreateGame={(duration, startPos, walls) => handleCreateOnlineGame(playerName, duration, startPos, walls)}
                        onJoinGame={(gameId) => handleJoinOnlineGame(gameId, playerName)}
                        onFindMatch={(duration, startPos, walls) => handleFindMatch(playerName, duration, startPos, walls)}
                        onBack={() => setMenuScreen('main')}
                    />
                );
        }
    }
    
    if (gameState === GameState.MENU) {
        const playerName = sessionStorage.getItem('playerName') || 'Player 1';
        if (pendingJoinId) {
            return (
                <JoinGamePrompt
                    gameId={pendingJoinId}
                    initialPlayerName={playerName}
                    onJoin={(gameId, name) => {
                        sessionStorage.setItem('playerName', name);
                        handleJoinOnlineGame(gameId, name);
                    }}
                    onCancel={cancelJoin}
                />
            );
        }
        return (
            <>
                <MenuBackground />
                {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
                 <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-md magical-container p-6 md:p-8 rounded-2xl">
                        {renderMenu()}
                        <div className="mt-6">
                           <button onClick={() => setShowHelp(true)} className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg button-glow button-glow-purple transition-all text-lg">How to Play</button>
                        </div>
                    </div>
                </div>
            </>
        );
    }
    
    if (gameState === GameState.AWAITING_AUTH) {
        return <GoogleSignInModal onSignIn={() => authService.signIn()} onCancel={cancelAuth} />;
    }
    
    const pageBackgroundClasses = "fixed inset-0 flex items-center justify-center z-50 bg-gradient-to-b from-[var(--dark-bg-start)] to-[var(--dark-bg-end)]";
    if ((gameState === GameState.PLAYING || gameState === GameState.GAME_OVER) && (!players[1] || !players[2])) {
        return (
            <div className={pageBackgroundClasses}>
                <svg className="animate-spin h-10 w-10 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
        );
    }

    const currentPlayer = players[currentPlayerId];
    const myPlayer = players[1]; 
    const opponentPlayer = players[2];
    
    const aiPlayerName = players[2]?.name || 'AI';

    return (
        <main className={`h-screen max-h-[100dvh] w-full flex flex-col items-center p-2 sm:p-4 bg-gradient-to-b from-[var(--dark-bg-start)] to-[var(--dark-bg-end)]`}>
            <header className="w-full max-w-2xl flex-shrink-0">
                 <div className="flex justify-between items-center w-full">
                    <div className="relative flex-1">
                        <div className="inline-block relative">
                          {opponentPlayer && <PlayerInfo player={opponentPlayer} />}
                          {gameMode === GameMode.PVC && aiMessage && <AiChatTooltip message={aiMessage} />}
                        </div>
                    </div>
                    <div className="text-center flex-1">
                        <p className="text-sm font-medium text-gray-400">GAME TIME</p>
                        <p className="text-2xl font-bold text-gray-200">{formatTime(gameTime)}</p>
                    </div>
                    <div className="flex-1 flex justify-end">
                        {currentPlayer?.id === opponentPlayer?.id && <TurnTimer turnTime={turnTime} player={currentPlayer} />}
                    </div>
                </div>
            </header>

            <div className="w-full flex-grow flex flex-col items-center justify-center py-1">
                <div className="h-12 flex items-center justify-center my-1">
                  {aiThinking ? (
                     <div className="magical-container p-3 rounded-full flex items-center gap-3 z-10">
                       <svg className="animate-spin h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span className="font-semibold text-gray-300">{aiPlayerName} is thinking...</span>
                    </div>
                  ) : (
                    currentPlayer && <TurnIndicator player={currentPlayer} />
                  )}
                </div>
                <div className="w-full">
                    <GameBoard 
                        players={players} 
                        walls={walls}
                        currentPlayerId={currentPlayerId}
                        selectedPiece={selectedPiece}
                        validMoves={validMoves}
                        isPlacingWall={isPlacingWall}
                        wallPreview={wallPreview}
                        onCellClick={handleCellClick}
                        onWallPreview={handleWallPreview}
                        onCancelWallPreview={cancelWallPlacement}
                    />
                </div>
            </div>

            <footer className="w-full max-w-2xl flex-shrink-0">
                <div className="flex justify-between items-center w-full">
                    <div className="flex-1 flex justify-start">
                        {currentPlayer?.id === myPlayer?.id && <TurnTimer turnTime={turnTime} player={currentPlayer} />}
                    </div>
                    <div className="flex-1" />
                    <div className="flex-1 flex justify-end">
                        {myPlayer && <PlayerInfo player={myPlayer} />}
                    </div>
                </div>

                {wallPreview ? (
                     <div className="flex w-full space-x-4 mt-4">
                         <button onClick={cancelWallPlacement} className="w-full py-3 rounded-lg font-bold text-white bg-red-500 button-glow button-glow-red">Cancel</button>
                         <button onClick={confirmWallPlacement} className="w-full py-3 rounded-lg font-bold text-white bg-green-500 button-glow button-glow-green">Confirm Wall</button>
                    </div>
                ) : (
                    <div className="flex w-full space-x-4 mt-4">
                         <button onClick={togglePlacingWall} disabled={!currentPlayer || currentPlayer.wallsLeft === 0 || !isMyTurn} className={`w-full py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed button-glow ${isPlacingWall ? 'bg-red-500 button-glow-red' : 'bg-blue-500 button-glow-blue'}`}>
                            {isPlacingWall ? 'Cancel' : 'Place Wall'}
                         </button>
                         <button onClick={returnToMenu} className="w-full py-3 rounded-lg font-bold text-white bg-purple-600 button-glow button-glow-purple">New Game</button>
                    </div>
                )}
            </footer>
            
            {gameState === GameState.GAME_OVER && winner && (
                <Modal title="Game Over!">
                    <div className="text-center">
                        <h3 className={`text-4xl font-magic mb-2`} style={{color: winner.color, textShadow: `0 0 10px ${winner.color}`}}>{winner.name} wins!</h3>
                        {gameMode === GameMode.PVC && winner.id === 1 && (
                            <p className="text-gray-300 mb-4 text-lg">
                                You defeated <span className="font-bold">{players[2].name}</span>!
                            </p>
                        )}
                        { turnTime <= 0 && <p className="text-gray-400 mb-4">The other player ran out of time.</p>}
                        <div className="flex flex-col gap-4 mt-6">
                           { gameMode !== GameMode.PVO && <button onClick={() => startGame(gameMode, difficulty, players[1].name, aiType, configuredTurnTime, startPosition, initialWalls)} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg button-glow button-glow-green">Play Again</button>}
                            <button onClick={returnToMenu} className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg button-glow button-glow-purple">Main Menu</button>
                        </div>
                    </div>
                </Modal>
            )}
            {gameState === GameState.ONLINE_WAITING && (
                <WaitingForOpponentModal 
                    gameId={onlineGameId} 
                    hasTimeout={!!onlineRequestTimeout} 
                    onCancelSearch={handleCancelFindMatch} 
                    onCancelCreateGame={handleCancelCreateGame}
                />
            )}
            {showRateLimitModal && (
                 <Modal title="API Limit Reached" onClose={() => setShowRateLimitModal(false)}>
                    <div className="text-center space-y-4">
                        <p className="text-gray-300">You've exceeded the request limit for Gemini. The AI will make a simple move. For an uninterrupted experience, try the offline <span className="font-bold text-white">Local AI</span>.</p>
                        <button onClick={() => setShowRateLimitModal(false)} className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg button-glow button-glow-blue">OK</button>
                    </div>
                </Modal>
            )}
            {errorToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-900/80 border border-red-500 text-red-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-fade-in-down backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="font-semibold">{errorToast}</span>
                </div>
            )}
            <style>{`@keyframes fade-in-down{0%{opacity:0;transform:translate(-50%,-20px)}100%{opacity:1;transform:translate(-50%,0)}}.animate-fade-in-down{animation:fade-in-down .5s ease-out forwards}`}</style>
        </main>
    );
};

// --- Menu Components ---

const MainMenu: React.FC<{ onNavigate: (screen: 'local_setup' | 'online_setup') => void }> = ({ onNavigate }) => {
    const [playerName, setPlayerName] = useState('Player 1');
    
    useEffect(() => {
        const storedName = sessionStorage.getItem('playerName');
        if (storedName) setPlayerName(storedName);
    }, []);

    const handlePlayerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setPlayerName(newName);
        sessionStorage.setItem('playerName', newName);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-6xl font-magic text-center mb-2 text-purple-400 text-glow-purple tracking-wider">Maze Magic</h1>
                <p className="text-gray-400 text-center">A strategic game of wits and walls.</p>
            </div>
             <div>
                 <label htmlFor="playerName" className="text-lg font-semibold mb-2 text-gray-300 block">Your Name</label>
                 <input type="text" id="playerName" value={playerName} onChange={handlePlayerNameChange} className="w-full p-3 rounded-lg bg-black/30 border-2 border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-400 transition" placeholder="Enter your name" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => onNavigate('local_setup')} className="p-4 rounded-lg font-bold transition-all bg-blue-500 text-white shadow-lg button-glow button-glow-blue">Local Game</button>
                <button onClick={() => onNavigate('online_setup')} className="p-4 rounded-lg font-bold transition-all bg-pink-500 text-white shadow-lg button-glow button-glow-pink">Online Game</button>
            </div>
            <p className="text-xs text-gray-500 text-center pt-2">Version 2.0</p>
        </div>
    );
};

const WaitingForOpponentModal: React.FC<{
    gameId: string | null; 
    hasTimeout: boolean;
    onCancelSearch?: () => void;
    onCancelCreateGame?: () => void;
}> = ({ gameId, hasTimeout, onCancelSearch, onCancelCreateGame }) => {
    const [copied, setCopied] = useState(false);
    const isFindingMatch = !gameId && hasTimeout;
    const initialTime = isFindingMatch ? 3 * 60 : 5 * 60;
    const [timeLeft, setTimeLeft] = useState(initialTime);
    const joinUrl = gameId ? `${window.location.origin}${window.location.pathname}?join=${gameId}` : '';

    useEffect(() => {
        if (!hasTimeout || timeLeft <= 0) return;
        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [hasTimeout, timeLeft]);

    const handleCopy = () => {
        if (!joinUrl) return;
        navigator.clipboard.writeText(joinUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const title = gameId ? 'Waiting for Opponent' : 'Finding Match...';
    
    return (
        <Modal title={title}>
            <div className="text-center space-y-4">
                <svg className="animate-spin h-10 w-10 text-purple-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                
                {isFindingMatch ? (
                    <p className="text-gray-300">Searching for another player. This may take a moment.</p>
                ) : (
                    <p className="text-gray-300">Share this link with a friend to invite them.</p>
                )}

                {gameId && (
                    <div className="flex items-center space-x-2">
                        <input type="text" readOnly value={joinUrl} className="w-full p-2 rounded-lg bg-black/30 border border-purple-500/50 text-sm" />
                        <button onClick={handleCopy} className="p-2 rounded-lg bg-blue-500 text-white font-bold button-glow button-glow-blue text-sm w-24">{copied ? 'Copied!' : 'Copy'}</button>
                    </div>
                )}
                {hasTimeout && timeLeft > 0 && (
                    <p className="text-sm text-gray-400">
                        {isFindingMatch ? 'Search will time out in' : 'Game will expire in'}: <span className="font-bold">{formatTime(timeLeft)}</span>
                    </p>
                )}
                 {(isFindingMatch && onCancelSearch || gameId && onCancelCreateGame) && (
                    <button 
                        onClick={isFindingMatch ? onCancelSearch : onCancelCreateGame} 
                        className="w-full mt-2 py-2 rounded-lg font-bold text-white bg-red-500 button-glow button-glow-red"
                    >
                        {isFindingMatch ? 'Cancel Search' : 'Cancel Game'}
                    </button>
                )}
            </div>
        </Modal>
    )
}

const SetupButton: React.FC<{active: boolean, onClick: ()=>void, children: React.ReactNode, color: 'blue'|'pink'|'purple'|'dark'}> = ({active, onClick, children, color}) => {
    const colorClasses = {
        blue: 'bg-blue-500 button-glow-blue',
        pink: 'bg-pink-500 button-glow-pink',
        purple: 'bg-purple-500 button-glow-purple',
        dark: 'bg-gray-800 button-glow-purple'
    };
    const activeClass = active ? `${colorClasses[color]} text-white scale-105` : 'bg-black/30 hover:bg-black/50 text-gray-300';
    return <button onClick={onClick} className={`w-full p-3 rounded-lg font-bold transition-all button-glow ${activeClass}`}>{children}</button>
};

const LocalGameSetup: React.FC<{ playerName: string; onStartGame: Function; onBack: () => void; }> = (props) => {
    const [mode, setMode] = useState<GameMode>(GameMode.PVC);
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
    const [aiType, setAiType] = useState<AiType>(AiType.LOCAL);
    const [startPos, setStartPos] = useState<StartPosition>(StartPosition.CENTER);
    const [duration, setDuration] = useState(60);
    const [walls, setWalls] = useState(10);
    const minTime = mode === GameMode.PVC && aiType === AiType.GEMINI ? 60 : 30;

    useEffect(() => { if (duration < minTime) setDuration(minTime); }, [mode, aiType, duration, minTime]);

    return (
      <div className="space-y-4 animate-fade-in-down">
          <button onClick={props.onBack} className="text-sm font-semibold text-gray-400 hover:text-white">{'< Back'}</button>
          <h2 className="text-2xl font-bold text-center text-white">Local Game Setup</h2>
          <div className="flex gap-4">
              <SetupButton active={mode === GameMode.PVP} onClick={() => setMode(GameMode.PVP)} color="blue">Player vs Player</SetupButton>
              <SetupButton active={mode === GameMode.PVC} onClick={() => setMode(GameMode.PVC)} color="pink">Player vs AI</SetupButton>
          </div>
          {mode === GameMode.PVC && (
              <div className="space-y-4 p-4 bg-black/20 rounded-lg">
                  <div>
                      <h3 className="font-semibold text-gray-300 mb-2">AI Type</h3>
                      <div className="flex gap-4">
                          <SetupButton active={aiType === AiType.LOCAL} onClick={() => setAiType(AiType.LOCAL)} color="dark">Local (Offline)</SetupButton>
                          <SetupButton active={aiType === AiType.GEMINI} onClick={() => setAiType(AiType.GEMINI)} color="purple">Gemini AI</SetupButton>
                      </div>
                  </div>
                  <div>
                      <h3 className="font-semibold text-gray-300 mb-2">AI Difficulty</h3>
                      <div className="grid grid-cols-3 gap-2">
                          {Object.values(Difficulty).map(d => (<button key={d} onClick={() => setDifficulty(d)} className={`p-2 rounded-lg font-semibold transition-all text-sm ${difficulty === d ? 'bg-purple-500 button-glow-purple text-white' : 'bg-black/30 hover:bg-black/50 text-gray-300'}`}>{d}</button>))}
                      </div>
                  </div>
              </div>
          )}
          <div>
              <h3 className="font-semibold text-gray-300 mb-2">Starting Position</h3>
              <div className="flex gap-4">
                  <SetupButton active={startPos === StartPosition.CENTER} onClick={() => setStartPos(StartPosition.CENTER)} color="blue">Center</SetupButton>
                  <SetupButton active={startPos === StartPosition.RANDOM} onClick={() => setStartPos(StartPosition.RANDOM)} color="pink">Random</SetupButton>
              </div>
          </div>
           <div>
              <label htmlFor="walls" className="font-semibold text-gray-300 block mb-1">Number of Walls: <span className="font-bold text-blue-400">{walls}</span></label>
              <input type="range" id="walls" value={walls} min="5" max="15" step="1" onChange={(e) => setWalls(Number(e.target.value))} className="w-full" />
          </div>
          <div>
              <label htmlFor="turnTime" className="font-semibold text-gray-300 block mb-2">Time Per Move (seconds)</label>
              <input type="number" id="turnTime" value={duration} min={minTime} step="15" onChange={(e) => setDuration(Math.max(minTime, Number(e.target.value)))} className="w-full p-3 rounded-lg bg-black/30 border border-purple-500/50" />
              <p className="text-xs text-gray-400 mt-1">Minimum: {minTime} seconds.</p>
          </div>
          <button onClick={() => props.onStartGame(mode, difficulty, props.playerName, aiType, duration, startPos, walls)} className="w-full bg-green-500 text-white font-bold py-4 rounded-lg button-glow button-glow-green text-xl">Start Game</button>
      </div>
    );
}

const OnlineGameSetup: React.FC<{ playerName: string; onCreateGame: Function; onJoinGame: Function; onFindMatch: Function; onBack: () => void; }> = (props) => {
    const [joinGameId, setJoinGameId] = useState('');
    const [startPos, setStartPos] = useState<StartPosition>(StartPosition.CENTER);
    const [duration, setDuration] = useState(60);
    const [walls, setWalls] = useState(10);

    return (
       <div className="space-y-4 animate-fade-in-down">
           <button onClick={props.onBack} className="text-sm font-semibold text-gray-400 hover:text-white">{'< Back'}</button>
           <h2 className="text-2xl font-bold text-center text-white">Online Multiplayer</h2>
           <div className="p-4 bg-black/20 rounded-lg space-y-3">
              <h3 className="font-semibold text-gray-300 mb-2">Game Options</h3>
                  <label htmlFor="turnTimeOnline" className="text-gray-300 block">Time Per Move: {duration}s</label>
                  <input type="range" id="turnTimeOnline" value={duration} min="30" max="120" step="15" onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
                  
                  <label htmlFor="wallsOnline" className="text-gray-300 block">Number of Walls: <span className="font-bold text-blue-400">{walls}</span></label>
                  <input type="range" id="wallsOnline" value={walls} min="5" max="15" step="1" onChange={(e) => setWalls(Number(e.target.value))} className="w-full" />
                  
                  <div className="flex gap-4 pt-2">
                     <SetupButton active={startPos === StartPosition.CENTER} onClick={() => setStartPos(StartPosition.CENTER)} color="blue">Center Start</SetupButton>
                     <SetupButton active={startPos === StartPosition.RANDOM} onClick={() => setStartPos(StartPosition.RANDOM)} color="pink">Random Start</SetupButton>
                  </div>
           </div>
           <div className="space-y-4 pt-4 border-t border-purple-500/30">
               <button onClick={() => props.onFindMatch(duration, startPos, walls)} className="w-full bg-purple-500 text-white font-bold py-3 rounded-lg button-glow button-glow-purple">Find Random Match</button>
               <div className="text-center text-gray-400">OR</div>
               <button onClick={() => props.onCreateGame(duration, startPos, walls)} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg button-glow button-glow-green">Create Private Game</button>
               <div className="flex items-center space-x-2">
                   <input type="text" value={joinGameId} onChange={(e) => setJoinGameId(e.target.value)} className="w-full p-3 rounded-lg bg-black/30 border border-purple-500/50" placeholder="Paste Game ID" />
                   <button onClick={() => props.onJoinGame(joinGameId)} disabled={!joinGameId} className="p-3 rounded-lg bg-blue-500 text-white font-bold button-glow button-glow-blue disabled:opacity-50">Join</button>
               </div>
           </div>
       </div>
    );
};


type JoinGamePromptProps = {
  gameId: string;
  initialPlayerName: string;
  onJoin: (gameId: string, playerName: string) => void;
  onCancel: () => void;
};

const JoinGamePrompt: React.FC<JoinGamePromptProps> = ({ gameId, initialPlayerName, onJoin, onCancel }) => {
  const [playerName, setPlayerName] = useState(initialPlayerName);

  useEffect(() => {
    setPlayerName(initialPlayerName);
  }, [initialPlayerName]);

  const handleJoin = () => {
    if (playerName.trim()) {
      onJoin(gameId, playerName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[var(--dark-bg-start)] to-[var(--dark-bg-end)] flex items-center justify-center p-4">
        <Modal title="Join Private Game" onClose={onCancel}>
          <div className="space-y-6 text-center">
            <p className="text-gray-300">You've been invited to a game!</p>
            <div>
              <label htmlFor="joinPlayerName" className="text-lg font-semibold mb-2 text-gray-300 block">Your Name</label>
              <input
                type="text"
                id="joinPlayerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full p-3 rounded-lg bg-black/30 border-2 border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-400 transition text-center"
                placeholder="Enter your name"
              />
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleJoin}
                disabled={!playerName.trim()}
                className="w-full bg-green-500 text-white font-bold py-3 rounded-lg button-glow button-glow-green text-lg disabled:opacity-50"
              >
                Join Game
              </button>
              <button 
                onClick={onCancel}
                className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg button-glow button-glow-purple"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
    </div>
  );
};

export default App;