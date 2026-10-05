"use client";

import React from "react";
import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  pageTitle: string;
  items?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export default function Breadcrumb({
  pageTitle,
  items = [{ label: "Home", href: "/" }, { label: pageTitle }],
  actions,
}: BreadcrumbProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 pb-2 border-b border-gray-100 dark:border-gray-800">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-800 dark:text-white/90">
          {pageTitle}
        </h1>
      </div>

      <div className="flex flex-col flex-wrap items-end justify-end gap-3">
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-sm">
            {items.map((item, idx) => {
              const isLast = idx === items.length - 1;
              return (
                <li key={idx} className="flex items-center gap-1.5">
                  {idx > 0 && (
                    <svg
                      className="w-4 h-4 text-gray-400 stroke-current rtl:rotate-180"
                      viewBox="0 0 17 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}

                  {isLast ? (
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {item.label}
                    </span>
                  ) : (
                    <Link
                      href={item.href || "/"}
                      className="text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
