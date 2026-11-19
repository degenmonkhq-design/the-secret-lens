import React from 'react';

interface BrandLogoProps {
  className?: string;
}

export const BRAND_LOGO_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <radialGradient id="tslEyeBg" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#102558"/>
      <stop offset="100%" stop-color="#040814"/>
    </radialGradient>
    <linearGradient id="tslGoldFav" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff6c4"/>
      <stop offset="50%" stop-color="#f5c542"/>
      <stop offset="100%" stop-color="#c68212"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="46" fill="url(#tslEyeBg)" stroke="url(#tslGoldFav)" stroke-width="3.5"/>
  <path d="M10 50 Q50 18 90 50 Q50 82 10 50 Z" fill="#07122e" stroke="url(#tslGoldFav)" stroke-width="4.2"/>
  <circle cx="50" cy="50" r="20" fill="none" stroke="url(#tslGoldFav)" stroke-width="2.4" stroke-opacity="0.75"/>
  <path d="M50 32 C41 32 35 39 35 47 C35 57 50 69 50 69 C50 69 65 57 65 47 C65 39 59 32 50 32 Z" fill="url(#tslGoldFav)"/>
  <circle cx="50" cy="46.5" r="5.5" fill="#040814"/>
  <circle cx="52" cy="44.5" r="1.8" fill="#ffffff"/>
</svg>`;

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = 'w-9 h-9' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={`${className} drop-shadow-[0_0_12px_rgba(245,197,66,0.7)]`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="tslEyeBgHud" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#102558" />
          <stop offset="100%" stopColor="#040814" />
        </radialGradient>
        <linearGradient id="tslGoldHud" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff6c4" />
          <stop offset="50%" stopColor="#f5c542" />
          <stop offset="100%" stopColor="#c68212" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#tslEyeBgHud)" stroke="url(#tslGoldHud)" strokeWidth="3.5" />
      <path d="M10 50 Q50 18 90 50 Q50 82 10 50 Z" fill="#07122e" stroke="url(#tslGoldHud)" strokeWidth="4.2" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="url(#tslGoldHud)" strokeWidth="2.4" strokeOpacity="0.75" />
      <path d="M50 32 C41 32 35 39 35 47 C35 57 50 69 50 69 C50 69 65 57 65 47 C65 39 59 32 50 32 Z" fill="url(#tslGoldHud)" />
      <circle cx="50" cy="46.5" r="5.5" fill="#040814" />
      <circle cx="52" cy="44.5" r="1.8" fill="#ffffff" />
    </svg>
  );
};
