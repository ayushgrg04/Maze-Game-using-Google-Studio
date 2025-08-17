import React, { useState, useEffect, useCallback } from 'react';
import { BOARD_SIZE } from '../constants';
import type { Position, Wall } from '../types';

type AnimPlayer = { id: 1 | 2; position: Position; goalRow: number; color: string; };
type AnimWall = { r: number; c: number; orientation: 'horizontal' | 'vertical'; color: string; };

// --- Minimal pathfinding and validation helpers for the animation ---

const isMoveBlockedAnim = (from: Position, to: Position, walls: AnimWall[]): boolean => {
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

const findShortestPathAnim = (startPos: Position, goalRow: number, walls: AnimWall[]): Position[] | null => {
    const queue: Position[][] = [[startPos]];
    const visited = new Set<string>([`${startPos.r},${startPos.c}`]);

    while (queue.length > 0) {
        const path = queue.shift()!;
        const currentPos = path[path.length - 1];

        if (currentPos.r === goalRow) return path;

        const neighbors = [
            { r: currentPos.r - 1, c: currentPos.c }, { r: currentPos.r + 1, c: currentPos.c },
            { r: currentPos.r, c: currentPos.c - 1 }, { r: currentPos.r, c: currentPos.c + 1 }
        ];

        for (const neighbor of neighbors) {
            const key = `${neighbor.r},${neighbor.c}`;
            if (neighbor.r >= 0 && neighbor.r < BOARD_SIZE && neighbor.c >= 0 && neighbor.c < BOARD_SIZE && !visited.has(key) && !isMoveBlockedAnim(currentPos, neighbor, walls)) {
                visited.add(key);
                queue.push([...path, neighbor]);
            }
        }
    }
    return null;
};

const isPlacementInvalidAnim = (wall: Omit<AnimWall, 'color'>, existingWalls: AnimWall[]): boolean => {
  return existingWalls.some(w => {
    if (w.r === wall.r && w.c === wall.c && w.orientation === wall.orientation) return true;
    if (wall.orientation === 'horizontal') {
        if (w.orientation === 'horizontal' && w.r === wall.r && Math.abs(w.c - wall.c) < 2) return true;
        if (w.orientation === 'vertical' && w.r === wall.r - 1 && w.c === wall.c + 1) return true;
    } else {
        if (w.orientation === 'vertical' && w.c === wall.c && Math.abs(w.r - wall.r) < 2) return true;
        if (w.orientation === 'horizontal' && w.r === wall.r + 1 && w.c === wall.c - 1) return true;
    }
    return false;
  });
};

const initialPlayerState = {
    1: { id: 1 as const, position: { r: 8, c: 4 }, goalRow: 0, color: '#3b82f6' },
    2: { id: 2 as const, position: { r: 0, c: 4 }, goalRow: 8, color: '#ec4899' },
};

export const AnimatedMenuBackground: React.FC = () => {
    const [players, setPlayers] = useState<{ [key: number]: AnimPlayer }>(initialPlayerState);
    const [walls, setWalls] = useState<AnimWall[]>([]);
    const [currentPlayerId, setCurrentPlayerId] = useState<1 | 2>(1);
    const [moveCount, setMoveCount] = useState(0);
    const [isResetting, setIsResetting] = useState(false);

    const resetGame = useCallback(() => {
        setIsResetting(true);
        setTimeout(() => {
            setPlayers(initialPlayerState);
            setWalls([]);
            setCurrentPlayerId(1);
            setMoveCount(0);
            setIsResetting(false);
        }, 500);
    }, []);

    useEffect(() => {
        if (isResetting) return;

        const gameLoop = setTimeout(() => {
            const p1 = players[1];
            const p2 = players[2];
            if (p1.position.r === p1.goalRow || p2.position.r === p2.goalRow || moveCount > 40) {
                resetGame();
                return;
            }

            const aiPlayer = players[currentPlayerId];
            const opponentId = currentPlayerId === 1 ? 2 : 1;
            
            const shouldPlaceWall = Math.random() < 0.25 && walls.length < 12;
            let actionTaken = false;

            if (shouldPlaceWall) {
                const opponentPath = findShortestPathAnim(players[opponentId].position, players[opponentId].goalRow, walls);
                if (opponentPath && opponentPath.length > 1) {
                    const p1 = opponentPath[0];
                    const p2 = opponentPath[1];
                    const isHorizontalMove = p1.r === p2.r;
                    const wallOrientation: 'vertical' | 'horizontal' = isHorizontalMove ? 'vertical' : 'horizontal';
                    const wallPos = isHorizontalMove 
                        ? { r: p1.r, c: Math.min(p1.c, p2.c) + 1 } 
                        : { r: Math.min(p1.r, p2.r) + 1, c: p1.c };
                    
                    const newWall = { ...wallPos, orientation: wallOrientation };

                    if (!isPlacementInvalidAnim(newWall, walls)) {
                        setWalls(w => [...w, { ...newWall, color: aiPlayer.color }]);
                        actionTaken = true;
                    }
                }
            }

            if (!actionTaken) {
                const myPath = findShortestPathAnim(aiPlayer.position, aiPlayer.goalRow, walls);
                if (myPath && myPath.length > 1) {
                    setPlayers(p => ({...p, [currentPlayerId]: {...aiPlayer, position: myPath[1] }}));
                }
            }
            
            setCurrentPlayerId(opponentId);
            setMoveCount(c => c + 1);

        }, 1500);

        return () => clearTimeout(gameLoop);
    }, [players, walls, currentPlayerId, moveCount, isResetting, resetGame]);
    
    const boardClasses = `relative w-[120vmin] h-[120vmin] max-w-4xl max-h-4xl bg-black/10 border-2 border-purple-700/50 rounded-2xl shadow-2xl shadow-purple-900/50 transition-opacity duration-500 ${isResetting ? 'board-fade-out' : ''}`;
    const cellWidth = 100 / BOARD_SIZE;

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--dark-bg-start)] to-[var(--dark-bg-end)]"></div>
            <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '1500px' }}>
                <div className={boardClasses} style={{ transform: 'rotateX(65deg) rotateZ(15deg) translateY(10%)', transformStyle: 'preserve-3d' }}>
                    <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(to right, transparent, transparent calc(100%/9 - 1px), #a855f722 1px), repeating-linear-gradient(to bottom, transparent, transparent calc(100%/9 - 1px), #a855f722 1px)` }} />
                    
                    {/* Render Walls */}
                    {walls.map((wall, i) => {
                        const style: React.CSSProperties = wall.orientation === 'horizontal'
                        ? { top: `${wall.r * cellWidth}%`, left: `${wall.c * cellWidth}%`, width: `${cellWidth * 2}%`, height: '2%' }
                        : { top: `${wall.r * cellWidth}%`, left: `${wall.c * cellWidth}%`, width: '2%', height: `${cellWidth * 2}%` };
                        
                        return (
                           <div key={i} className="absolute rounded-full menu-wall-animated" style={{...style, backgroundColor: wall.color, boxShadow: `0 0 10px ${wall.color}`, transform: `translate(-50%, -50%) translate(${wall.orientation === 'horizontal' ? cellWidth : 1}%, ${wall.orientation === 'vertical' ? cellWidth : 1}%)` }} />
                        )
                    })}
                    
                    {/* Render Players */}
                    {Object.values(players).map(p => (
                         <div key={p.id} className="absolute rounded-full transition-all duration-700 ease-in-out" style={{
                            width: `${cellWidth * 0.8}%`,
                            height: `${cellWidth * 0.8}%`,
                            top: `${p.position.r * cellWidth}%`,
                            left: `${p.position.c * cellWidth}%`,
                            backgroundColor: p.color,
                            boxShadow: `0 0 15px ${p.color}`,
                            transform: `translate(${cellWidth*0.1}%, ${cellWidth*0.1}%)`
                        }} />
                    ))}
                </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-bg-end)] via-transparent to-[var(--dark-bg-start)] opacity-60"></div>
            <div className="absolute inset-0 backdrop-blur-[2px]"></div>
            <div className="absolute inset-0 bg-black/40"></div>
        </div>
    );
};