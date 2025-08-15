import { useState, useCallback, useEffect } from 'react';
import { BOARD_SIZE, INITIAL_WALLS } from '../constants';
import getAiMove from '../services/geminiService';
import type { Player, Position, Wall, AiAction } from '../types';
import { GameState, GameMode, Difficulty } from '../types';

const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.PVP);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [players, setPlayers] = useState<{ [key: number]: Player }>({});
  const [walls, setWalls] = useState<Wall[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<Player | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [isPlacingWall, setIsPlacingWall] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [lastAiAction, setLastAiAction] = useState<AiAction | null>(null);
  const [gameTime, setGameTime] = useState(0);
  const [turnTime, setTurnTime] = useState(60);

  const initializeGame = useCallback((mode: GameMode, p1Name: string = 'Player 1') => {
    const p1: Player = {
      id: 1,
      name: p1Name,
      color: '#3b82f6', // blue-500
      position: { r: BOARD_SIZE - 1, c: Math.floor(BOARD_SIZE / 2) },
      wallsLeft: INITIAL_WALLS,
      goalRow: 0,
    };
    const p2: Player = {
      id: 2,
      name: mode === GameMode.PVP ? 'Player 2' : 'Gemini AI',
      color: '#ec4899', // pink-500
      position: { r: 0, c: Math.floor(BOARD_SIZE / 2) },
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
    setGameTime(0);
    setTurnTime(60);
  }, []);

    const isValidMove = useCallback((from: Position, to: Position, p1Pos: Position, p2Pos: Position, currentWalls: Wall[]): boolean => {
    const { r: fromR, c: fromC } = from;
    const { r: toR, c: toC } = to;

    // Check bounds
    if (toR < 0 || toR >= BOARD_SIZE || toC < 0 || toC >= BOARD_SIZE) return false;

    // Check for wall collision
    if (fromR === toR) { // Horizontal move
        const wallC = Math.min(fromC, toC);
        if (currentWalls.some(w => w.orientation === 'vertical' && w.c === wallC + 1 && (w.r === fromR || w.r === fromR - 1))) return false;
    } else { // Vertical move
        const wallR = Math.min(fromR, toR);
        if (currentWalls.some(w => w.orientation === 'horizontal' && w.r === wallR + 1 && (w.c === fromC || w.c === fromC - 1))) return false;
    }

    const otherPlayerPos = (from.r === p1Pos.r && from.c === p1Pos.c) ? p2Pos : p1Pos;
    
    const dr = toR - fromR;
    const dc = toC - fromC;

    // Standard move
    if (Math.abs(dr) + Math.abs(dc) === 1) {
        return !(toR === otherPlayerPos.r && toC === otherPlayerPos.c);
    }
    
    // Jump move
    if (Math.abs(dr) + Math.abs(dc) === 2) {
        if (!(fromR + dr / 2 === otherPlayerPos.r && fromC + dc / 2 === otherPlayerPos.c)) return false;
        
        // Cannot jump over a wall
        if (!isValidMove(from, otherPlayerPos, p1Pos, p2Pos, currentWalls)) return false;

        return isValidMove(otherPlayerPos, to, p1Pos, p2Pos, currentWalls);
    }

    return false;
  }, []);


  const isValidWallPlacement = useCallback((wall: Wall, currentWalls: Wall[], p1: Player, p2: Player): boolean => {
    const player = p1.id === wall.playerId ? p1 : p2;
    if (!player || player.wallsLeft === 0) return false;
    
    if (wall.orientation === 'horizontal' && (wall.c < 0 || wall.c >= BOARD_SIZE - 1 || wall.r <= 0 || wall.r >= BOARD_SIZE)) return false;
    if (wall.orientation === 'vertical' && (wall.r < 0 || wall.r >= BOARD_SIZE - 1 || wall.c <= 0 || wall.c >= BOARD_SIZE)) return false;

    // Check for collisions with existing walls
    for (const w of currentWalls) {
        // Direct overlap
        if (w.r === wall.r && w.c === wall.c && w.orientation === wall.orientation) return false; 
        
        if (wall.orientation === 'horizontal') {
            // Adjacent horizontal walls overlapping
            if (w.orientation === 'horizontal' && w.r === wall.r && Math.abs(w.c - wall.c) < 2) return false;
            // Crossing a vertical wall (forming a '+')
            if (w.orientation === 'vertical' && w.r === wall.r - 1 && w.c === wall.c + 1) return false;
        } else { // vertical
            // Adjacent vertical walls overlapping
            if (w.orientation === 'vertical' && w.c === wall.c && Math.abs(w.r - wall.r) < 2) return false;
            // Crossing a horizontal wall (forming a '+')
            if (w.orientation === 'horizontal' && w.r === wall.r + 1 && w.c === wall.c - 1) return false;
        }
    }

    // A correct implementation requires a more robust pathfinding algorithm (like A* or BFS)
    // to ensure no player is completely blocked off. This is a complex check.
    // For now, we allow placements that don't physically collide.
    // const newWalls = [...currentWalls, wall];
    // if (!pathExists(p1.position, p1.goalRow, newWalls)) return false;
    // if (!pathExists(p2.position, p2.goalRow, newWalls)) return false;

    return true;
  }, []);

  const switchTurn = useCallback(() => {
    setCurrentPlayerId(prev => (prev === 1 ? 2 : 1));
    setSelectedPiece(null);
    setValidMoves([]);
    setIsPlacingWall(false);
    setTurnTime(60);
  }, []);
  
  const handleMove = useCallback((to: Position, from?: Position) => {
    const fromPos = from || selectedPiece;
    if (!fromPos || !players[1] || !players[2]) return;

    if (isValidMove(fromPos, to, players[1].position, players[2].position, walls)) {
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
  }, [players, walls, selectedPiece, currentPlayerId, isValidMove, switchTurn]);

  const handlePlaceWall = useCallback((wall: Omit<Wall, 'playerId'>) => {
    if (!players[1] || !players[2]) return;
    const newWall: Wall = { ...wall, playerId: currentPlayerId };
    if (players[currentPlayerId].wallsLeft > 0 && isValidWallPlacement(newWall, walls, players[1], players[2])) {
        setWalls(prev => [...prev, newWall]);
        setPlayers(prev => ({
            ...prev,
            [currentPlayerId]: {
                ...prev[currentPlayerId],
                wallsLeft: prev[currentPlayerId].wallsLeft - 1,
            },
        }));
        switchTurn();
    }
    setIsPlacingWall(false);
  }, [players, walls, currentPlayerId, isValidWallPlacement, switchTurn]);
  
  const calculateValidMoves = useCallback((pos: Position) => {
    if (!players[1] || !players[2]) return;
    const { r, c } = pos;
    // Base orthogonal moves
    let potentialMoves = [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }];
    // Jumps
    potentialMoves.push({r:r-2, c:c}, {r:r+2, c:c}, {r:r, c:c-2}, {r:r, c:c+2});
    // Diagonal jumps
    const opponentPos = players[currentPlayerId === 1 ? 2: 1].position;
    if( (Math.abs(pos.r - opponentPos.r) + Math.abs(pos.c - opponentPos.c)) === 1){
      potentialMoves.push({r:opponentPos.r + (opponentPos.r - pos.r), c:opponentPos.c + (opponentPos.c-pos.c)});
    }
    
    const valid = potentialMoves.filter(move => isValidMove(pos, move, players[1].position, players[2].position, walls));
    setValidMoves(valid);
  }, [players, walls, isValidMove, currentPlayerId]);

  const handlePieceClick = useCallback((pos: Position) => {
    if (isPlacingWall || !players[currentPlayerId]) return;
    if (players[currentPlayerId].position.r === pos.r && players[currentPlayerId].position.c === pos.c) {
        if (selectedPiece) {
            setSelectedPiece(null);
            setValidMoves([]);
        } else {
            setSelectedPiece(pos);
            calculateValidMoves(pos);
        }
    }
  }, [isPlacingWall, players, selectedPiece, currentPlayerId, calculateValidMoves]);

  const executeAiMove = useCallback(async () => {
    if (gameState !== GameState.PLAYING || gameMode !== GameMode.PVC || currentPlayerId !== 2 || winner || !players[1] || !players[2]) return;
    
    setAiThinking(true);
    setLastAiAction(null);
    const aiAction = await getAiMove(players, 2, walls, difficulty);
    const aiPlayer = players[2];

    if (!aiAction) {
      const {position} = aiPlayer;
      const moves = [{r:position.r-1, c:position.c}, {r:position.r+1, c:position.c}, {r:position.r, c:position.c-1}, {r:position.r, c:position.c+1}];
      const validAiMoves = moves.filter(m => isValidMove(position, m, players[1].position, aiPlayer.position, walls));
      if(validAiMoves.length > 0) {
        const forwardMove = validAiMoves.find(m => m.r > position.r); // AI goal is row 8 (bottom)
        handleMove(forwardMove || validAiMoves[0], position);
      }
      setAiThinking(false);
      return;
    }
    
    setLastAiAction(aiAction);

    if (aiAction.action === 'MOVE') {
        const { r, c } = aiAction.position;
        if (isValidMove(aiPlayer.position, { r, c }, players[1].position, aiPlayer.position, walls)) {
            handleMove({ r, c }, aiPlayer.position);
        } else {
            const validAiMoves = [{r: aiPlayer.position.r+1, c: aiPlayer.position.c}].filter(m => isValidMove(aiPlayer.position, m, players[1].position, aiPlayer.position, walls));
            if(validAiMoves.length > 0) handleMove(validAiMoves[0], aiPlayer.position); else switchTurn();
        }
    } else if (aiAction.action === 'PLACE_WALL' && aiAction.orientation) {
        const { position, orientation } = aiAction;
        const wallToPlace = { r: position.r, c: position.c, orientation: orientation };
        const wallWithPlayerId = { ...wallToPlace, playerId: currentPlayerId };
        
        if (isValidWallPlacement(wallWithPlayerId, walls, players[1], players[2])) {
            handlePlaceWall(wallToPlace);
        } else {
            // Fallback to moving if wall placement is invalid
            const validAiMoves = [{r: aiPlayer.position.r+1, c: aiPlayer.position.c}].filter(m => isValidMove(aiPlayer.position, m, players[1].position, aiPlayer.position, walls));
            if(validAiMoves.length > 0) handleMove(validAiMoves[0], aiPlayer.position); else switchTurn();
        }
    }
    setAiThinking(false);
  }, [gameState, gameMode, currentPlayerId, winner, players, walls, difficulty, handleMove, handlePlaceWall, isValidMove, isValidWallPlacement, switchTurn]);

  // AI thinking trigger
  useEffect(() => {
    if(gameState === GameState.PLAYING && gameMode === GameMode.PVC && currentPlayerId === 2 && !winner && !aiThinking) {
      const timer = setTimeout(() => {
        executeAiMove();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPlayerId, gameState, gameMode, winner, executeAiMove, aiThinking]);

  // Game timers
  useEffect(() => {
    let gameInterval: number | undefined;
    if (gameState === GameState.PLAYING) {
      gameInterval = window.setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(gameInterval);
  }, [gameState]);

  useEffect(() => {
    let turnInterval: number | undefined;
    if (gameState === GameState.PLAYING) {
      turnInterval = window.setInterval(() => {
        setTurnTime(prev => {
          if (prev <= 1) {
            clearInterval(turnInterval);
            // The timeout logic effect will handle the game over state
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(turnInterval);
  }, [gameState, currentPlayerId]);

  // Timeout logic
  useEffect(() => {
    if (gameState === GameState.PLAYING && turnTime <= 0) {
      const winnerPlayer = players[currentPlayerId === 1 ? 2 : 1];
      setWinner(winnerPlayer);
      setGameState(GameState.GAME_OVER);
    }
  }, [turnTime, gameState, players, currentPlayerId]);

  const startGame = (mode: GameMode, diff: Difficulty, p1Name: string) => {
    setGameMode(mode);
    setDifficulty(diff);
    initializeGame(mode, p1Name);
  }

  const returnToMenu = () => {
    setGameState(GameState.MENU);
  }

  return {
    gameState,
    gameMode,
    difficulty,
    players,
    walls,
    currentPlayerId,
    winner,
    selectedPiece,
    validMoves,
    isPlacingWall,
    aiThinking,
    lastAiAction,
    gameTime,
    turnTime,
    startGame,
    handlePieceClick,
    handleCellClick: handleMove,
    handleWallClick: handlePlaceWall,
    togglePlacingWall: () => {
        setIsPlacingWall(prev => !prev);
        setSelectedPiece(null);
        setValidMoves([]);
    },
    returnToMenu,
  };
};

export default useGameLogic;