import React from 'react';
import { BOARD_SIZE } from '../constants';
import type { Player, Position, Wall } from '../types';

type GameBoardProps = {
  players: { [key: number]: Player };
  walls: Wall[];
  selectedPiece: Position | null;
  validMoves: Position[];
  isPlacingWall: boolean;
  onPieceClick: (pos: Position) => void;
  onCellClick: (pos: Position) => void;
  onWallClick: (wall: Omit<Wall, 'playerId'>) => void;
  currentPlayerId: 1 | 2;
};

const WALL_THICKNESS = 6; // in pixels
const GRID_GAP = 5; // in pixels

type WallPlaceholderProps = {
  wall: Omit<Wall, 'playerId'>;
  playerColor: string;
  existingWalls: Wall[];
  onWallClick: (wall: Omit<Wall, 'playerId'>) => void;
};

const WallPlaceholder: React.FC<WallPlaceholderProps> = ({ wall, playerColor, existingWalls, onWallClick }) => {
  const isHorizontal = wall.orientation === 'horizontal';

  const isInvalidPlacement = existingWalls.some(w => {
    if (w.r === wall.r && w.c === wall.c && w.orientation === wall.orientation) return true;
    if (isHorizontal) {
      if (w.orientation === 'horizontal' && w.r === wall.r && Math.abs(w.c - wall.c) < 2) return true;
      if (w.orientation === 'vertical' && w.r === wall.r - 1 && w.c === wall.c + 1) return true;
    } else {
      if (w.orientation === 'vertical' && w.c === wall.c && Math.abs(w.r - wall.r) < 2) return true;
      if (w.orientation === 'horizontal' && w.r === wall.r + 1 && w.c === wall.c - 1) return true;
    }
    return false;
  });

  if (isInvalidPlacement) return null;

  const lineContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    flexDirection: isHorizontal ? 'column' : 'row',
  };

  const lineStyle: React.CSSProperties = {
    borderRadius: '9999px',
    transition: 'background-color 0.2s ease-in-out',
    ...(isHorizontal ? { height: '2px', width: '100%' } : { width: '2px', height: '100%' }),
  };

  return (
    <div
      className="absolute group cursor-pointer"
      style={{
        top: isHorizontal ? `calc(${wall.r * (100 / BOARD_SIZE)}% - ${WALL_THICKNESS / 2}px - ${GRID_GAP / 2}px)` : `calc(${wall.r * (100 / BOARD_SIZE)}% + ${GRID_GAP / 2}px)`,
        left: isHorizontal ? `calc(${wall.c * (100 / BOARD_SIZE)}% + ${GRID_GAP / 2}px)` : `calc(${wall.c * (100 / BOARD_SIZE)}% - ${WALL_THICKNESS / 2}px - ${GRID_GAP / 2}px)`,
        width: isHorizontal ? `calc(2 * (100 / BOARD_SIZE)% - ${GRID_GAP}px)` : `${WALL_THICKNESS}px`,
        height: isHorizontal ? `${WALL_THICKNESS}px` : `calc(2 * (100 / BOARD_SIZE)% - ${GRID_GAP}px)`,
        pointerEvents: 'auto',
        zIndex: 30,
      }}
      onClick={() => onWallClick(wall)}
      aria-label={`Place ${wall.orientation} wall at ${wall.r}, ${wall.c}`}
    >
        <div className="relative w-full h-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: playerColor, borderRadius: '4px' }}></div>
    </div>
  );
};

const GameBoard: React.FC<GameBoardProps> = ({
  players,
  walls,
  selectedPiece,
  validMoves,
  isPlacingWall,
  onPieceClick,
  onCellClick,
  onWallClick,
  currentPlayerId,
}) => {
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
      (isPlayer1Here || isPlayer2Here) && !isPlacingWall && ((isPlayer1Here && currentPlayerId === 1) || (isPlayer2Here && currentPlayerId === 2)) ? 'cursor-pointer' : '',
    ].join(' ');
    
    // --- New Wall Rendering Logic ---
    const cellWallStyles: React.CSSProperties = { boxSizing: 'border-box' };
    const wallThicknessPx = `${WALL_THICKNESS}px`;
    
    // Check for a horizontal wall just ABOVE this cell
    const wallAbove = walls.find(wall => wall.orientation === 'horizontal' && wall.r === r && (wall.c === c || wall.c === c - 1));
    if (wallAbove) {
        cellWallStyles.borderTop = `${wallThicknessPx} solid ${players[wallAbove.playerId]?.color || '#111827'}`;
    }
    
    // Check for a vertical wall to the LEFT of this cell
    const wallLeft = walls.find(wall => wall.orientation === 'vertical' && wall.c === c && (wall.r === r || wall.r === r - 1));
    if (wallLeft) {
        cellWallStyles.borderLeft = `${wallThicknessPx} solid ${players[wallLeft.playerId]?.color || '#111827'}`;
    }
    // --- End of New Logic ---

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
        style={cellWallStyles}
        onClick={() => {
          if (isPlacingWall) return;
          if (isPlayer1Here || isPlayer2Here) {
            onPieceClick({ r, c });
          } else if (isValidMove) {
            onCellClick({ r, c });
          }
        }}
        aria-label={`Cell ${r}, ${c}`}
      >
        {isPlayer1Here && playerPiece(players[1], isSelected && players[1].id === currentPlayerId)}
        {isPlayer2Here && playerPiece(players[2], isSelected && players[2].id === currentPlayerId)}
        {isValidMove && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-1/3 h-1/3 bg-blue-400 rounded-full opacity-80"></div></div>}
      </div>
    );
  };

  const currentPlayerColor = players[currentPlayerId]?.color;

  return (
    <div className="aspect-square w-full max-w-2xl mx-auto p-2 bg-slate-200 rounded-2xl shadow-lg">
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
        
        {/* Wall Placeholders are rendered on top */}
        {isPlacingWall && currentPlayerColor && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
              {/* Horizontal */}
              {Array.from({ length: (BOARD_SIZE) * (BOARD_SIZE - 1) }).map((_, i) => {
                const r = Math.floor(i / (BOARD_SIZE - 1)) + 1;
                const c = i % (BOARD_SIZE - 1);
                if (r >= BOARD_SIZE) return null;
                return <WallPlaceholder key={`h-wall-${r}-${c}`} wall={{ r, c, orientation: 'horizontal' }} playerColor={currentPlayerColor} existingWalls={walls} onWallClick={onWallClick} />;
              })}
              {/* Vertical */}
              {Array.from({ length: (BOARD_SIZE - 1) * (BOARD_SIZE) }).map((_, i) => {
                const r = i % (BOARD_SIZE - 1);
                const c = Math.floor(i / (BOARD_SIZE - 1)) + 1;
                 if (c >= BOARD_SIZE) return null;
                return <WallPlaceholder key={`v-wall-${r}-${c}`} wall={{ r, c, orientation: 'vertical' }} playerColor={currentPlayerColor} existingWalls={walls} onWallClick={onWallClick} />;
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
