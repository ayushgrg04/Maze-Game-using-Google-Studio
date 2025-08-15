
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
    // --- Step 1: Find the best possible move ---
    const myPath = findShortestPath(aiPlayer.position, aiPlayer.goalRow, walls, humanPlayer.position);
    let bestMove = myPath && myPath.length > 1 ? myPath[1] : null;

    // If no path exists, find any possible move to escape.
    if (!bestMove) {
        const anyMove = getPossibleMoves(aiPlayer.position, walls, humanPlayer.position)[0];
        if (anyMove) bestMove = anyMove;
    }

    // If no move is possible at all, the AI is trapped and must pass its turn.
    if (!bestMove) {
        return { action: 'PASS', reasoning: "I'm trapped and cannot move." };
    }

    const moveAction: AiAction = {
        action: 'MOVE',
        position: bestMove,
        reasoning: "Advancing along my shortest path.",
    };

    // --- Step 2: For EASY difficulty, always choose the best move ---
    if (difficulty === Difficulty.EASY) {
        return moveAction;
    }

    // --- Step 3: For MEDIUM & HARD, consider placing a wall ---
    if (aiPlayer.wallsLeft === 0) {
        return moveAction; // No walls left, must move.
    }
    
    const humanPathLength = findShortestPath(humanPlayer.position, humanPlayer.goalRow, walls, aiPlayer.position)?.length || Infinity;
    const myPathLength = myPath?.length || Infinity;
    
    const bestWallDetails = findBestBlockingWall(aiPlayer, humanPlayer, walls, isValidWallPlacement);

    if (bestWallDetails) {
        const wallAction: AiAction = {
            action: 'PLACE_WALL',
            position: bestWallDetails.wall,
            orientation: bestWallDetails.wall.orientation,
            reasoning: "Placing a wall to obstruct your path."
        };
        
        const isWinning = myPathLength <= humanPathLength;

        if (difficulty === Difficulty.HARD) {
            // If losing, place any effective wall.
            if (!isWinning && bestWallDetails.score > 0) {
                 wallAction.reasoning = "You're ahead, so I'm slowing you down.";
                 return wallAction;
            }
            // If winning, only place a wall if it's a very strong, decisive move.
            if (isWinning && bestWallDetails.score >= 3) {
                 wallAction.reasoning = "Placing a key wall to secure my lead.";
                 return wallAction;
            }
        }

        if (difficulty === Difficulty.MEDIUM) {
            // Medium AI only places a wall if it's losing and finds an obvious block.
            if (!isWinning && bestWallDetails.score > 0) {
                return wallAction;
            }
        }
    }

    // --- Step 4: If no wall was placed, perform the best move ---
    return moveAction;
};

export default getLocalAiMove;