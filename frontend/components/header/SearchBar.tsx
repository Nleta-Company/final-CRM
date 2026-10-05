"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search or type command...",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isMac, setIsMac] = useState(false);

  const inputRef =
    useRef<HTMLInputElement>(null);

  /*
   * Detect operating system
   */
  useEffect(() => {
    const platform =
      navigator.platform ||
      navigator.userAgent;

    setIsMac(
      /Mac|iPhone|iPad|iPod/i.test(platform)
    );
  }, []);

  /*
   * Global keyboard shortcut
   *
   * Mac     -> Cmd + K
   * Windows -> Ctrl + K
   * Linux   -> Ctrl + K
   */
  useEffect(() => {
    const handleKeyDown = (
      e: KeyboardEvent
    ) => {
      const modifier =
        isMac ? e.metaKey : e.ctrlKey;

      if (
        modifier &&
        e.key.toLowerCase() === "k"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isMac]);

  /*
   * Search change
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    setQuery(value);
    onSearch?.(value);
  };

  /*
   * Clear search
   */
  const handleClear = () => {
    setQuery("");
    onSearch?.("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Search Icon */}
      <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-gray-400 dark:text-gray-500">
        <svg
          className="h-5 w-5 fill-current"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
          />
        </svg>
      </span>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search"
        className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 ps-11 pe-20 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
      />

      {/* Right Controls */}
      <div className="absolute inset-y-0 end-0 flex items-center gap-1 pe-2.5">
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {/* Keyboard Shortcut */}
        <kbd className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500 shadow-theme-xs dark:border-gray-800 dark:bg-white/5 dark:text-gray-400">
          <span>
            {isMac ? "⌘" : "Ctrl"}
          </span>
          <span>K</span>
        </kbd>
      </div>
    </div>
  );
}