"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "@/components/sidebar/Sidebar";
import BdeSidebar from "@/components/sidebar/BdeSidebar";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import RoleGuard from "@/components/auth/RoleGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  /*
   * Read the authenticated user's role.
   * Login already stores the user object in nleta_user.
   */
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("nleta_user");

      if (!storedUser) {
        setUserRole(null);
        return;
      }

      const user = JSON.parse(storedUser);

      setUserRole(
        typeof user?.role === "string"
          ? user.role.trim().toUpperCase()
          : null
      );
    } catch (error) {
      console.error("Unable to read authenticated user role:", error);
      setUserRole(null);
    }
  }, [pathname]);

  const isBde =
    userRole === "BDE/SALES" ||
    userRole === "BDE_SALES" ||
    userRole === "BDE" ||
    userRole === "SALES";

  const handleToggleSidebar = () => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < 1024
    ) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <RoleGuard>
      <div className="flex min-h-screen bg-gray-50 font-outfit dark:bg-black">
        {/* --------------------------------------------- */}
        {/* ROLE-BASED SIDEBAR                            */}
        {/* --------------------------------------------- */}

        {isBde ? (
          <BdeSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
          />
        ) : (
          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
          />
        )}

        {/* --------------------------------------------- */}
        {/* MAIN CONTENT                                  */}
        {/* --------------------------------------------- */}

        <div className="flex flex-1 flex-col overflow-y-auto">
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isCollapsed={sidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
          />

          <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
            {children}
          </main>

          <Footer />
        </div>
      </div>
    </RoleGuard>
  );
}