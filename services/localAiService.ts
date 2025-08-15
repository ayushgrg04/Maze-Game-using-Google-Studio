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

const getPossibleMoves = (pos: Position, walls: Wall[], opponentPos: Position): Position[] => {
    const { r, c } = pos;
    const moves: Position[] = [];

    const potentialMoves = [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }];

    for (const move of potentialMoves) {
        if (move.r < 0 || move.r >= BOARD_SIZE || move.c < 0 || move.c >= BOARD_SIZE || isMoveBlocked(pos, move, walls)) {
            continue;
        }

        if (move.r === opponentPos.r && move.c === opponentPos.c) {
            // Adjacent to opponent, calculate jumps
            const dr = opponentPos.r - pos.r;
            const dc = opponentPos.c - pos.c;
            const jumpPos = { r: opponentPos.r + dr, c: opponentPos.c + dc };

            // Straight jump
            if (jumpPos.r >= 0 && jumpPos.r < BOARD_SIZE && jumpPos.c >= 0 && jumpPos.c < BOARD_SIZE && !isMoveBlocked(opponentPos, jumpPos, walls)) {
                moves.push(jumpPos);
            } else {
                // Diagonal jumps if straight is blocked
                if (dr === 0) { // Horizontal adjacency
                    const d1 = { r: opponentPos.r - 1, c: opponentPos.c };
                    const d2 = { r: opponentPos.r + 1, c: opponentPos.c };
                    if (!isMoveBlocked(opponentPos, d1, walls)) moves.push(d1);
                    if (!isMoveBlocked(opponentPos, d2, walls)) moves.push(d2);
                } else { // Vertical adjacency
                    const d1 = { r: opponentPos.r, c: opponentPos.c - 1 };
                    const d2 = { r: opponentPos.r, c: opponentPos.c + 1 };
                    if (!isMoveBlocked(opponentPos, d1, walls)) moves.push(d1);
                    if (!isMoveBlocked(opponentPos, d2, walls)) moves.push(d2);
                }
            }
        } else {
            moves.push(move);
        }
    }
    return moves.filter(m => m.r >= 0 && m.r < BOARD_SIZE && m.c >= 0 && m.c < BOARD_SIZE);
};

// Simplified helper to find a potentially good wall placement to block the opponent.
const findBestBlockingWall = (
    opponent: Player, 
    aiPlayer: Player,
    walls: Wall[], 
    isValidWall: (wall: Wall) => boolean
): Omit<Wall, 'playerId'> | null => {
    const opponentPath = findShortestPath(opponent.position, opponent.goalRow, walls, aiPlayer.position);
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
    // The pathfinding now correctly considers jumps over the opponent.
    const myPath = findShortestPath(aiPlayer.position, aiPlayer.goalRow, walls, humanPlayer.position);
    const humanPath = findShortestPath(humanPlayer.position, humanPlayer.goalRow, walls, aiPlayer.position);

    const myPathLength = myPath ? myPath.length - 1 : Infinity;
    const humanPathLength = humanPath ? humanPath.length - 1 : Infinity;

    // --- Decision Logic ---
    let bestMoveAction: AiAction | null = null;
    if (myPath && myPath.length > 1) {
        const move = myPath[1];
        const isJump = Math.abs(move.r - aiPlayer.position.r) + Math.abs(move.c - aiPlayer.position.c) > 1;
        bestMoveAction = { 
            action: 'MOVE', 
            position: move, 
            reasoning: isJump ? "Jumping over your pawn." : "Moving along my shortest path." 
        };
    } else { // Trapped or no path to goal, find any valid move
        const anyMove = getPossibleMoves(aiPlayer.position, walls, humanPlayer.position)[0];
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
        const humanPathAfterWall = findShortestPath(humanPlayer.position, humanPlayer.goalRow, newWalls, aiPlayer.position);
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