"use client";

import React, { useMemo } from "react";

export type PaginationVariant = "default" | "bordered" | "minimal" | "rounded";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  variant?: PaginationVariant;
  showPageSizeSelector?: boolean;
  showTotalInfo?: boolean;
  siblingCount?: number;
  className?: string;
}

/**
 * Generate pagination page items with smart ellipsis
 */
function usePaginationRange({
  currentPage,
  totalPages,
  siblingCount = 1,
}: {
  currentPage: number;
  totalPages: number;
  siblingCount?: number;
}): (number | string)[] {
  return useMemo(() => {
    // Total numbers to display = siblings + firstPage + lastPage + currentPage + 2*dots
    const totalPageNumbers = siblingCount * 2 + 5;

    // Case 1: If total pages is less than page numbers we want to show
    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    // Case 2: No left dots, but right dots needed
    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, idx) => idx + 1);
      return [...leftRange, "...", totalPages];
    }

    // Case 3: No right dots, but left dots needed
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, idx) => totalPages - rightItemCount + idx + 1
      );
      return [firstPageIndex, "...", ...rightRange];
    }

    // Case 4: Both left and right dots needed
    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, idx) => leftSiblingIndex + idx
      );
      return [firstPageIndex, "...", ...middleRange, "...", lastPageIndex];
    }

    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }, [currentPage, totalPages, siblingCount]);
}

/**
 * Reusable Page Size Selector
 */
export function PageSizeSelector({
  pageSize = 5,
  pageSizeOptions = [5, 10, 20, 50],
  onPageSizeChange,
  className = "",
}: {
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  className?: string;
}) {
  if (!onPageSizeChange) return null;

  return (
    <div className={`flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ${className}`}>
      <span>Show</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        aria-label="Select rows per page"
        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-theme-xs hover:border-gray-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
      >
        {pageSizeOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span>entries</span>
    </div>
  );
}

/**
 * Reusable Pagination Summary Info
 */
export function PaginationInfo({
  currentPage,
  pageSize = 5,
  totalRecords = 0,
  className = "",
}: {
  currentPage: number;
  pageSize?: number;
  totalRecords?: number;
  className?: string;
}) {
  const start = totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>
      Showing <span className="font-semibold text-gray-800 dark:text-white">{start}</span> to{" "}
      <span className="font-semibold text-gray-800 dark:text-white">{end}</span> of{" "}
      <span className="font-semibold text-gray-800 dark:text-white">{totalRecords}</span> records
    </div>
  );
}

/**
 * Reusable Pagination Button Navigation Bar
 */
export function PaginationNav({
  currentPage,
  totalPages,
  onPageChange,
  variant = "default",
  siblingCount = 1,
  className = "",
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  variant?: PaginationVariant;
  siblingCount?: number;
  className?: string;
}) {
  const paginationRange = usePaginationRange({
    currentPage,
    totalPages,
    siblingCount,
  });

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Minimal Variant: "Page X of Y" with simple chevron buttons
  if (variant === "minimal") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Page <span className="font-semibold text-gray-800 dark:text-white">{currentPage}</span> of{" "}
          <span className="font-semibold text-gray-800 dark:text-white">{totalPages || 1}</span>
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={!canGoPrevious}
            aria-label="Previous Page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={!canGoNext}
            aria-label="Next Page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Bordered Group Variant (Joined container)
  if (variant === "bordered") {
    return (
      <nav aria-label="Pagination" className={`inline-flex rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 divide-x divide-gray-200 dark:divide-gray-800 overflow-hidden ${className}`}>
        {/* Previous */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={!canGoPrevious}
          aria-label="Previous Page"
          className="flex h-8.5 items-center gap-1 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none dark:text-gray-300 dark:hover:bg-gray-800 transition"
        >
          <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page Numbers */}
        {paginationRange.map((pageNumber, index) => {
          if (typeof pageNumber === "string") {
            return (
              <span
                key={`dots-${index}`}
                className="flex h-8.5 w-8.5 select-none items-center justify-center text-xs font-semibold text-gray-400 dark:text-gray-500"
              >
                &hellip;
              </span>
            );
          }

          const isActive = pageNumber === currentPage;
          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-8.5 min-w-[2.125rem] px-2 items-center justify-center text-xs font-semibold transition ${
                isActive
                  ? "bg-brand-500 text-white font-bold"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {pageNumber}
            </button>
          );
        })}

        {/* Next */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={!canGoNext}
          aria-label="Next Page"
          className="flex h-8.5 items-center gap-1 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none dark:text-gray-300 dark:hover:bg-gray-800 transition"
        >
          <span className="hidden sm:inline">Next</span>
          <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </nav>
    );
  }

  // Rounded Pill Variant & Default TailAdmin Style
  const isPill = variant === "rounded";

  return (
    <nav aria-label="Pagination" className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* First Page Jump (when more than 6 pages) */}
      {totalPages > 6 && (
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
          title="First Page"
          aria-label="First Page"
          className={`hidden sm:flex h-8 w-8 items-center justify-center border border-gray-200 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:pointer-events-none dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition ${
            isPill ? "rounded-full" : "rounded-lg"
          }`}
        >
          <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Previous Button */}
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={!canGoPrevious}
        aria-label="Previous Page"
        className={`flex h-8 items-center gap-1 border border-gray-200 bg-white px-2.5 sm:px-3 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:pointer-events-none dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition ${
          isPill ? "rounded-full" : "rounded-lg"
        }`}
      >
        <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {paginationRange.map((pageNumber, index) => {
          if (typeof pageNumber === "string") {
            return (
              <span
                key={`dots-${index}`}
                className="flex h-8 w-7 select-none items-center justify-center text-xs font-bold text-gray-400 dark:text-gray-500"
              >
                &hellip;
              </span>
            );
          }

          const isActive = pageNumber === currentPage;
          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-8 w-8 items-center justify-center text-xs font-semibold transition-all ${
                isPill ? "rounded-full" : "rounded-lg"
              } ${
                isActive
                  ? "bg-brand-500 text-white shadow-theme-xs font-bold ring-2 ring-brand-500/20 dark:bg-brand-500"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              {pageNumber}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={!canGoNext}
        aria-label="Next Page"
        className={`flex h-8 items-center gap-1 border border-gray-200 bg-white px-2.5 sm:px-3 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:pointer-events-none dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition ${
          isPill ? "rounded-full" : "rounded-lg"
        }`}
      >
        <span className="hidden sm:inline">Next</span>
        <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Last Page Jump (when more than 6 pages) */}
      {totalPages > 6 && (
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          title="Last Page"
          aria-label="Last Page"
          className={`hidden sm:flex h-8 w-8 items-center justify-center border border-gray-200 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:pointer-events-none dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition ${
            isPill ? "rounded-full" : "rounded-lg"
          }`}
        >
          <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </nav>
  );
}

/**
 * Main TailAdmin Theme Pagination Component
 * Combines entries selector, count summary, and responsive nav buttons.
 */
export default function Pagination({
  currentPage,
  totalPages,
  totalRecords = 0,
  pageSize = 5,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  variant = "default",
  showPageSizeSelector = true,
  showTotalInfo = true,
  siblingCount = 1,
  className = "",
}: PaginationProps) {
  return (
    <div
      className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 ${className}`}
    >
      {/* Left: Page Size Selector & Total Records Count */}
      <div className="flex flex-wrap items-center gap-3">
        {showPageSizeSelector && onPageSizeChange && (
          <PageSizeSelector
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={onPageSizeChange}
          />
        )}

        {showPageSizeSelector && onPageSizeChange && showTotalInfo && (
          <span className="hidden sm:inline-block text-gray-300 dark:text-gray-700">&bull;</span>
        )}

        {showTotalInfo && (
          <PaginationInfo
            currentPage={currentPage}
            pageSize={pageSize}
            totalRecords={totalRecords}
          />
        )}
      </div>

      {/* Right: Responsive Navigation Controls */}
      <div className="flex items-center justify-end">
        <PaginationNav
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          variant={variant}
          siblingCount={siblingCount}
        />
      </div>
    </div>
  );
}
