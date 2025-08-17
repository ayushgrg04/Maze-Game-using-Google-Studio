import React from 'react';

type ModalProps = {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
};

const Modal: React.FC<ModalProps> = ({ title, children, onClose, className }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300 backdrop-blur-sm">
      <div className={`magical-container rounded-2xl p-8 m-4 w-full transform transition-all duration-300 scale-95 hover:scale-100 ${className || 'max-w-sm'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-magic text-white text-glow-purple">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
