
import React from 'react';
import { BOARD_SIZE } from '../constants';
import type { Wall } from '../types';

type WallPlacementGuideProps = {
  playerColor: string;
  existingWalls: Wall[];
  onWallClick: (wall: Omit<Wall, 'playerId'>) => void;
};

// Checks for direct overlaps or intersections with existing walls.
const isPlacementInvalid = (wall: Omit<Wall, 'playerId'>, existingWalls: Wall[]): boolean => {
  return existingWalls.some(w => {
    // Exact same wall
    if (w.r === wall.r && w.c === wall.c && w.orientation === wall.orientation) return true;
    
    // Wall collision logic
    if (wall.orientation === 'horizontal') {
        // Overlapping horizontal wall
        if (w.orientation === 'horizontal' && w.r === wall.r && Math.abs(w.c - wall.c) < 2) return true;
        // Crossing vertical wall
        if (w.orientation === 'vertical' && w.r === wall.r - 1 && w.c === wall.c + 1) return true;
    } else { // vertical
        // Overlapping vertical wall
        if (w.orientation === 'vertical' && w.c === wall.c && Math.abs(w.r - wall.r) < 2) return true;
        // Crossing horizontal wall
        if (w.orientation === 'horizontal' && w.r === wall.r + 1 && w.c === wall.c - 1) return true;
    }
    return false;
  });
};

export const WallPlacementGuide: React.FC<WallPlacementGuideProps> = ({ playerColor, existingWalls, onWallClick }) => {
    
    const horizontalGuides = [];
    // Horizontal Guides
    for (let r = 1; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE - 1; c++) {
            const wall = { r, c, orientation: 'horizontal' as const };
            if (isPlacementInvalid(wall, existingWalls)) continue;
            
            horizontalGuides.push(
                <div // This is the Hitbox
                    key={`h-guide-${r}-${c}`}
                    className="group relative flex justify-center"
                    style={{
                        gridRow: r + 1,
                        gridColumn: `${c + 1} / span 2`,
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        height: '50%',
                        alignSelf: 'start',
                    }}
                    onClick={() => onWallClick(wall)}
                    aria-label={`Place horizontal wall at row ${r}, column ${c}`}
                >
                    {/* Default placeholder (soothing color) */}
                    <div
                        className="h-[10px] w-full self-start -translate-y-1/2 bg-slate-400 rounded-full opacity-40 transition-opacity duration-200 group-hover:opacity-0"
                    />
                    {/* Hover placeholder (player color) */}
                    <div
                        className="absolute top-0 left-0 h-[10px] w-full -translate-y-1/2 opacity-0 group-hover:opacity-80 transition-all duration-200 ease-in-out rounded-full group-hover:scale-y-125"
                        style={{
                            backgroundColor: playerColor,
                            boxShadow: `0 0 12px ${playerColor}`,
                        }}
                    />
                </div>
            );
        }
    }
    
    const verticalGuides = [];
    // Vertical Guides
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
        for (let c = 1; c < BOARD_SIZE; c++) {
            const wall = { r, c, orientation: 'vertical' as const };
            if (isPlacementInvalid(wall, existingWalls)) continue;

            verticalGuides.push(
                <div // Hitbox
                    key={`v-guide-${r}-${c}`}
                    className="group relative flex flex-col justify-center"
                    style={{
                        gridRow: `${r + 1} / span 2`,
                        gridColumn: c + 1,
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        width: '50%',
                        justifySelf: 'start',
                    }}
                    onClick={() => onWallClick(wall)}
                    aria-label={`Place vertical wall at row ${r}, column ${c}`}
                >
                    {/* Default placeholder (soothing color) */}
                    <div
                        className="w-[10px] h-full self-start -translate-x-1/2 bg-slate-400 rounded-full opacity-40 transition-opacity duration-200 group-hover:opacity-0"
                    />
                    {/* Hover placeholder (player color) */}
                    <div
                        className="absolute top-0 left-0 w-[10px] h-full -translate-x-1/2 opacity-0 group-hover:opacity-80 transition-all duration-200 ease-in-out rounded-full group-hover:scale-x-125"
                        style={{
                            backgroundColor: playerColor,
                            boxShadow: `0 0 12px ${playerColor}`,
                        }}
                    />
                </div>
            );
        }
    }
    
    return (
        <div 
            className="absolute inset-0 grid pointer-events-none"
            style={{
                gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
                zIndex: 30,
            }}
        >
            {horizontalGuides}
            {verticalGuides}
        </div>
    );
};
