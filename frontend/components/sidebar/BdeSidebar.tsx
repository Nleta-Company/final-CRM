"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface BdeSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
}

export default function BdeSidebar({
  sidebarOpen,
  setSidebarOpen,
  collapsed = false,
  setCollapsed,
}: BdeSidebarProps) {
  const pathname = usePathname();

  // ------------------------------------------------------------
  // DROPDOWN STATE
  // ------------------------------------------------------------

  const [openSections, setOpenSections] = useState({
    leads: pathname.startsWith("/bde/leads"),
    activities: pathname.startsWith("/bde/activities"),
  });

  // ------------------------------------------------------------
  // AUTO OPEN ACTIVE SECTION
  // ------------------------------------------------------------

  useEffect(() => {
    setOpenSections((previous) => ({
      ...previous,

      leads: pathname.startsWith("/bde/leads")
        ? true
        : previous.leads,

      activities: pathname.startsWith("/bde/activities")
        ? true
        : previous.activities,
    }));
  }, [pathname]);

  // ------------------------------------------------------------
  // TOGGLE DROPDOWN
  // ------------------------------------------------------------

  const toggleSection = (
    section: "leads" | "activities"
  ) => {
    setOpenSections((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  };

  // ------------------------------------------------------------
  // MOBILE SIDEBAR
  // ------------------------------------------------------------

  const closeMobileSidebar = () => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < 1024
    ) {
      setSidebarOpen(false);
    }
  };

  // ------------------------------------------------------------
  // ACTIVE ROUTE
  // ------------------------------------------------------------

  const isActive = (href: string) => {
    if (href === "/bde/dashboard") {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  // ------------------------------------------------------------
  // COMMON CLASSES
  // ------------------------------------------------------------

  const mainItemClass = (active: boolean) => `
    group flex w-full items-center gap-3 rounded-xl
    px-3 py-2.5 text-sm font-medium transition-all
    ${
      active
        ? "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60"
    }
    ${collapsed ? "justify-center" : ""}
  `;

  const subItemClass = (active: boolean) => `
    ml-8 flex items-center rounded-lg
    px-3 py-2 text-xs font-medium transition-colors
    ${
      active
        ? "bg-brand-500 text-white shadow-theme-xs"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
    }
  `;

  return (
    <>
      {/* =====================================================
          MOBILE BACKDROP
      ====================================================== */}

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-999 bg-gray-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* =====================================================
          SIDEBAR
          DESKTOP = FIXED
          MOBILE = FIXED + SLIDE
      ====================================================== */}

      <aside
        className={`
          fixed top-0 left-0 z-9999
          flex h-screen flex-col
          overflow-hidden
          border-r border-gray-200 bg-white
          transition-all duration-300
          dark:border-gray-800 dark:bg-gray-900

          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }

          ${
            collapsed
              ? "lg:w-20"
              : "w-72 lg:w-72"
          }
        `}
      >
        {/* =====================================================
            BRAND
        ====================================================== */}

        <div
          className={`
            flex h-16 shrink-0 items-center border-b
            border-gray-100 dark:border-gray-800/60

            ${
              collapsed
                ? "justify-center px-3"
                : "justify-between px-6"
            }
          `}
        >
          <Link
            href="/bde/dashboard"
            onClick={closeMobileSidebar}
            className="flex items-center gap-3"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-800">
              <Image
                src="/images/logo/nleta-logo.png"
                alt="NLETA"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
            </div>

            {!collapsed && (
              <div className="flex max-w-[170px] flex-col overflow-hidden">
                <span className="truncate text-sm font-bold leading-tight text-gray-900 dark:text-white">
                  NLETA
                </span>

                <span className="truncate text-[10px] font-semibold leading-tight tracking-tight text-red-600 dark:text-red-400">
                  National Lift Escalator Testing Agency
                </span>
              </div>
            )}
          </Link>

          {/* Desktop collapse */}

          {setCollapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 lg:flex"
              aria-label="Toggle sidebar"
            >
              <svg
                className={`h-4 w-4 transition-transform ${
                  collapsed ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}

          {/* Mobile close */}

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* =====================================================
            NAVIGATION
            ONLY NAVIGATION SCROLLS
        ====================================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 custom-scrollbar">
          {!collapsed && (
            <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Sales Workspace
            </div>
          )}

          <nav className="space-y-1.5">
            {/* =================================================
                DASHBOARD
            ================================================= */}

            <Link
              href="/bde/dashboard"
              onClick={closeMobileSidebar}
              title={collapsed ? "Dashboard" : undefined}
              className={mainItemClass(
                isActive("/bde/dashboard")
              )}
            >
              <svg
                className="h-5 w-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect
                  x="3"
                  y="3"
                  width="7"
                  height="7"
                  rx="1"
                />

                <rect
                  x="14"
                  y="3"
                  width="7"
                  height="7"
                  rx="1"
                />

                <rect
                  x="3"
                  y="14"
                  width="7"
                  height="7"
                  rx="1"
                />

                <rect
                  x="14"
                  y="14"
                  width="7"
                  height="7"
                  rx="1"
                />
              </svg>

              {!collapsed && <span>Dashboard</span>}
            </Link>

            {/* =================================================
                LEADS DROPDOWN
            ================================================= */}

            <div>
              <div className="flex items-center">
                <Link
                  href="/bde/leads"
                  onClick={closeMobileSidebar}
                  title={collapsed ? "My Leads" : undefined}
                  className={`${mainItemClass(
                    isActive("/bde/leads")
                  )} flex-1`}
                >
                  <svg
                    className="h-5 w-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
                    />

                    <circle
                      cx="9"
                      cy="7"
                      r="4"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                    />
                  </svg>

                  {!collapsed && (
                    <span className="flex-1 text-left">
                      My Leads
                    </span>
                  )}
                </Link>

                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleSection("leads")}
                    className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    aria-label={
                      openSections.leads
                        ? "Collapse leads"
                        : "Expand leads"
                    }
                  >
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${
                        openSections.leads
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
                )}
              </div>

              {!collapsed && openSections.leads && (
                <div className="mt-1 space-y-1">
                  <Link
                    href="/bde/leads/create"
                    onClick={closeMobileSidebar}
                    className={subItemClass(
                      pathname === "/bde/leads/create"
                    )}
                  >
                    + Create Lead
                  </Link>
                </div>
              )}
            </div>

            {/* =================================================
                CLIENTS
            ================================================= */}

            <Link
              href="/bde/clients"
              onClick={closeMobileSidebar}
              title={collapsed ? "My Clients" : undefined}
              className={mainItemClass(
                isActive("/bde/clients")
              )}
            >
              <svg
                className="h-5 w-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="2"
                />

                <path
                  strokeLinecap="round"
                  d="M8 9h8M8 13h5"
                />
              </svg>

              {!collapsed && <span>My Clients</span>}
            </Link>

            {/* =================================================
                ACTIVITIES DROPDOWN
            ================================================= */}

            <div>
              <div className="flex items-center">
                <Link
                  href="/bde/activities"
                  onClick={closeMobileSidebar}
                  title={
                    collapsed
                      ? "My Activities"
                      : undefined
                  }
                  className={`${mainItemClass(
                    isActive("/bde/activities")
                  )} flex-1`}
                >
                  <svg
                    className="h-5 w-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 11l3 3L22 4"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                    />
                  </svg>

                  {!collapsed && (
                    <span className="flex-1 text-left">
                      My Activities
                    </span>
                  )}
                </Link>

                {!collapsed && (
                  <button
                    type="button"
                    onClick={() =>
                      toggleSection("activities")
                    }
                    className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    aria-label={
                      openSections.activities
                        ? "Collapse activities"
                        : "Expand activities"
                    }
                  >
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${
                        openSections.activities
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
                )}
              </div>

              {!collapsed &&
                openSections.activities && (
                  <div className="mt-1 space-y-1">
                    <Link
                      href="/bde/activities"
                      onClick={closeMobileSidebar}
                      className={subItemClass(
                        pathname === "/bde/activities"
                      )}
                    >
                      Follow-ups
                    </Link>
                  </div>
                )}
            </div>
          </nav>
        </div>

        {/* =====================================================
            PINNED FOOTER
        ====================================================== */}

        {!collapsed && (
          <div className="shrink-0 border-t border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-3 dark:border-brand-500/20 dark:bg-brand-500/10">
              <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                BDE / Sales Workspace
              </p>

              <p className="mt-1 text-[10px] leading-4 text-brand-600/80 dark:text-brand-400/80">
                Manage your leads, clients and follow-ups.
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}