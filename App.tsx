

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
    <div className="bg-white rounded-full shadow-md px-4 py-2 flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: player.color }}></div>
        <span className="font-semibold text-gray-700">{player.name}'s Turn</span>
    </div>
);

const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);

const TurnTimer: React.FC<{ turnTime: number; player: Player | undefined }> = ({ turnTime, player }) => {
    const turnTimeColor = !player ? 'text-gray-700' : (player.id === 1 ? 'text-blue-500' : 'text-pink-500');
    const turnTimeClasses = `text-2xl font-bold transition-colors ${turnTime <= 10 ? 'text-red-500 animate-pulse' : turnTimeColor}`;

    return (
        <div className="text-center">
            <p className="text-sm font-medium text-gray-500">TURN TIME</p>
            <p className={turnTimeClasses}>{formatTime(turnTime)}</p>
        </div>
    );
};

const App: React.FC = () => {
    const {
        gameState, gameMode, difficulty, aiType, players, walls, currentPlayerId, winner,
        selectedPiece, validMoves, isPlacingWall, aiThinking, lastAiAction, apiError, gameTime, turnTime,
        showRateLimitModal, wallPlacementError, setShowRateLimitModal, configuredTurnTime, startPosition,
        wallPreview, onlineGameId, onlinePlayerId, onlineRequestTimeout, initialWalls,
        isMyTurn,
        startGame, handleCellClick, handleWallPreview, confirmWallPlacement, cancelWallPlacement,
        togglePlacingWall, returnToMenu, handleCreateOnlineGame, handleJoinOnlineGame, handleFindMatch, handleCancelFindMatch, handleCancelCreateGame,
        cancelAuth,
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

    const renderMenu = () => {
        // Retrieve name from session storage for menu components
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
        return (
            <>
                {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
                <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
                    <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-2xl shadow-lg border">
                        {renderMenu()}
                        <div className="mt-6">
                           <button onClick={() => setShowHelp(true)} className="w-full bg-gray-500 text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition-all shadow-md text-lg">How to Play</button>
                        </div>
                    </div>
                </div>
            </>
        );
    }
    
    if (gameState === GameState.AWAITING_AUTH) {
        return <GoogleSignInModal onSignIn={() => authService.signIn()} onCancel={cancelAuth} />;
    }
    
    // Guard against rendering the game screen before player data is ready, preventing crashes.
    if ((gameState === GameState.PLAYING || gameState === GameState.GAME_OVER) && (!players[1] || !players[2])) {
        return (
            <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-50">
                <svg className="animate-spin h-10 w-10 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
        );
    }

    const currentPlayer = players[currentPlayerId];
    // In local games or as Player 1, "me" is player 1. For Player 2 online, perspective is flipped.
    // The useGameLogic hook now returns players with the correct perspective, so player 1 is always "me".
    const myPlayer = players[1]; 
    const opponentPlayer = players[2];
    
    const aiPlayerName = players[2]?.name || 'AI';

    return (
        <main className="h-screen max-h-[100dvh] w-full bg-gray-100 flex flex-col items-center p-2 sm:p-4">
            <header className="w-full max-w-2xl flex-shrink-0">
                 <div className="flex justify-between items-center w-full">
                    <div className="relative flex-1">
                        {opponentPlayer && <PlayerInfo player={opponentPlayer} />}
                        {gameMode === GameMode.PVC && aiMessage && <AiChatTooltip message={aiMessage} />}
                    </div>
                    <div className="text-center flex-1">
                        <p className="text-sm font-medium text-gray-500">GAME TIME</p>
                        <p className="text-2xl font-bold text-gray-700">{formatTime(gameTime)}</p>
                    </div>
                    <div className="flex-1 flex justify-end">
                        {currentPlayer?.id === opponentPlayer?.id && <TurnTimer turnTime={turnTime} player={currentPlayer} />}
                    </div>
                </div>
            </header>

            <div className="w-full flex-grow flex flex-col items-center justify-center py-1">
                <div className="h-12 flex items-center justify-center my-1">
                  {aiThinking ? (
                     <div className="bg-white p-3 rounded-full shadow-lg flex items-center gap-3 z-10">
                       <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span className="font-semibold text-gray-600">{aiPlayerName} is thinking...</span>
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
                         <button onClick={cancelWallPlacement} className="w-full py-3 rounded-lg font-bold text-white bg-red-500 hover:bg-red-600 transition-all shadow-md">Cancel</button>
                         <button onClick={confirmWallPlacement} className="w-full py-3 rounded-lg font-bold text-white bg-green-500 hover:bg-green-600 transition-all shadow-md">Confirm Wall</button>
                    </div>
                ) : (
                    <div className="flex w-full space-x-4 mt-4">
                         <button onClick={togglePlacingWall} disabled={!currentPlayer || currentPlayer.wallsLeft === 0 || !isMyTurn} className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${isPlacingWall ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                            {isPlacingWall ? 'Cancel' : 'Place Wall'}
                         </button>
                         <button onClick={returnToMenu} className="w-full py-3 rounded-lg font-bold text-gray-700 bg-gray-300 hover:bg-gray-400 transition-all shadow-md">New Game</button>
                    </div>
                )}
            </footer>
            
            {gameState === GameState.GAME_OVER && winner && (
                <Modal title="Game Over!">
                    <div className="text-center">
                        <h3 className={`text-3xl font-bold mb-2`} style={{color: winner.color}}>{winner.name} wins!</h3>
                        {gameMode === GameMode.PVC && winner.id === 1 && (
                            <p className="text-gray-600 mb-4 text-lg">
                                You defeated <span className="font-bold">{players[2].name}</span>!
                            </p>
                        )}
                        { turnTime <= 0 && <p className="text-gray-600 mb-4">The other player ran out of time.</p>}
                        <div className="flex flex-col gap-4">
                           { gameMode !== GameMode.PVO && <button onClick={() => startGame(gameMode, difficulty, players[1].name, aiType, configuredTurnTime, startPosition, initialWalls)} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-all">Play Again</button>}
                            <button onClick={returnToMenu} className="w-full bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-500 transition-all">Main Menu</button>
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
                 <Modal title="Gemini API Limit Reached" onClose={() => setShowRateLimitModal(false)}>
                    <div className="text-center space-y-4">
                        <p className="text-gray-600">You've exceeded the request limit. The AI will make a simple move. For an uninterrupted experience, try the offline <span className="font-bold text-gray-800">Local AI</span>.</p>
                        <button onClick={() => setShowRateLimitModal(false)} className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-all">OK</button>
                    </div>
                </Modal>
            )}
            {errorToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-fade-in-down">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="font-semibold">{errorToast}</span>
                </div>
            )}
            <style>{`@keyframes fade-in-down{0%{opacity:0;transform:translateY(-20px) translateX(-50%)}100%{opacity:1;transform:translateY(0) translateX(-50%)}}.animate-fade-in-down{animation:fade-in-down .5s ease-out forwards}`}</style>
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
                <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">Maze Race</h1>
                <p className="text-gray-500 text-center">A strategic game of wits and walls.</p>
            </div>
             <div>
                 <label htmlFor="playerName" className="text-lg font-semibold mb-2 text-gray-600 block">Your Name</label>
                 <input type="text" id="playerName" value={playerName} onChange={handlePlayerNameChange} className="w-full p-3 rounded-lg bg-gray-200 border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Enter your name" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => onNavigate('local_setup')} className="p-4 rounded-lg font-bold transition-all bg-blue-500 text-white shadow-lg hover:bg-blue-600">Local Game</button>
                <button onClick={() => onNavigate('online_setup')} className="p-4 rounded-lg font-bold transition-all bg-pink-500 text-white shadow-lg hover:bg-pink-600">Online Game</button>
            </div>
            <p className="text-xs text-gray-400 text-center pt-2">Version 2.0</p>
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

    const title = gameId ? 'Waiting for Opponent...' : 'Finding Match...';
    
    return (
        <Modal title={title}>
            <div className="text-center space-y-4">
                <svg className="animate-spin h-10 w-10 text-gray-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                
                {isFindingMatch ? (
                    <p className="text-gray-600">Searching for another player. This may take a moment.</p>
                ) : (
                    <p className="text-gray-600">Share this link with a friend to invite them.</p>
                )}

                {gameId && (
                    <div className="flex items-center space-x-2">
                        <input type="text" readOnly value={joinUrl} className="w-full p-2 rounded-lg bg-gray-200 border text-sm" />
                        <button onClick={handleCopy} className="p-2 rounded-lg bg-blue-500 text-white font-bold hover:bg-blue-600 transition-all text-sm w-24">{copied ? 'Copied!' : 'Copy'}</button>
                    </div>
                )}
                {hasTimeout && timeLeft > 0 && (
                    <p className="text-sm text-gray-500">
                        {isFindingMatch ? 'Search will time out in' : 'Game will expire in'}: <span className="font-bold">{formatTime(timeLeft)}</span>
                    </p>
                )}
                 {isFindingMatch && onCancelSearch && (
                    <button 
                        onClick={onCancelSearch} 
                        className="w-full mt-2 py-2 rounded-lg font-bold text-white bg-red-500 hover:bg-red-600 transition-all shadow-md"
                    >
                        Cancel Search
                    </button>
                )}
                 {gameId && onCancelCreateGame && (
                    <button 
                        onClick={onCancelCreateGame} 
                        className="w-full mt-2 py-2 rounded-lg font-bold text-white bg-red-500 hover:bg-red-600 transition-all shadow-md"
                    >
                        Cancel Game
                    </button>
                )}
            </div>
        </Modal>
    )
}

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
          <button onClick={props.onBack} className="text-sm font-semibold text-gray-600 hover:text-black">{'< Back'}</button>
          <h2 className="text-2xl font-bold text-center text-gray-800">Local Game Setup</h2>
          <div className="flex gap-4">
              <button onClick={() => setMode(GameMode.PVP)} className={`w-full p-3 rounded-lg font-bold transition-all ${mode === GameMode.PVP ? 'bg-blue-500 text-white scale-105' : 'bg-gray-200 hover:bg-gray-300'}`}>Player vs Player</button>
              <button onClick={() => setMode(GameMode.PVC)} className={`w-full p-3 rounded-lg font-bold transition-all ${mode === GameMode.PVC ? 'bg-pink-500 text-white scale-105' : 'bg-gray-200 hover:bg-gray-300'}`}>Player vs AI</button>
          </div>
          {mode === GameMode.PVC && (
              <div className="space-y-4">
                  <div>
                      <h3 className="font-semibold text-gray-600 mb-2">AI Type</h3>
                      <div className="flex gap-4">
                          <button onClick={() => setAiType(AiType.LOCAL)} className={`w-full p-3 rounded-lg font-bold transition-all ${aiType === AiType.LOCAL ? 'bg-gray-800 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Local (Offline)</button>
                          <button onClick={() => setAiType(AiType.GEMINI)} className={`w-full p-3 rounded-lg font-bold transition-all ${aiType === AiType.GEMINI ? 'bg-purple-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Gemini AI</button>
                      </div>
                  </div>
                  <div>
                      <h3 className="font-semibold text-gray-600 mb-2">AI Difficulty</h3>
                      <div className="grid grid-cols-3 gap-2">
                          {Object.values(Difficulty).map(d => (<button key={d} onClick={() => setDifficulty(d)} className={`p-2 rounded-lg font-semibold transition-all text-sm ${difficulty === d ? 'bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>{d}</button>))}
                      </div>
                  </div>
              </div>
          )}
          <div>
              <h3 className="font-semibold text-gray-600 mb-2">Starting Position</h3>
              <div className="flex gap-4">
                  <button onClick={() => setStartPos(StartPosition.CENTER)} className={`w-full p-3 rounded-lg font-bold transition-all ${startPos === StartPosition.CENTER ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Center</button>
                  <button onClick={() => setStartPos(StartPosition.RANDOM)} className={`w-full p-3 rounded-lg font-bold transition-all ${startPos === StartPosition.RANDOM ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Random</button>
              </div>
          </div>
           <div>
              <label htmlFor="walls" className="font-semibold text-gray-600 block mb-1">Number of Walls: <span className="font-bold text-blue-600">{walls}</span></label>
              <input type="range" id="walls" value={walls} min="5" max="15" step="1" onChange={(e) => setWalls(Number(e.target.value))} className="w-full" />
          </div>
          <div>
              <label htmlFor="turnTime" className="font-semibold text-gray-600 block mb-2">Time Per Move (seconds)</label>
              <input type="number" id="turnTime" value={duration} min={minTime} step="15" onChange={(e) => setDuration(Math.max(minTime, Number(e.target.value)))} className="w-full p-3 rounded-lg bg-gray-200" />
              <p className="text-xs text-gray-500 mt-1">Minimum: {minTime} seconds.</p>
          </div>
          <button onClick={() => props.onStartGame(mode, difficulty, props.playerName, aiType, duration, startPos, walls)} className="w-full bg-green-500 text-white font-bold py-4 rounded-lg hover:bg-green-600 transition-all shadow-lg text-xl">Start Game</button>
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
           <button onClick={props.onBack} className="text-sm font-semibold text-gray-600 hover:text-black">{'< Back'}</button>
           <h2 className="text-2xl font-bold text-center text-gray-800">Online Multiplayer</h2>
           <div>
              <h3 className="font-semibold text-gray-600 mb-2">Game Options</h3>
              <div className="space-y-3">
                  <label htmlFor="turnTimeOnline" className="text-gray-600 block">Time Per Move: {duration}s</label>
                  <input type="range" id="turnTimeOnline" value={duration} min="30" max="120" step="15" onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
                  
                  <label htmlFor="wallsOnline" className="text-gray-600 block">Number of Walls: <span className="font-bold text-blue-600">{walls}</span></label>
                  <input type="range" id="wallsOnline" value={walls} min="5" max="15" step="1" onChange={(e) => setWalls(Number(e.target.value))} className="w-full" />
                  
                  <div className="flex gap-4">
                      <button onClick={() => setStartPos(StartPosition.CENTER)} className={`w-full p-3 rounded-lg font-bold transition-all ${startPos === StartPosition.CENTER ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Center Start</button>
                      <button onClick={() => setStartPos(StartPosition.RANDOM)} className={`w-full p-3 rounded-lg font-bold transition-all ${startPos === StartPosition.RANDOM ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Random Start</button>
                  </div>
              </div>
           </div>
           <div className="space-y-4 pt-4 border-t">
               <button onClick={() => props.onFindMatch(duration, startPos, walls)} className="w-full bg-purple-500 text-white font-bold py-3 rounded-lg hover:bg-purple-600 transition-all">Find Random Match</button>
               <div className="text-center text-gray-500">OR</div>
               <button onClick={() => props.onCreateGame(duration, startPos, walls)} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-all">Create Private Game</button>
               <div className="flex items-center space-x-2">
                   <input type="text" value={joinGameId} onChange={(e) => setJoinGameId(e.target.value)} className="w-full p-3 rounded-lg bg-gray-200" placeholder="Paste Game ID" />
                   <button onClick={() => props.onJoinGame(joinGameId)} disabled={!joinGameId} className="p-3 rounded-lg bg-blue-500 text-white font-bold hover:bg-blue-600 transition-all disabled:opacity-50">Join</button>
               </div>
           </div>
       </div>
    );
};

export default App;