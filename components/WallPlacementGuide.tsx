import React from 'react';
import { BOARD_SIZE } from '../constants';
import type { Wall } from '../types';

const WALL_THICKNESS = 6;
const GRID_GAP = 5;

type WallPlacementGuideProps = {
  playerColor: string;
  existingWalls: Wall[];
  onWallClick: (wall: Omit<Wall, 'playerId'>) => void;
};

const isPlacementInvalid = (wall: Omit<Wall, 'playerId'>, existingWalls: Wall[]): boolean => {
  return existingWalls.some(w => {
    if (w.r === wall.r && w.c === wall.c && w.orientation === wall.orientation) return true;
    
    if (wall.orientation === 'horizontal') {
        if (w.orientation === 'horizontal' && w.r === wall.r && Math.abs(w.c - wall.c) < 2) return true;
        if (w.orientation === 'vertical' && w.r === wall.r - 1 && w.c === wall.c + 1) return true;
    } else { // vertical
        if (w.orientation === 'vertical' && w.c === wall.c && Math.abs(w.r - wall.r) < 2) return true;
        if (w.orientation === 'horizontal' && w.r === wall.r + 1 && w.c === wall.c - 1) return true;
    }
    return false;
  });
};

export const WallPlacementGuide: React.FC<WallPlacementGuideProps> = ({ playerColor, existingWalls, onWallClick }) => {
    
    const renderGuides = () => {
        const guides = [];
        
        // Horizontal Guides
        for (let r = 1; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE - 1; c++) {
                const wall = { r, c, orientation: 'horizontal' as const };
                if (isPlacementInvalid(wall, existingWalls)) continue;
                
                guides.push(
                    <div
                        key={`h-guide-${r}-${c}`}
                        className="group"
                        style={{
                            gridRow: r + 1,
                            gridColumn: `${c + 1} / span 2`,
                            position: 'relative',
                            pointerEvents: 'auto',
                            cursor: 'pointer'
                        }}
                        onClick={() => onWallClick(wall)}
                        aria-label={`Place horizontal wall at ${r}, ${c}`}
                    >
                        <div className="absolute w-full bg-transparent group-hover:bg-white opacity-40" 
                             style={{
                                height: `${WALL_THICKNESS + GRID_GAP}px`,
                                top: `-${(WALL_THICKNESS + GRID_GAP) / 2}px`,
                             }}
                        />
                         <div className="absolute w-full opacity-60 group-hover:opacity-100 transition-opacity" 
                             style={{
                                backgroundColor: playerColor,
                                borderRadius: '3px',
                                height: `${WALL_THICKNESS}px`,
                                top: `-${WALL_THICKNESS / 2}px`,
                                transform: 'translateY(-50%)',
                                marginTop: `-${GRID_GAP / 2}px`,
                             }}
                        />
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
                        className="group"
                        style={{
                            gridRow: `${r + 1} / span 2`,
                            gridColumn: c + 1,
                            position: 'relative',
                            pointerEvents: 'auto',
                            cursor: 'pointer'
                        }}
                        onClick={() => onWallClick(wall)}
                        aria-label={`Place vertical wall at ${r}, ${c}`}
                    >
                       <div className="absolute h-full bg-transparent group-hover:bg-white opacity-40" 
                             style={{
                                width: `${WALL_THICKNESS + GRID_GAP}px`,
                                left: `-${(WALL_THICKNESS + GRID_GAP) / 2}px`,
                             }}
                        />
                        <div className="absolute h-full opacity-60 group-hover:opacity-100 transition-opacity" 
                             style={{
                                backgroundColor: playerColor,
                                borderRadius: '3px',
                                width: `${WALL_THICKNESS}px`,
                                left: `-${WALL_THICKNESS/2}px`,
                                transform: 'translateX(-50%)',
                                marginLeft: `-${GRID_GAP/2}px`,
                             }}
                        />
                    </div>
                );
            }
        }
        return guides;
    };
    
    return (
        <div 
            className="absolute inset-0 grid pointer-events-none"
            style={{
                gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
                zIndex: 30,
            }}
        >
            {renderGuides()}
        </div>
    );
};
