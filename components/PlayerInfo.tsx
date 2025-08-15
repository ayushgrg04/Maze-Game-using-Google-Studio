
import React from 'react';
import type { Player } from '../types';

type PlayerInfoProps = {
  player: Player;
};

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 w-32 flex flex-col items-center justify-center space-y-2">
      <div className={`w-5 h-5 rounded-full`} style={{ backgroundColor: player.color }}></div>
      <p className="font-semibold text-gray-700">{player.name}</p>
      <p className="text-sm text-gray-500">{player.wallsLeft} walls</p>
    </div>
  );
};

export default PlayerInfo;