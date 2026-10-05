"use client";

import React from "react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType?: "increase" | "decrease" | "neutral";
  period?: string;
  icon?: React.ReactNode;
}

export default function MetricCard({
  title,
  value,
  change,
  changeType = "increase",
  period = "vs last month",
  icon,
}: MetricCardProps) {
  const isPositive = changeType === "increase";
  const isNegative = changeType === "decrease";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 transition-all duration-200 hover:shadow-theme-md dark:border-gray-800 dark:bg-gray-900/60">
      {/* Icon header */}
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {icon ? (
            icon
          ) : (
            <svg
              className="w-6 h-6 fill-current"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          )}
        </div>

        {/* Change Badge */}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isPositive
              ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
              : isNegative
              ? "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {isPositive && (
            <svg
              className="w-3 h-3 fill-current"
              viewBox="0 0 12 12"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.56462 1.62393C5.70193 1.47072 5.90135 1.37432 6.12329 1.37432C6.31631 1.37415 6.50845 1.44731 6.65505 1.59381L9.65514 4.5918C9.94814 4.88459 9.94831 5.35947 9.65552 5.65246C9.36273 5.94546 8.88785 5.94562 8.59486 5.65283L6.87329 3.93247L6.87329 10.125C6.87329 10.5392 6.53751 10.875 6.12329 10.875C5.70908 10.875 5.37329 10.5392 5.37329 10.125L5.37329 3.93578L3.65516 5.65282C3.36218 5.94562 2.8873 5.94547 2.5945 5.65248C2.3017 5.35949 2.30185 4.88462 2.59484 4.59182L5.56462 1.62393Z"
              />
            </svg>
          )}

          {isNegative && (
            <svg
              className="w-3 h-3 fill-current rotate-180"
              viewBox="0 0 12 12"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.56462 1.62393C5.70193 1.47072 5.90135 1.37432 6.12329 1.37432C6.31631 1.37415 6.50845 1.44731 6.65505 1.59381L9.65514 4.5918C9.94814 4.88459 9.94831 5.35947 9.65552 5.65246C9.36273 5.94546 8.88785 5.94562 8.59486 5.65283L6.87329 3.93247L6.87329 10.125C6.87329 10.5392 6.53751 10.875 6.12329 10.875C5.70908 10.875 5.37329 10.5392 5.37329 10.125L5.37329 3.93578L3.65516 5.65282C3.36218 5.94562 2.8873 5.94547 2.5945 5.65248C2.3017 5.35949 2.30185 4.88462 2.59484 4.59182L5.56462 1.62393Z"
              />
            </svg>
          )}

          <span>{change}</span>
        </span>
      </div>

      {/* Metric Content */}
      <div className="mt-5 flex items-end justify-between">
        <div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </span>
          <h4 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-gray-800 dark:text-white/90">
            {value}
          </h4>
        </div>

        <span className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
          {period}
        </span>
      </div>
    </div>
  );
}
