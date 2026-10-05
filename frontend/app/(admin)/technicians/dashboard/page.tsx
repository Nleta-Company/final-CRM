"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricCard from "@/components/metrics/MetricCard";
import BarChart from "@/components/charts/BarChart";
import DynamicTable, { Column } from "@/components/tables/DynamicTable";
import Button from "@/components/ui/Button";
import { technicianService } from "@/services/technicianService";
import { assetService } from "@/services/assetService";
import { TechnicianItem, TechnicianStats, TechnicianStatus } from "@/types/technician";
import { AssetRecord } from "@/types/asset";

export default function InspectorDashboardPage() {
  const [inspectors, setInspectors] = useState<TechnicianItem[]>([]);
  const [stats, setStats] = useState<TechnicianStats | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inspectorList, inspectorStats, assetList] = await Promise.all([
        technicianService.getAllTechnicians(),
        technicianService.getTechnicianStats(),
        assetService.getAllAssets(),
      ]);
      setInspectors(inspectorList);
      setStats(inspectorStats);
      setAssets(assetList);
    } catch (err) {
      console.error("Error loading Inspection Inspector Dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubTech = technicianService.subscribe(loadData);
    const unsubAssets = assetService.subscribe(loadData);
    return () => {
      unsubTech();
      unsubAssets();
    };
  }, []);

  const filteredInspectors = useMemo(() => {
    if (statusFilter === "ALL") return inspectors;
    return inspectors.filter((t) => t.status === statusFilter);
  }, [inspectors, statusFilter]);

  const monthlyAuditChartData = useMemo(() => {
    return [
      { month: "Jan", sales: 45 },
      { month: "Feb", sales: 52 },
      { month: "Mar", sales: 68 },
      { month: "Apr", sales: 60 },
      { month: "May", sales: 74 },
      { month: "Jun", sales: 82 },
      { month: "Jul", sales: 78 },
      { month: "Aug", sales: 90 },
      { month: "Sep", sales: 96 },
    ];
  }, []);

  const getStatusBadge = (status: TechnicianStatus) => {
    switch (status) {
      case "Available on Field":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-800/40";
      case "On-Site Inspection":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-800/40";
      case "In Transit":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-800/40";
      case "On Leave":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-800/40";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    }
  };

  const columns: Column<TechnicianItem>[] = [
    {
      key: "badgeNumber",
      header: "Badge & ID",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 block">
            {row.badgeNumber}
          </span>
          <span className="text-[10px] text-gray-400 truncate max-w-[120px] block">{row.skillSpecialization}</span>
        </div>
      ),
    },
    {
      key: "fullName",
      header: "Inspection Inspector Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-bold text-xs text-white">
            {row.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <span className="block font-semibold text-gray-900 dark:text-white">
              {row.fullName}
            </span>
            <span className="text-[11px] text-gray-400">{row.certificationLevel}</span>
          </div>
        </div>
      ),
    },
    {
      key: "operatingZone",
      header: "Zone & Jurisdiction",
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
          📍 {row.operatingZone}
        </span>
      ),
    },
    {
      key: "status",
      header: "Field Status",
      sortable: true,
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusBadge(row.status)}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "completedAuditsCount",
      header: "Safety Audits Done",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white text-xs">
          {row.completedAuditsCount} Units
        </span>
      ),
    },
    {
      key: "safetyRating",
      header: "Quality Score",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          ⭐ {row.safetyRating?.toFixed(1) || "5.0"} / 5.0
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      align: "center",
      render: (row) => (
        <Link
          href={`/technicians/${row.id}`}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400"
        >
          View Inspector &rarr;
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header & Breadcrumbs */}
      <Breadcrumb
        pageTitle="Inspection Inspector & Safety Operations Dashboard"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inspection Inspectors", href: "/technicians" },
          { label: "Inspector Dashboard" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/technicians">
              <Button variant="outline" size="md">
                Inspectors Roster
              </Button>
            </Link>
            <Link href="/technicians/create">
              <Button variant="primary" size="md">
                + Add Inspection Inspector
              </Button>
            </Link>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        <MetricCard
          title="Certified Inspection Inspectors"
          value={stats ? stats.totalTechnicians.toString() : inspectors.length.toString()}
          change="BIS Accredited"
          changeType="increase"
          period="field testing engineers"
          icon={
            <svg className="w-6 h-6 fill-current text-brand-600 dark:text-brand-400" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a4 4 0 100 8 4 4 0 000-8zM3 16a7 7 0 1114 0H3z" />
            </svg>
          }
        />
        <MetricCard
          title="Available for Dispatch"
          value={stats ? stats.availableOnField.toString() : "--"}
          change="Immediate Deployment"
          changeType="increase"
          period="ready on standby"
          icon={
            <svg className="w-6 h-6 fill-current text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          }
        />
        <MetricCard
          title="On-Site Active Audits"
          value={stats ? stats.onSiteInspection.toString() : "--"}
          change="Active Testing"
          changeType="neutral"
          period="shaft & mechanical inspection"
          icon={
            <svg className="w-6 h-6 fill-current text-blue-600 dark:text-blue-400" viewBox="0 0 24 24">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <MetricCard
          title="Average Quality Rating"
          value={stats ? `${stats.averageRating.toFixed(1)} / 5.0` : "4.9 / 5.0"}
          change="98.6% Pass Rate"
          changeType="increase"
          period="audit verification score"
          icon={
            <svg className="w-6 h-6 fill-current text-amber-500" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
        />
      </div>

      {/* Desktop 50% / 50% Split Charts & Field Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Completed Safety Audits Bar Chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <BarChart
            title="Monthly Safety Inspections Conducted"
            subtitle="Completed certified lift & escalator audits (2026)"
            data={monthlyAuditChartData}
          />
        </div>

        {/* Territory & Operational Readiness Overview */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Zone & Field Readiness Status
              </h3>
              <span className="rounded-full bg-blue-light-50 px-2.5 py-0.5 text-xs font-bold text-blue-light-600 border border-blue-light-200 dark:bg-blue-light-500/15 dark:text-blue-light-400">
                100% Territory Coverage
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/40">
                <div>
                  <span className="block font-semibold text-xs text-gray-900 dark:text-white">
                    North Zone (Delhi/NCR)
                  </span>
                  <span className="text-[11px] text-gray-400">Lead Inspector: Rajesh Sharma &bull; 4 active sites</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Normal</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/40">
                <div>
                  <span className="block font-semibold text-xs text-gray-900 dark:text-white">
                    West Zone (Mumbai/Pune)
                  </span>
                  <span className="text-[11px] text-gray-400">Lead Inspector: Amit Patel &bull; 6 active sites</span>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">High Activity</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/40">
                <div>
                  <span className="block font-semibold text-xs text-gray-900 dark:text-white">
                    South Zone (Bengaluru)
                  </span>
                  <span className="text-[11px] text-gray-400">Lead Inspector: Vikram Malhotra &bull; 3 active sites</span>
                </div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Standby Ready</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <span>Next Dispatch Window: <strong>Today, 14:30 IST</strong></span>
            <Link href="/technicians" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Manage Roster &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Tabs by Status */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        {[
          { key: "ALL", label: "All Inspection Inspectors", count: inspectors.length },
          { key: "Available on Field", label: "Available on Field", count: stats?.statusBreakdown["Available on Field"] || 0 },
          { key: "On-Site Inspection", label: "On-Site Inspection", count: stats?.statusBreakdown["On-Site Inspection"] || 0 },
          { key: "In Transit", label: "In Transit", count: stats?.statusBreakdown["In Transit"] || 0 },
          { key: "On Leave", label: "On Leave", count: stats?.statusBreakdown["On Leave"] || 0 },
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-brand-500 text-white shadow-theme-xs"
                  : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800"
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

      {/* Inspection Inspectors Dynamic Table */}
      <DynamicTable<TechnicianItem>
        title="Field Inspection Inspectors Directory"
        description="Monitor certified safety engineers, zone allocations, active site testing, and licensing credentials"
        columns={columns}
        data={filteredInspectors}
        searchPlaceholder="Search by inspector name, badge ID, zone, specialization..."
        initialPageSize={10}
        pageSizeOptions={[5, 10, 20]}
      />
    </div>
  );
}
