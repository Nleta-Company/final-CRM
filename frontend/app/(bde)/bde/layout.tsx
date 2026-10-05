"use client";

import React, { useState } from "react";

import BdeSidebar from "@/components/sidebar/BdeSidebar";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import RoleGuard from "@/components/auth/RoleGuard";

export default function BdeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const handleToggleSidebar = () => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < 1024
    ) {
      setSidebarOpen((prev) => !prev);
      return;
    }

    setSidebarCollapsed((prev) => !prev);
  };

  return (
    <RoleGuard>
      <div className="min-h-screen bg-gray-50 font-outfit dark:bg-black">
        {/* =====================================================
            BDE SIDEBAR
            Fixed independently from page content
        ====================================================== */}

        <BdeSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        {/* =====================================================
            MAIN AREA
            Reserve space for fixed sidebar on desktop
        ====================================================== */}

        <div
          className={`
            min-h-screen
            transition-[margin] duration-300 ease-in-out
            ${
              sidebarCollapsed
                ? "lg:ml-20"
                : "lg:ml-72"
            }
          `}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isCollapsed={sidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
          />

          {/* =================================================
              PAGE CONTENT
              No internal overflow-y-auto
              Browser/page scroll handles scrolling
          ================================================= */}

          <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
            {children}
          </main>

          {/* =================================================
              FOOTER
          ================================================= */}

          <Footer />
        </div>
      </div>
    </RoleGuard>
  );
}