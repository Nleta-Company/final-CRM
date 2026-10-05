"use client";

import React from "react";

interface RadialProgressChartProps {
  title?: string;
  subtitle?: string;
  percentage?: number;
  targetAmount?: string;
  currentAmount?: string;
}

export default function RadialProgressChart({
  title = "Monthly Target Progress",
  subtitle = "Overall revenue vs monthly quota",
  percentage = 75.55,
  targetAmount = "$150,000",
  currentAmount = "$113,325",
}: RadialProgressChartProps) {
  // Semi-circle configuration
  const radius = 95;
  const strokeWidth = 18;
  const circumference = Math.PI * radius; // Half circle perimeter
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900/60 shadow-theme-xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white/90">
            {title}
          </h3>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            Active Sprint
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      </div>

      {/* Radial Semi-circle Gauge */}
      <div className="relative flex flex-col items-center justify-center my-4">
        <svg
          width="240"
          height="140"
          viewBox="0 0 240 140"
          className="overflow-visible"
        >
          {/* Background Arc */}
          <path
            d="M 25 125 A 95 95 0 0 1 215 125"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="text-gray-100 dark:text-gray-800"
          />

          {/* Progress Arc */}
          <path
            d="M 25 125 A 95 95 0 0 1 215 125"
            fill="none"
            stroke="url(#radialGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />

          <defs>
            <linearGradient id="radialGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#465fff" />
              <stop offset="100%" stopColor="#7592ff" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute bottom-2 flex flex-col items-center">
          <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {percentage}%
          </span>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Completed
          </span>
        </div>
      </div>

      {/* Target Details Breakdown */}
      <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 text-center">
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Achieved
          </span>
          <p className="text-sm sm:text-base font-bold text-gray-800 dark:text-white/90">
            {currentAmount}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Goal Target
          </span>
          <p className="text-sm sm:text-base font-bold text-brand-600 dark:text-brand-400">
            {targetAmount}
          </p>
        </div>
      </div>
    </div>
  );
}
