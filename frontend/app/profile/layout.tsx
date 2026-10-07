"use client";

import React, { useState } from "react";

import Sidebar from "@/components/sidebar/Sidebar";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import RoleGuard from "@/components/auth/RoleGuard";

export default function ProfileLayout({
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
      <div className="min-h-screen bg-gray-50 font-outfit dark:bg-black lg:flex dark:bg-black">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        <div className="min-h-screen min-w-0 flex-1">
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isCollapsed={sidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
          />

          <main className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
            {children}
          </main>

          <Footer />
        </div>
      </div>
    </RoleGuard>
  );
}