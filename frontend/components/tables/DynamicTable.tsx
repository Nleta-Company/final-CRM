"use client";

import React, { useMemo, useState } from "react";
import Button from "../ui/Button";
import Pagination, { PaginationVariant } from "../pagination/Pagination";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DynamicTableProps<T> {
  title?: string;
  description?: string;
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchable?: boolean;
  filterable?: boolean;
  filterOptions?: { label: string; value: string; field: keyof T }[];
  pageSizeOptions?: number[];
  initialPageSize?: number;
  paginationVariant?: PaginationVariant;
  showPageSizeSelector?: boolean;
  showTotalInfo?: boolean;
  onRowClick?: (row: T) => void;
  onAddRecord?: () => void;
}

export default function DynamicTable<T extends object>({
  title = "CRM Records",
  description = "Manage, search, sort, and analyze your CRM data records",
  columns,
  data,
  searchPlaceholder = "Search records...",
  searchable = true,
  filterable = true,
  filterOptions = [],
  pageSizeOptions = [5, 10, 20],
  initialPageSize = 5,
  paginationVariant = "default",
  showPageSizeSelector = true,
  showTotalInfo = true,
  onRowClick,
  onAddRecord,
}: DynamicTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Handle Sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortKey(null);
        setSortOrder("asc");
      }
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Search Query Match across all fields
      const matchesSearch =
        searchTerm === "" ||
        Object.values(item as Record<string, unknown>).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(searchTerm.toLowerCase());
        });

      // 2. Dropdown Filter Match
      let matchesFilter = true;
      if (activeFilter !== "ALL" && filterOptions.length > 0) {
        const option = filterOptions.find((opt) => opt.value === activeFilter);
        if (option && option.field) {
          matchesFilter = String((item as Record<string, unknown>)[option.field as string]) === activeFilter;
        }
      }

      return matchesSearch && matchesFilter;
    });
  }, [data, searchTerm, activeFilter, filterOptions]);

  // Sort Logic
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortKey];
      const valB = (b as Record<string, unknown>)[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }

      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredData, sortKey, sortOrder]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
      {/* Table Top Controls & Search Bar */}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white/90">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          {searchable && (
            <div className="relative w-full sm:w-64">
              <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  />
                </svg>
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 ps-9 pe-3 text-xs text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          )}

          {/* Filter Dropdown */}
          {filterable && filterOptions.length > 0 && (
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="ALL">All Statuses</option>
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Optional Action Button */}
          {onAddRecord && (
            <Button
              size="sm"
              variant="primary"
              onClick={onAddRecord}
              leftIcon={
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                </svg>
              }
            >
              Add Record
            </Button>
          )}
        </div>
      </div>

      {/* Responsive Table Scroll Container */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-start text-xs sm:text-sm">
          {/* Dynamic Table Header */}
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width }}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`px-5 py-3.5 font-semibold select-none ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${
                      col.sortable
                        ? "cursor-pointer hover:text-brand-600 dark:hover:text-brand-400"
                        : ""
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === "right" ? "justify-end" : ""
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="flex flex-col text-[10px]">
                          <svg
                            className={`w-3 h-3 transition-colors ${
                              isSorted && sortOrder === "asc"
                                ? "text-brand-600 dark:text-brand-400 font-bold"
                                : "text-gray-300 dark:text-gray-600"
                            }`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <svg
                            className={`w-3 h-3 -mt-1.5 transition-colors ${
                              isSorted && sortOrder === "desc"
                                ? "text-brand-600 dark:text-brand-400 font-bold"
                                : "text-gray-300 dark:text-gray-600"
                            }`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr
                  key={((row as Record<string, unknown>).id as string | number | undefined) ?? idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-800/40 ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 whitespace-nowrap text-gray-700 dark:text-gray-300 ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      } ${col.className || ""}`}
                    >
                      {col.render
                        ? col.render(row, (currentPage - 1) * pageSize + idx)
                        : (row as Record<string, unknown>)[col.key] !== undefined
                        ? String((row as Record<string, unknown>)[col.key])
                        : "-"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <svg
                      className="w-10 h-10 text-gray-300 dark:text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">
                      No matching records found
                    </p>
                    <p className="text-xs text-gray-400">
                      Try adjusting your search query or clear filters.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reusable Theme-based Pagination Component */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={sortedData.length}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        onPageChange={(p) => setCurrentPage(p)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        variant={paginationVariant}
        showPageSizeSelector={showPageSizeSelector}
        showTotalInfo={showTotalInfo}
      />
    </div>
  );
}
