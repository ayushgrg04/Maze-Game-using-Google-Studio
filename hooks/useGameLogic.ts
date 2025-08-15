


import { useState, useCallback, useEffect } from 'react';
import { BOARD_SIZE, INITIAL_WALLS } from '../constants';
import getAiMove from '../services/geminiService';
import getLocalAiMove from '../services/localAiService';
import { onlineService } from '../services/onlineService';
import { findShortestPath, getPossibleMoves } from '../utils/pathfinding';
import type { Player, Position, Wall, AiAction, OnlineGameData } from '../types';
import { GameState, GameMode, Difficulty, AiType, StartPosition } from '../types';

type GameAction = 
    | { type: 'MOVE', to: { r: number, c: number } }
    | { type: 'PLACE_WALL', wall: Omit<Wall, 'playerId'> }
    | { type: 'TIMEOUT' };

const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.PVP);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [aiType, setAiType] = useState<AiType>(AiType.LOCAL);
  const [startPosition, setStartPosition] = useState<StartPosition>(StartPosition.CENTER);
  const [players, setPlayers] = useState<{ [key: number]: Player }>({});
  const [walls, setWalls] = useState<Wall[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<Player | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [isPlacingWall, setIsPlacingWall] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [lastAiAction, setLastAiAction] = useState<AiAction | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [gameTime, setGameTime] = useState(0);
  const [turnTime, setTurnTime] = useState(60);
  const [configuredTurnTime, setConfiguredTurnTime] = useState(60);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [wallPlacementError, setWallPlacementError] = useState<string | null>(null);
  const [wallPreview, setWallPreview] = useState<Omit<Wall, 'playerId'> | null>(null);
  const [onlineGameId, setOnlineGameId] = useState<string | null>(null);
  const [onlinePlayerId, setOnlinePlayerId] = useState<1 | 2 | null>(null);
  const [onlineRequestTimeout, setOnlineRequestTimeout] = useState<number | null>(null);


  const resetGameState = useCallback(() => {
    setWalls([]);
    setCurrentPlayerId(1);
    setWinner(null);
    setSelectedPiece(null);
    setValidMoves([]);
    setIsPlacingWall(false);
    setLastAiAction(null);
    setApiError(null);
    setGameTime(0);
    setTurnTime(configuredTurnTime);
    
    if(onlineRequestTimeout) clearTimeout(onlineRequestTimeout);
    setOnlineRequestTimeout(null);
    if(onlineGameId) onlineService.leaveGame(onlineGameId);
    setOnlineGameId(null);
    setOnlinePlayerId(null);

  }, [configuredTurnTime, onlineGameId, onlineRequestTimeout]);
  
  const returnToMenu = useCallback(() => {
    setGameState(GameState.MENU);
    resetGameState();
  }, [resetGameState]);

  const initializeLocalGame = useCallback((mode: GameMode, p1Name: string = 'Player 1', selectedAiType: AiType, duration: number, startPos: StartPosition) => {
    resetGameState();
    let p2Name = 'Player 2';
    if (mode === GameMode.PVC) {
        p2Name = selectedAiType === AiType.GEMINI ? 'Gemini AI' : 'Local AI';
    }

    const p1Col = startPos === StartPosition.CENTER ? Math.floor(BOARD_SIZE / 2) : Math.floor(Math.random() * BOARD_SIZE);
    const p2Col = startPos === StartPosition.CENTER ? Math.floor(BOARD_SIZE / 2) : (BOARD_SIZE - 1) - p1Col;
    
    const p1: Player = { id: 1, name: p1Name, color: '#3b82f6', position: { r: BOARD_SIZE - 1, c: p1Col }, wallsLeft: INITIAL_WALLS, goalRow: 0 };
    const p2: Player = { id: 2, name: p2Name, color: '#ec4899', position: { r: 0, c: p2Col }, wallsLeft: INITIAL_WALLS, goalRow: BOARD_SIZE - 1 };

    setPlayers({ 1: p1, 2: p2 });
    setConfiguredTurnTime(duration);
    setTurnTime(duration);
    setGameState(GameState.PLAYING);
  }, [resetGameState]);

  const isValidWallPlacement = useCallback((wall: Wall, currentWalls: Wall[], p1: Player, p2: Player): boolean => {
    const player = p1.id === wall.playerId ? p1 : p2;
    if (!player || player.wallsLeft === 0) return false;
    
    if (wall.orientation === 'horizontal' && (wall.c < 0 || wall.c >= BOARD_SIZE - 1 || wall.r <= 0 || wall.r >= BOARD_SIZE)) return false;
    if (wall.orientation === 'vertical' && (wall.r < 0 || wall.r >= BOARD_SIZE - 1 || wall.c <= 0 || wall.c >= BOARD_SIZE)) return false;

    for (const w of currentWalls) {
        if (w.r === wall.r && w.c === wall.c && w.orientation === wall.orientation) return false; 
        if (wall.orientation === 'horizontal') {
            if (w.orientation === 'horizontal' && w.r === wall.r && Math.abs(w.c - wall.c) < 2) return false;
            if (w.orientation === 'vertical' && w.r === wall.r - 1 && w.c === wall.c + 1) return false;
        } else {
            if (w.orientation === 'vertical' && w.c === wall.c && Math.abs(w.r - wall.r) < 2) return false;
            if (w.orientation === 'horizontal' && w.r === wall.r + 1 && w.c === wall.c - 1) return false;
        }
    }

    const newWalls = [...currentWalls, wall];
    const p1PathExists = findShortestPath(p1.position, p1.goalRow, newWalls) !== null;
    const p2PathExists = findShortestPath(p2.position, p2.goalRow, newWalls) !== null;
    
    return p1PathExists && p2PathExists;
  }, []);

  const switchTurn = useCallback(() => {
    setCurrentPlayerId(prev => (prev === 1 ? 2 : 1));
    setSelectedPiece(null);
    setValidMoves([]);
    setIsPlacingWall(false);
    setWallPlacementError(null);
    setWallPreview(null);
    setTurnTime(configuredTurnTime);
  }, [configuredTurnTime]);

  const calculateValidMoves = useCallback((pos: Position) => {
    if (!players[1] || !players[2]) return;
    const opponentPos = players[currentPlayerId === 1 ? 2 : 1].position;
    const valid = getPossibleMoves(pos, walls, opponentPos);
    setValidMoves(valid);
  }, [players, walls, currentPlayerId]);

  const applyActionToState = (state: OnlineGameData, action: GameAction, actionByPlayerId: 1 | 2): OnlineGameData => {
    const newState = JSON.parse(JSON.stringify(state)); // Deep clone
    if (newState.winner || actionByPlayerId !== newState.currentPlayerId) return state;

    const { players, walls } = newState;
    switch(action.type) {
        case 'MOVE':
            players[actionByPlayerId].position = action.to;
            if (action.to.r === players[actionByPlayerId].goalRow) {
                newState.winner = players[actionByPlayerId];
            }
            break;
        case 'PLACE_WALL':
            const newWall: Wall = { ...action.wall, playerId: actionByPlayerId };
            walls.push(newWall);
            players[actionByPlayerId].wallsLeft--;
            break;
        case 'TIMEOUT':
            newState.winner = players[actionByPlayerId === 1 ? 2 : 1];
            break;
    }

    if (!newState.winner) {
        newState.currentPlayerId = actionByPlayerId === 1 ? 2 : 1;
    }
    newState.turnTime = configuredTurnTime;
    return newState;
  };
  
  const handleMove = useCallback((to: Position, from?: Position) => {
    const fromPos = from || selectedPiece;
    if (!fromPos || !players[1] || !players[2] || (gameMode === GameMode.PVO && currentPlayerId !== onlinePlayerId)) return;

    const opponentPos = players[currentPlayerId === 1 ? 2 : 1].position;
    const possibleMoves = getPossibleMoves(fromPos, walls, opponentPos);
    const moveIsValid = possibleMoves.some(move => move.r === to.r && move.c === to.c);

    if (moveIsValid) {
        if (gameMode === GameMode.PVO && onlineGameId && onlinePlayerId) {
            const currentState: OnlineGameData = { players, walls, currentPlayerId, winner, gameTime, turnTime };
            const nextState = applyActionToState(currentState, { type: 'MOVE', to }, onlinePlayerId);
            onlineService.publishGameState(onlineGameId, nextState);
        } else {
            const updatedPlayers = { ...players };
            updatedPlayers[currentPlayerId].position = to;
            setPlayers(updatedPlayers);
            if (to.r === players[currentPlayerId].goalRow) {
                setWinner(players[currentPlayerId]);
                setGameState(GameState.GAME_OVER);
            } else {
                switchTurn();
            }
        }
    }
    setSelectedPiece(null);
    setValidMoves([]);
  }, [players, walls, selectedPiece, currentPlayerId, switchTurn, gameMode, onlineGameId, onlinePlayerId, winner, gameTime, turnTime, applyActionToState]);

  const handlePlaceWall = useCallback((wall: Omit<Wall, 'playerId'>) => {
    if (!players[1] || !players[2] || (gameMode === GameMode.PVO && currentPlayerId !== onlinePlayerId)) return;
    setWallPlacementError(null);
    const newWall: Wall = { ...wall, playerId: currentPlayerId };
    
    if (players[currentPlayerId].wallsLeft <= 0) {
        setWallPlacementError("You have no walls left.");
        return;
    }
    if (!isValidWallPlacement(newWall, walls, players[1], players[2])) {
        setWallPlacementError("Invalid Placement. Walls cannot cross or completely block a player.");
        return;
    }

    if(gameMode === GameMode.PVO && onlineGameId && onlinePlayerId) {
        const currentState: OnlineGameData = { players, walls, currentPlayerId, winner, gameTime, turnTime };
        const nextState = applyActionToState(currentState, { type: 'PLACE_WALL', wall }, onlinePlayerId);
        onlineService.publishGameState(onlineGameId, nextState);
    } else {
      setWalls(prev => [...prev, newWall]);
      setPlayers(prev => ({
          ...prev,
          [currentPlayerId]: { ...prev[currentPlayerId], wallsLeft: prev[currentPlayerId].wallsLeft - 1, },
      }));
      setIsPlacingWall(false);
      switchTurn();
    }
  }, [players, walls, currentPlayerId, isValidWallPlacement, switchTurn, gameMode, onlineGameId, onlinePlayerId, winner, gameTime, turnTime, applyActionToState]);

  const updateStateFromOnline = useCallback((data: OnlineGameData) => {
      setPlayers(data.players);
      setWalls(data.walls);
      setCurrentPlayerId(data.currentPlayerId);
      setWinner(data.winner);
      setGameTime(data.gameTime);
      setTurnTime(data.turnTime);
      
      const gameHasStarted = data.players && data.players[1] && data.players[2];

      if (gameHasStarted) {
          if (onlineRequestTimeout) {
            clearTimeout(onlineRequestTimeout);
            setOnlineRequestTimeout(null);
          }
      }

      if (data.winner) {
          setGameState(GameState.GAME_OVER);
      } else if (gameHasStarted && gameState !== GameState.PLAYING) {
          setGameState(GameState.PLAYING);
      }
  }, [gameState, onlineRequestTimeout]);

  useEffect(() => {
      if (onlineGameId) {
          const unsubscribe = onlineService.onGameStateUpdate(onlineGameId, updateStateFromOnline);
          return () => unsubscribe();
      }
  }, [onlineGameId, updateStateFromOnline]);

  const handleCreateOnlineGame = useCallback(async (p1Name: string, duration: number, startPos: StartPosition) => {
    resetGameState();
    setGameMode(GameMode.PVO);
    const p1Col = startPos === StartPosition.CENTER ? Math.floor(BOARD_SIZE / 2) : Math.floor(Math.random() * BOARD_SIZE);
    const p1: Player = { id: 1, name: p1Name, color: '#3b82f6', position: { r: BOARD_SIZE - 1, c: p1Col }, wallsLeft: INITIAL_WALLS, goalRow: 0 };
    setPlayers({ 1: p1 });
    setConfiguredTurnTime(duration);
    setGameState(GameState.ONLINE_WAITING);
    
    const gameId = await onlineService.createGame(p1, duration, startPos);
    setOnlineGameId(gameId);
    setOnlinePlayerId(1);

    const timeout = window.setTimeout(() => {
        setApiError("Game creation timed out. The link has expired.");
        returnToMenu();
    }, 5 * 60 * 1000); // 5 minutes
    setOnlineRequestTimeout(timeout);
  }, [resetGameState, returnToMenu]);

  const handleJoinOnlineGame = useCallback(async (gameId: string, p2Name: string) => {
      const initialState = await onlineService.joinGame(gameId, p2Name);
      if (initialState) {
        setOnlineGameId(gameId);
        setOnlinePlayerId(2);
        setConfiguredTurnTime(initialState.turnTime);
        setGameMode(GameMode.PVO);
        updateStateFromOnline(initialState);
      } else {
        setApiError("Could not join game. It might be full or expired.");
      }
  }, [updateStateFromOnline]);
  
  const handleFindMatch = useCallback(async (pName: string, duration: number, startPos: StartPosition) => {
    resetGameState();
    setGameMode(GameMode.PVO);
    const p: Omit<Player, 'id' | 'color' | 'position' | 'goalRow'> = { name: pName, wallsLeft: INITIAL_WALLS };

    setGameState(GameState.ONLINE_WAITING);
    setConfiguredTurnTime(duration);
    
    onlineService.findMatch(p, duration, startPos, (gameId, playerId, initialState) => {
        if (onlineRequestTimeout) {
            clearTimeout(onlineRequestTimeout);
            setOnlineRequestTimeout(null);
        }
        setOnlineGameId(gameId);
        setOnlinePlayerId(playerId);
        updateStateFromOnline(initialState);
    });
    
    const timeout = window.setTimeout(() => {
        setApiError("Could not find a match. Please try again later.");
        onlineService.cancelFindMatch();
        returnToMenu();
    }, 3 * 60 * 1000); // 3 minutes
    setOnlineRequestTimeout(timeout);
  }, [resetGameState, updateStateFromOnline, returnToMenu, onlineRequestTimeout]);
  
  const handleCancelFindMatch = useCallback(() => {
    onlineService.cancelFindMatch();
    returnToMenu();
  }, [returnToMenu]);

  const handleCancelCreateGame = useCallback(() => {
    returnToMenu();
  }, [returnToMenu]);

  useEffect(() => {
    const isHumanTurn = (gameMode !== GameMode.PVC || currentPlayerId === 1) && (gameMode !== GameMode.PVO || currentPlayerId === onlinePlayerId);
    if (gameState === GameState.PLAYING && !isPlacingWall && !winner && isHumanTurn) {
        const currentPlayer = players[currentPlayerId];
        if (currentPlayer) {
          setSelectedPiece(currentPlayer.position);
          calculateValidMoves(currentPlayer.position);
        }
    } else {
      setSelectedPiece(null);
      setValidMoves([]);
    }
  }, [currentPlayerId, gameState, gameMode, players, isPlacingWall, winner, calculateValidMoves, onlinePlayerId]);

  const executeAiMove = useCallback(async () => {
    if (gameState !== GameState.PLAYING || gameMode !== GameMode.PVC || currentPlayerId !== 2 || winner || !players[1] || !players[2]) return;
    
    setAiThinking(true);
    setLastAiAction(null);
    setApiError(null);

    try {
        let aiAction: AiAction;
        if (aiType === AiType.LOCAL) {
            const checkWall = (wall: Wall) => isValidWallPlacement(wall, walls, players[1], players[2]);
            aiAction = getLocalAiMove(players[2], players[1], walls, difficulty, checkWall);
        } else {
            aiAction = await getAiMove(players, 2, walls, difficulty);
        }
        
        setLastAiAction(aiAction);
        
        if (aiAction.action === 'MOVE') {
            const possibleMoves = getPossibleMoves(players[2].position, walls, players[1].position);
            const moveIsValid = possibleMoves.some(m => m.r === aiAction.position.r && m.c === aiAction.position.c);
            if (moveIsValid) handleMove(aiAction.position, players[2].position);
            else throw new Error("AI suggested an invalid move.");
        } else if (aiAction.action === 'PLACE_WALL' && aiAction.orientation) {
            const wallToPlace = { r: aiAction.position.r, c: aiAction.position.c, orientation: aiAction.orientation };
            if (isValidWallPlacement({ ...wallToPlace, playerId: 2 }, walls, players[1], players[2])) handlePlaceWall(wallToPlace);
            else throw new Error("AI suggested an invalid wall placement.");
        } else {
            throw new Error(`AI returned an invalid action.`);
        }
    } catch (error: any) {
        if (error.message && error.message.includes('RESOURCE_EXHAUSTED')) setShowRateLimitModal(true);
        else setApiError(error.message || "An unexpected AI error occurred. Making a default move.");
        
        const fallbackPath = findShortestPath(players[2].position, players[2].goalRow, walls, players[1].position);
        if (fallbackPath && fallbackPath.length > 1) handleMove(fallbackPath[1], players[2].position);
        else switchTurn();
    } finally {
        setAiThinking(false);
    }
  }, [gameState, gameMode, currentPlayerId, winner, players, walls, difficulty, aiType, handleMove, handlePlaceWall, isValidWallPlacement, switchTurn]);

  useEffect(() => {
    if(gameState === GameState.PLAYING && gameMode === GameMode.PVC && currentPlayerId === 2 && !winner && !aiThinking) {
      const timer = setTimeout(() => executeAiMove(), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPlayerId, gameState, gameMode, winner, executeAiMove, aiThinking]);

  useEffect(() => {
    let gameInterval: number | undefined;
    if (gameState === GameState.PLAYING) {
      gameInterval = window.setInterval(() => {
          setGameTime(prev => prev + 1)
      }, 1000);
    }
    return () => clearInterval(gameInterval);
  }, [gameState, onlinePlayerId]);

  useEffect(() => {
    let turnInterval: number | undefined;
    if (gameState === GameState.PLAYING && (gameMode !== GameMode.PVO || currentPlayerId === onlinePlayerId)) {
      turnInterval = window.setInterval(() => {
        setTurnTime(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(turnInterval);
  }, [gameState, currentPlayerId, gameMode, onlinePlayerId]);

  useEffect(() => {
    if (gameState === GameState.PLAYING && turnTime === 0 && onlineGameId && onlinePlayerId && currentPlayerId === onlinePlayerId) {
        const currentState: OnlineGameData = { players, walls, currentPlayerId, winner, gameTime, turnTime };
        const nextState = applyActionToState(currentState, { type: 'TIMEOUT' }, onlinePlayerId);
        onlineService.publishGameState(onlineGameId, nextState);
    } else if (gameState === GameState.PLAYING && turnTime === 0 && gameMode !== GameMode.PVO) {
        setWinner(players[currentPlayerId === 1 ? 2 : 1]);
        setGameState(GameState.GAME_OVER);
    }
  }, [turnTime, gameState, players, currentPlayerId, gameMode, onlinePlayerId, onlineGameId, winner, gameTime, walls, configuredTurnTime, applyActionToState]);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('join');
    if (gameId) {
      const p2Name = sessionStorage.getItem('playerName') || 'Player 2';
      handleJoinOnlineGame(gameId, p2Name);
      window.history.replaceState({}, document.title, window.location.pathname); // Clean URL
    }
  }, [handleJoinOnlineGame]);


  const handleWallPreview = useCallback((wall: Omit<Wall, 'playerId'>) => setWallPreview(wall), []);
  const confirmWallPlacement = useCallback(() => {
    if (wallPreview) handlePlaceWall(wallPreview);
    setWallPreview(null);
  }, [wallPreview, handlePlaceWall]);
  const cancelWallPlacement = useCallback(() => setWallPreview(null), []);
  
  const togglePlacingWall = () => {
    if (isPlacingWall) setWallPreview(null);
    setIsPlacingWall(prev => !prev);
    setSelectedPiece(null);
    setValidMoves([]);
    setWallPlacementError(null);
  };

  const startGame = (mode: GameMode, diff: Difficulty, p1Name: string, type: AiType, duration: number, startPos: StartPosition) => {
    setGameMode(mode);
    setDifficulty(diff);
    setAiType(type);
    setStartPosition(startPos);
    initializeLocalGame(mode, p1Name, type, duration, startPos);
  }

  return {
    gameState, gameMode, difficulty, aiType, players, walls, currentPlayerId, winner,
    selectedPiece, validMoves, isPlacingWall, aiThinking, lastAiAction, apiError,
    gameTime, turnTime, showRateLimitModal, wallPlacementError,
    configuredTurnTime, startPosition, wallPreview, onlineGameId, onlinePlayerId, onlineRequestTimeout,
    setShowRateLimitModal,
    startGame, handleCellClick: handleMove, handleWallPreview,
    confirmWallPlacement, cancelWallPlacement,
    togglePlacingWall, returnToMenu,
    handleCreateOnlineGame, handleJoinOnlineGame, handleFindMatch, handleCancelFindMatch, handleCancelCreateGame,
  };
};

export default useGameLogic;
