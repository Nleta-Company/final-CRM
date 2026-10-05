"use client";

import React, { useState } from "react";

interface AreaChartProps {
  title?: string;
  subtitle?: string;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const salesData = [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235];
const revenueData = [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140];

export default function AreaChart({
  title = "Sales & Revenue Trends",
  subtitle = "Performance analytics comparison across months",
}: AreaChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const maxVal = 260;
  const width = 680;
  const height = 220;
  const paddingX = 30;
  const paddingY = 20;

  const pointsCount = months.length;
  const stepX = (width - paddingX * 2) / (pointsCount - 1);

  // Compute SVG coordinates
  const getCoordinates = (val: number, idx: number) => {
    const x = paddingX + idx * stepX;
    const y = height - paddingY - (val / maxVal) * (height - paddingY * 2);
    return { x, y };
  };

  const salesPoints = salesData.map((val, idx) => getCoordinates(val, idx));
  const revenuePoints = revenueData.map((val, idx) => getCoordinates(val, idx));

  // Build SVG Path
  const buildPath = (points: { x: number; y: number }[]) => {
    return points.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      // Smooth cubic bezier or straight lines
      const prev = points[idx - 1];
      const cp1X = prev.x + (curr.x - prev.x) / 2;
      const cp1Y = prev.y;
      const cp2X = prev.x + (curr.x - prev.x) / 2;
      const cp2Y = curr.y;
      return `${acc} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${curr.x} ${curr.y}`;
    }, "");
  };

  const salesLine = buildPath(salesPoints);
  const revenueLine = buildPath(revenuePoints);

  const salesArea = `${salesLine} L ${salesPoints[pointsCount - 1].x} ${
    height - paddingY
  } L ${salesPoints[0].x} ${height - paddingY} Z`;

  const revenueArea = `${revenueLine} L ${revenuePoints[pointsCount - 1].x} ${
    height - paddingY
  } L ${revenuePoints[0].x} ${height - paddingY} Z`;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900/60 shadow-theme-xs">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white/90">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
            <span className="text-gray-600 dark:text-gray-300">Sales Volume</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-300" />
            <span className="text-gray-600 dark:text-gray-300">Net Revenue</span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#465FFF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#465FFF" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9CB9FF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#9CB9FF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = height - paddingY - ratio * (height - paddingY * 2);
            return (
              <line
                key={i}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                strokeDasharray="4 4"
                className="text-gray-200 dark:text-gray-800"
                strokeWidth="1"
              />
            );
          })}

          {/* Area Fills */}
          <path d={salesArea} fill="url(#salesGrad)" />
          <path d={revenueArea} fill="url(#revGrad)" />

          {/* Lines */}
          <path
            d={salesLine}
            fill="none"
            stroke="#465FFF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={revenueLine}
            fill="none"
            stroke="#9CB9FF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Data Points / Hover Crosshairs */}
          {months.map((m, idx) => {
            const sp = salesPoints[idx];
            const rp = revenuePoints[idx];
            const isHovered = hoverIndex === idx;

            return (
              <g
                key={m}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-pointer"
              >
                {/* Invisible hover capture bar */}
                <rect
                  x={sp.x - stepX / 2}
                  y={0}
                  width={stepX}
                  height={height}
                  fill="transparent"
                />

                {/* Vertical hover guideline */}
                {isHovered && (
                  <line
                    x1={sp.x}
                    y1={paddingY}
                    x2={sp.x}
                    y2={height - paddingY}
                    stroke="#465FFF"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="opacity-70"
                  />
                )}

                {/* Sales point dot */}
                <circle
                  cx={sp.x}
                  cy={sp.y}
                  r={isHovered ? "5" : "3"}
                  fill="#465FFF"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Revenue point dot */}
                <circle
                  cx={rp.x}
                  cy={rp.y}
                  r={isHovered ? "5" : "3"}
                  fill="#9CB9FF"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoverIndex !== null && (
          <div
            className="absolute top-2 pointer-events-none z-20 -translate-x-1/2 rounded-xl bg-gray-900/95 p-3 text-xs text-white shadow-theme-xl dark:bg-gray-800/95 backdrop-blur-sm border border-gray-700"
            style={{
              left: `${
                ((salesPoints[hoverIndex].x) / width) * 100
              }%`,
            }}
          >
            <p className="font-bold text-gray-300 pb-1 border-b border-gray-700 mb-1.5">
              {months[hoverIndex]} Performance
            </p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Sales:</span>
              <span className="font-semibold text-brand-300">
                ${salesData[hoverIndex]},000
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Revenue:</span>
              <span className="font-semibold text-blue-200">
                ${revenueData[hoverIndex]},000
              </span>
            </div>
          </div>
        )}

        {/* X-Axis Month Labels */}
        <div className="flex justify-between px-6 pt-2 text-[11px] font-medium text-gray-400 dark:text-gray-500">
          {months.map((m, idx) => (
            <span
              key={m}
              className={`transition-colors ${
                hoverIndex === idx
                  ? "text-brand-600 dark:text-brand-400 font-bold"
                  : ""
              }`}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
