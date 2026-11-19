import React from 'react';

interface TejajiEmblemProps {
  className?: string;
}

/**
 * Custom glowing Liquid-Gold SVG emblem of Veer Tejaji Maharaj's Sacred Sign:
 * Royal Golden Spear (Bhala) + Coiled Sacred Cobra (Nag Devta) + Divine Halo + "🙏 तेजाजी" badge.
 */
export const TejajiEmblem: React.FC<TejajiEmblemProps> = ({ className = '' }) => {
  return (
    <div
      className={`inline-flex flex-col items-center justify-center shrink-0 select-none ${className}`}
      title="Veer Tejaji Maharaj Sacred Blessing"
    >
      <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#070d20]/95 border border-[#f5c542]/80 shadow-[0_0_18px_rgba(245,197,66,0.55),inset_0_0_10px_rgba(245,197,66,0.28)] flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-[0_0_8px_rgba(255,220,110,0.85)]"
          aria-label="Veer Tejaji Maharaj Sacred Emblem"
        >
          <defs>
            <radialGradient id="tejajiHalo" cx="50%" cy="46%" r="50%">
              <stop offset="0%" stopColor="#fff7c2" stopOpacity="0.65" />
              <stop offset="55%" stopColor="#f5c542" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f5c542" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="tejajiGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff9d6" />
              <stop offset="45%" stopColor="#f5c542" />
              <stop offset="100%" stopColor="#b8730a" />
            </linearGradient>
            <linearGradient id="serpentGold" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c47d10" />
              <stop offset="50%" stopColor="#ffdf70" />
              <stop offset="100%" stopColor="#fff6c4" />
            </linearGradient>
          </defs>

          {/* Radiant Divine Halo & Subtle Sun Rays */}
          <circle cx="50" cy="46" r="42" fill="url(#tejajiHalo)" />
          <circle
            cx="50"
            cy="46"
            r="34"
            fill="none"
            stroke="url(#tejajiGold)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
            strokeOpacity="0.7"
          />

          {/* Royal Golden Spear / Bhala */}
          <path
            d="M50 7 L58 26 L53 29 L53 93 L47 93 L47 29 L42 26 Z"
            fill="url(#tejajiGold)"
            stroke="#fff7cc"
            strokeWidth="0.9"
          />
          {/* Ornate Bhala Guard Collar */}
          <rect x="42" y="29" width="16" height="3.5" rx="1.75" fill="#fff3b0" />

          {/* Sacred Coiled Cobra / Nag Devta wrapping gracefully around Spear */}
          <path
            d="M56 84 C68 80, 68 68, 50 64 C33 60, 34 49, 50 45 C65 41, 66 31, 56 26"
            fill="none"
            stroke="url(#serpentGold)"
            strokeWidth="5.2"
            strokeLinecap="round"
          />
          <path
            d="M56 84 C68 80, 68 68, 50 64 C33 60, 34 49, 50 45 C65 41, 66 31, 56 26"
            fill="none"
            stroke="#fffbe0"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />

          {/* Flared Cobra Hood on Top-Right of Spear */}
          <path
            d="M56 27 C49 24, 48 16, 56 14 C64 16, 63 24, 56 27 Z"
            fill="url(#serpentGold)"
            stroke="#fff7cc"
            strokeWidth="1"
          />
          {/* Sacred Tilak & Eyes on Serpent */}
          <line x1="56" y1="16.5" x2="56" y2="20" stroke="#ff5252" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="53.6" cy="19.5" r="1" fill="#040814" />
          <circle cx="58.4" cy="19.5" r="1" fill="#040814" />
        </svg>
      </div>
      <span className="-mt-1.5 px-1.5 py-[1px] rounded-full bg-[#1a1103]/95 border border-[#f5c542]/75 text-[9px] font-extrabold text-[#fff2b2] leading-tight tracking-tight shadow-[0_0_10px_rgba(245,197,66,0.45)] whitespace-nowrap">
        🙏 तेजाजी
      </span>
    </div>
  );
};
