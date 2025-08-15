import React from 'react';

type AiChatTooltipProps = {
  message: string;
};

export const AiChatTooltip: React.FC<AiChatTooltipProps> = ({ message }) => {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 z-40">
      <div className="relative bg-white rounded-lg shadow-lg p-3 max-w-xs animate-fade-in-up">
        <p className="text-sm text-center text-gray-700 font-medium">"{message}"</p>
        <div 
          className="absolute top-full left-1/2 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid white',
          }}
        />
      </div>
      <style>
        {`
          @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.5s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
};
