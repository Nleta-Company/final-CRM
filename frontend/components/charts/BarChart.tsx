"use client";

import React, { useState } from "react";

interface BarChartProps {
  title?: string;
  subtitle?: string;
  data?: { month: string; sales: number }[];
}

const defaultData = [
  { month: "Jan", sales: 168 },
  { month: "Feb", sales: 385 },
  { month: "Mar", sales: 201 },
  { month: "Apr", sales: 298 },
  { month: "May", sales: 187 },
  { month: "Jun", sales: 195 },
  { month: "Jul", sales: 291 },
  { month: "Aug", sales: 110 },
  { month: "Sep", sales: 215 },
  { month: "Oct", sales: 390 },
  { month: "Nov", sales: 280 },
  { month: "Dec", sales: 112 },
];

export default function BarChart({
  title = "Monthly Sales Overview",
  subtitle = "Yearly revenue and sales statistics",
  data = defaultData,
}: BarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = Math.max(...data.map((d) => d.sales)) * 1.15;
  const chartHeight = 200;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900/60 shadow-theme-xs">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white/90">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-brand-500" />
            <span className="font-medium text-gray-600 dark:text-gray-300">
              Sales Volume ($k)
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Bar Chart Visualization */}
      <div className="relative pt-6">
        {/* Tooltip */}
        {hoveredIdx !== null && (
          <div
            className="absolute top-0 transform -translate-x-1/2 pointer-events-none z-10 rounded-lg bg-gray-900 px-2.5 py-1 text-xs text-white shadow-theme-md dark:bg-gray-800"
            style={{
              left: `${((hoveredIdx + 0.5) / data.length) * 100}%`,
            }}
          >
            <div className="font-bold">{data[hoveredIdx].month}</div>
            <div className="text-brand-300">${data[hoveredIdx].sales},000</div>
          </div>
        )}

        {/* Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10 pb-6 pt-6">
          <div className="border-b border-gray-400 border-dashed w-full" />
          <div className="border-b border-gray-400 border-dashed w-full" />
          <div className="border-b border-gray-400 border-dashed w-full" />
          <div className="border-b border-gray-400 w-full" />
        </div>

        {/* Bars Container */}
        <div
          className="relative flex items-end justify-between gap-1.5 sm:gap-3"
          style={{ height: `${chartHeight}px` }}
        >
          {data.map((item, idx) => {
            const heightPercent = (item.sales / maxVal) * 100;
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={item.month}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="relative flex flex-col items-center flex-1 h-full justify-end cursor-pointer group"
              >
                {/* Bar */}
                <div
                  className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                    isHovered
                      ? "bg-brand-600 shadow-lg shadow-brand-500/30 scale-y-105"
                      : "bg-brand-500 hover:bg-brand-600"
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    transformOrigin: "bottom",
                  }}
                />

                {/* X-Axis Label */}
                <span
                  className={`mt-2 text-[11px] font-medium transition-colors ${
                    isHovered
                      ? "text-brand-600 dark:text-brand-400 font-bold"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
