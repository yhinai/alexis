import React from 'react';

export const Logo = ({ className = "", size = 32 }: { className?: string; size?: number }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Shape: Rounded Sandbox Container */}
      <rect x="2" y="2" width="28" height="28" rx="8" className="fill-primary/10 stroke-primary" strokeWidth="2" />
      
      {/* Inner Elements: Code Brackets + Voice Wave */}
      <path
        d="M10 12L7 16L10 20"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 12L25 16L22 20"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Center Voice/AI lines */}
      <path
        d="M16 9V23"
        className="stroke-orange-500"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M13 13V19"
        className="stroke-orange-500/70"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M19 13V19"
        className="stroke-orange-500/70"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
