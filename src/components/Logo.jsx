import React from 'react';

export default function Logo({ size = 'md', className = '', showText = true }) {
  const sizeMap = {
    sm: { box: 'h-9 w-9', icon: 'h-6 w-6', text: 'text-lg' },
    md: { box: 'h-11 w-11', icon: 'h-8 w-8', text: 'text-xl' },
    lg: { box: 'h-16 w-16', icon: 'h-12 w-12', text: 'text-2xl sm:text-3xl' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2.5 select-none flex-nowrap shrink-0 ${className}`}>
      {/* Theme-Aware Vector Emblem based on user image */}
      <div className={`relative flex items-center justify-center rounded-2xl bg-card border border-border/80 shadow-lg group-hover:scale-105 transition-transform duration-300 shrink-0 ${currentSize.box}`}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className={`${currentSize.icon} filter drop-shadow-sm`}
        >
          <defs>
            {/* Outer Drop Red Gradient */}
            <linearGradient id="outer-drop-red" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EE1C25" />
              <stop offset="50%" stopColor="#C8102E" />
              <stop offset="100%" stopColor="#9B0016" />
            </linearGradient>

            {/* Inner Drop Gradient */}
            <linearGradient id="inner-drop-glow" x1="45" y1="25" x2="45" y2="75" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#FFF0F2" />
              <stop offset="100%" stopColor="#FFD1D6" />
            </linearGradient>

            {/* Cross Red Gradient */}
            <linearGradient id="cross-red" x1="35" y1="45" x2="35" y2="65" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
          </defs>

          {/* 1. Outer Red Blood Drop forming cupping hand on right */}
          <path 
            d="M 44 8 C 44 8 20 28 18 50 C 16 68 28 88 52 90 C 72 92 88 78 86 60 C 84 46 72 38 72 38 C 72 38 80 48 78 58 C 76 68 66 76 54 75 C 40 74 32 64 32 52 C 32 38 44 26 44 26 C 44 26 28 38 28 54 C 28 66 38 72 48 72 C 60 72 70 64 74 54 C 77 46 74 36 68 32 C 60 27 50 16 44 8 Z" 
            fill="url(#outer-drop-red)" 
          />

          {/* Main Solid Drop Body & Hand Arch */}
          <path 
            d="M 44 8 C 44 8 20 32 20 54 C 20 72 34 86 54 86 C 72 86 84 74 84 56 C 84 42 74 32 74 32 C 74 32 80 40 80 50 C 80 62 70 72 58 72 C 44 72 34 62 34 48 C 34 32 44 8 44 8 Z" 
            fill="url(#outer-drop-red)" 
          />

          {/* Cupping Hand Fingers Detail */}
          <path 
            d="M 52 86 C 68 86 82 76 84 58 C 85 48 80 38 74 34 C 78 42 80 50 78 58 C 76 68 66 76 54 76 C 44 76 38 70 36 62 C 42 70 50 72 58 72 C 70 72 78 64 80 52 C 81 44 76 36 72 32 C 78 38 82 48 81 58 C 79 70 68 82 52 86 Z" 
            fill="#80000A" 
            opacity="0.4" 
          />

          {/* 2. Central White Blood Drop */}
          <path 
            d="M 45 26 C 45 26 31 42 31 55 C 31 65 37 72 46 72 C 55 72 61 65 61 55 C 61 42 45 26 45 26 Z" 
            fill="url(#inner-drop-glow)" 
            stroke="#FCA5A5" 
            strokeWidth="1.5" 
          />

          {/* 3. Red Medical Cross with Upward Arrow in center of Inner Drop */}
          <g transform="translate(1, 2)">
            {/* Horizontal Arm */}
            <rect x="36" y="52" width="18" height="6" rx="1.5" fill="url(#cross-red)" />
            {/* Vertical Arm */}
            <rect x="42" y="46" width="6" height="18" rx="1.5" fill="url(#cross-red)" />
            
            {/* White Upward Arrow inside the cross */}
            <path 
              d="M 45 48 L 41 53 H 43.5 V 60 H 46.5 V 53 H 49 L 45 48 Z" 
              fill="#FFFFFF" 
            />
          </g>

          {/* 4. Blue Signal / Connectivity Waves (Top Right of Inner Drop) */}
          <g stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" fill="none">
            {/* Inner Arc */}
            <path d="M 54 39 A 6 6 0 0 1 60 45" />
            {/* Middle Arc */}
            <path d="M 57 35 A 11 11 0 0 1 66 45" />
            {/* Outer Arc */}
            <path d="M 60 31 A 16 16 0 0 1 72 45" />
          </g>
        </svg>

        {/* Live Active Green Indicator */}
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background shadow-sm animate-pulse" />
      </div>

      {showText && (
        <span className={`font-black tracking-tight text-foreground whitespace-nowrap ${currentSize.text}`}>
          Blood<span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-primary to-rose-700">Bridge</span>
        </span>
      )}
    </div>
  );
}


