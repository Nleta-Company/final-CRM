"use client";

import React from "react";

export type SpinnerSize = "sm" | "md" | "lg" | "xl";

export interface LogoSpinnerProps {
  /** Size of the spinner: 'sm', 'md', 'lg', 'xl' */
  size?: SpinnerSize;
  /** If true, covers the entire viewport with a frosted glass backdrop */
  fullscreen?: boolean;
  /** Primary text displayed below the spinner */
  label?: string;
  /** Secondary small text displayed below label */
  sublabel?: string;
  /** Additional custom classes for wrapper */
  className?: string;
}

const sizeConfig: Record<
  SpinnerSize,
  {
    container: string;
    ring: string;
    logoSize: number;
    strokeWidth: number;
    radius: number;
    textSize: string;
  }
> = {
  sm: {
    container: "w-14 h-14",
    ring: "w-14 h-14",
    logoSize: 32,
    strokeWidth: 2.5,
    radius: 24,
    textSize: "text-xs",
  },
  md: {
    container: "w-20 h-20",
    ring: "w-20 h-20",
    logoSize: 48,
    strokeWidth: 3,
    radius: 35,
    textSize: "text-sm",
  },
  lg: {
    container: "w-28 h-28",
    ring: "w-28 h-28",
    logoSize: 68,
    strokeWidth: 3.5,
    radius: 49,
    textSize: "text-base",
  },
  xl: {
    container: "w-36 h-36",
    ring: "w-36 h-36",
    logoSize: 88,
    strokeWidth: 4,
    radius: 64,
    textSize: "text-lg",
  },
};

export default function LogoSpinner({
  size = "md",
  fullscreen = false,
  label,
  sublabel,
  className = "",
}: LogoSpinnerProps) {
  const config = sizeConfig[size];
  const center = (config.radius + config.strokeWidth) * 2;
  const circumference = 2 * Math.PI * config.radius;

  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Relative container holding spinning outer ring and pulsating centered logo */}
      <div className={`relative flex items-center justify-center ${config.container}`}>
        {/* Animated Glow Halo */}
        <div className="absolute inset-0 rounded-full bg-red-500/20 dark:bg-red-500/30 blur-md animate-pulse" />

        {/* Outer Circular Spinner Ring */}
        <svg
          className={`absolute inset-0 animate-spin ${config.ring}`}
          viewBox={`0 0 ${center} ${center}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animationDuration: "1.2s" }}
        >
          {/* Background track circle */}
          <circle
            cx={center / 2}
            cy={center / 2}
            r={config.radius}
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-gray-200 dark:text-gray-800"
          />
          {/* Active spinning arc with NLETA red-to-blue gradient */}
          <circle
            cx={center / 2}
            cy={center / 2}
            r={config.radius}
            stroke="url(#nletaSpinnerGradient)"
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.7}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="nletaSpinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e53935" />
              <stop offset="50%" stopColor="#ff5252" />
              <stop offset="100%" stopColor="#1e88e5" />
            </linearGradient>
          </defs>
        </svg>

        {/* Central App Logo (nleta-logo.png) with subtle breathing animation */}
        <div
          className="relative z-10 flex items-center justify-center animate-pulse rounded-full overflow-hidden shadow-sm"
          style={{ animationDuration: "2s" }}
        >
          <img
            src="/images/logo/nleta-logo.png"
            alt="National Lift Escalator Testing Agency"
            width={config.logoSize}
            height={config.logoSize}
            className="rounded-full object-contain select-none"
          />
        </div>
      </div>

      {/* Optional Status Text */}
      {(label || sublabel) && (
        <div className="text-center space-y-1">
          {label && (
            <p className={`font-semibold text-gray-800 dark:text-white/90 ${config.textSize}`}>
              {label}
            </p>
          )}
          {sublabel && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {sublabel}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-999999 flex flex-col items-center justify-center bg-white/85 backdrop-blur-md dark:bg-black/90 transition-opacity duration-300"
        role="status"
        aria-label={label || "Loading..."}
      >
        {spinnerContent}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4" role="status" aria-label={label || "Loading"}>
      {spinnerContent}
    </div>
  );
}
