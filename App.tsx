
import React, { useState, useEffect } from 'react';
import useGameLogic from './hooks/useGameLogic';
import GameBoard from './components/GameBoard';
import PlayerInfo from './components/PlayerInfo';
import Modal from './components/Modal';
import { AiChatTooltip } from './components/AiChatTooltip';
import { GameState, GameMode, Difficulty, Player, AiType, StartPosition } from './types';

const TurnIndicator: React.FC<{player: Player}> = ({ player }) => (
    <div className="bg-white rounded-full shadow-md px-4 py-2 flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: player.color }}></div>
        <span className="font-semibold text-gray-700">{player.name}'s Turn</span>
    </div>
);

const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);

const App: React.FC = () => {
    const {
        gameState, gameMode, difficulty, aiType, players, walls, currentPlayerId, winner,
        selectedPiece, validMoves, isPlacingWall, aiThinking, lastAiAction, apiError, gameTime, turnTime,
        showRateLimitModal, wallPlacementError, setShowRateLimitModal, configuredTurnTime, startPosition,
        startGame, handlePieceClick, handleCellClick, handleWallClick, togglePlacingWall, returnToMenu
    } = useGameLogic();

    const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.PVC);
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
    const [selectedAiType, setSelectedAiType] = useState<AiType>(AiType.LOCAL);
    const [playerName, setPlayerName] = useState('Player 1');
    const [turnDuration, setTurnDuration] = useState(60);
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [errorToast, setErrorToast] = useState<string | null>(null);
    const [selectedStartPosition, setSelectedStartPosition] = useState<StartPosition>(StartPosition.CENTER);

    const minTime = selectedMode === GameMode.PVC && selectedAiType === AiType.GEMINI ? 60 : 30;

    useEffect(() => {
        if (turnDuration < minTime) {
            setTurnDuration(minTime);
        }
    }, [selectedMode, selectedAiType, turnDuration, minTime]);

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


    if (gameState === GameState.MENU) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border space-y-6">
                    <div>
                        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">Maze Race</h1>
                        <p className="text-gray-500 text-center">A strategic game of wits and walls.</p>
                    </div>
                    
                    <div>
                         <label htmlFor="playerName" className="text-lg font-semibold mb-2 text-gray-600 block">Your Name</label>
                         <input
                            type="text"
                            id="playerName"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            className="w-full p-3 rounded-lg bg-gray-200 border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            placeholder="Enter your name"
                         />
                    </div>
                    
                    <div>
                        <h2 className="text-lg font-semibold mb-3 text-gray-600">Game Mode</h2>
                        <div className="flex gap-4">
                            <button onClick={() => setSelectedMode(GameMode.PVP)} className={`w-full p-4 rounded-lg font-bold transition-all ${selectedMode === GameMode.PVP ? 'bg-blue-500 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Player vs Player</button>
                            <button onClick={() => setSelectedMode(GameMode.PVC)} className={`w-full p-4 rounded-lg font-bold transition-all ${selectedMode === GameMode.PVC ? 'bg-pink-500 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Player vs AI</button>
                        </div>
                    </div>

                    {selectedMode === GameMode.PVC && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold mb-3 text-gray-600">AI Type</h2>
                                <div className="flex gap-4">
                                    <button onClick={() => setSelectedAiType(AiType.LOCAL)} className={`w-full p-3 rounded-lg font-bold transition-all ${selectedAiType === AiType.LOCAL ? 'bg-gray-800 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Local AI (Offline)</button>
                                    <button onClick={() => setSelectedAiType(AiType.GEMINI)} className={`w-full p-3 rounded-lg font-bold transition-all ${selectedAiType === AiType.GEMINI ? 'bg-purple-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Gemini AI</button>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold mb-3 text-gray-600">AI Difficulty</h2>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.values(Difficulty).map(d => (
                                         <button key={d} onClick={() => setSelectedDifficulty(d)} className={`p-3 rounded-lg font-semibold transition-all text-sm ${selectedDifficulty === d ? 'bg-gray-600 text-white ring-2 ring-pink-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{d}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <h2 className="text-lg font-semibold mb-3 text-gray-600">Starting Position</h2>
                        <div className="flex gap-4">
                            <button onClick={() => setSelectedStartPosition(StartPosition.CENTER)} className={`w-full p-4 rounded-lg font-bold transition-all ${selectedStartPosition === StartPosition.CENTER ? 'bg-blue-500 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Center</button>
                            <button onClick={() => setSelectedStartPosition(StartPosition.RANDOM)} className={`w-full p-4 rounded-lg font-bold transition-all ${selectedStartPosition === StartPosition.RANDOM ? 'bg-pink-500 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Random</button>
                        </div>
                    </div>

                    <div>
                         <label htmlFor="turnTime" className="text-lg font-semibold mb-2 text-gray-600 block">Time Per Move (seconds)</label>
                         <input
                            type="number"
                            id="turnTime"
                            value={turnDuration}
                            min={minTime}
                            step="15"
                            onChange={(e) => setTurnDuration(Math.max(minTime, Number(e.target.value)))}
                            className="w-full p-3 rounded-lg bg-gray-200 border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                         />
                         <p className="text-xs text-gray-500 mt-1">Minimum: {minTime} seconds.</p>
                    </div>
                    
                    <button onClick={() => startGame(selectedMode, selectedDifficulty, playerName, selectedAiType, turnDuration, selectedStartPosition)} className="w-full bg-green-500 text-white font-bold py-4 rounded-lg hover:bg-green-600 transition-all shadow-lg text-xl transform hover:scale-105">
                        Start Game
                    </button>
                    <p className="text-xs text-gray-400 text-center pt-2">Version 1.0</p>
                </div>
            </div>
        );
    }
    
    const currentPlayer = players[currentPlayerId];
    const turnTimeColor = !currentPlayer ? 'text-gray-700' : (currentPlayer.id === 1 ? 'text-blue-500' : 'text-pink-500');
    const turnTimeClasses = `text-2xl font-bold transition-colors ${turnTime <= 10 ? 'text-red-500 animate-pulse' : turnTimeColor}`;
    const aiPlayerName = players[2]?.name || 'AI';

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 space-y-4">
            <h1 className="text-4xl font-bold text-gray-800">Maze Race</h1>

            {currentPlayer && <TurnIndicator player={currentPlayer} />}

            <div className="flex justify-around w-full max-w-sm text-center my-2">
                <div>
                    <p className="text-sm font-medium text-gray-500">TURN TIME</p>
                    <p className={turnTimeClasses}>{formatTime(turnTime)}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">GAME TIME</p>
                    <p className="text-2xl font-bold text-gray-700">{formatTime(gameTime)}</p>
                </div>
            </div>

            <div className="flex justify-between w-full max-w-sm px-10">
                {players[1] && <PlayerInfo player={players[1]} />}
                 <div className="relative">
                    {players[2] && <PlayerInfo player={players[2]} />}
                    {gameMode === GameMode.PVC && aiMessage && <AiChatTooltip message={aiMessage} />}
                 </div>
            </div>

            <GameBoard 
                players={players} 
                walls={walls}
                currentPlayerId={currentPlayerId}
                selectedPiece={selectedPiece}
                validMoves={validMoves}
                isPlacingWall={isPlacingWall}
                onPieceClick={handlePieceClick}
                onCellClick={handleCellClick}
                onWallClick={handleWallClick}
            />

            <div className="flex w-full max-w-sm space-x-4">
                 <button 
                    onClick={togglePlacingWall} 
                    disabled={!currentPlayer || currentPlayer.wallsLeft === 0 || (gameMode === GameMode.PVC && currentPlayerId === 2)}
                    className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${isPlacingWall ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                  >
                    {isPlacingWall ? 'Cancel Wall' : 'Place Wall'}
                 </button>
                 <button 
                    onClick={returnToMenu}
                    className="w-full py-3 rounded-lg font-bold text-gray-700 bg-gray-300 hover:bg-gray-400 transition-all shadow-md"
                  >
                    New Game
                 </button>
            </div>
            
            {gameState === GameState.GAME_OVER && winner && (
                <Modal title="Game Over!">
                    <div className="text-center">
                        <h3 className={`text-3xl font-bold mb-2`} style={{color: winner.color}}>{winner.name} wins!</h3>
                        { turnTime <= 0 && <p className="text-gray-600 mb-4">The other player ran out of time.</p>}
                        <div className="flex flex-col gap-4">
                            <button onClick={() => startGame(gameMode, difficulty, players[1].name, aiType, configuredTurnTime, startPosition)} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-all">Play Again</button>
                            <button onClick={returnToMenu} className="w-full bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-500 transition-all">Main Menu</button>
                        </div>
                    </div>
                </Modal>
            )}
            {showRateLimitModal && (
                 <Modal title="Gemini API Limit Reached" onClose={() => setShowRateLimitModal(false)}>
                    <div className="text-center space-y-4">
                        <p className="text-gray-600">
                            You've exceeded the request limit for the Gemini AI. The AI will make a simple move to continue.
                        </p>
                        <p className="text-gray-600 font-medium">
                            For an uninterrupted experience, we recommend starting a new game with the offline <span className="font-bold text-gray-800">Local AI</span>.
                        </p>
                        <button onClick={() => setShowRateLimitModal(false)} className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-all">
                            OK
                        </button>
                    </div>
                </Modal>
            )}
            {aiThinking && (
                <div className="fixed top-4 right-4 bg-white p-3 rounded-full shadow-lg flex items-center gap-3 z-50">
                   <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="font-semibold text-gray-600">{aiPlayerName} is thinking...</span>
                </div>
            )}
            {errorToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-fade-in-down">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="font-semibold">{errorToast}</span>
                </div>
            )}
            <style>
            {`
              @keyframes fade-in-down {
                0% { opacity: 0; transform: translateY(-20px) translateX(-50%); }
                100% { opacity: 1; transform: translateY(0) translateX(-50%); }
              }
              .animate-fade-in-down {
                animation: fade-in-down 0.5s ease-out forwards;
              }
            `}
            </style>
        </main>
    );
};

export default App;