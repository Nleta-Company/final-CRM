"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricCard from "@/components/metrics/MetricCard";
import DynamicTable, { Column } from "@/components/tables/DynamicTable";
import Button from "@/components/ui/Button";
import { assetService } from "@/services/assetService";
import { AssetRecord, AssetStats, AssetOperationalStatus } from "@/types/asset";

export default function ClientAssetsViewPage() {
  const router = useRouter();

  // State
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<AssetRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quickStatusFilter, setQuickStatusFilter] = useState<string>("ALL");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshData = async () => {
    try {
      const [list, currentStats] = await Promise.all([
        assetService.getAllAssets(),
        assetService.getAssetStats(),
      ]);
      setAssets(list);
      setStats(currentStats);
    } catch (err) {
      console.error("Error loading assets:", err);
    }
  };

  useEffect(() => {
    refreshData();
    const unsub = assetService.subscribe(() => refreshData());
    return () => unsub();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return;
    try {
      await assetService.deleteAsset(assetToDelete.id);
      showToast(`Asset unit "${assetToDelete.id}" removed successfully.`);
      setAssetToDelete(null);
      if (selectedAsset?.id === assetToDelete.id) {
        setSelectedAsset(null);
      }
      refreshData();
    } catch (err) {
      console.error("Error deleting asset:", err);
      showToast("Failed to delete asset.");
    }
  };

  const getStatusBadge = (status: AssetOperationalStatus) => {
    switch (status) {
      case "Certified & Operational":
        return {
          bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
          dot: "bg-emerald-500",
        };
      case "Due for Audit":
        return {
          bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
          dot: "bg-amber-500",
        };
      case "Audit In-Progress":
        return {
          bg: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
          dot: "bg-blue-500",
        };
      case "Defect Rectification":
        return {
          bg: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200 dark:border-rose-800/40",
          dot: "bg-rose-500",
        };
      case "Decommissioned":
      default:
        return {
          bg: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
          dot: "bg-gray-400",
        };
    }
  };

  const filterOptions = [
    { label: "Certified & Operational", value: "Certified & Operational", field: "status" as keyof AssetRecord },
    { label: "Due for Audit", value: "Due for Audit", field: "status" as keyof AssetRecord },
    { label: "Audit In-Progress", value: "Audit In-Progress", field: "status" as keyof AssetRecord },
    { label: "Defect Rectification", value: "Defect Rectification", field: "status" as keyof AssetRecord },
    { label: "Decommissioned", value: "Decommissioned", field: "status" as keyof AssetRecord },
  ];

  const displayData = useMemo(() => {
    if (quickStatusFilter === "ALL") return assets;
    return assets.filter((a) => a.status === quickStatusFilter);
  }, [assets, quickStatusFilter]);

  const columns: Column<AssetRecord>[] = [
    {
      key: "id",
      header: "Asset ID",
      sortable: true,
      width: "100px",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
          {row.id}
        </span>
      ),
    },
    {
      key: "assetName",
      header: "Unit & Organization",
      sortable: true,
      render: (row) => (
        <div className="max-w-[240px]">
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {row.assetName}
          </p>
          <span className="text-[11px] text-gray-400 truncate block">
            {row.clientName}
          </span>
        </div>
      ),
    },
    {
      key: "equipmentType",
      header: "Equipment Type",
      sortable: true,
      render: (row) => (
        <div className="max-w-[180px]">
          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
            {row.equipmentType}
          </p>
          <p className="text-[11px] text-gray-400 truncate">{row.manufacturer} ({row.installationYear})</p>
        </div>
      ),
    },
    {
      key: "facilityName",
      header: "Facility & Location",
      sortable: true,
      render: (row) => (
        <div className="text-xs text-gray-600 dark:text-gray-300 max-w-[200px]">
          <p className="font-medium truncate">{row.facilityName}</p>
          <p className="text-[11px] text-gray-400 truncate">{row.locationInFacility}</p>
        </div>
      ),
    },
    {
      key: "safetyComplianceScore",
      header: "Safety Score",
      sortable: true,
      align: "center",
      render: (row) => {
        const score = row.safetyComplianceScore;
        const color =
          score >= 95
            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800"
            : score >= 85
            ? "text-blue-600 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800"
            : score >= 75
            ? "text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800"
            : "text-rose-600 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800";
        return (
          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold border ${color}`}>
            {score}%
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Operational Status",
      sortable: true,
      render: (row) => {
        const badge = getStatusBadge(row.status);
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${badge.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            <span>{row.status}</span>
          </span>
        );
      },
    },
    {
      key: "nextAuditDueDate",
      header: "Next Audit Due",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {row.nextAuditDueDate}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setSelectedAsset(row)}
            title="View Details"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => router.push(`/client-assets/${row.id}/edit`)}
            title="Edit Asset"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-amber-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-amber-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setAssetToDelete(row)}
            title="Delete Asset"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-gray-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-99999 flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-theme-xl dark:bg-white dark:text-gray-900 animate-bounce">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Breadcrumbs */}
      <Breadcrumb
        pageTitle="Client Assets Registry"
        items={[
          { label: "Admin Portal", href: "/dashboard" },
          { label: "Client Assets" },
        ]}
        actions={
          <Link href="/client-assets/create">
            <Button variant="primary" size="md">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Register New Asset
            </Button>
          </Link>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Monitored Assets"
          value={stats?.totalAssets ?? "--"}
          change="+18.5%"
          changeType="increase"
          period="certified portfolio"
          icon={
            <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <MetricCard
          title="Certified & Safe"
          value={stats?.certifiedOperational ?? "--"}
          change="94.2%"
          changeType="increase"
          period="operational compliance"
          icon={
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <MetricCard
          title="Audit Scheduled / Due"
          value={(stats ? stats.dueForAudit + stats.auditInProgress : 0) || "--"}
          change="Upcoming"
          changeType="neutral"
          period="next 30-60 days"
          icon={
            <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Avg Safety Score"
          value={stats ? `${stats.averageSafetyScore}%` : "--"}
          change="+1.8%"
          changeType="increase"
          period="NLETA quality index"
          icon={
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        {[
          { key: "ALL", label: "All Assets", count: assets.length },
          { key: "Certified & Operational", label: "Certified & Operational", count: stats?.statusBreakdown["Certified & Operational"] || 0 },
          { key: "Due for Audit", label: "Due for Audit", count: stats?.statusBreakdown["Due for Audit"] || 0 },
          { key: "Audit In-Progress", label: "Audit In-Progress", count: stats?.statusBreakdown["Audit In-Progress"] || 0 },
          { key: "Defect Rectification", label: "Defects / Rectification", count: stats?.statusBreakdown["Defect Rectification"] || 0 },
          { key: "Decommissioned", label: "Decommissioned", count: stats?.statusBreakdown["Decommissioned"] || 0 },
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
                  : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-900/60 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Table */}
      <DynamicTable<AssetRecord>
        title="Elevator & Escalator Registry"
        description="Comprehensive technical database of client equipment inspected and certified by NLETA"
        columns={columns}
        data={displayData}
        searchPlaceholder="Search by asset name, facility, client, manufacturer..."
        filterable={true}
        filterOptions={filterOptions}
        initialPageSize={10}
        onRowClick={(row) => setSelectedAsset(row)}
        onAddRecord={() => router.push("/client-assets/create")}
      />

      {/* View Detail Modal */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div>
                <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                  {selectedAsset.id}
                </span>
                <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {selectedAsset.assetName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Client: {selectedAsset.clientName} ({selectedAsset.clientId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {/* Technical Specifications Grid */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Technical Specifications
                </h4>
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40 text-xs">
                  <div>
                    <span className="text-gray-400">Equipment Type</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedAsset.equipmentType}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Manufacturer</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedAsset.manufacturer} ({selectedAsset.installationYear})
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Rated Capacity</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedAsset.capacity}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Rated Speed</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedAsset.speed}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location & Facility */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Installation Facility & Shaft
                </h4>
                <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Facility / Complex:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {selectedAsset.facilityName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Internal Shaft / Core:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {selectedAsset.locationInFacility}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit & Compliance */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Safety Audit & Compliance
                </h4>
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40 text-xs">
                  <div>
                    <span className="text-gray-400">Current Status</span>
                    <div className="mt-1">
                      {(() => {
                        const badge = getStatusBadge(selectedAsset.status);
                        return (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold border ${badge.bg}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                            <span>{selectedAsset.status}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Compliance Score</span>
                    <p className="font-bold text-brand-600 dark:text-brand-400 mt-0.5 text-base">
                      {selectedAsset.safetyComplianceScore}%
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Last Audit Date</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedAsset.lastAuditDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Next Audit Due</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedAsset.nextAuditDueDate}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Assigned Certified Inspector</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedAsset.assignedInspector}
                    </p>
                  </div>
                </div>
              </div>

              {selectedAsset.notes && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Inspector & Engineering Notes
                  </h4>
                  <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                    {selectedAsset.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedAsset(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(`/client-assets/${selectedAsset.id}/edit`)}
              >
                Edit Asset Record
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {assetToDelete && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setAssetToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Delete Equipment Record?
            </h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Are you sure you want to delete asset <span className="font-semibold text-gray-800 dark:text-gray-200">{assetToDelete.assetName} ({assetToDelete.id})</span>? This record will be permanently removed from NLETA safety logs.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setAssetToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
                Confirm Deletion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
