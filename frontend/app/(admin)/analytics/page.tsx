"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricCard from "@/components/metrics/MetricCard";
import Button from "@/components/ui/Button";
import { leadService } from "@/services/leadService";
import { clientService } from "@/services/clientService";
import { assetService } from "@/services/assetService";
import { bdeService, formatINR } from "@/services/bdeService";
import { technicianService } from "@/services/technicianService";
import { LeadStats } from "@/types/lead";
import { ClientStats } from "@/types/client";
import { AssetStats } from "@/types/asset";
import { BdeStats, BdeItem } from "@/types/bde";
import { TechnicianStats, TechnicianItem } from "@/types/technician";

export default function BusinessAnalysisPage() {
  // Timeframe Filter
  const [timeframe, setTimeframe] = useState<"month" | "quarter" | "year">("quarter");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Loaded Stats
  const [loading, setLoading] = useState(true);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [assetStats, setAssetStats] = useState<AssetStats | null>(null);
  const [bdeStats, setBdeStats] = useState<BdeStats | null>(null);
  const [techStats, setTechStats] = useState<TechnicianStats | null>(null);
  const [bdesList, setBdesList] = useState<BdeItem[]>([]);
  const [techsList, setTechsList] = useState<TechnicianItem[]>([]);

  // Hover states for interactive charts
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);
  const [hoveredSectorIdx, setHoveredSectorIdx] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    async function loadAllBusinessData() {
      try {
        setLoading(true);
        const [leads, clients, assets, bdes, techs, bdeRecords, techRecords] =
          await Promise.all([
            leadService.getLeadStats(),
            clientService.getClientStats(),
            assetService.getAssetStats(),
            bdeService.getBdeStats(),
            technicianService.getTechnicianStats(),
            bdeService.getAllBdes(),
            technicianService.getAllTechnicians(),
          ]);
        setLeadStats(leads);
        setClientStats(clients);
        setAssetStats(assets);
        setBdeStats(bdes);
        setTechStats(techs);
        setBdesList(bdeRecords);
        setTechsList(techRecords);
      } catch (err) {
        console.error("Failed to load business analytics data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAllBusinessData();
  }, []);

  // Multi-Month Trends Data (Mock historical aggregated data adjusted by timeframe)
  const monthlyTrends = useMemo(() => {
    return [
      { month: "Jan", revenue: 42, audits: 85, deals: 11 },
      { month: "Feb", revenue: 58, audits: 110, deals: 16 },
      { month: "Mar", revenue: 74, audits: 145, deals: 21 },
      { month: "Apr", revenue: 65, audits: 125, deals: 18 },
      { month: "May", revenue: 82, audits: 160, deals: 24 },
      { month: "Jun", revenue: 95, audits: 195, deals: 28 },
      { month: "Jul", revenue: 88, audits: 175, deals: 25 },
      { month: "Aug", revenue: 105, audits: 220, deals: 31 },
      { month: "Sep", revenue: 118, audits: 245, deals: 36 },
      { month: "Oct", revenue: 110, audits: 230, deals: 33 },
      { month: "Nov", revenue: 125, audits: 260, deals: 39 },
      { month: "Dec", revenue: 142, audits: 295, deals: 44 },
    ];
  }, []);

  // Sector Distribution
  const sectorsData = useMemo(() => {
    return [
      { sector: "Commercial Real Estate", share: 38, value: "₹ 1.85 Cr", units: 142, color: "#465fff" },
      { sector: "Government & Transit Metro", share: 26, value: "₹ 1.28 Cr", units: 98, color: "#10b981" },
      { sector: "Hospitality & Luxury Hotels", share: 16, value: "₹ 78.5 L", units: 54, color: "#f59e0b" },
      { sector: "Healthcare & Hospitals", share: 12, value: "₹ 59.2 L", units: 42, color: "#8b5cf6" },
      { sector: "Industrial & Logistics", share: 8, value: "₹ 39.4 L", units: 32, color: "#ec4899" },
    ];
  }, []);

  // Regional Performance Comparison
  const regionalPerformance = useMemo(() => {
    return [
      { region: "Delhi NCR Hub", target: "₹ 75 L", closed: "₹ 68.5 L", rate: 91, audits: 142, compliance: 98.2, status: "Leading" },
      { region: "Mumbai Metro", target: "₹ 60 L", closed: "₹ 54.2 L", rate: 90, audits: 118, compliance: 97.5, status: "High Growth" },
      { region: "Bengaluru Tech Corridor", target: "₹ 55 L", closed: "₹ 49.8 L", rate: 90, audits: 96, compliance: 96.8, status: "Stable" },
      { region: "Pune & West Zone", target: "₹ 45 L", closed: "₹ 38.0 L", rate: 84, audits: 78, compliance: 95.9, status: "On Track" },
      { region: "Chennai & Coastal Hub", target: "₹ 50 L", closed: "₹ 41.0 L", rate: 82, audits: 84, compliance: 96.2, status: "Expanding" },
      { region: "Kolkata & East Zone", target: "₹ 35 L", closed: "₹ 24.5 L", rate: 70, audits: 52, compliance: 94.8, status: "Nurturing" },
    ];
  }, []);

  // Compute Total Annualized Value
  const totalCommercialTurnover = useMemo(() => {
    const clientVal = clientStats?.totalContractValue || 45000000;
    const bdeAchieved = bdeStats?.totalAchieved || 27600000;
    return clientVal + bdeAchieved;
  }, [clientStats, bdeStats]);

  const maxRevenue = Math.max(...monthlyTrends.map((m) => m.revenue)) * 1.15;
  const maxAudits = Math.max(...monthlyTrends.map((m) => m.audits)) * 1.15;

  const chartWidth = 720;
  const chartHeight = 220;
  const padX = 35;
  const padY = 25;
  const stepX = (chartWidth - padX * 2) / (monthlyTrends.length - 1);

  // SVG Line paths builder
  const getCoordinates = (val: number, max: number, idx: number) => {
    const x = padX + idx * stepX;
    const y = chartHeight - padY - (val / max) * (chartHeight - padY * 2);
    return { x, y };
  };

  const revenuePoints = monthlyTrends.map((m, idx) => getCoordinates(m.revenue, maxRevenue, idx));
  const auditPoints = monthlyTrends.map((m, idx) => getCoordinates(m.audits, maxAudits, idx));

  const buildSmoothPath = (points: { x: number; y: number }[]) => {
    return points.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = points[idx - 1];
      const cp1X = prev.x + (curr.x - prev.x) / 2;
      const cp1Y = prev.y;
      const cp2X = prev.x + (curr.x - prev.x) / 2;
      const cp2Y = curr.y;
      return `${acc} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${curr.x} ${curr.y}`;
    }, "");
  };

  const revenueLine = buildSmoothPath(revenuePoints);
  const revenueArea = `${revenueLine} L ${revenuePoints[revenuePoints.length - 1].x} ${
    chartHeight - padY
  } L ${revenuePoints[0].x} ${chartHeight - padY} Z`;

  const auditLine = buildSmoothPath(auditPoints);

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-99999 flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-theme-xl dark:bg-white dark:text-gray-900 animate-bounce">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Breadcrumbs */}
      <Breadcrumb
        pageTitle="Overall Business Analysis & Executive Intelligence"
        items={[
          { label: "Admin Portal", href: "/dashboard" },
          { label: "Business Analytics" },
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Timeframe Pill Selector */}
            <div className="flex items-center rounded-xl bg-gray-100 p-1 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setTimeframe("month")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  timeframe === "month"
                    ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-900 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setTimeframe("quarter")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  timeframe === "quarter"
                    ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-900 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                Quarterly
              </button>
              <button
                type="button"
                onClick={() => setTimeframe("year")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  timeframe === "year"
                    ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-900 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                Fiscal YTD
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => showToast("Exporting Comprehensive Business Intelligence Dossier (PDF/Excel)...")}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              Export Report
            </Button>
          </div>
        }
      />

      {/* Primary Business Metrics Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Consolidated Portfolio Turnover"
          value={formatINR(totalCommercialTurnover)}
          change="+24.8%"
          changeType="increase"
          period="combined contracts & deals"
          icon={
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Monitored Equipment Fleet"
          value={assetStats ? `${assetStats.totalAssets} Units` : "360+ Units"}
          change="94.2% Operational"
          changeType="increase"
          period="elevators & escalators"
          icon={
            <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <MetricCard
          title="Overall Audit Safety Index"
          value={assetStats ? `${assetStats.averageSafetyScore}%` : "96.4%"}
          change="+1.5%"
          changeType="increase"
          period="BIS / NLETA compliance standard"
          icon={
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <MetricCard
          title="Sales Pipeline Win Rate"
          value={bdeStats ? `${bdeStats.averageConversionRate}%` : "76.5%"}
          change="+5.2%"
          changeType="increase"
          period="deal closure velocity"
          icon={
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </section>

      {/* Row 2: Comprehensive Visual Analytics (50% / 50% Half Grid for Desktops) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: 12-Month Invoiced Revenue & Audit Volume Trajectory */}
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-brand-500 animate-pulse" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  Revenue Growth & Audit Throughput
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Monthly revenue recognition (₹ Lakhs) vs. Safety audits executed
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-6 rounded-full bg-brand-500" />
                <span className="text-gray-700 dark:text-gray-300">Revenue (₹ Lakhs)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-6 rounded-full bg-emerald-500" />
                <span className="text-gray-700 dark:text-gray-300">Audits Completed</span>
              </div>
            </div>
          </div>

          {/* SVG Interactive Multi-Area Chart */}
          <div className="relative overflow-x-auto">
            {/* Tooltip on hover */}
            {hoveredMonthIdx !== null && (
              <div
                className="absolute top-2 z-20 pointer-events-none -translate-x-1/2 rounded-xl bg-gray-900/95 px-3.5 py-2 text-xs text-white shadow-theme-xl backdrop-blur-sm dark:bg-gray-800/95 border border-gray-700"
                style={{
                  left: `${((hoveredMonthIdx + 0.5) / monthlyTrends.length) * 100}%`,
                }}
              >
                <div className="font-bold text-brand-300 mb-1">
                  {monthlyTrends[hoveredMonthIdx].month} Trajectory
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Revenue:</span>
                  <span className="font-semibold text-emerald-400">
                    ₹ {monthlyTrends[hoveredMonthIdx].revenue} Lakhs
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Audits:</span>
                  <span className="font-semibold text-brand-300">
                    {monthlyTrends[hoveredMonthIdx].audits} units
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Deals Won:</span>
                  <span className="font-semibold text-white">
                    {monthlyTrends[hoveredMonthIdx].deals} contracts
                  </span>
                </div>
              </div>
            )}

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              <defs>
                <linearGradient id="analysisRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#465fff" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#465fff" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                const y = padY + p * (chartHeight - padY * 2);
                return (
                  <line
                    key={i}
                    x1={padX}
                    y1={y}
                    x2={chartWidth - padX}
                    y2={y}
                    stroke="currentColor"
                    className="text-gray-100 dark:text-gray-800"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Revenue Area Fill */}
              <path d={revenueArea} fill="url(#analysisRevenueGrad)" />

              {/* Revenue Line */}
              <path
                d={revenueLine}
                fill="none"
                stroke="#465fff"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Audits Line */}
              <path
                d={auditLine}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="6 3"
              />

              {/* Interactive Points */}
              {revenuePoints.map((pt, idx) => (
                <g
                  key={idx}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredMonthIdx(idx)}
                  onMouseLeave={() => setHoveredMonthIdx(null)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredMonthIdx === idx ? "6" : "4"}
                    className="fill-brand-500 stroke-white dark:stroke-gray-900 transition-all duration-150"
                    strokeWidth="2"
                  />
                  <circle
                    cx={auditPoints[idx].x}
                    cy={auditPoints[idx].y}
                    r={hoveredMonthIdx === idx ? "5" : "3"}
                    className="fill-emerald-500 stroke-white dark:stroke-gray-900 transition-all duration-150"
                    strokeWidth="2"
                  />
                  {/* Invisible hit column */}
                  <rect
                    x={pt.x - stepX / 2}
                    y={0}
                    width={stepX}
                    height={chartHeight}
                    fill="transparent"
                  />
                </g>
              ))}

              {/* Month Labels */}
              {monthlyTrends.map((m, idx) => (
                <text
                  key={idx}
                  x={padX + idx * stepX}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors ${
                    hoveredMonthIdx === idx
                      ? "fill-brand-600 font-bold"
                      : "fill-gray-400 dark:fill-gray-500"
                  }`}
                >
                  {m.month}
                </text>
              ))}
            </svg>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Average Monthly Growth: <strong className="text-emerald-600 dark:text-emerald-400">+18.4% MoM</strong></span>
            <span>Peak Month: <strong>December (₹ 1.42 Cr)</strong></span>
          </div>
        </div>

        {/* Right: Operational Equipment Health & Compliance Gauge (50% on Desktop) */}
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Equipment Compliance Status
              </h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                Live Audit Logs
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Physical certification & defect breakdown
            </p>
          </div>

          {/* Radial Semi-Circle Display */}
          <div className="relative flex flex-col items-center justify-center my-6">
            <svg width="220" height="125" viewBox="0 0 220 125" className="overflow-visible">
              {/* Background Arc */}
              <path
                d="M 20 115 A 90 90 0 0 1 200 115"
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
                className="text-gray-100 dark:text-gray-800"
              />
              {/* Progress Arc: 94.2% */}
              <path
                d="M 20 115 A 90 90 0 0 1 200 115"
                fill="none"
                stroke="url(#complianceGrad)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={Math.PI * 90}
                strokeDashoffset={Math.PI * 90 * (1 - 0.942)}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="complianceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>

            {/* Inner Percentage */}
            <div className="absolute bottom-1 flex flex-col items-center">
              <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                94.2%
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Safe & Certified
              </span>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Certified & In Service</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">
                {assetStats?.certifiedOperational ?? 328} units
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Due for Renewal Audit</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">
                {assetStats?.dueForAudit ?? 24} units
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Defect Rectification</span>
              </div>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {assetStats?.statusBreakdown["Defect Rectification"] ?? 8} units
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Industry Sectors & Revenue Contribution Bar Breakdown (50% / 50% Half Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Distribution (50% on Desktop) */}
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Portfolio Share by Industry Sector
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Contract revenue volume and asset distribution across key verticals
              </p>
            </div>
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
              5 High-Impact Verticals
            </span>
          </div>

          <div className="space-y-4">
            {sectorsData.map((sec, idx) => (
              <div
                key={sec.sector}
                onMouseEnter={() => setHoveredSectorIdx(idx)}
                onMouseLeave={() => setHoveredSectorIdx(null)}
                className={`p-3 rounded-xl transition-all border ${
                  hoveredSectorIdx === idx
                    ? "bg-brand-50/50 border-brand-200 dark:bg-brand-500/10 dark:border-brand-800"
                    : "bg-transparent border-transparent"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-md"
                      style={{ backgroundColor: sec.color }}
                    />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {sec.sector}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-gray-500 dark:text-gray-400">
                      {sec.units} units
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {sec.value}
                    </span>
                    <span className="font-bold text-brand-600 dark:text-brand-400 min-w-[32px] text-right">
                      {sec.share}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${sec.share}%`,
                      backgroundColor: sec.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workforce & Field Engineering Efficiency (50% on Desktop) */}
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Workforce Deployment & Readiness
              </h3>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                Operations Live
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Sales quota realization & certified inspector availability
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  BDE Sales Force
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {bdeStats?.activeExecutives ?? 5} / {bdeStats?.totalExecutives ?? 6}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                {bdeStats ? `${bdeStats.averageConversionRate}% avg conversion` : "83% active"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Field Inspectors
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {techStats?.availableOnField ?? 4} Ready
              </p>
              <p className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold mt-1">
                ★ {techStats ? `${techStats.averageRating} Rating` : "4.92 Rating"}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-brand-50 to-blue-50 p-4 dark:from-brand-950/40 dark:to-gray-900/60 border border-brand-100 dark:border-brand-900/40 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <strong className="text-gray-900 dark:text-white">
                Emergency 24/7 Rapid Response Network
              </strong>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              4 certified senior field engineers are on active standby across Delhi NCR, Mumbai, Bengaluru, and Chennai corridors for unexpected breakdown audits.
            </p>
          </div>
        </div>
      </div>

      {/* Row 4: Regional Territory Performance Matrix Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Territorial Market Performance Matrix
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Target realization, inspection density, and client safety compliance across regional operating zones
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              6 Active Metro Hubs
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 dark:border-gray-800 uppercase tracking-wider text-[11px]">
                <th className="pb-3 font-semibold">Operating Zone / Territory</th>
                <th className="pb-3 font-semibold text-right">Quarterly Quota</th>
                <th className="pb-3 font-semibold text-right">Closed Turnover</th>
                <th className="pb-3 font-semibold text-center">Realization</th>
                <th className="pb-3 font-semibold text-center">Audited Fleet</th>
                <th className="pb-3 font-semibold text-center">Compliance</th>
                <th className="pb-3 font-semibold text-right">Territory Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {regionalPerformance.map((row) => (
                <tr
                  key={row.region}
                  className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="py-3.5 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span>{row.region}</span>
                  </td>
                  <td className="py-3.5 text-right text-gray-600 dark:text-gray-300 font-mono">
                    {row.target}
                  </td>
                  <td className="py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {row.closed}
                  </td>
                  <td className="py-3.5 text-center">
                    <span className="inline-flex items-center rounded-lg bg-brand-50 px-2 py-0.5 font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                      {row.rate}%
                    </span>
                  </td>
                  <td className="py-3.5 text-center font-semibold text-gray-800 dark:text-gray-200">
                    {row.audits} units
                  </td>
                  <td className="py-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    {row.compliance}%
                  </td>
                  <td className="py-3.5 text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        row.status === "Leading"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : row.status === "High Growth"
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400 border border-brand-200 dark:border-brand-800"
                          : row.status === "Stable"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
