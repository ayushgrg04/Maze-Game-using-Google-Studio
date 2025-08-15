

import { useState, useCallback, useEffect } from 'react';
import { BOARD_SIZE, INITIAL_WALLS } from '../constants';
import getAiMove from '../services/geminiService';
import getLocalAiMove from '../services/localAiService';
import { findShortestPath, getPossibleMoves } from '../utils/pathfinding';
import type { Player, Position, Wall, AiAction } from '../types';
import { GameState, GameMode, Difficulty, AiType, StartPosition } from '../types';

const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.PVP);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [aiType, setAiType] = useState<AiType>(AiType.GEMINI);
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


  const initializeGame = useCallback((mode: GameMode, p1Name: string = 'Player 1', selectedAiType: AiType, duration: number, startPos: StartPosition) => {
    let p2Name = 'Player 2';
    if (mode === GameMode.PVC) {
        p2Name = selectedAiType === AiType.GEMINI ? 'Gemini AI' : 'Local AI';
    }

    const p1Col = startPos === StartPosition.CENTER ? Math.floor(BOARD_SIZE / 2) : Math.floor(Math.random() * BOARD_SIZE);
    // Ensure symmetrical placement for random starts to maintain fairness
    const p2Col = startPos === StartPosition.CENTER ? Math.floor(BOARD_SIZE / 2) : (BOARD_SIZE - 1) - p1Col;
    
    const p1: Player = {
      id: 1,
      name: p1Name,
      color: '#3b82f6', // blue-500
      position: { r: BOARD_SIZE - 1, c: p1Col },
      wallsLeft: INITIAL_WALLS,
      goalRow: 0,
    };
    const p2: Player = {
      id: 2,
      name: p2Name,
      color: '#ec4899', // pink-500
      position: { r: 0, c: p2Col },
      wallsLeft: INITIAL_WALLS,
      goalRow: BOARD_SIZE - 1,
    };
    setPlayers({ 1: p1, 2: p2 });
    setWalls([]);
    setCurrentPlayerId(1);
    setWinner(null);
    setSelectedPiece(null);
    setValidMoves([]);
    setIsPlacingWall(false);
    setGameState(GameState.PLAYING);
    setLastAiAction(null);
    setApiError(null);
    setGameTime(0);
    setConfiguredTurnTime(duration);
    setTurnTime(duration);
  }, []);

  const isValidWallPlacement = useCallback((wall: Wall, currentWalls: Wall[], p1: Player, p2: Player): boolean => {
    const player = p1.id === wall.playerId ? p1 : p2;
    if (!player || player.wallsLeft === 0) return false;
    
    if (wall.orientation === 'horizontal' && (wall.c < 0 || wall.c >= BOARD_SIZE - 1 || wall.r <= 0 || wall.r >= BOARD_SIZE)) return false;
    if (wall.orientation === 'vertical' && (wall.r < 0 || wall.r >= BOARD_SIZE - 1 || wall.c <= 0 || wall.c >= BOARD_SIZE)) return false;

    // Check for collisions with existing walls
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

    // Pathfinding check to ensure no player is completely blocked off
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
  
  const handleMove = useCallback((to: Position, from?: Position) => {
    const fromPos = from || selectedPiece;
    if (!fromPos || !players[1] || !players[2]) return;

    // For human clicks, prevent interaction during AI's turn
    if (!from && gameMode === GameMode.PVC && currentPlayerId === 2) return;

    const opponentPos = players[currentPlayerId === 1 ? 2 : 1].position;
    const possibleMoves = getPossibleMoves(fromPos, walls, opponentPos);
    const moveIsValid = possibleMoves.some(move => move.r === to.r && move.c === to.c);

    if (moveIsValid) {
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
    setSelectedPiece(null);
    setValidMoves([]);
  }, [players, walls, selectedPiece, currentPlayerId, switchTurn, gameMode]);

  const handlePlaceWall = useCallback((wall: Omit<Wall, 'playerId'>) => {
    if (!players[1] || !players[2]) return;
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

    setWalls(prev => [...prev, newWall]);
    setPlayers(prev => ({
        ...prev,
        [currentPlayerId]: {
            ...prev[currentPlayerId],
            wallsLeft: prev[currentPlayerId].wallsLeft - 1,
        },
    }));
    setIsPlacingWall(false);
    switchTurn();
  }, [players, walls, currentPlayerId, isValidWallPlacement, switchTurn]);

  useEffect(() => {
    // Automatically show valid moves for the human player at the start of their turn.
    if (gameState === GameState.PLAYING && !isPlacingWall && !winner) {
      const isHumanTurn = (gameMode === GameMode.PVP) || (gameMode === GameMode.PVC && currentPlayerId === 1);
      if (isHumanTurn) {
        const currentPlayer = players[currentPlayerId];
        if (currentPlayer) {
          setSelectedPiece(currentPlayer.position);
          calculateValidMoves(currentPlayer.position);
        }
      } else {
        // Clear highlights on AI's turn
        setSelectedPiece(null);
        setValidMoves([]);
      }
    } else if (isPlacingWall || winner) {
      // Clear moves when entering wall placement or game is over
      setSelectedPiece(null);
      setValidMoves([]);
    }
  }, [currentPlayerId, gameState, gameMode, players, isPlacingWall, winner, calculateValidMoves]);

  const executeAiMove = useCallback(async () => {
    if (gameState !== GameState.PLAYING || gameMode !== GameMode.PVC || currentPlayerId !== 2 || winner || !players[1] || !players[2]) return;
    
    setAiThinking(true);
    setLastAiAction(null);
    setApiError(null);

    try {
        const aiPlayer = players[2];
        const humanPlayer = players[1];
        if (!aiPlayer || !humanPlayer) return;

        let aiAction: AiAction;
        if (aiType === AiType.LOCAL) {
            const checkWall = (wall: Wall) => isValidWallPlacement(wall, walls, humanPlayer, aiPlayer);
            aiAction = getLocalAiMove(aiPlayer, humanPlayer, walls, difficulty, checkWall);
        } else {
            aiAction = await getAiMove(players, 2, walls, difficulty);
        }
        
        setLastAiAction(aiAction);
        
        const opponentPos = players[1].position;
        
        if (aiAction.action === 'MOVE') {
            const possibleMoves = getPossibleMoves(aiPlayer.position, walls, opponentPos);
            const moveIsValid = possibleMoves.some(m => m.r === aiAction.position.r && m.c === aiAction.position.c);
            if (moveIsValid) {
                handleMove(aiAction.position, aiPlayer.position);
            } else {
                console.warn("AI suggested an invalid move:", aiAction);
                throw new Error("AI suggested an invalid move.");
            }
        } else if (aiAction.action === 'PLACE_WALL') {
            if (!aiAction.orientation) {
                console.warn("AI suggested wall placement without orientation:", aiAction);
                throw new Error("AI suggested placing a wall but did not provide an orientation.");
            }
            const wallToPlace = { r: aiAction.position.r, c: aiAction.position.c, orientation: aiAction.orientation };
            if (isValidWallPlacement({ ...wallToPlace, playerId: aiPlayer.id }, walls, humanPlayer, aiPlayer)) {
                handlePlaceWall(wallToPlace);
            } else {
                console.warn("AI suggested an invalid wall placement:", aiAction);
                throw new Error("AI suggested an invalid wall placement.");
            }
        } else {
            throw new Error(`AI returned an unknown action type: '${(aiAction as any)?.action}'.`);
        }
    } catch (error: any) {
        if (error.message && error.message.includes('RESOURCE_EXHAUSTED')) {
            setShowRateLimitModal(true);
        } else {
            setApiError(error.message || "An unexpected AI error occurred. Making a default move.");
        }
        
        const aiPlayer = players[2];
        const humanPlayer = players[1];
        if (!aiPlayer || !humanPlayer) {
          setAiThinking(false);
          return;
        }

        const fallbackPath = findShortestPath(aiPlayer.position, aiPlayer.goalRow, walls, humanPlayer.position);
        if (fallbackPath && fallbackPath.length > 1) {
            handleMove(fallbackPath[1], aiPlayer.position);
        } else {
            setApiError(prev => prev ? `${prev} AI is trapped and must skip its turn.` : "AI is trapped and must skip its turn.");
            switchTurn();
        }
    } finally {
        setAiThinking(false);
    }
  }, [gameState, gameMode, currentPlayerId, winner, players, walls, difficulty, aiType, handleMove, handlePlaceWall, isValidWallPlacement, switchTurn]);

  useEffect(() => {
    if(gameState === GameState.PLAYING && gameMode === GameMode.PVC && currentPlayerId === 2 && !winner && !aiThinking) {
      const timer = setTimeout(() => {
        executeAiMove();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPlayerId, gameState, gameMode, winner, executeAiMove, aiThinking]);

  useEffect(() => {
    let gameInterval: number | undefined;
    if (gameState === GameState.PLAYING) {
      gameInterval = window.setInterval(() => setGameTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(gameInterval);
  }, [gameState]);

  useEffect(() => {
    let turnInterval: number | undefined;
    if (gameState === GameState.PLAYING) {
      turnInterval = window.setInterval(() => {
        setTurnTime(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(turnInterval);
  }, [gameState, currentPlayerId]);

  useEffect(() => {
    if (gameState === GameState.PLAYING && turnTime <= 0) {
      setWinner(players[currentPlayerId === 1 ? 2 : 1]);
      setGameState(GameState.GAME_OVER);
    }
  }, [turnTime, gameState, players, currentPlayerId]);

  const handleWallPreview = useCallback((wall: Omit<Wall, 'playerId'>) => {
    setWallPreview(wall);
  }, []);

  const confirmWallPlacement = useCallback(() => {
    if (wallPreview) {
      handlePlaceWall(wallPreview);
    }
    setWallPreview(null);
  }, [wallPreview, handlePlaceWall]);

  const cancelWallPlacement = useCallback(() => {
    setWallPreview(null);
  }, []);
  
  const togglePlacingWall = () => {
    if (isPlacingWall) {
        setWallPreview(null);
    }
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
    initializeGame(mode, p1Name, type, duration, startPos);
  }

  const returnToMenu = () => {
    setGameState(GameState.MENU);
  }

  return {
    gameState, gameMode, difficulty, aiType, players, walls, currentPlayerId, winner,
    selectedPiece, validMoves, isPlacingWall, aiThinking, lastAiAction, apiError,
    gameTime, turnTime, showRateLimitModal, wallPlacementError,
    configuredTurnTime, startPosition, wallPreview,
    setShowRateLimitModal,
    startGame, handleCellClick: handleMove, handleWallPreview,
    confirmWallPlacement, cancelWallPlacement,
    togglePlacingWall, returnToMenu,
  };
};

export default useGameLogic;