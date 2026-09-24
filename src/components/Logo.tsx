import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  inverse?: boolean;
  companyName?: string;
  logoUrl?: string;
}

export default function Logo({ className = '', iconOnly = false, inverse = false, companyName, logoUrl }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Visual Icon Logo: Intersecting high-speed fiber waves forming a 3D futuristic T or Custom Uploaded Logo */}
      <div className="relative flex items-center justify-center shrink-0">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={companyName || 'Logo'}
            className="w-[42px] h-[42px] object-contain rounded-xl border border-slate-200/50 bg-white p-0.5 shadow-sm"
            referrerPolicy="no-referrer"
          />
        ) : (
          <svg
            width="42"
            height="42"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-[0_4px_10px_rgba(37,99,235,0.25)] transition-transform duration-300 hover:scale-105"
          >
            {/* Outer speed rings */}
            <circle cx="50" cy="50" r="44" stroke="url(#ring-grad)" strokeWidth="1.5" strokeDasharray="6 4" className="opacity-40" />
            
            {/* Futuristic geometric nodes */}
            <path
              d="M50 12 C62 12, 74 16, 80 26 C86 36, 88 50, 80 64 C72 78, 50 88, 50 88"
              stroke="url(#speed-grad-1)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="opacity-75"
            />
            <path
              d="M50 12 C38 12, 26 16, 20 26 C14 36, 12 50, 20 64 C28 78, 50 88, 50 88"
              stroke="url(#speed-grad-2)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="opacity-75"
            />

            {/* Central T-Shape Mesh Core */}
            <path
              d="M32 30 H68 M50 30 V72"
              stroke={inverse ? '#facc15' : '#1d4ed8'}
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            <path
              d="M35 30 H65 M50 30 V68"
              stroke="url(#core-grad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Fiber Optic Pulse Node */}
            <circle cx="50" cy="68" r="5" fill="#ffffff" />
            <circle cx="50" cy="68" r="9" stroke="#38bdf8" strokeWidth="2" className="animate-ping" />

            <defs>
              <linearGradient id="ring-grad" x1="0" y1="0" x2="100" y2="100">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="speed-grad-1" x1="12" y1="12" x2="88" y2="88">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
              <linearGradient id="speed-grad-2" x1="88" y1="12" x2="12" y2="88">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="core-grad" x1="50" y1="20" x2="50" y2="75">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        )}
        
        {/* Glow backdrop element */}
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl -z-10 animate-pulse" />
      </div>

      {!iconOnly && (
        <div className="flex flex-col items-start leading-none">
          <div className="flex items-baseline">
            <span className={`font-display font-black text-2xl tracking-tight ${inverse ? 'text-white' : 'text-slate-900'}`}>
              {(() => {
                const name = (companyName || 'TARANET').trim().toUpperCase();
                if (name.includes(' ')) {
                  const parts = name.split(' ');
                  const first = parts[0];
                  const rest = parts.slice(1).join(' ');
                  return (
                    <>
                      {first}
                      <span className={inverse ? 'text-yellow-400' : 'text-blue-600'}> {rest}</span>
                    </>
                  );
                } else {
                  const half = Math.ceil(name.length / 2);
                  const part1 = name.slice(0, half);
                  const part2 = name.slice(half);
                  return (
                    <>
                      {part1}
                      <span className={inverse ? 'text-yellow-400' : 'text-blue-600'}>{part2}</span>
                    </>
                  );
                }
              })()}
            </span>
            <span className={`font-mono text-[10px] font-bold px-1 py-0.5 rounded ml-1 bg-blue-500/10 ${inverse ? 'text-yellow-300' : 'text-blue-600'}`}>
              FO
            </span>
          </div>
          <span className={`text-[9px] font-mono tracking-[0.25em] uppercase font-extrabold mt-0.5 ${inverse ? 'text-slate-300' : 'text-slate-500'}`}>
            ULTRA BROADBAND
          </span>
        </div>
      )}
    </div>
  );
}
