"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: {
    text: string;
    variant: "pro" | "new" | "count";
  };
  children?: {
    id: string;
    label: string;
    href?: string;
    badge?: string;
  }[];
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  activeItem?: string;
  onSelectItem?: (id: string) => void;
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  collapsed: externalCollapsed,
  setCollapsed: externalSetCollapsed,
  activeItem = "dashboard",
  onSelectItem,
}: SidebarProps) {
  const pathname = usePathname();

  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const collapsed =
    externalCollapsed !== undefined
      ? externalCollapsed
      : internalCollapsed;

  const setCollapsed =
    externalSetCollapsed || setInternalCollapsed;

  // Determine which module submenu should be open
  const getActiveModuleKey = (path: string): string | null => {
    if (path.startsWith("/leads")) return "leads";
    if (path.startsWith("/clients")) return "clients";
    if (path.startsWith("/client-assets")) return "client-assets";
    if (path.startsWith("/bde")) return "bde";

    return null;
  };

  const [openSubmenus, setOpenSubmenus] = useState<
    Record<string, boolean>
  >(() => {
    const activeKey = getActiveModuleKey(pathname);

    return activeKey ? { [activeKey]: true } : {};
  });

  // Automatically sync open submenu with current route
  useEffect(() => {
    const activeKey = getActiveModuleKey(pathname);

    if (activeKey) {
      setOpenSubmenus({ [activeKey]: true });
    } else {
      setOpenSubmenus({});
    }
  }, [pathname]);

  const toggleSubmenu = (id: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleItemClick = (id: string, href?: string) => {
    if (onSelectItem) onSelectItem(id);

    if (href) {
      if (href.startsWith("#")) {
        const el = document.getElementById(
          href.replace("#", "")
        );

        if (el) {
          el.scrollIntoView({
            behavior: "smooth",
          });
        }
      } else if (
        href.includes("#") &&
        typeof window !== "undefined" &&
        window.location.pathname.includes("dashboard")
      ) {
        const hash = href.split("#")[1];
        const el = document.getElementById(hash);

        if (el) {
          el.scrollIntoView({
            behavior: "smooth",
          });
        }
      }
    }

    // On small screens, close mobile drawer after selection
    if (
      typeof window !== "undefined" &&
      window.innerWidth < 1024
    ) {
      setSidebarOpen(false);
    }
  };

  const navigationGroups: {
    title: string;
    items: NavItem[];
  }[] = [
    {
      title: "CORE CRM",

      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          href: "/dashboard",
          icon: (
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path d="M3.33334 3.33334H8.33334V8.33334H3.33334V3.33334ZM3.33334 11.6667H8.33334V16.6667H3.33334V11.6667ZM11.6667 3.33334H16.6667V8.33334H11.6667V3.33334ZM11.6667 11.6667H16.6667V16.6667H11.6667V11.6667Z" />
            </svg>
          ),
        },

        {
          id: "leads",
          label: "Leads",
          href: "/leads",
          badge: {
            text: "Pipeline",
            variant: "new",
          },
          icon: (
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path d="M10 2a4 4 0 100 8 4 4 0 000-8zM3 16a7 7 0 1114 0H3z" />
            </svg>
          ),
          children: [
            {
              id: "leads-view",
              label: "View All Leads",
              href: "/leads",
            },
            {
              id: "leads-create",
              label: "Register New Lead",
              href: "/leads/create",
            },
          ],
        },

        {
          id: "clients",
          label: "Clients",
          href: "/clients",
          badge: {
            text: "Accounts",
            variant: "count",
          },
          icon: (
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm1 4a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1V6zm0 4a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1zm0 4a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1zm6-8a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1h-2a1 1 0 01-1-1V6zm0 4a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1h-2a1 1 0 01-1-1v-1zm0 4a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1h-2a1 1 0 01-1-1v-1z" />
            </svg>
          ),
          children: [
            {
              id: "clients-view",
              label: "View All Clients",
              href: "/clients",
            },
            {
              id: "clients-create",
              label: "Register New Client",
              href: "/clients/create",
            },
          ],
        },

        {
          id: "client-assets",
          label: "Client Assets",
          href: "/client-assets",
          badge: {
            text: "Units",
            variant: "pro",
          },
          icon: (
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2v8h4V6H5zm6 0v8h4V6h-4zm-3-4a1 1 0 100 2 1 1 0 000-2zm4 0a1 1 0 100 2 1 1 0 000-2z"
                clipRule="evenodd"
              />
            </svg>
          ),
          children: [
            {
              id: "assets-view",
              label: "View All Assets",
              href: "/client-assets",
            },
          ],
        },

        {
          id: "bde",
          label: "BDE/Sales Team",
          href: "/bde",
          badge: {
            text: "Sales",
            variant: "pro",
          },
          icon: (
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                fillRule="evenodd"
                d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
              <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
            </svg>
          ),
          children: [
           
            {
              id: "bde-view",
              label: "Sales Reps Directory",
              href: "/bde",
            },
            {
              id: "bde-create",
              label: "Add BDE/Sales",
              href: "/bde/create",
            },
          ],
        },

        // ======================================================
        // INCENTIVES
        // ======================================================

        {
          id: "incentives",
          label: "Incentives",
          href: "/incentives",
          badge: {
            text: "PSGA",
            variant: "pro",
          },
          icon: (
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                fillRule="evenodd"
                d="M10 1.667a8.333 8.333 0 100 16.666 8.333 8.333 0 000-16.666zM10 5a.833.833 0 01.833.833v.834h.834a.833.833 0 110 1.666h-.834V10h.834a.833.833 0 110 1.667h-.834v.833a.833.833 0 11-1.666 0v-.833H8.333a.833.833 0 110-1.667h.834v-1.666H8.333a.833.833 0 110-1.667h.834v-.834A.833.833 0 0110 5z"
                clipRule="evenodd"
              />
            </svg>
          ),
        },

        {
          id: "analytics",
          label: "Business Analysis",
          href: "/analytics",
          badge: {
            text: "BI",
            variant: "pro",
          },
          icon: (
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.25A8.004 8.004 0 0117.75 8H12V2.25z" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-999 bg-gray-900/50 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Main Aside Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-9999 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 lg:static ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-20" : "w-72"}`}
      >
        {/* Sidebar Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center gap-3">
            {/* App Logo */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-theme-xs bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <img
                src="/images/logo/nleta-logo.png"
                alt="National Lift Escalator Testing Agency"
                className="h-9 w-9 object-contain select-none"
              />
            </div>

            {!collapsed && (
              <div className="flex flex-col overflow-hidden max-w-[170px]">
                <span
                  className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate"
                  title="National Lift Escalator Testing Agency"
                >
                  NLETA
                </span>

                <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold tracking-tight truncate leading-tight">
                  National Lift Escalator Agency
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Button */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Collapse sidebar"
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
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

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg
              className="w-5 h-5"
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

        {/* Scrollable Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 custom-scrollbar">
          {navigationGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {!collapsed && (
                <h3 className="mb-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {group.title}
                </h3>
              )}

              <ul className="space-y-1">
                {group.items.map((item) => {
                  const hasChildren =
                    item.children &&
                    item.children.length > 0;

                  const isSubOpen =
                    openSubmenus[item.id] || false;

                  const isPathMatch = item.href
                    ? pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href))
                    : false;

                  const isDirectActive =
                    activeItem === item.id ||
                    isPathMatch;

                  const isChildActive =
                    item.children?.some(
                      (c) =>
                        c.href
                          ? pathname === c.href ||
                            (c.href !== "/" &&
                              pathname.startsWith(
                                c.href + "/"
                              ))
                          : c.id === activeItem
                    );

                  const isItemActive =
                    isDirectActive ||
                    isChildActive;

                  if (hasChildren) {
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() =>
                            toggleSubmenu(item.id)
                          }
                          className={`w-full group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                            isItemActive
                              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-semibold"
                              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60"
                          } ${
                            collapsed
                              ? "justify-center"
                              : ""
                          }`}
                          title={
                            collapsed
                              ? item.label
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`shrink-0 transition-colors ${
                                isItemActive
                                  ? "text-brand-500 dark:text-brand-400"
                                  : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                              }`}
                            >
                              {item.icon}
                            </span>

                            {!collapsed && (
                              <span>
                                {item.label}
                              </span>
                            )}
                          </div>

                          {!collapsed && (
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                isSubOpen
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
                          )}
                        </button>

                        {/* Collapsible Children Accordion */}
                        {!collapsed && isSubOpen && (
                          <ul className="mt-1 space-y-1 pl-9 pr-1">
                            {item.children?.map(
                              (child) => {
                                const isSubItemActive =
                                  child.href
                                    ? pathname ===
                                      child.href
                                    : activeItem ===
                                      child.id;

                                return (
                                  <li
                                    key={child.id}
                                  >
                                    {child.href &&
                                    child.href.startsWith(
                                      "/"
                                    ) ? (
                                      <Link
                                        href={
                                          child.href
                                        }
                                        onClick={() => {
                                          if (
                                            typeof window !==
                                              "undefined" &&
                                            window.innerWidth <
                                              1024
                                          ) {
                                            setSidebarOpen(
                                              false
                                            );
                                          }
                                        }}
                                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                          isSubItemActive
                                            ? "bg-brand-500 text-white font-semibold shadow-theme-xs"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                                        }`}
                                      >
                                        <span>
                                          {
                                            child.label
                                          }
                                        </span>

                                        {child.badge && (
                                          <span
                                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                              isSubItemActive
                                                ? "bg-white/20 text-white"
                                                : "bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                                            }`}
                                          >
                                            {
                                              child.badge
                                            }
                                          </span>
                                        )}
                                      </Link>
                                    ) : (
                                      <a
                                        href={
                                          child.href ||
                                          `#${child.id}`
                                        }
                                        onClick={(e) => {
                                          e.preventDefault();

                                          handleItemClick(
                                            child.id,
                                            child.href
                                          );
                                        }}
                                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                          isSubItemActive
                                            ? "bg-brand-500 text-white font-semibold shadow-theme-xs"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                                        }`}
                                      >
                                        <span>
                                          {
                                            child.label
                                          }
                                        </span>

                                        {child.badge && (
                                          <span
                                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                              isSubItemActive
                                                ? "bg-white/20 text-white"
                                                : "bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                                            }`}
                                          >
                                            {
                                              child.badge
                                            }
                                          </span>
                                        )}
                                      </a>
                                    )}
                                  </li>
                                );
                              }
                            )}
                          </ul>
                        )}
                      </li>
                    );
                  }

                  if (
                    item.href &&
                    item.href.startsWith("/") &&
                    !item.href.includes("#")
                  ) {
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() => {
                            if (
                              typeof window !==
                                "undefined" &&
                              window.innerWidth <
                                1024
                            ) {
                              setSidebarOpen(false);
                            }
                          }}
                          className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                            isDirectActive
                              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-semibold"
                              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60"
                          } ${
                            collapsed
                              ? "justify-center"
                              : ""
                          }`}
                          title={
                            collapsed
                              ? item.label
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`shrink-0 transition-colors ${
                                isDirectActive
                                  ? "text-brand-500 dark:text-brand-400"
                                  : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                              }`}
                            >
                              {item.icon}
                            </span>

                            {!collapsed && (
                              <span>
                                {item.label}
                              </span>
                            )}
                          </div>

                          {!collapsed &&
                            item.badge && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  item.badge.variant ===
                                  "pro"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                    : item.badge.variant ===
                                      "new"
                                    ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                              >
                                {
                                  item.badge.text
                                }
                              </span>
                            )}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <a
                        href={
                          item.href ||
                          `#${item.id}`
                        }
                        onClick={(e) => {
                          const href =
                            item.href ||
                            `#${item.id}`;

                          if (
                            href.startsWith("#") ||
                            (href.includes("#") &&
                              typeof window !==
                                "undefined" &&
                              window.location.pathname.includes(
                                "dashboard"
                              ))
                          ) {
                            e.preventDefault();
                          }

                          handleItemClick(
                            item.id,
                            href
                          );
                        }}
                        className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                          isDirectActive
                            ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-semibold"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60"
                        } ${
                          collapsed
                            ? "justify-center"
                            : ""
                        }`}
                        title={
                          collapsed
                            ? item.label
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`shrink-0 transition-colors ${
                              isDirectActive
                                ? "text-brand-500 dark:text-brand-400"
                                : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                            }`}
                          >
                            {item.icon}
                          </span>

                          {!collapsed && (
                            <span>
                              {item.label}
                            </span>
                          )}
                        </div>

                        {!collapsed &&
                          item.badge && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                item.badge.variant ===
                                "pro"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                  : item.badge.variant ===
                                    "new"
                                  ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              }`}
                            >
                              {item.badge.text}
                            </span>
                          )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Widget */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800/60">
            <div className="rounded-xl bg-gradient-to-br from-brand-50 to-blue-50 p-4 border border-brand-100 dark:from-brand-950/40 dark:to-gray-900 dark:border-brand-900/50">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-2 w-2 rounded-full bg-success-500 animate-pulse" />

                <span className="text-xs font-semibold text-gray-800 dark:text-white">
                  CRM Pro Workspace
                </span>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Connected to v2.4 live sync
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}