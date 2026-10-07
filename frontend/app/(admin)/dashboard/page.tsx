"use client";

import React, { useEffect, useMemo, useState } from "react";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import LeadsTable from "@/components/tables/LeadsTable";
import Button from "@/components/ui/Button";

import { leadService } from "@/services/leadService";
import { clientService } from "@/services/clientService";
import { bdeService } from "@/services/bdeService";

import { LeadStats } from "@/types/lead";
import { ClientStats } from "@/types/client";
import { BdeStats } from "@/types/bde";

interface ProcessStats {
  clientCreated: number;
  fsoGenerated: number;
  psgaGenerated: number;
  psgaCompleted: number;
}

type ProcessStatus =
  | "active"
  | "pending"
  | "completed";

export default function AdminDashboardPage() {
  const [toastMessage, setToastMessage] =
    useState<string | null>(null);

  const [leadStats, setLeadStats] =
    useState<LeadStats | null>(null);

  const [clientStats, setClientStats] =
    useState<ClientStats | null>(null);

  const [bdeStats, setBdeStats] =
    useState<BdeStats | null>(null);

  const [processStats, setProcessStats] =
    useState<ProcessStats | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);

    window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  /*
   * ============================================================
   * LOAD REAL CRM DATA
   * ============================================================
   */

  const loadDashboardData = async () => {
    try {
      setError(null);

      const [
        leads,
        clients,
        process,
        bdes,
      ] = await Promise.all([
        leadService.getLeadStats(),
        clientService.getClientStats(),
        clientService.getClientProcessStats(),
        bdeService.getBdeStats(),
      ]);

      setLeadStats(leads);
      setClientStats(clients);
      setProcessStats(process);
      setBdeStats(bdes);
    } catch (err) {
      console.error(
        "Failed to load admin dashboard:",
        err
      );

      setError(
        "Unable to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const unsubscribeLeads =
      leadService.subscribe(loadDashboardData);

    const unsubscribeClients =
      clientService.subscribe(loadDashboardData);

    const unsubscribeBde =
      bdeService.subscribe(loadDashboardData);

    return () => {
      unsubscribeLeads();
      unsubscribeClients();
      unsubscribeBde();
    };
  }, []);

  /*
   * ============================================================
   * REAL CRM VALUES
   * ============================================================
   */

  const totalLeads =
    leadStats?.total ?? null;

  const totalClients =
    clientStats?.totalClients ?? null;

  const clientCreated =
    processStats?.clientCreated ?? null;

  const fsoGenerated =
    processStats?.fsoGenerated ?? null;

  const psgaGenerated =
    processStats?.psgaGenerated ?? null;

  const psgaCompleted =
    processStats?.psgaCompleted ?? null;

  /*
   * ============================================================
   * PROCESS PERCENTAGES
   * ============================================================
   */

  const fsoRate = useMemo(() => {
    if (
      clientCreated === null ||
      clientCreated <= 0 ||
      fsoGenerated === null
    ) {
      return null;
    }

    return Math.min(
      100,
      Math.round(
        (fsoGenerated / clientCreated) * 100
      )
    );
  }, [clientCreated, fsoGenerated]);

  const psgaRate = useMemo(() => {
    if (
      fsoGenerated === null ||
      fsoGenerated <= 0 ||
      psgaGenerated === null
    ) {
      return null;
    }

    return Math.min(
      100,
      Math.round(
        (psgaGenerated / fsoGenerated) * 100
      )
    );
  }, [fsoGenerated, psgaGenerated]);

  const completionRate = useMemo(() => {
    if (
      psgaGenerated === null ||
      psgaGenerated <= 0 ||
      psgaCompleted === null
    ) {
      return null;
    }

    return Math.min(
      100,
      Math.round(
        (psgaCompleted / psgaGenerated) * 100
      )
    );
  }, [psgaGenerated, psgaCompleted]);

  /*
   * ============================================================
   * PROCESS CHART SCALE
   * ============================================================
   */

  const processMaximum = useMemo(() => {
    const values = [
      clientCreated,
      fsoGenerated,
      psgaGenerated,
      psgaCompleted,
    ].filter(
      (value): value is number =>
        typeof value === "number"
    );

    if (!values.length) {
      return 0;
    }

    return Math.max(...values);
  }, [
    clientCreated,
    fsoGenerated,
    psgaGenerated,
    psgaCompleted,
  ]);

  /*
   * ============================================================
   * KPI DATA
   * ============================================================
   */

  const kpis = [
    {
      id: "leads",
      title: "Total Leads",
      value: totalLeads,
      subtitle: "Lead pipeline",
      icon: <LeadIcon />,
      iconClass:
        "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    },

    {
      id: "clients",
      title: "Total Clients",
      value: totalClients,
      subtitle: "Customer base",
      icon: <ClientIcon />,
      iconClass:
        "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    },

    {
      id: "fso",
      title: "FSO Generated",
      value: fsoGenerated,
      subtitle: "Client → FSO",
      icon: <DocumentIcon />,
      iconClass:
        "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
    },

    {
      id: "psga",
      title: "PSGA Generated",
      value: psgaGenerated,
      subtitle: "FSO → PSGA",
      icon: <ProcessIcon />,
      iconClass:
        "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    },

    {
      id: "completed",
      title: "PSGA Completed",
      value: psgaCompleted,
      subtitle: "Incentive eligible",
      icon: <CheckIcon />,
      iconClass:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    },

    {
      id: "revenue",
      title: "Total Revenue",
      value: null,
      displayValue:
        bdeStats?.formattedTotalRevenue ?? "—",
      subtitle: "Current CRM revenue",
      icon: <RevenueIcon />,
      iconClass:
        "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    },
  ];

  return (
    <div className="min-h-full space-y-8 pb-10">
      {/* ======================================================
          TOAST
      ======================================================= */}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-99999 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:text-white">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {toastMessage}
        </div>
      )}

      {/* ======================================================
          PAGE HEADER
      ======================================================= */}

      <Breadcrumb
        pageTitle="Admin Dashboard"
        items={[
          {
            label: "Admin",
            href: "/dashboard",
          },
          {
            label: "Overview",
          },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                document
                  .getElementById("recent-leads")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });

                showToast("Opening lead pipeline");
              }}
            >
              View Leads
            </Button>
          </div>
        }
      />

      {/* ======================================================
          ERROR
      ======================================================= */}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
              !
            </span>

            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboardData}
            className="text-sm font-semibold text-red-700 hover:underline dark:text-red-300"
          >
            Retry
          </button>
        </div>
      )}

      {/* ======================================================
          OVERVIEW HEADER
      ======================================================= */}

      <section>
        <div className="mb-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Business Overview
            </h2>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Real-time view of your CRM pipeline and business
              performance.
            </p>
          </div>
        </div>

        {/* ====================================================
            KPI CARDS
        ===================================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.id}
              title={kpi.title}
              value={kpi.value}
              displayValue={kpi.displayValue}
              subtitle={kpi.subtitle}
              icon={kpi.icon}
              iconClass={kpi.iconClass}
              loading={loading}
            />
          ))}
        </div>
      </section>

      {/* ======================================================
          CRM PIPELINE
      ======================================================= */}

      <section>
        <SectionHeader
          title="CRM Pipeline"
          description="Track the customer journey from lead creation to PSGA completion."
        />

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Customer Journey
                </h3>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Lead → Client → FSO → PSGA → Completed
                </p>
              </div>

              {completionRate !== null && (
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {completionRate}% PSGA completion
                </div>
              )}
            </div>
          </div>

          {/* ==================================================
              SINGLE-LINE CUSTOMER JOURNEY
          =================================================== */}

          <div className="overflow-x-auto p-6">
            <div className="flex min-w-[1120px] items-center gap-3">
              <PipelineCard
                number="01"
                title="Leads"
                value={totalLeads}
                description="Incoming opportunities"
                status="active"
                loading={loading}
              />

              <PipelineConnector />

              <PipelineCard
                number="02"
                title="Clients"
                value={totalClients}
                description="Customer accounts"
                status="active"
                loading={loading}
              />

              <PipelineConnector />

              <PipelineCard
                number="03"
                title="FSO"
                value={fsoGenerated}
                description="FSO generated"
                status={
                  fsoGenerated !== null &&
                  fsoGenerated > 0
                    ? "active"
                    : "pending"
                }
                loading={loading}
              />

              <PipelineConnector />

              <PipelineCard
                number="04"
                title="PSGA"
                value={psgaGenerated}
                description="PSGA generated"
                status={
                  psgaGenerated !== null &&
                  psgaGenerated > 0
                    ? "active"
                    : "pending"
                }
                loading={loading}
              />

              <PipelineConnector />

              <PipelineCard
                number="05"
                title="Completed"
                value={psgaCompleted}
                description="Incentive eligible"
                status={
                  psgaCompleted !== null &&
                  psgaCompleted > 0
                    ? "completed"
                    : "pending"
                }
                loading={loading}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          ANALYTICS
      ======================================================= */}

      <section>
        <SectionHeader
          title="Business Analytics"
          description="Current CRM process performance based only on available real data."
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* ==================================================
              PROCESS PERFORMANCE
          ================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 xl:col-span-2">
            <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Process Performance
                  </h3>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Current records at each CRM stage
                  </p>
                </div>

                <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Live data
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <ProcessBar
                  label="Clients Created"
                  value={clientCreated}
                  maximum={processMaximum}
                  color="bg-blue-500"
                  percentage={100}
                  loading={loading}
                />

                <ProcessBar
                  label="FSO Generated"
                  value={fsoGenerated}
                  maximum={processMaximum}
                  color="bg-indigo-500"
                  percentage={fsoRate}
                  loading={loading}
                />

                <ProcessBar
                  label="PSGA Generated"
                  value={psgaGenerated}
                  maximum={processMaximum}
                  color="bg-orange-500"
                  percentage={psgaRate}
                  loading={loading}
                />

                <ProcessBar
                  label="PSGA Completed"
                  value={psgaCompleted}
                  maximum={processMaximum}
                  color="bg-emerald-500"
                  percentage={completionRate}
                  loading={loading}
                />
              </div>
            </div>
          </div>

          {/* ==================================================
              PROCESS SUMMARY
          ================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Process Summary
              </h3>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Current pipeline status
              </p>
            </div>

            <div className="space-y-1 p-4">
              <SummaryRow
                label="Clients Created"
                value={clientCreated}
                icon={<ClientIcon />}
              />

              <SummaryRow
                label="FSO Generated"
                value={fsoGenerated}
                icon={<DocumentIcon />}
              />

              <SummaryRow
                label="PSGA Generated"
                value={psgaGenerated}
                icon={<ProcessIcon />}
              />

              <SummaryRow
                label="PSGA Completed"
                value={psgaCompleted}
                icon={<CheckIcon />}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          REVENUE
      ======================================================= */}

      <section>
        <SectionHeader
          title="Revenue"
          description="Current revenue available from the CRM revenue service."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <RevenueIcon />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Total Revenue
                    </p>

                    <h3 className="mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {loading
                        ? "—"
                        : bdeStats?.formattedTotalRevenue ??
                          "—"}
                    </h3>
                  </div>
                </div>

                <p className="mt-5 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Revenue shown here comes directly from the
                  available CRM revenue statistics. No
                  estimated or fabricated monthly values are
                  displayed.
                </p>
              </div>

              {bdeStats?.formattedTotalTarget && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Revenue Target
                  </p>

                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {bdeStats.formattedTotalTarget}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Revenue status */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <ChartIcon />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Revenue Analytics
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Data availability
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/40">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Aggregate revenue available
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                A monthly or yearly revenue graph will be
                shown once time-series revenue data is
                available from the backend.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          LEADS TABLE
      ======================================================= */}

      <section
        id="recent-leads"
        className="scroll-mt-6"
      >
        <SectionHeader
          title="Lead Pipeline"
          description="Current CRM leads and their business status."
        />

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Recent Leads
                </h3>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Manage and review your current lead pipeline.
                </p>
              </div>

              {totalLeads !== null && (
                <span className="w-fit rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {totalLeads.toLocaleString()} total leads
                </span>
              )}
            </div>
          </div>

          <div className="p-1">
            <LeadsTable />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
        {title}
      </h2>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

/* ============================================================
   KPI CARD
============================================================ */

function KpiCard({
  title,
  value,
  displayValue,
  subtitle,
  icon,
  iconClass,
  loading,
}: {
  title: string;
  value: number | null;
  displayValue?: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClass: string;
  loading: boolean;
}) {
  const formattedValue =
    displayValue !== undefined
      ? displayValue
      : value !== null
      ? value.toLocaleString()
      : "—";

  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {title}
        </p>

        <div className="mt-1.5 min-h-9">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
          ) : (
            <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {formattedValue}
            </p>
          )}
        </div>

        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   PIPELINE CARD
============================================================ */

function PipelineCard({
  number,
  title,
  value,
  description,
  status,
  loading,
}: {
  number: string;
  title: string;
  value: number | null;
  description: string;
  status: ProcessStatus;
  loading: boolean;
}) {
  const styles = {
    active: {
      wrapper:
        "border-brand-200 bg-brand-50/60 dark:border-brand-500/20 dark:bg-brand-500/5",
      badge:
        "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400",
      dot: "bg-brand-500",
    },

    pending: {
      wrapper:
        "border-gray-200 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-800/30",
      badge:
        "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
      dot: "bg-gray-400",
    },

    completed: {
      wrapper:
        "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5",
      badge:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
  };

  const current = styles[status];

  return (
    <div
      className={`w-[190px] shrink-0 rounded-xl border p-4 transition ${current.wrapper}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold ${current.badge}`}
        >
          {number}
        </span>

        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <span
            className={`h-1.5 w-1.5 rounded-full ${current.dot}`}
          />

          {status === "completed"
            ? "Complete"
            : status === "active"
            ? "Active"
            : "Pending"}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-gray-800 dark:text-white">
          {title}
        </p>

        <div className="mt-1 min-h-8">
          {loading ? (
            <div className="h-7 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {value !== null
                ? value.toLocaleString()
                : "—"}
            </p>
          )}
        </div>

        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   PIPELINE CONNECTOR
============================================================ */

function PipelineConnector() {
  return (
    <div className="flex w-12 shrink-0 items-center justify-center">
      <div className="relative w-full">
        <div className="h-px w-full bg-gray-200 dark:bg-gray-700" />

        <svg
          className="absolute -right-1.5 -top-2 h-4 w-4 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M9 5l7 7-7 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

/* ============================================================
   PROCESS BAR
============================================================ */

function ProcessBar({
  label,
  value,
  maximum,
  color,
  percentage,
  loading,
}: {
  label: string;
  value: number | null;
  maximum: number;
  color: string;
  percentage: number | null;
  loading: boolean;
}) {
  const width =
    value !== null &&
    maximum > 0
      ? Math.max(
          2,
          Math.round((value / maximum) * 100)
        )
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>

        <div className="flex items-center gap-3">
          {percentage !== null && (
            <span className="text-xs font-medium text-gray-400">
              {percentage}%
            </span>
          )}

          <span className="min-w-8 text-right text-sm font-semibold text-gray-900 dark:text-white">
            {loading
              ? "—"
              : value !== null
              ? value.toLocaleString()
              : "—"}
          </span>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{
            width: `${width}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   SUMMARY ROW
============================================================ */

function SummaryRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {icon}
        </div>

        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </div>

      <span className="text-sm font-bold text-gray-900 dark:text-white">
        {value !== null
          ? value.toLocaleString()
          : "—"}
      </span>
    </div>
  );
}

/* ============================================================
   ICONS
============================================================ */

function LeadIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx="9"
        cy="7"
        r="4"
      />

      <path
        d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClientIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M3 21h18"
        strokeLinecap="round"
      />

      <path
        d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M14 2v6h6M8 13h8M8 17h5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProcessIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1.5"
      />

      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1.5"
      />

      <path
        d="M10 6.5h4a2 2 0 012 2V14"
        strokeLinecap="round"
      />

      <path
        d="M14 17.5h-4a2 2 0 01-2-2V10"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M20 6L9 17l-5-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 1v22"
        strokeLinecap="round"
      />

      <path
        d="M17 5.5c-.9-1-2.4-1.5-4.5-1.5-3 0-4.5 1.4-4.5 3.2 0 2.1 2 2.8 4.5 3.4 2.5.6 4.5 1.3 4.5 3.5 0 2-1.7 3.4-4.8 3.4-2.2 0-3.8-.7-4.7-1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M4 19V5M4 19h16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M8 16l3-4 3 2 5-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}