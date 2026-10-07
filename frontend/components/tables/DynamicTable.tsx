"use client";

import React, { useEffect, useMemo, useState } from "react";

import Button from "../ui/Button";
import Pagination, {
  PaginationVariant,
} from "../pagination/Pagination";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
  render?: (
    row: T,
    index: number
  ) => React.ReactNode;
}

export interface DynamicTableProps<T> {
  title?: string;
  description?: string;
  columns: Column<T>[];
  data: T[];

  searchPlaceholder?: string;
  searchable?: boolean;

  filterable?: boolean;

  filterOptions?: {
    label: string;
    value: string;
    field: keyof T;
  }[];

  pageSizeOptions?: number[];
  initialPageSize?: number;

  paginationVariant?: PaginationVariant;

  showPageSizeSelector?: boolean;
  showTotalInfo?: boolean;

  onRowClick?: (row: T) => void;
  onAddRecord?: () => void;
}

export default function DynamicTable<
  T extends object
>({
  title = "CRM Records",
  description = "Manage, search, sort, and analyze your CRM records",

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
  const [searchTerm, setSearchTerm] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState("ALL");

  const [sortKey, setSortKey] =
    useState<string | null>(null);

  const [sortOrder, setSortOrder] =
    useState<"asc" | "desc">("asc");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(initialPageSize);

  /*
   * ============================================================
   * SEARCH VALUE
   * ============================================================
   */

  const getSearchableValue = (
    value: unknown
  ): string => {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value
        .map((item) =>
          getSearchableValue(item)
        )
        .join(" ");
    }

    if (
      typeof value === "object"
    ) {
      return Object.values(
        value as Record<string, unknown>
      )
        .map((item) =>
          getSearchableValue(item)
        )
        .join(" ");
    }

    return "";
  };

  /*
   * ============================================================
   * FILTER + SEARCH
   * ============================================================
   */

  const filteredData = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    return data.filter((item) => {
      /*
       * Search
       */

      const matchesSearch =
        normalizedSearch === "" ||
        Object.values(
          item as Record<string, unknown>
        ).some((value) =>
          getSearchableValue(value)
            .toLowerCase()
            .includes(normalizedSearch)
        );

      /*
       * Filter
       */

      let matchesFilter = true;

      if (
        activeFilter !== "ALL" &&
        filterOptions.length > 0
      ) {
        const option =
          filterOptions.find(
            (item) =>
              item.value === activeFilter
          );

        if (option) {
          const itemValue =
            (item as Record<string, unknown>)[
              option.field as string
            ];

          matchesFilter =
            String(itemValue) ===
            activeFilter;
        }
      }

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [
    data,
    searchTerm,
    activeFilter,
    filterOptions,
  ]);

  /*
   * ============================================================
   * SORT
   * ============================================================
   */

  const handleSort = (
    key: string
  ) => {
    if (sortKey === key) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortKey(null);
        setSortOrder("asc");
      }

      return;
    }

    setSortKey(key);
    setSortOrder("asc");
    setCurrentPage(1);
  };

  const sortedData = useMemo(() => {
    if (!sortKey) {
      return filteredData;
    }

    return [...filteredData].sort(
      (a, b) => {
        const valA =
          (a as Record<string, unknown>)[
            sortKey
          ];

        const valB =
          (b as Record<string, unknown>)[
            sortKey
          ];

        if (valA === valB) {
          return 0;
        }

        if (
          valA === null ||
          valA === undefined
        ) {
          return 1;
        }

        if (
          valB === null ||
          valB === undefined
        ) {
          return -1;
        }

        if (
          typeof valA === "number" &&
          typeof valB === "number"
        ) {
          return sortOrder === "asc"
            ? valA - valB
            : valB - valA;
        }

        const stringA =
          String(valA).toLowerCase();

        const stringB =
          String(valB).toLowerCase();

        return sortOrder === "asc"
          ? stringA.localeCompare(stringB)
          : stringB.localeCompare(stringA);
      }
    );
  }, [
    filteredData,
    sortKey,
    sortOrder,
  ]);

  /*
   * ============================================================
   * PAGINATION
   * ============================================================
   */

  const totalPages = Math.max(
    1,
    Math.ceil(
      sortedData.length / pageSize
    )
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [
    currentPage,
    totalPages,
  ]);

  const paginatedData = useMemo(() => {
    const start =
      (currentPage - 1) *
      pageSize;

    return sortedData.slice(
      start,
      start + pageSize
    );
  }, [
    sortedData,
    currentPage,
    pageSize,
  ]);

  /*
   * ============================================================
   * CLEAR SEARCH
   * ============================================================
   */

  const hasActiveControls =
    searchTerm.trim() !== "" ||
    activeFilter !== "ALL";

  const clearControls = () => {
    setSearchTerm("");
    setActiveFilter("ALL");
    setCurrentPage(1);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* ======================================================
          HEADER
      ======================================================= */}

      <div className="border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Title */}

          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h3 className="truncate text-base font-semibold tracking-tight text-gray-900 dark:text-white">
                {title}
              </h3>

              <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 sm:inline-flex dark:bg-gray-800 dark:text-gray-400">
                {data.length}
              </span>
            </div>

            {description && (
              <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>

          {/* Controls */}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search */}

            {searchable && (
              <div className="relative w-full sm:w-72">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <SearchIcon />
                </span>

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(
                      event.target.value
                    );

                    setCurrentPage(1);
                  }}
                  placeholder={
                    searchPlaceholder
                  }
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-9 text-xs font-medium text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800/70 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-gray-800"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    aria-label="Clear search"
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>
            )}

            {/* Filter */}

            {filterable &&
              filterOptions.length > 0 && (
                <select
                  value={activeFilter}
                  onChange={(event) => {
                    setActiveFilter(
                      event.target.value
                    );

                    setCurrentPage(1);
                  }}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none transition hover:bg-gray-50 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {filterOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              )}

            {/* Add */}

            {onAddRecord && (
              <Button
                size="sm"
                variant="primary"
                onClick={onAddRecord}
                leftIcon={
                  <PlusIcon />
                }
              >
                Add Record
              </Button>
            )}
          </div>
        </div>

        {/* Active filter information */}

        {hasActiveControls && (
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-2.5 dark:border-gray-800 dark:bg-gray-800/30">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Showing
            </span>

            <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200">
              {sortedData.length}
            </span>

            <span className="text-[11px] text-gray-400">
              matching records
            </span>

            <button
              type="button"
              onClick={clearControls}
              className="ml-auto text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* ======================================================
          TABLE
      ======================================================= */}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-xs sm:text-sm">
          {/* Header */}

          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-800/50">
              {columns.map((column) => {
                const isSorted =
                  sortKey === column.key;

                const alignment =
                  column.align === "right"
                    ? "text-right"
                    : column.align ===
                      "center"
                    ? "text-center"
                    : "text-left";

                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={{
                      width:
                        column.width,
                    }}
                    onClick={() =>
                      column.sortable &&
                      handleSort(
                        column.key
                      )
                    }
                    className={`px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${alignment} ${
                      column.sortable
                        ? "cursor-pointer select-none hover:text-brand-600 dark:hover:text-brand-400"
                        : ""
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        column.align ===
                        "right"
                          ? "justify-end"
                          : column.align ===
                            "center"
                          ? "justify-center"
                          : ""
                      }`}
                    >
                      <span>
                        {
                          column.header
                        }
                      </span>

                      {column.sortable && (
                        <SortIcon
                          active={
                            isSorted
                          }
                          order={
                            sortOrder
                          }
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}

          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedData.length >
            0 ? (
              paginatedData.map(
                (row, rowIndex) => (
                  <tr
                    key={
                      String(
                        (
                          row as Record<
                            string,
                            unknown
                          >
                        ).id ??
                          rowIndex
                      )
                    }
                    onClick={() =>
                      onRowClick?.(
                        row
                      )
                    }
                    className={`group transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40 ${
                      onRowClick
                        ? "cursor-pointer"
                        : ""
                    }`}
                  >
                    {columns.map(
                      (column) => {
                        const alignment =
                          column.align ===
                          "right"
                            ? "text-right"
                            : column.align ===
                              "center"
                            ? "text-center"
                            : "text-left";

                        return (
                          <td
                            key={
                              column.key
                            }
                            className={`px-5 py-4 ${alignment} ${
                              column.className ||
                              ""
                            }`}
                          >
                            {column.render
                              ? column.render(
                                  row,
                                  (currentPage -
                                    1) *
                                    pageSize +
                                    rowIndex
                                )
                              : String(
                                  (
                                    row as Record<
                                      string,
                                      unknown
                                    >
                                  )[
                                    column
                                      .key
                                  ] ??
                                    "—"
                                )}
                          </td>
                        );
                      }
                    )}
                  </tr>
                )
              )
            ) : (
              <tr>
                <td
                  colSpan={
                    columns.length
                  }
                  className="px-6 py-16 text-center"
                >
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                      <EmptyIcon />
                    </div>

                    <h4 className="mt-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      No records found
                    </h4>

                    <p className="mt-1 text-xs leading-5 text-gray-400 dark:text-gray-500">
                      {hasActiveControls
                        ? "Try changing your search or filter criteria."
                        : "There are no CRM records available right now."}
                    </p>

                    {hasActiveControls && (
                      <button
                        type="button"
                        onClick={
                          clearControls
                        }
                        className="mt-3 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                      >
                        Clear search & filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ======================================================
          FOOTER / PAGINATION
      ======================================================= */}

      <div className="border-t border-gray-100 dark:border-gray-800">
        <Pagination
          currentPage={
            currentPage
          }
          totalPages={totalPages}
          totalRecords={
            sortedData.length
          }
          pageSize={pageSize}
          pageSizeOptions={
            pageSizeOptions
          }
          onPageChange={(page) =>
            setCurrentPage(page)
          }
          onPageSizeChange={(
            newSize
          ) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          variant={
            paginationVariant
          }
          showPageSizeSelector={
            showPageSizeSelector
          }
          showTotalInfo={
            showTotalInfo
          }
        />
      </div>
    </div>
  );
}

/* ============================================================
   ICONS
============================================================ */

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
      />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13V7a2 2 0 00-2-2h-4l-2-2H6a2 2 0 00-2 2v8"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 17a3 3 0 003 3h10a3 3 0 003-3v-1H4v1z"
      />
    </svg>
  );
}

function SortIcon({
  active,
  order,
}: {
  active: boolean;
  order: "asc" | "desc";
}) {
  return (
    <span className="flex flex-col leading-none">
      <svg
        className={`h-2.5 w-2.5 ${
          active && order === "asc"
            ? "text-brand-600 dark:text-brand-400"
            : "text-gray-300 dark:text-gray-600"
        }`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414 6.707 9.707a1 1 0 01-1.414 0z" />
      </svg>

      <svg
        className={`-mt-0.5 h-2.5 w-2.5 ${
          active && order === "desc"
            ? "text-brand-600 dark:text-brand-400"
            : "text-gray-300 dark:text-gray-600"
        }`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
      </svg>
    </span>
  );
}