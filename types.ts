
export type Player = {
  id: 1 | 2;
  name: string;
  color: string;
  position: Position;
  wallsLeft: number;
  goalRow: number;
};

export type Position = {
  r: number;
  c: number;
};

export type Wall = {
  r: number;
  c: number;
  orientation: 'horizontal' | 'vertical';
  playerId: 1 | 2;
};

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export enum GameMode {
  PVP = 'PVP',
  PVC = 'PVC',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum AiType {
  GEMINI = 'GEMINI',
  LOCAL = 'LOCAL',
}

export enum StartPosition {
  CENTER = 'CENTER',
  RANDOM = 'RANDOM',
}

export type AiAction = {
  action: 'MOVE' | 'PLACE_WALL';
  position: Position;
  orientation?: 'horizontal' | 'vertical';
  reasoning: string;
}