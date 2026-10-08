"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricCard from "@/components/metrics/MetricCard";
import DynamicTable, { Column } from "@/components/tables/DynamicTable";
import Button from "@/components/ui/Button";

import { bdeService } from "@/services/bdeService";
import { BdeItem, BdeStats, BdeStatus } from "@/types/bde";

export default function BdeViewPage() {
  const router = useRouter();

  const [bdes, setBdes] = useState<BdeItem[]>([]);
  const [stats, setStats] = useState<BdeStats | null>(null);
  const [bdeToDelete, setBdeToDelete] = useState<BdeItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quickStatusFilter, setQuickStatusFilter] = useState("ALL");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshData = async () => {
    try {
      const [list, currentStats] = await Promise.all([
        bdeService.getAllBdes(),
        bdeService.getBdeStats(),
      ]);
      setBdes(Array.isArray(list) ? list : []);
      setStats(currentStats);
    } catch (err) {
      console.error("Error loading sales team:", err);
      showToast("Failed to load sales team data.");
    }
  };

  useEffect(() => {
    void refreshData();
    const unsubscribe = bdeService.subscribe(() => void refreshData());
    return unsubscribe;
  }, []);

  const handleDeleteConfirm = async () => {
    if (!bdeToDelete) return;
    try {
      await bdeService.deleteBde(bdeToDelete.id);
      showToast(`Sales Rep "${bdeToDelete.fullName}" removed successfully.`);
      setBdeToDelete(null);
      await refreshData();
    } catch (err) {
      console.error("Error deleting sales rep:", err);
      showToast("Failed to delete sales rep record.");
    }
  };

  const getStatusBadge = (status: BdeStatus) => {
    switch (status) {
      case "Active":
        return {
          bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
          dot: "bg-emerald-500",
        };
      case "On Leave":
        return {
          bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
          dot: "bg-amber-500",
        };
      case "Probation":
        return {
          bg: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
          dot: "bg-purple-500",
        };
      default:
        return {
          bg: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
          dot: "bg-gray-400",
        };
    }
  };

  const displayData = useMemo(
    () =>
      quickStatusFilter === "ALL"
        ? bdes
        : bdes.filter((b) => b.status === quickStatusFilter),
    [bdes, quickStatusFilter]
  );

  const columns: Column<BdeItem>[] = [
    {
      key: "id",
      header: "Rep ID",
      sortable: true,
      width: "110px",
      render: (row) => (
        <div>
          <span className="block font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
            {row.id}
          </span>
          <span className="font-mono text-[10px] text-gray-400">
            {row.employeeCode}
          </span>
        </div>
      ),
    },
    {
      key: "fullName",
      header: "Sales Rep Name & Role",
      sortable: true,
      render: (row) => (
        <div className="max-w-[220px]">
          <p className="truncate font-semibold text-gray-900 dark:text-white">
            {row.fullName}
          </p>
          <span className="block truncate text-[11px] text-gray-400">
            {row.designation}
          </span>
        </div>
      ),
    },
    {
      key: "region",
      header: "Sales Territory",
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
          <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          {row.region}
        </span>
      ),
    },
    {
      key: "conversionRate",
      header: "Win Rate",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="inline-flex items-center rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
          {row.conversionRate}%
        </span>
      ),
    },
    {
      key: "activeLeadsCount",
      header: "Active Leads & Won Deals",
      sortable: true,
      align: "center",
      render: (row) => (
        <div className="text-xs">
          <span className="font-bold text-gray-800 dark:text-white">
            {row.activeLeadsCount} Leads
          </span>
          <span className="block text-[10px] text-gray-400">
            {row.closedDealsCount} Won
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => {
        const badge = getStatusBadge(row.status);
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            <span>{row.status}</span>
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/bde/${row.id}`}
            title="View Sales Rep Profile & Pipeline"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={() => router.push(`/bde/${row.id}/edit`)}
            title="Edit Sales Rep"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-amber-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-amber-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setBdeToDelete(row)}
            title="Delete Sales Rep"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-gray-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-99999 flex animate-bounce items-center gap-3 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-theme-xl dark:bg-white dark:text-gray-900">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      <Breadcrumb
        pageTitle="Sales Team & Account Executives"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Sales Team" },
        ]}
        actions={
          <Link href="/bde/create">
            <Button variant="primary" size="md">
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Sales Rep
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Sales Reps"
          value={stats?.totalExecutives ?? "--"}
          period="current sales force"
          icon={
            <svg className="h-6 w-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <MetricCard
          title="Active in Field"
          value={stats?.activeExecutives ?? "--"}
          period="currently active"
          icon={
            <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <MetricCard
          title="Total Closed Sales"
          value={stats?.formattedTotalRevenue ?? "--"}
          period="current quarter revenue"
          icon={
            <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <MetricCard
          title="Average Win Rate"
          value={stats ? `${stats.averageConversionRate}%` : "--"}
          period="current win rate"
          icon={
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        {[
          { key: "ALL", label: "All Sales Reps", count: bdes.length },
          { key: "Active", label: "Active", count: stats?.statusBreakdown["Active"] || 0 },
          { key: "On Leave", label: "On Leave", count: stats?.statusBreakdown["On Leave"] || 0 },
          { key: "Probation", label: "Probation", count: stats?.statusBreakdown["Probation"] || 0 },
          { key: "Inactive", label: "Inactive", count: stats?.statusBreakdown["Inactive"] || 0 },
        ].map((tab) => {
          const isActive = quickStatusFilter === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setQuickStatusFilter(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-brand-500 text-white shadow-theme-xs"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <DynamicTable<BdeItem>
        title="Sales Team & Performance Directory"
        description="Track sales reps, assigned territories, quarterly targets, closed deals, and win rates"
        columns={columns}
        data={displayData}
        searchPlaceholder="Search by rep name, employee ID, territory..."
        initialPageSize={10}
        pageSizeOptions={[5, 10, 20]}
        filterOptions={[
          { label: "Active", value: "Active", field: "status" },
          { label: "On Leave", value: "On Leave", field: "status" },
          { label: "Probation", value: "Probation", field: "status" },
          { label: "Inactive", value: "Inactive", field: "status" },
        ]}
      />

      {bdeToDelete && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Remove Sales Rep
              </h3>
            </div>

            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to remove{" "}
              <strong>{bdeToDelete.fullName}</strong> ({bdeToDelete.id}) from the sales team?
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" size="md" onClick={() => setBdeToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="md" onClick={handleDeleteConfirm}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
