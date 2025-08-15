
import { findShortestPath, getPossibleMoves } from '../utils/pathfinding';
import { Difficulty } from '../types';
import type { Player, Wall, AiAction } from '../types';

/**
 * Finds the most strategically advantageous wall placement for the AI.
 * It evaluates potential walls along the opponent's shortest path, scoring them
 * based on how much they impede the opponent versus how much they impede the AI.
 * @returns The best wall to place and its calculated strategic score, or null if no good wall is found.
 */
const findBestBlockingWall = (
    aiPlayer: Player,
    humanPlayer: Player,
    walls: Wall[],
    isValidWallPlacement: (wall: Wall) => boolean
): { wall: Omit<Wall, 'playerId'>; score: number } | null => {
    const myPathLength = findShortestPath(aiPlayer.position, aiPlayer.goalRow, walls, humanPlayer.position)?.length || Infinity;
    const humanPath = findShortestPath(humanPlayer.position, humanPlayer.goalRow, walls, aiPlayer.position);

    if (!humanPath || humanPath.length < 2) return null;

    let bestWall: Omit<Wall, 'playerId'> | null = null;
    let bestScore = -Infinity;

    // Look a few steps ahead on the opponent's path to find critical choke points.
    const pathSegmentsToAnalyze = humanPath.slice(0, Math.min(humanPath.length - 1, 4));

    for (let i = 0; i < pathSegmentsToAnalyze.length; i++) {
        const p1 = humanPath[i];
        const p2 = humanPath[i + 1];
        if (!p2) continue;

        const isHorizontalMove = p1.r === p2.r;
        const potentialWalls: Omit<Wall, 'playerId'>[] = [];

        if (isHorizontalMove) {
            const c = Math.min(p1.c, p2.c) + 1;
            potentialWalls.push({ r: p1.r, c, orientation: 'vertical' });
            if (p1.r > 0) potentialWalls.push({ r: p1.r - 1, c, orientation: 'vertical' });
        } else { // Vertical move
            const r = Math.min(p1.r, p2.r) + 1;
            potentialWalls.push({ r, c: p1.c, orientation: 'horizontal' });
            if (p1.c > 0) potentialWalls.push({ r, c: p1.c - 1, orientation: 'horizontal' });
        }
        
        for (const wall of potentialWalls) {
            if (isValidWallPlacement({ ...wall, playerId: aiPlayer.id })) {
                const newWalls = [...walls, { ...wall, playerId: aiPlayer.id }];
                
                const newHumanPathLength = findShortestPath(humanPlayer.position, humanPlayer.goalRow, newWalls, aiPlayer.position)?.length || Infinity;
                const newMyPathLength = findShortestPath(aiPlayer.position, aiPlayer.goalRow, newWalls, humanPlayer.position)?.length || Infinity;

                // A good wall significantly hinders the opponent without hurting the AI too much.
                // We heavily penalize walls that block our own path.
                if (newMyPathLength === Infinity) continue;

                const score = (newHumanPathLength - humanPath.length) - (newMyPathLength - myPathLength);
                if (score > bestScore) {
                    bestScore = score;
                    bestWall = wall;
                }
            }
        }
    }
    
    // Only return a wall if it provides a positive strategic advantage.
    if (bestWall && bestScore > 0) {
        return { wall: bestWall, score: bestScore };
    }

    return null;
};


const getLocalAiMove = (
    aiPlayer: Player,
    humanPlayer: Player,
    walls: Wall[],
    difficulty: Difficulty,
    isValidWallPlacement: (wall: Wall) => boolean
): AiAction => {
    // --- Universal Setup ---
    const myPath = findShortestPath(aiPlayer.position, aiPlayer.goalRow, walls, humanPlayer.position);
    const humanPath = findShortestPath(humanPlayer.position, humanPlayer.goalRow, walls, aiPlayer.position);

    const myPathLength = myPath ? myPath.length - 1 : Infinity;
    const humanPathLength = humanPath ? humanPath.length - 1 : Infinity;

    // --- Best Move Calculation ---
    let bestMoveAction: AiAction | null = null;
    if (myPath && myPath.length > 1) {
        const move = myPath[1];
        const isJump = Math.abs(move.r - aiPlayer.position.r) + Math.abs(move.c - aiPlayer.position.c) > 1;
        bestMoveAction = { 
            action: 'MOVE', 
            position: move, 
            reasoning: isJump ? "Jumping over your pawn for a shortcut." : "Advancing along my shortest path." 
        };
    } else { // Trapped or no path to goal, try to find any valid move.
        const anyMove = getPossibleMoves(aiPlayer.position, walls, humanPlayer.position)[0];
        if (anyMove) {
            bestMoveAction = { action: 'MOVE', position: anyMove, reasoning: "My main path is blocked, so I'm finding a new route." };
        }
    }

    const defaultMove = bestMoveAction ?? { action: 'MOVE', position: aiPlayer.position, reasoning: "I am trapped and have no valid moves." };

    // --- Difficulty-based Decision Logic ---
    if (difficulty === Difficulty.EASY) {
        return defaultMove;
    }

    // --- MEDIUM & HARD: Wall Placement Consideration ---
    if (aiPlayer.wallsLeft === 0) {
        return defaultMove;
    }
    
    if (difficulty === Difficulty.HARD) {
        const bestWallDetails = findBestBlockingWall(aiPlayer, humanPlayer, walls, isValidWallPlacement);
        
        if (bestWallDetails) {
            const isWinning = myPathLength <= humanPathLength;
            // If losing, place any effective wall.
            if (!isWinning && bestWallDetails.score > 0) {
                return {
                    action: 'PLACE_WALL',
                    position: { r: bestWallDetails.wall.r, c: bestWallDetails.wall.c },
                    orientation: bestWallDetails.wall.orientation,
                    reasoning: "You're ahead, so I'm placing a wall to slow you down."
                };
            }
            // If winning, only place a wall if it's a very strong, decisive move.
            if (isWinning && bestWallDetails.score >= 3) {
                 return {
                    action: 'PLACE_WALL',
                    position: { r: bestWallDetails.wall.r, c: bestWallDetails.wall.c },
                    orientation: bestWallDetails.wall.orientation,
                    reasoning: "Placing a key wall to secure my lead."
                };
            }
        }
        // If no good wall placement is found, or it's not strategically sound to place one, move.
        return defaultMove;
    }

    if (difficulty === Difficulty.MEDIUM) {
        // Medium AI only places a wall if it's losing and finds an obvious block.
        if (myPathLength > humanPathLength) {
             const blockingWall = findBestBlockingWall(aiPlayer, humanPlayer, walls, isValidWallPlacement);
             if (blockingWall && blockingWall.score > 0) {
                return {
                    action: 'PLACE_WALL',
                    position: { r: blockingWall.wall.r, c: blockingWall.wall.c },
                    orientation: blockingWall.wall.orientation,
                    reasoning: "Placing a wall to obstruct your path."
                };
             }
        }
    }

    // Default for Medium (if not placing wall) and fallback for Hard
    return defaultMove;
};

export default getLocalAiMove;
