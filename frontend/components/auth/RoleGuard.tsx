"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
    getDashboardPath,
    normalizeRole,
} from "@/lib/roleRouting";

interface StoredUser {
    role?: string | null;
}

interface RoleGuardProps {
    children: React.ReactNode;
}

function matchesRoute(
    pathname: string,
    route: string
): boolean {
    return (
        pathname === route ||
        pathname.startsWith(`${route}/`)
    );
}

export default function RoleGuard({
    children,
}: RoleGuardProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [checking, setChecking] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const checkAccess = () => {
            try {
                const storedUser =
                    localStorage.getItem("nleta_user");

                const token =
                    localStorage.getItem("token");

                /*
                 * ==================================================
                 * AUTHENTICATION
                 * ==================================================
                 */

                if (!token || !storedUser) {
                    router.replace("/signin");
                    return;
                }

                const user = JSON.parse(
                    storedUser
                ) as StoredUser;

                const role = normalizeRole(user.role);

                /*
                 * ==================================================
                 * INVALID ROLE
                 * ==================================================
                 */

                if (!role) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("nleta_user");

                    router.replace("/signin");
                    return;
                }

                /*
                 * ==================================================
                 * COMMON PROFILE
                 * ==================================================
                 *
                 * If your application has a common /profile page,
                 * all authenticated roles can access it.
                 *
                 * /profile
                 * /profile/*
                 * ==================================================
                 */

                const isProfileRoute =
                    matchesRoute(
                        pathname,
                        "/profile"
                    );

                if (isProfileRoute) {
                    if (isMounted) {
                        setAllowed(true);
                    }

                    return;
                }

                /*
                 * ==================================================
                 * ADMIN DASHBOARD
                 * ==================================================
                 */

                if (pathname === "/dashboard") {
                    if (role === "ADMIN") {
                        if (isMounted) {
                            setAllowed(true);
                        }

                        return;
                    }

                    router.replace(
                        getDashboardPath(role)
                    );

                    return;
                }

                /*
                 * ==================================================
                 * BDE DEDICATED AREA
                 * ==================================================
                 *
                 * BDE/Sales routes:
                 *
                 * /bde/dashboard
                 * /bde/leads
                 * /bde/clients
                 * /bde/activities
                 *
                 * Nested routes are also allowed:
                 *
                 * /bde/leads/create
                 * /bde/leads/[id]
                 * /bde/leads/[id]/edit
                 * etc.
                 * ==================================================
                 */

                const isBdeDashboard =
                    matchesRoute(
                        pathname,
                        "/bde/dashboard"
                    );

                const isBdeLeads =
                    matchesRoute(
                        pathname,
                        "/bde/leads"
                    );

                const isBdeClients =
                    matchesRoute(
                        pathname,
                        "/bde/clients"
                    );

                const isBdeActivities =
                    matchesRoute(
                        pathname,
                        "/bde/activities"
                    );

                const isBdeWorkspaceRoute =
                    isBdeDashboard ||
                    isBdeLeads ||
                    isBdeClients ||
                    isBdeActivities;

                if (isBdeWorkspaceRoute) {
                    if (role === "BDE_SALES") {
                        if (isMounted) {
                            setAllowed(true);
                        }

                        return;
                    }

                    router.replace(
                        getDashboardPath(role)
                    );

                    return;
                }

                /*
                 * ==================================================
                 * BDE PROFILE
                 * ==================================================
                 *
                 * UserDropdown sends BDE users to:
                 *
                 * /bde/profile
                 *
                 * Therefore this route MUST be checked before
                 * Admin BDE Management.
                 *
                 * Otherwise /bde/profile would be treated as an
                 * Admin BDE management route and BDE would be
                 * redirected to /bde/dashboard.
                 *
                 * Nested profile routes are also supported:
                 *
                 * /bde/profile
                 * /bde/profile/edit
                 * etc.
                 * ==================================================
                 */

                const isBdeProfileRoute =
                    matchesRoute(
                        pathname,
                        "/bde/profile"
                    );

                if (isBdeProfileRoute) {
                    if (role === "BDE_SALES") {
                        if (isMounted) {
                            setAllowed(true);
                        }

                        return;
                    }

                    router.replace(
                        getDashboardPath(role)
                    );

                    return;
                }

                /*
                 * ==================================================
                 * ADMIN BDE MANAGEMENT
                 * ==================================================
                 *
                 * Admin pages:
                 *
                 * /bde
                 * /bde/create
                 * /bde/[id]
                 *
                 * These are NOT:
                 *
                 * /bde/dashboard
                 * /bde/leads
                 * /bde/clients
                 * /bde/activities
                 * /bde/profile
                 * ==================================================
                 */

                const isAdminBdeManagement =
                    pathname === "/bde" ||
                    (
                        pathname.startsWith("/bde/") &&
                        !isBdeWorkspaceRoute &&
                        !isBdeProfileRoute
                    );

                if (isAdminBdeManagement) {
                    if (role === "ADMIN") {
                        if (isMounted) {
                            setAllowed(true);
                        }

                        return;
                    }

                    router.replace(
                        getDashboardPath(role)
                    );

                    return;
                }

                /*
                 * ==================================================
                 * OWNER AREA
                 * ==================================================
                 *
                 * /owner/*
                 *
                 * Only OWNER.
                 * ==================================================
                 */

                const isOwnerRoute =
                    matchesRoute(
                        pathname,
                        "/owner"
                    );

                if (isOwnerRoute) {
                    if (role === "OWNER") {
                        if (isMounted) {
                            setAllowed(true);
                        }

                        return;
                    }

                    router.replace(
                        getDashboardPath(role)
                    );

                    return;
                }

                /*
                 * ==================================================
                 * SUB ADMIN AREA
                 * ==================================================
                 *
                 * /sub-admin/*
                 *
                 * Only SUB_ADMIN.
                 * ==================================================
                 */

                const isSubAdminRoute =
                    matchesRoute(
                        pathname,
                        "/sub-admin"
                    );

                if (isSubAdminRoute) {
                    if (role === "SUB_ADMIN") {
                        if (isMounted) {
                            setAllowed(true);
                        }

                        return;
                    }

                    router.replace(
                        getDashboardPath(role)
                    );

                    return;
                }

                /*
                 * ==================================================
                 * ANALYTICS
                 * ==================================================
                 *
                 * Admin only.
                 * ==================================================
                 */

                const isAnalyticsRoute =
                    matchesRoute(
                        pathname,
                        "/analytics"
                    );

                if (isAnalyticsRoute) {
                    if (role === "ADMIN") {
                        if (isMounted) {
                            setAllowed(true);
                        }

                        return;
                    }

                    router.replace(
                        getDashboardPath(role)
                    );

                    return;
                }

                /*
                 * ==================================================
                 * ADMIN CRM ROUTES
                 * ==================================================
                 *
                 * These routes remain Admin-only.
                 *
                 * /leads/*
                 * /clients/*
                 * /activities/*
                 * /employees/*
                 * /technicians/*
                 * /client-assets/*
                 * ==================================================
                 */

                const adminRoutes = [
                    "/leads",
                    "/clients",
                    "/activities",
                    "/employees",
                    "/technicians",
                    "/client-assets",
                ];

                const isAdminCrmRoute =
                    adminRoutes.some((route) =>
                        matchesRoute(
                            pathname,
                            route
                        )
                    );

                if (isAdminCrmRoute) {
                    if (role === "ADMIN") {
                        if (isMounted) {
                            setAllowed(true);
                        }

                        return;
                    }

                    router.replace(
                        getDashboardPath(role)
                    );

                    return;
                }

                /*
                 * ==================================================
                 * ADMIN FALLBACK
                 * ==================================================
                 *
                 * Unknown authenticated CRM routes are allowed
                 * only for Admin.
                 * ==================================================
                 */

                if (role === "ADMIN") {
                    if (isMounted) {
                        setAllowed(true);
                    }

                    return;
                }

                /*
                 * ==================================================
                 * NON-ADMIN UNKNOWN ROUTE
                 * ==================================================
                 */

                router.replace(
                    getDashboardPath(role)
                );

            } catch (error) {
                console.error(
                    "Role guard error:",
                    error
                );

                localStorage.removeItem("token");
                localStorage.removeItem("nleta_user");

                router.replace("/signin");

            } finally {
                if (isMounted) {
                    setChecking(false);
                }
            }
        };

        checkAccess();

        return () => {
            isMounted = false;
        };
    }, [pathname, router]);

    /*
     * ==================================================
     * LOADING
     * ==================================================
     */

    if (checking || !allowed) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />

                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Checking access...
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}