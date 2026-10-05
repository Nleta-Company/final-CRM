"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/header/ThemeToggle";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
}: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-outfit">
      {/* Background Image with Layered Gradient Overlays */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: "url('/images/grid-image/image-01.png')",
        }}
      >
        {/* Dark / Light adaptive overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-950/90 via-gray-900/80 to-brand-950/70 dark:from-black/95 dark:via-gray-950/90 dark:to-brand-950/85 backdrop-blur-[2px]" />
        
        {/* Subtle decorative glow spots */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-light-500/15 blur-3xl pointer-events-none" />
      </div>

      {/* Top Bar with Theme Toggle */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-4 flex items-center justify-end">
        <ThemeToggle />
      </header>

      {/* Center Container: App Logo & Form in Center */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* App Logo at Top Center */}
          <div className="mb-6 flex flex-col items-center justify-center text-center">
            <Link
              href="/dashboard"
              className="group flex flex-col items-center focus:outline-none"
            >
              {/* Logo Emblem */}
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/95 p-2.5 shadow-xl ring-4 ring-white/20 backdrop-blur-md transition-transform duration-300 group-hover:scale-105 dark:bg-gray-900/90 dark:ring-white/10">
                <Image
                  src="/images/logo/nleta-logo.png"
                  alt="National Lift Escalator Testing Agency"
                  width={64}
                  height={64}
                  className="h-full w-full object-contain select-none"
                  priority
                />
              </div>

              {/* Agency Title & Subtitle */}
              <div className="mt-3 text-center">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                  NLETA CRM
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm font-medium text-gray-300">
                  National Lift Escalator Testing Agency
                </p>
              </div>
            </Link>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8 dark:border-gray-800 dark:bg-gray-900/95">
            <div className="mb-6 text-center">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {title}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            </div>

            {/* Form Component Body */}
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center">
        <p className="text-xs text-white/60 drop-shadow-sm">
          &copy; {new Date().getFullYear()} National Lift Escalator Testing Agency (NLETA). All rights reserved.
        </p>
      </footer>
    </div>
  );
}
