import { findShortestPath } from '../utils/pathfinding';
import { BOARD_SIZE } from '../constants';
import { Difficulty } from '../types';
import type { Player, Wall, AiAction, Position } from '../types';

// Helper to check if a move between two cells is blocked by a wall
const isMoveBlocked = (from: Position, to: Position, walls: Wall[]): boolean => {
    const { r: fromR, c: fromC } = from;
    const { r: toR, c: toC } = to;

    if (fromR === toR) { // Horizontal move
        const wallC = Math.min(fromC, toC);
        return walls.some(w => w.orientation === 'vertical' && w.c === wallC + 1 && (w.r === fromR || w.r === fromR - 1));
    } else { // Vertical move
        const wallR = Math.min(fromR, toR);
        return walls.some(w => w.orientation === 'horizontal' && w.r === wallR + 1 && (w.c === fromC || w.c === fromC - 1));
    }
};

const getPossibleMoves = (pos: Position, walls: Wall[]): Position[] => {
    const { r, c } = pos;
    // Note: This simplified version doesn't handle jumps over players.
    // The core game logic will still validate the chosen move.
    const potentialMoves = [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }];
    return potentialMoves.filter(move =>
        move.r >= 0 && move.r < BOARD_SIZE &&
        move.c >= 0 && move.c < BOARD_SIZE &&
        !isMoveBlocked(pos, move, walls)
    );
};

// Simplified helper to find a potentially good wall placement to block the opponent.
const findBestBlockingWall = (
    opponent: Player, 
    aiPlayer: Player,
    walls: Wall[], 
    isValidWall: (wall: Wall) => boolean
): Omit<Wall, 'playerId'> | null => {
    const opponentPath = findShortestPath(opponent.position, opponent.goalRow, walls);
    if (!opponentPath || opponentPath.length < 2) return null;

    // Try to place a wall along the first step of the opponent's path
    const [p1, p2] = opponentPath;
    const isHorizontalMove = p1.r === p2.r;

    const wall: Wall = {
        orientation: isHorizontalMove ? 'vertical' : 'horizontal',
        r: isHorizontalMove ? p1.r : Math.min(p1.r, p2.r) + 1,
        c: isHorizontalMove ? Math.min(p1.c, p2.c) + 1 : p1.c,
        playerId: aiPlayer.id,
    };
    
    // Check main position and one adjacent position for validity
    if (isValidWall(wall)) return wall;
    
    if (wall.orientation === 'horizontal' && wall.c > 0) {
        const wall2 = { ...wall, c: wall.c - 1 };
        if (isValidWall(wall2)) return wall2;
    }
     if (wall.orientation === 'vertical' && wall.r > 0) {
        const wall2 = { ...wall, r: wall.r - 1 };
        if (isValidWall(wall2)) return wall2;
    }

    return null;
}

const getLocalAiMove = (
    aiPlayer: Player,
    humanPlayer: Player,
    walls: Wall[],
    difficulty: Difficulty,
    isValidWallPlacement: (wall: Wall) => boolean
): AiAction => {
    const myPath = findShortestPath(aiPlayer.position, aiPlayer.goalRow, walls);
    const humanPath = findShortestPath(humanPlayer.position, humanPlayer.goalRow, walls);

    const myPathLength = myPath ? myPath.length - 1 : Infinity;
    const humanPathLength = humanPath ? humanPath.length - 1 : Infinity;

    // --- Decision Logic ---
    let bestMoveAction: AiAction | null = null;
    if (myPath && myPath.length > 1) {
        bestMoveAction = { action: 'MOVE', position: myPath[1], reasoning: "Moving along my shortest path." };
    } else { // Trapped or no path, find any valid move
        const anyMove = getPossibleMoves(aiPlayer.position, walls)[0];
        if (anyMove) {
            bestMoveAction = { action: 'MOVE', position: anyMove, reasoning: "My path is blocked, trying to find a way around." };
        }
    }

    // EASY: Always moves forward.
    if (difficulty === Difficulty.EASY) {
        return bestMoveAction ?? { action: 'MOVE', position: aiPlayer.position, reasoning: "I am trapped and cannot move." };
    }

    // MEDIUM & HARD: Consider placing a wall
    let bestWallAction: AiAction | null = null;
    if (aiPlayer.wallsLeft > 0) {
        // Condition to place a wall: if opponent is ahead (Medium) or for any strategic advantage (Hard)
        const shouldConsiderWall = (difficulty === Difficulty.MEDIUM && humanPathLength < myPathLength) || difficulty === Difficulty.HARD;

        if (shouldConsiderWall) {
             const blockingWall = findBestBlockingWall(humanPlayer, aiPlayer, walls, isValidWallPlacement);
             if (blockingWall) {
                bestWallAction = {
                    action: 'PLACE_WALL',
                    position: { r: blockingWall.r, c: blockingWall.c },
                    orientation: blockingWall.orientation,
                    reasoning: "Placing a wall to obstruct your path."
                };
             }
        }
    }

    // HARD: Compare the outcome of moving vs placing a wall
    if (difficulty === Difficulty.HARD && bestWallAction && bestMoveAction) {
        const newWalls = [...walls, { ...(bestWallAction.position), orientation: bestWallAction.orientation!, playerId: aiPlayer.id }];
        const humanPathAfterWall = findShortestPath(humanPlayer.position, humanPlayer.goalRow, newWalls);
        const humanPathLengthAfterWall = humanPathAfterWall ? humanPathAfterWall.length - 1 : Infinity;
        
        // If placing a wall is significantly better (lengthens opponent path), do it.
        if (humanPathLengthAfterWall > humanPathLength + 1) {
            return bestWallAction;
        }
        return bestMoveAction;
    }
    
    // MEDIUM: If a wall is available and opponent is winning, use it.
    if (difficulty === Difficulty.MEDIUM && bestWallAction) {
        return bestWallAction;
    }

    // Default to moving
    return bestMoveAction ?? { action: 'MOVE', position: aiPlayer.position, reasoning: "I am trapped and cannot move." };
};

export default getLocalAiMove;