import React, { useState } from 'react';
import Modal from './Modal';

type HelpModalProps = {
  onClose: () => void;
};

const content = {
  en: {
    title: "How to Play",
    goalTitle: "The Goal",
    goalText: "Be the first player to move your pawn to any space on the opposite side of the board (your designated goal row).",
    goalCaption: "Player 1 (Blue) starts at the bottom and must reach the top row.",
    turnTitle: "Your Turn",
    turnText: "On your turn, you must choose to do one of the following:",
    turnMove: "Move your pawn one space.",
    turnPlace: "Place one of your walls.",
    movingTitle: "Moving Your Pawn",
    movingStandard: "Standard Move: Move one space forward, backward, left, or right to an empty, unblocked square.",
    captionMove: "Move to any adjacent empty square.",
    captionJump: "Jump over an adjacent opponent.",
    captionDiagonal: "Jump diagonally if a wall blocks a straight jump.",
    wallsTitle: "Placing Walls",
    wallsText: "Walls are placed in the grooves between squares and are always two squares long.",
    wallsRule: "The Golden Rule: You cannot place a wall that completely blocks the last remaining path for *either* player to their goal line.",
    captionValidWall: "A valid vertical wall placement.",
    captionInvalidWall: "An invalid placement that traps a player.",
    toggleButton: "हिंदी"
  },
  hi: {
    title: "कैसे खेलें",
    goalTitle: "लक्ष्य",
    goalText: "बोर्ड के दूसरी तरफ (आपके निर्धारित लक्ष्य पंक्ति) किसी भी स्थान पर अपने मोहरे को ले जाने वाले पहले खिलाड़ी बनें।",
    goalCaption: "खिलाड़ी 1 (नीला) नीचे से शुरू होता है और उसे शीर्ष पंक्ति तक पहुंचना होता है।",
    turnTitle: "आपकी बारी",
    turnText: "अपनी बारी पर, आपको निम्नलिखित में से कोई एक चुनना होगा:",
    turnMove: "अपने मोहरे को एक स्थान पर ले जाएं।",
    turnPlace: "अपनी दीवारों में से एक को रखें।",
    movingTitle: "अपने मोहरे को हिलाना",
    movingStandard: "मानक चाल: एक खाली, अबाधित वर्ग में एक स्थान आगे, पीछे, बाएं या दाएं ले जाएं।",
    captionMove: "किसी भी आसन्न खाली वर्ग में जाएं।",
    captionJump: "एक आसन्न प्रतिद्वंद्वी पर से कूदें।",
    captionDiagonal: "यदि कोई दीवार सीधी छलांग को रोकती है तो तिरछे कूदें।",
    wallsTitle: "दीवारें लगाना",
    wallsText: "दीवारें चौकों के बीच की खांचों में रखी जाती हैं और हमेशा दो चौकों जितनी लंबी होती हैं।",
    wallsRule: "सुनहरा नियम: आप ऐसी दीवार नहीं लगा सकते जो किसी भी खिलाड़ी के लिए उनके लक्ष्य रेखा तक पहुंचने के अंतिम शेष पथ को पूरी तरह से अवरुद्ध कर दे।",
    captionValidWall: "एक वैध ऊर्ध्वाधर दीवार प्लेसमेंट।",
    captionInvalidWall: "एक अमान्य प्लेसमेंट जो एक खिलाड़ी को फंसाता है।",
    toggleButton: "English"
  }
};


const RuleSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-3">
    <h3 className="text-xl font-bold text-gray-800 border-b-2 border-gray-200 pb-2">{title}</h3>
    <div className="text-base leading-relaxed">{children}</div>
  </div>
);

const RuleIllustration: React.FC<{ caption: string, children: React.ReactNode }> = ({ children, caption }) => (
  <div className="text-center my-4">
    <div className="bg-slate-200 rounded-lg p-2 inline-flex items-center justify-center shadow-inner">
      {children}
    </div>
    <p className="text-xs text-gray-600 mt-2 font-medium">{caption}</p>
  </div>
);


const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const currentContent = content[language];

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'hi' : 'en'));
  };

  return (
    <Modal title={currentContent.title} onClose={onClose} className="max-w-xl">
        <div className="absolute top-8 right-24">
            <button onClick={toggleLanguage} className="px-3 py-1 text-sm font-semibold text-white bg-indigo-500 rounded-md hover:bg-indigo-600 transition-colors shadow-sm">
                {currentContent.toggleButton}
            </button>
        </div>
      <div className="space-y-6 text-gray-700 max-h-[70vh] overflow-y-auto pr-4 -mr-4">
        
        <RuleSection title={currentContent.goalTitle}>
          <p>{currentContent.goalText}</p>
           <RuleIllustration caption={currentContent.goalCaption}>
             <svg width="100" height="100" viewBox="0 0 100 100">
                <rect width="100" height="11" fill="#ec4899" fillOpacity="0.3"/>
                <rect y="89" width="100" height="11" fill="#3b82f6" fillOpacity="0.3"/>
                <circle cx="50" cy="94" r="5" fill="#3b82f6" />
                <path d="M 50 85 C 40 60, 40 40, 50 15" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                <path d="M 45 20 L 50 15 L 55 20" stroke="#3b82f6" strokeWidth="2" fill="none" />
             </svg>
           </RuleIllustration>
        </RuleSection>

        <RuleSection title={currentContent.turnTitle}>
          <p>{currentContent.turnText}</p>
          <ul className="list-disc list-inside pl-4 space-y-1 mt-2">
            <li><strong>{currentContent.turnMove.split(':')[0]}</strong>: {currentContent.turnMove.split(':')[1]}</li>
            <li><strong>{currentContent.turnPlace.split(':')[0]}</strong>: {currentContent.turnPlace.split(':')[1]}</li>
          </ul>
        </RuleSection>

        <RuleSection title={currentContent.movingTitle}>
            <p><strong>{currentContent.movingStandard.split(':')[0]}:</strong>{currentContent.movingStandard.split(':')[1]}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <RuleIllustration caption={currentContent.captionMove}>
                    <svg width="80" height="80" viewBox="0 0 100 100">
                      <path d="M 0 33 H 100 M 0 66 H 100 M 33 0 V 100 M 66 0 V 100" stroke="#d1d5db" strokeWidth="1"/>
                      <circle cx="50" cy="50" r="12" fill="#3b82f6" />
                      <circle cx="50" cy="17" r="8" fill="#60a5fa" opacity="0.8" />
                      <circle cx="50" cy="83" r="8" fill="#60a5fa" opacity="0.8" />
                      <circle cx="17" cy="50" r="8" fill="#60a5fa" opacity="0.8" />
                      <circle cx="83" cy="50" r="8" fill="#60a5fa" opacity="0.8" />
                    </svg>
                </RuleIllustration>
                
                <RuleIllustration caption={currentContent.captionJump}>
                    <svg width="80" height="80" viewBox="0 0 100 100">
                      <path d="M 0 33 H 100 M 0 66 H 100 M 33 0 V 100 M 66 0 V 100" stroke="#d1d5db" strokeWidth="1"/>
                      <circle cx="50" cy="50" r="12" fill="#3b82f6" />
                      <circle cx="50" cy="17" r="12" fill="#ec4899" />
                      <circle cx="50" cy="-15" r="8" fill="#60a5fa" opacity="0.8" />
                       <path d="M 50 38 A 20 20 0 0 1 50 -3" stroke="#60a5fa" strokeWidth="2" fill="none" strokeDasharray="3 3" />
                       <path d="M 46 -8 L 50 -3 L 54 -8" stroke="#60a5fa" strokeWidth="2" fill="none" />
                    </svg>
                </RuleIllustration>

                <RuleIllustration caption={currentContent.captionDiagonal}>
                    <svg width="80" height="80" viewBox="0 0 100 100">
                      <path d="M 0 33 H 100 M 0 66 H 100 M 33 0 V 100 M 66 0 V 100" stroke="#d1d5db" strokeWidth="1"/>
                      <circle cx="50" cy="50" r="12" fill="#3b82f6" />
                      <circle cx="50" cy="17" r="12" fill="#ec4899" />
                      <rect x="0" y="-5" width="100" height="10" fill="#374151" rx="3" />
                      <circle cx="17" cy="17" r="8" fill="#60a5fa" opacity="0.8" />
                      <circle cx="83" cy="17" r="8" fill="#60a5fa" opacity="0.8" />
                    </svg>
                </RuleIllustration>
            </div>
        </RuleSection>

        <RuleSection title={currentContent.wallsTitle}>
            <p>{currentContent.wallsText}</p>
            <p className="font-bold text-red-600 my-2">{currentContent.wallsRule}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RuleIllustration caption={currentContent.captionValidWall}>
                     <svg width="80" height="80" viewBox="0 0 100 100">
                      <path d="M 0 50 H 100 M 50 0 V 100" stroke="#d1d5db" strokeWidth="1"/>
                       <rect x="45" y="-33" width="10" height="66" fill="#3b82f6" rx="3" />
                    </svg>
                </RuleIllustration>
                <RuleIllustration caption={currentContent.captionInvalidWall}>
                     <svg width="80" height="80" viewBox="0 0 100 100">
                      <path d="M 0 33 H 100 M 0 66 H 100 M 33 0 V 100 M 66 0 V 100" stroke="#d1d5db" strokeWidth="1"/>
                      <circle cx="50" cy="50" r="12" fill="#ec4899" />
                      <rect x="-33" y="28" width="66" height="10" fill="#374151" rx="3" />
                      <rect x="33" y="28" width="66" height="10" fill="#374151" rx="3" />
                      <rect x="28" y="-33" width="10" height="66" fill="#374151" rx="3" />
                      <rect x="61" y="33" width="10" height="66" fill="#ef4444" rx="3" />
                      <path d="M 70 30 L 95 5 M 95 30 L 70 5" stroke="#ef4444" strokeWidth="6" strokeLinecap="round"/>
                    </svg>
                </RuleIllustration>
            </div>
        </RuleSection>
      </div>
    </Modal>
  );
};

export default HelpModal;