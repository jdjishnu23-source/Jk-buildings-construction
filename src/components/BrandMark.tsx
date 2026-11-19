import React from 'react';

export const JkHouseLogo: React.FC<{ className?: string }> = ({ className = 'w-16 h-14' }) => (
  <svg viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    {/* Skyline silhouette behind roof */}
    <rect x="34" y="16" width="12" height="24" fill="#0B2C5D" />
    <rect x="52" y="6" width="14" height="32" fill="#0B2C5D" />
    <rect x="70" y="14" width="12" height="24" fill="#EAB308" />
    {/* Golden roof arch */}
    <path
      d="M8 54 C24 34, 48 24, 62 20 L114 48 L108 54 L62 30 C44 34, 24 44, 12 58 Z"
      fill="#EAB308"
    />
    <path d="M58 18 L112 46 L104 48 L58 24 Z" fill="#0B2C5D" />
    {/* 4-pane window */}
    <rect x="55" y="34" width="5" height="5" fill="#0B2C5D" />
    <rect x="62" y="34" width="5" height="5" fill="#0B2C5D" />
    <rect x="55" y="41" width="5" height="5" fill="#0B2C5D" />
    <rect x="62" y="41" width="5" height="5" fill="#0B2C5D" />
    {/* Bold JK monogram */}
    <text
      x="60"
      y="78"
      textAnchor="middle"
      fontFamily="Plus Jakarta Sans, sans-serif"
      fontWeight="800"
      fontSize="36"
      letterSpacing="-1"
    >
      <tspan fill="#0B2C5D">J</tspan>
      <tspan fill="#EAB308">K</tspan>
    </text>
    {/* Bottom golden swoosh */}
    <path d="M10 82 Q55 96 108 82 Q60 90 10 82 Z" fill="#EAB308" />
  </svg>
);

export const JkBuildingsIcon: React.FC<{ className?: string }> = ({ className = 'w-16 h-12' }) => (
  <svg viewBox="0 0 110 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    {/* Left tall building */}
    <rect x="10" y="10" width="38" height="62" fill="#1D6FA5" />
    <rect x="17" y="18" width="6" height="6" fill="#FFFFFF" />
    <rect x="27" y="18" width="6" height="6" fill="#FFFFFF" />
    <rect x="37" y="18" width="6" height="6" fill="#FFFFFF" />
    <rect x="17" y="29" width="6" height="6" fill="#FFFFFF" />
    <rect x="27" y="29" width="6" height="6" fill="#FFFFFF" />
    <rect x="37" y="29" width="6" height="6" fill="#FFFFFF" />
    <rect x="17" y="40" width="6" height="6" fill="#FFFFFF" />
    <rect x="27" y="40" width="6" height="6" fill="#FFFFFF" />
    <rect x="37" y="40" width="6" height="6" fill="#FFFFFF" />
    <rect x="17" y="51" width="6" height="6" fill="#FFFFFF" />
    <rect x="27" y="51" width="6" height="6" fill="#FFFFFF" />
    <rect x="37" y="51" width="6" height="6" fill="#FFFFFF" />
    {/* Right building */}
    <rect x="54" y="24" width="44" height="48" fill="#1D6FA5" />
    <rect x="61" y="32" width="7" height="7" fill="#FFFFFF" />
    <rect x="73" y="32" width="7" height="7" fill="#FFFFFF" />
    <rect x="85" y="32" width="7" height="7" fill="#FFFFFF" />
    <rect x="61" y="44" width="7" height="7" fill="#FFFFFF" />
    <rect x="73" y="44" width="7" height="7" fill="#FFFFFF" />
    <rect x="85" y="44" width="7" height="7" fill="#FFFFFF" />
    <rect x="72" y="58" width="10" height="14" fill="#FFFFFF" />
    {/* Base ground line */}
    <rect x="2" y="72" width="106" height="3" fill="#1D6FA5" />
  </svg>
);

export const SafetyHelmetGraphic: React.FC<{ className?: string }> = ({ className = 'w-20 h-14' }) => (
  <svg viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path
      d="M16 46 C16 22, 34 10, 52 10 C70 10, 84 22, 86 46 Z"
      fill="#FACC15"
      stroke="#CA8A04"
      strokeWidth="2"
    />
    <path d="M44 10 L58 10 L60 44 L42 44 Z" fill="#FDE047" />
    <path d="M10 46 Q50 56 92 48 L88 53 Q50 61 12 52 Z" fill="#EAB308" stroke="#A16207" strokeWidth="1.5" />
  </svg>
);
