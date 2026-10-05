"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

interface Notification {
  id: string;
  avatarText: string;
  avatarColor: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
}

export default function NotificationCard() {
  const [isOpen, setIsOpen] =
    useState(false);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  const unreadCount =
    notifications.filter(
      (notification) =>
        notification.unread
    ).length;

  useEffect(() => {
    const handleClickOutside = (
      e: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          e.target as Node
        )
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        unread: false,
      }))
    );
  };

  return (
    <div
      className="relative"
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={() =>
          setIsOpen(!isOpen)
        }
        aria-label="View notifications"
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        {unreadCount > 0 && (
          <span className="absolute end-0.5 top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />

            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
          </span>
        )}

        <svg
          className="h-5 w-5 fill-current"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.292a.75.75 0 00-1.5 0v.544C6.083 3.207 3.625 5.9 3.625 9.167v5.292h-.292a.75.75 0 000 1.5h13.334a.75.75 0 000-1.5h-.292V9.167c0-3.267-2.458-5.96-5.625-6.331V2.292zm4.125 12.167V9.167c0-2.692-2.183-4.875-4.875-4.875s-4.875 2.183-4.875 4.875v5.292h9.75zM8 17.708a.75.75 0 00.75.75h2.5a.75.75 0 000-1.5h-2.5a.75.75 0 00-.75.75z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute end-0 z-9999 mt-3 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <h5 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Notifications
              </h5>

              {unreadCount > 0 && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="custom-scrollbar max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a6 6 0 00-6 6v2.586l-.707.707A1 1 0 004 13h12a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6zm-3 13a3 3 0 006 0H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  No new notifications
                </p>

                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  You&apos;re all caught up.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map(
                  (item) => (
                    <div
                      key={item.id}
                      className={`flex gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/5 ${
                        item.unread
                          ? "bg-brand-50/20 dark:bg-brand-500/5"
                          : ""
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${item.avatarColor}`}
                      >
                        {item.avatarText}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                            {item.title}
                          </p>

                          <span className="shrink-0 text-[11px] text-gray-400">
                            {item.time}
                          </span>
                        </div>

                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 border-t border-gray-100 pt-3 text-center dark:border-gray-800">
            <button
              type="button"
              onClick={() =>
                setIsOpen(false)
              }
              className="text-xs font-semibold text-gray-600 hover:text-brand-500 dark:text-gray-400 dark:hover:text-white"
            >
              View All Notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}