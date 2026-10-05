"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

interface UserDropdownProps {
  userName?: string;
  userRole?: string;
  userEmail?: string;
  avatarUrl?: string;
}

interface StoredUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  mobile?: string;
  role?: string | { name?: string };
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

function getRoleName(
  role?: string | { name?: string }
): string {
  if (!role) {
    return "";
  }

  if (typeof role === "string") {
    return role;
  }

  return role.name || "";
}

function formatRole(role: string): string {
  switch (role) {
    case "BDE/Sales":
      return "BDE / Sales";

    case "Admin":
      return "Administrator";

    case "Client":
      return "Client";

    case "SUB_ADMIN":
    case "Sub Admin":
      return "Sub Administrator";

    default:
      return role || "User";
  }
}

export default function UserDropdown({
  userName,
  userRole,
  userEmail,
}: UserDropdownProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [currentUser, setCurrentUser] =
    useState<StoredUser | null>(null);

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  /*
   * --------------------------------------------------
   * LOAD LOGGED-IN USER
   * --------------------------------------------------
   */

  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser =
          localStorage.getItem("nleta_user");

        if (!storedUser) {
          setCurrentUser(null);
          return;
        }

        const parsedUser =
          JSON.parse(storedUser);

        setCurrentUser(parsedUser);
      } catch (error) {
        console.error(
          "Failed to load current user:",
          error
        );

        setCurrentUser(null);
      }
    };

    loadUser();

    /*
     * Allows header to refresh if login/session
     * information changes.
     */
    window.addEventListener(
      "nleta_user_updated",
      loadUser
    );

    window.addEventListener(
      "storage",
      loadUser
    );

    return () => {
      window.removeEventListener(
        "nleta_user_updated",
        loadUser
      );

      window.removeEventListener(
        "storage",
        loadUser
      );
    };
  }, []);

  /*
   * --------------------------------------------------
   * DERIVED USER INFORMATION
   * --------------------------------------------------
   */

  const firstName =
    currentUser?.firstName || "";

  const lastName =
    currentUser?.lastName || "";

  const actualName =
    currentUser?.fullName ||
    `${firstName} ${lastName}`.trim() ||
    userName ||
    "User";

  const actualRole =
    getRoleName(currentUser?.role) ||
    userRole ||
    "User";

  const actualEmail =
    currentUser?.email ||
    userEmail ||
    "";

  const displayRole =
    formatRole(actualRole);

  const initials =
    actualName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => name.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  /*
   * --------------------------------------------------
   * CLOSE DROPDOWN ON OUTSIDE CLICK
   * --------------------------------------------------
   */

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

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /*
   * --------------------------------------------------
   * LOGOUT
   * --------------------------------------------------
   */

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setIsOpen(false);

    try {
      const token =
        localStorage.getItem("token");

      await fetch(
        `${API_BASE_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...(token
              ? {
                Authorization: `Bearer ${token}`,
              }
              : {}),
          },
        }
      );
    } catch (error) {
      console.error(
        "CRM logout error:",
        error
      );
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("authToken");
      localStorage.removeItem("nleta_user");
      localStorage.removeItem(
        "nleta_remember_me"
      );

      router.replace("/signin");
      router.refresh();

      setIsLoggingOut(false);
    }
  };

  return (
    <div
      className="relative"
      ref={dropdownRef}
    >
      {/* User Button */}
      <button
        type="button"
        onClick={() =>
          setIsOpen(!isOpen)
        }
        className="flex items-center gap-3 text-start focus:outline-hidden"
      >
        {/* Avatar */}
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white shadow-theme-xs">
            {initials}
          </div>

          <span className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full bg-success-500 ring-2 ring-white dark:ring-gray-900" />
        </div>

        {/* User Info */}
        <div className="hidden text-start lg:block">
          <span className="block text-sm font-semibold text-gray-800 dark:text-white/90">
            {actualName}
          </span>

          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {displayRole}
          </span>
        </div>

        {/* Arrow */}
        <svg
          className={`hidden h-4 w-4 text-gray-400 transition-transform lg:block ${isOpen
              ? "rotate-180"
              : ""
            }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute end-0 z-9999 mt-3 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          {/* User Details */}
          <div className="border-b border-gray-100 p-2.5 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {actualName}
            </p>

            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {actualEmail || "No email available"}
            </p>

            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              {displayRole}
            </p>
          </div>

          <div className="py-1">
            {/* Profile */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/bde/profile");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <svg
                className="h-4 w-4 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>

              View Profile
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={() =>
                setIsOpen(false)
              }
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <svg
                className="h-4 w-4 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 1.561 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942.734 2.106 2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>

              Account Settings
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 pt-1 dark:border-gray-800">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-error-600 hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-error-400 dark:hover:bg-error-500/10"
            >
              <svg
                className="h-4 w-4 fill-current"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                  clipRule="evenodd"
                />
              </svg>

              {isLoggingOut
                ? "Signing Out..."
                : "Sign Out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}