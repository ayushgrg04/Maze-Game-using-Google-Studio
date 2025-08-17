

import React from 'react';
import { BOARD_SIZE } from '../constants';
import type { Position, Wall } from '../types';

type WallPlacementGuideProps = {
  playerColor: string;
  existingWalls: Wall[];
  onWallClick: (wall: Omit<Wall, 'playerId'>) => void;
  wallPreview: Omit<Wall, 'playerId'> | null;
  onCancel: () => void;
};

// Checks for direct overlaps or intersections with existing walls.
// This logic must be kept in sync with the physical validation in useGameLogic.
const isPlacementInvalid = (wall: Omit<Wall, 'playerId'>, existingWalls: Wall[]): boolean => {
  return existingWalls.some(w => {
    // Exact same wall
    if (w.r === wall.r && w.c === wall.c && w.orientation === wall.orientation) return true;
    
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

export const WallPlacementGuide: React.FC<WallPlacementGuideProps> = ({ 
    playerColor, existingWalls, onWallClick, wallPreview, onCancel,
}) => {
    
    if (wallPreview) {
        const isHorizontal = wallPreview.orientation === 'horizontal';
        const style: React.CSSProperties = isHorizontal ? {
            gridRow: wallPreview.r + 1,
            gridColumn: `${wallPreview.c + 1} / span 2`,
            alignSelf: 'start',
            height: '10px',
            transform: 'translateY(-50%)',
        } : {
            gridRow: `${wallPreview.r + 1} / span 2`,
            gridColumn: wallPreview.c + 1,
            justifySelf: 'start',
            width: '10px',
            transform: 'translateX(-50%)',
        };
        
        return (
            <>
                <div className="absolute inset-0 z-20" onClick={onCancel} />
                <div 
                    className="absolute grid z-30 pointer-events-none"
                    style={{
                        gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                        gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
                        gap: `5px`,
                        inset: 0
                    }}
                >
                    <div 
                        className="rounded-full"
                        style={{
                            ...style,
                            backgroundColor: playerColor,
                            boxShadow: `0 0 12px ${playerColor}, 0 0 20px ${playerColor}`
                        }}
                    />
                </div>
            </>
        );
    }

    const guides = [];

    // Horizontal Guides
    for (let r = 1; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE - 1; c++) {
            const wall = { r, c, orientation: 'horizontal' as const };
            if (isPlacementInvalid(wall, existingWalls)) continue;
            
            guides.push(
                <div
                    key={`h-guide-${r}-${c}`}
                    className="group relative flex justify-center items-center"
                    style={{ 
                        gridRow: r + 1, 
                        gridColumn: `${c + 1} / span 2`, 
                        transform: 'translateY(calc(-50% - 2.5px))',
                        height: '20px',
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                    }}
                    onClick={() => onWallClick(wall)}
                    aria-label={`Place horizontal wall at row ${r}, column ${c}`}
                >
                    <div className="h-[10px] w-full bg-slate-400 rounded-full opacity-40 transition-opacity duration-200 group-hover:opacity-0" />
                    <div className="absolute h-[10px] w-full opacity-0 group-hover:opacity-80 transition-all duration-200 ease-in-out rounded-full group-hover:scale-y-125" style={{ backgroundColor: playerColor, boxShadow: `0 0 12px ${playerColor}` }} />
                </div>
            );
        }
    }
    
    // Vertical Guides
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
        for (let c = 1; c < BOARD_SIZE; c++) {
            const wall = { r, c, orientation: 'vertical' as const };
            if (isPlacementInvalid(wall, existingWalls)) continue;

            guides.push(
                <div
                    key={`v-guide-${r}-${c}`}
                    className="group relative flex justify-center items-center"
                    style={{ 
                        gridRow: `${r + 1} / span 2`, 
                        gridColumn: c + 1,
                        transform: 'translateX(calc(-50% - 2.5px))',
                        width: '20px',
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                    }}
                    onClick={() => onWallClick(wall)}
                    aria-label={`Place vertical wall at row ${r}, column ${c}`}
                >
                    <div className="w-[10px] h-full bg-slate-400 rounded-full opacity-40 transition-opacity duration-200 group-hover:opacity-0" />
                    <div className="absolute w-[10px] h-full opacity-0 group-hover:opacity-80 transition-all duration-200 ease-in-out rounded-full group-hover:scale-x-125" style={{ backgroundColor: playerColor, boxShadow: `0 0 12px ${playerColor}` }} />
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
                gap: '5px',
                zIndex: 30,
            }}
        >
            {guides}
        </div>
    );
};