"use client";

import React from "react";
import Link from "next/link";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import NotificationCard from "./NotificationCard";
import UserDropdown from "./UserDropdown";

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onSearch?: (query: string) => void;
}

export default function Header({
  sidebarOpen,
  setSidebarOpen,
  isCollapsed = false,
  onToggleSidebar,
  onSearch,
}: HeaderProps) {
  const handleToggle = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  return (
    <header className="sticky top-0 z-999 flex w-full border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95 sm:px-6">
      <div className="flex w-full items-center justify-between gap-4">
        {/* Left Section */}
        <div className="flex flex-1 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <svg
              className="h-5 w-5 fill-current"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              />
            </svg>
          </button>

          {/* Mobile Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 lg:hidden"
          >
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
              <img
                src="/images/logo/nleta-logo.png"
                alt="National Lift Escalator Testing Agency"
                className="h-7 w-7 select-none object-contain"
              />
            </div>

            <span className="text-base font-bold text-gray-800 dark:text-white/90">
              NLETA
            </span>
          </Link>

          {/* Search */}
          <div className="hidden max-w-md flex-1 sm:block">
            <SearchBar onSearch={onSearch} />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <ThemeToggle />

          <NotificationCard />

          <div className="mx-1 hidden h-6 w-px bg-gray-200 dark:bg-gray-800 sm:block" />

          <UserDropdown />
        </div>
      </div>
    </header>
  );
}