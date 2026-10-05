"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-gray-200 bg-white px-4 py-4 sm:px-6 dark:border-gray-800 dark:bg-gray-900 transition-colors">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row text-xs text-gray-500 dark:text-gray-400">
        {/* Left: Copyright */}
        <div className="flex items-center gap-2">
          <img
            src="/images/logo/nleta-logo.png"
            alt="NLETA"
            className="h-4 w-4 object-contain"
          />
          <span>&copy; {currentYear} National Lift Escalator Testing Agency (NLETA). All rights reserved.</span>
        </div>

        {/* Middle: System Health status */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-success-700 dark:bg-success-500/10 dark:text-success-400 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-ping" />
          <span>All systems operational</span>
        </div>

        {/* Right: Policy & Support Links */}
        <div className="flex items-center gap-4">
          <a
            href="#privacy"
            className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
          >
            Privacy Policy
          </a>
          <span>&bull;</span>
          <a
            href="#terms"
            className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
          >
            Terms of Service
          </a>
          <span>&bull;</span>
          <a
            href="#docs"
            className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
          >
            Documentation
          </a>
          <span>&bull;</span>
          <a
            href="#support"
            className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
          >
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
