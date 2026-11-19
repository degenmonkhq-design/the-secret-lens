import React from 'react';
import { BrandLogo } from './BrandLogo';

interface ScanIntroOverlayProps {
  visible: boolean;
  title: string;
  subtitle: string;
}

export const ScanIntroOverlay: React.FC<ScanIntroOverlayProps> = ({
  visible,
  title,
  subtitle,
}) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_center,#091533_0%,#03050b_100%)] transition-all duration-500 ${
        visible ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      }`}
      aria-hidden={!visible}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245, 197, 66, 0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 197, 66, 0.13) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(circle at center, black 35%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 35%, transparent 85%)',
        }}
      />
      <div
        className="animate-laser-sweep absolute left-0 right-0 h-1 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent, #fff0a8, #f5c542, #fff0a8, transparent)',
          boxShadow: '0 0 24px 6px rgba(245, 197, 66, 0.75)',
        }}
      />
      <BrandLogo className="w-20 h-20 relative z-10" />
      <h2 className="font-hud relative z-10 px-5 text-center text-lg sm:text-2xl font-bold tracking-[0.24em] text-[#fff0a8] drop-shadow-[0_0_18px_rgba(245,197,66,0.55)]">
        {title}
      </h2>
      <p className="relative z-10 text-xs sm:text-sm tracking-[0.16em] text-[#38e8ff] uppercase">
        {subtitle}
      </p>
    </div>
  );
};
