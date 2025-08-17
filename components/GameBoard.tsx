

import React from 'react';
import { BOARD_SIZE } from '../constants';
import type { Player, Position, Wall } from '../types';
import { WallPlacementGuide } from './WallPlacementGuide';

type GameBoardProps = {
  players: { [key: number]: Player };
  walls: Wall[];
  selectedPiece: Position | null;
  validMoves: Position[];
  isPlacingWall: boolean;
  wallPreview: Omit<Wall, 'playerId'> | null;
  onCellClick: (pos: Position) => void;
  onWallPreview: (wall: Omit<Wall, 'playerId'>) => void;
  onCancelWallPreview: () => void;
  currentPlayerId: 1 | 2;
};

const WALL_THICKNESS = 8; // in pixels
const GRID_GAP = 5; // in pixels

const GameBoard: React.FC<GameBoardProps> = ({
  players,
  walls,
  selectedPiece,
  validMoves,
  isPlacingWall,
  wallPreview,
  onCellClick,
  onWallPreview,
  onCancelWallPreview,
  currentPlayerId,
}) => {
  const currentPlayerColor = players[currentPlayerId]?.color;
  
  const renderCell = (r: number, c: number) => {
    const player1 = players[1];
    const player2 = players[2];
    if (!player1 || !player2) return null;

    const isPlayer1Here = player1.position.r === r && player1.position.c === c;
    const isPlayer2Here = player2.position.r === r && player2.position.c === c;
    const isSelected = selectedPiece?.r === r && selectedPiece?.c === c;
    const isValidMove = validMoves.some(move => move.r === r && move.c === c);
    const isPlayer1Goal = r === player1.goalRow;
    const isPlayer2Goal = r === player2.goalRow;

    const cellClasses = [
      'relative aspect-square rounded-sm shadow-inner transition-colors duration-200',
      isPlayer1Goal ? 'bg-blue-100' : isPlayer2Goal ? 'bg-pink-100' : 'bg-white',
      isValidMove ? 'cursor-pointer' : '',
    ].join(' ');

    const playerPiece = (player: Player, isSelectedFlag: boolean) => (
      <div
        className={`absolute inset-0 flex items-center justify-center transition-transform duration-300 z-10 ${isSelectedFlag ? 'scale-110' : 'scale-100'}`}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`w-[80%] h-[80%] rounded-full shadow-lg flex items-center justify-center text-white font-bold text-xl`}
          style={{
            backgroundColor: player.color,
            boxShadow: 'inset 0px -4px 5px rgba(0,0,0,0.3), 0px 4px 5px rgba(0,0,0,0.2)'
          }}
        >
          {player.id}
        </div>
      </div>
    );

    return (
      <div
        key={`cell-${r}-${c}`}
        className={cellClasses}
        onClick={() => {
          if (isPlacingWall) return;
          if (isValidMove) {
            onCellClick({ r, c });
          }
        }}
        aria-label={`Cell ${r}, ${c}`}
      >
        {isPlayer1Here && playerPiece(players[1], isSelected && players[1].id === currentPlayerId)}
        {isPlayer2Here && playerPiece(players[2], isSelected && players[2].id === currentPlayerId)}
        {isValidMove && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className="w-1/3 h-1/3 rounded-full opacity-80"
              style={{ backgroundColor: currentPlayerColor || '#60a5fa' }}
            ></div>
          </div>
        )}
      </div>
    );
  };

  const renderWall = (wall: Wall) => {
    const wallColor = players[wall.playerId]?.color || '#111827';
    const isHorizontal = wall.orientation === 'horizontal';

    const style: React.CSSProperties = isHorizontal ? {
        gridRow: wall.r + 1,
        gridColumn: `${wall.c + 1} / span 2`,
        alignSelf: 'start',
        height: `${WALL_THICKNESS}px`,
        transform: `translateY(-${WALL_THICKNESS / 2}px)`,
        margin: `0 ${GRID_GAP / 2}px`, // Add horizontal margin to not overlap vertical walls
    } : { // Vertical
        gridRow: `${wall.r + 1} / span 2`,
        gridColumn: wall.c + 1,
        justifySelf: 'start',
        width: `${WALL_THICKNESS}px`,
        transform: `translateX(-${WALL_THICKNESS / 2}px)`,
        margin: `${GRID_GAP / 2}px 0`, // Add vertical margin
    };

    return (
        <div
            key={`wall-${wall.orientation}-${wall.r}-${wall.c}`}
            className="rounded-full shadow-md"
            style={{ ...style, backgroundColor: wallColor }}
        />
    );
  };

  return (
    <div className="aspect-square w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto p-2 bg-slate-200 rounded-2xl shadow-lg">
      <div
        className="relative grid bg-slate-300 h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
          gap: `${GRID_GAP}px`,
        }}
      >
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) =>
          renderCell(Math.floor(i / BOARD_SIZE), i % BOARD_SIZE)
        )}
        
        {/* Wall Layer: Absolutely positioned overlay grid for rendering walls without affecting the main grid flow */}
        <div 
          className="absolute inset-0 grid pointer-events-none"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
            gap: `${GRID_GAP}px`,
            zIndex: 20,
          }}
        >
            {walls.map(renderWall)}
        </div>
        
        {isPlacingWall && currentPlayerColor && (
          <WallPlacementGuide 
            playerColor={currentPlayerColor}
            existingWalls={walls}
            onWallClick={onWallPreview}
            wallPreview={wallPreview}
            onCancel={onCancelWallPreview}
          />
        )}
      </div>
    </div>
  );
};

export default GameBoard;