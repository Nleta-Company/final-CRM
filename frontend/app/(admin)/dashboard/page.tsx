"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricGroup, {
  MetricGroupItem,
} from "@/components/metrics/MetricGroup";
import AreaChart from "@/components/charts/AreaChart";
import RadialProgressChart from "@/components/charts/RadialProgressChart";
import BarChart from "@/components/charts/BarChart";
import LeadsTable from "@/components/tables/LeadsTable";
import Button from "@/components/ui/Button";

import { leadService } from "@/services/leadService";
import { assetService } from "@/services/assetService";
import { bdeService } from "@/services/bdeService";
import { technicianService } from "@/services/technicianService";

import { LeadStats } from "@/types/lead";
import { AssetStats } from "@/types/asset";
import { BdeStats } from "@/types/bde";
import { TechnicianStats } from "@/types/technician";

export default function AdminDashboardPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "monthly" | "quarterly" | "yearly"
  >("monthly");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [assetStats, setAssetStats] = useState<AssetStats | null>(null);
  const [bdeStats, setBdeStats] = useState<BdeStats | null>(null);
  const [techStats, setTechStats] = useState<TechnicianStats | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadLiveStats = async () => {
    try {
      const [leads, assets, bdes, techs] = await Promise.all([
        leadService.getLeadStats(),
        assetService.getAssetStats(),
        bdeService.getBdeStats(),
        technicianService.getTechnicianStats(),
      ]);

      setLeadStats(leads);
      setAssetStats(assets);
      setBdeStats(bdes);
      setTechStats(techs);
    } catch (err) {
      console.error("Error loading dashboard live statistics:", err);
    }
  };

  useEffect(() => {
    loadLiveStats();

    const unsubLeads = leadService.subscribe(loadLiveStats);
    const unsubAssets = assetService.subscribe(loadLiveStats);
    const unsubBdes = bdeService.subscribe(loadLiveStats);
    const unsubTechs = technicianService.subscribe(loadLiveStats);

    return () => {
      unsubLeads();
      unsubAssets();
      unsubBdes();
      unsubTechs();
    };
  }, []);

  // Dashboard Summary Cards
  const dynamicMetrics: MetricGroupItem[] = [
    {
      id: "leads",
      title: "Total Leads",
      value: leadStats ? leadStats.total.toLocaleString() : "—",
      change:
        leadStats?.won !== undefined ? `${leadStats.won} won` : "—",
      changeType: "increase",
      period: "Current Pipeline",
      icon: (
        <svg
          className="w-6 h-6 fill-current text-brand-600 dark:text-brand-400"
          viewBox="0 0 24 24"
        >
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      ),
    },

    {
      id: "inspections",
      title: "Active Inspections",
      value: assetStats
        ? assetStats.totalAssets.toLocaleString()
        : "—",
      change:
        assetStats?.certifiedOperational !== undefined
          ? `${assetStats.certifiedOperational} certified`
          : "—",
      changeType: "increase",
      period: "Active Assets",
      icon: (
        <svg
          className="w-6 h-6 fill-current text-blue-600 dark:text-blue-400"
          viewBox="0 0 24 24"
        >
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
        </svg>
      ),
    },

    {
      id: "revenue",
      title: "Total Deal Value",
      value: bdeStats?.formattedTotalRevenue ?? "—",
      change: bdeStats?.formattedTotalTarget
        ? `Target ${bdeStats.formattedTotalTarget}`
        : "—",
      changeType: "increase",
      period: "Current Quarter",
      icon: (
        <svg
          className="w-6 h-6 fill-current text-emerald-600 dark:text-emerald-400"
          viewBox="0 0 24 24"
        >
          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
        </svg>
      ),
    },

    {
      id: "compliance",
      title: "Safety Score",
      value:
        assetStats?.averageSafetyScore !== undefined
          ? `${assetStats.averageSafetyScore}%`
          : "—",
      change:
        techStats?.availableOnField !== undefined
          ? `${techStats.availableOnField} inspectors active`
          : "—",
      changeType: "increase",
      period: "Current Safety Rating",
      icon: (
        <svg
          className="w-6 h-6 fill-current text-purple-600 dark:text-purple-400"
          viewBox="0 0 24 24"
        >
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-99999 flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-theme-xl dark:bg-white dark:text-gray-900 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <Breadcrumb
        pageTitle="Admin Dashboard"
        items={[
          { label: "Admin", href: "/dashboard" },
          { label: "Overview" },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                const el = document.getElementById("leads");

                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }

                showToast("Viewing Leads & Inspections");
              }}
              leftIcon={
                <svg
                  className="w-4 h-4 fill-none stroke-current"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              }
            >
              Manage Leads
            </Button>
          </div>
        }
      />

      {/* Quick Access */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/bde/dashboard"
          className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs transition-all hover:border-brand-500 hover:shadow-theme-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20">
                <path d="M10 2a4 4 0 100 8 4 4 0 000-8zM3 16a7 7 0 1114 0H3z" />
              </svg>
            </div>

            <div>
              <span className="block font-bold text-sm text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors">
                Sales Dashboard
              </span>

              <span className="text-xs text-gray-500 dark:text-gray-400">
                View sales, deals and targets &rarr;
              </span>
            </div>
          </div>
        </Link>

        <Link
          href="/employees/dashboard"
          className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs transition-all hover:border-blue-light-500 hover:shadow-theme-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </div>

            <div>
              <span className="block font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-light-600 transition-colors">
                Employee Dashboard
              </span>

              <span className="text-xs text-gray-500 dark:text-gray-400">
                View staff and departments &rarr;
              </span>
            </div>
          </div>
        </Link>

        <Link
          href="/technicians/dashboard"
          className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs transition-all hover:border-purple-500 hover:shadow-theme-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 group-hover:scale-105 transition-transform">
              <svg
                className="w-6 h-6 fill-current"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561-2.6 0-2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <div>
              <span className="block font-bold text-sm text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                Inspector Dashboard
              </span>

              <span className="text-xs text-gray-500 dark:text-gray-400">
                View inspections and field work &rarr;
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Section 1: Business Overview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Business Overview
            </h2>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Quick view of leads, assets, revenue and safety performance
            </p>
          </div>

          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900 text-xs">
            <button
              onClick={() => setSelectedTimeframe("monthly")}
              className={`rounded px-2.5 py-1 font-medium transition ${
                selectedTimeframe === "monthly"
                  ? "bg-brand-500 text-white shadow-theme-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Monthly
            </button>

            <button
              onClick={() => setSelectedTimeframe("quarterly")}
              className={`rounded px-2.5 py-1 font-medium transition ${
                selectedTimeframe === "quarterly"
                  ? "bg-brand-500 text-white shadow-theme-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Quarterly
            </button>

            <button
              onClick={() => setSelectedTimeframe("yearly")}
              className={`rounded px-2.5 py-1 font-medium transition ${
                selectedTimeframe === "yearly"
                  ? "bg-brand-500 text-white shadow-theme-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        <MetricGroup metrics={dynamicMetrics} />
      </section>

      {/* Section 2: Reports */}
      <section id="analytics" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Business & Safety Reports
            </h2>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Track inspections, revenue and safety progress
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="w-full">
            <AreaChart
              title="Inspections & Revenue"
              subtitle="Monthly inspections and revenue progress"
            />
          </div>

          <div className="w-full">
            <RadialProgressChart
              title="Inspection Target Progress"
              subtitle="Target compared with completed inspections"
              percentage={
                assetStats?.totalAssets &&
                assetStats.certifiedOperational !== undefined
                  ? Math.min(
                      100,
                      Math.round(
                        (assetStats.certifiedOperational /
                          assetStats.totalAssets) *
                          100
                      )
                    )
                  : 0
              }
              targetAmount={
                assetStats?.totalAssets !== undefined
                  ? `${assetStats.totalAssets} Audits`
                  : "—"
              }
              currentAmount={
                assetStats?.certifiedOperational !== undefined
                  ? `${assetStats.certifiedOperational} Completed`
                  : "—"
              }
            />
          </div>

          <div className="w-full">
            <BarChart
              title="Monthly Inspection Summary"
              subtitle="Inspection volume across different equipment types"
              data={[]}
            />
          </div>

          <div className="w-full">
            <AreaChart
              title="Quarterly Inspection Progress"
              subtitle="Inspection completion by quarter"
            />
          </div>
        </div>
      </section>

      {/* Section 3: Leads & Inspections */}
      <section id="leads" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Leads & Inspections
            </h2>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              View leads and manage inspection activities
            </p>
          </div>
        </div>

        <LeadsTable />
      </section>
    </div>
  );
}