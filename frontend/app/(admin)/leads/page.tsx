"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricCard from "@/components/metrics/MetricCard";
import DynamicTable, { Column } from "@/components/tables/DynamicTable";
import Button from "@/components/ui/Button";
import { leadService } from "@/services/leadService";
import { LeadItem, LeadStats, LeadStatus } from "@/types/lead";

export default function LeadsViewPage() {
  const router = useRouter();

  // State
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<LeadItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);

  // Status Filter Pill for secondary fast-filter
  const [quickStatusFilter, setQuickStatusFilter] = useState<string>("ALL");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load leads and metrics from Lead Service
  const refreshData = async () => {
    try {
      const [leadsList, currentStats] = await Promise.all([
        leadService.getAllLeads(),
        leadService.getLeadStats(),
      ]);
      setLeads(leadsList);
      setStats(currentStats);
    } catch (err) {
      console.error("Error loading leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // Subscribe to any changes from create/edit/delete anywhere in app
    const unsubscribe = leadService.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  // Quick Delete Handler
  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;
    try {
      await leadService.deleteLead(leadToDelete.id);
      showToast(`Lead "${leadToDelete.id}" deleted successfully.`);
      setLeadToDelete(null);
      if (selectedLead?.id === leadToDelete.id) {
        setSelectedLead(null);
      }
      refreshData();
    } catch (err) {
      console.error("Error deleting lead:", err);
      showToast("Failed to delete lead.");
    }
  };

  // Convert Lead -> Client
  const handleConvertToClient = async (lead: LeadItem) => {
    if (lead.clientId) {
      showToast("This lead has already been converted to a client.");
      return;
    }

    if (lead.status === "LOST") {
      showToast("A lost lead cannot be converted to a client.");
      return;
    }

    const confirmed = window.confirm(
      `Convert "${lead.associationName}" to a client?\n\n` +
        "This will create a new client record and link it with this lead."
    );

    if (!confirmed) return;

    try {
      setConvertingLeadId(lead.id);
      await leadService.convertLeadToClient(lead.id, {});
      showToast(`Lead "${lead.id}" converted to client successfully.`);
      setSelectedLead(null);
      await refreshData();
    } catch (err) {
      console.error("Error converting lead to client:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to convert lead to client.";
      showToast(message);
    } finally {
      setConvertingLeadId(null);
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case "WON":
        return {
          bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
          dot: "bg-emerald-500",
        };
      case "CONTACTED":
      case "QUALIFIED":
      case "PROPOSAL_SENT":
      case "NEGOTIATION":
        return {
          bg: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
          dot: "bg-blue-500",
        };
      case "LOST":
        return {
          bg: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200 dark:border-rose-800/40",
          dot: "bg-rose-500",
        };
      case "NEW":
      default:
        return {
          bg: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
          dot: "bg-gray-400",
        };
    }
  };

  // Filter options for DynamicTable dropdown
  const filterOptions = [
    { label: "New", value: "NEW", field: "status" as keyof LeadItem },
    { label: "Contacted", value: "CONTACTED", field: "status" as keyof LeadItem },
    { label: "Qualified", value: "QUALIFIED", field: "status" as keyof LeadItem },
    { label: "Proposal Sent", value: "PROPOSAL_SENT", field: "status" as keyof LeadItem },
    { label: "Negotiation", value: "NEGOTIATION", field: "status" as keyof LeadItem },
    { label: "Won", value: "WON", field: "status" as keyof LeadItem },
    { label: "Lost", value: "LOST", field: "status" as keyof LeadItem },
  ];

  // Secondary Fast-filtered data (if quick status pills clicked)
  const displayData = useMemo(() => {
    if (quickStatusFilter === "ALL") {
      return leads;
    }

    if (quickStatusFilter === "ACTIVE") {
      return leads.filter((lead) =>
        ["CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION"].includes(
          lead.status
        )
      );
    }

    return leads.filter((lead) => lead.status === quickStatusFilter);
  }, [leads, quickStatusFilter]);

  // Columns definition for DynamicTable
  const columns: Column<LeadItem>[] = [
    {
      key: "id",
      header: "Lead ID",
      sortable: true,
      width: "150px",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              row.status === "WON"
                ? "bg-emerald-500"
                : row.status === "LOST"
                  ? "bg-rose-500"
                  : row.status === "NEGOTIATION" ||
                      row.status === "PROPOSAL_SENT"
                    ? "bg-blue-500"
                    : "bg-gray-400"
            }`}
            title={`Status: ${row.status}`}
          />
          <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
            {row.id}
          </span>
        </div>
      ),
    },
    {
      key: "associationName",
      header: "Association",
      sortable: true,
      render: (row) => (
        <div className="max-w-[220px]">
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {row.associationName}
          </p>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            {row.source || "Source not specified"}
          </div>
        </div>
      ),
    },
    {
      key: "contactName",
      header: "Client Contact",
      sortable: true,
      render: (row) => (
        <div className="max-w-[200px]">
          <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
            {row.contactName}
          </p>
          {row.mobile && (
            <p className="text-[11px] text-gray-400 truncate">
              {row.mobile}
            </p>
          )}
          {row.email && (
            <p className="text-[11px] text-gray-400 truncate">
              {row.email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "assignedTo",
      header: "Assigned BDE",
      sortable: false,
      render: (row) => {
        if (!row.assignedTo) {
          return (
            <span className="text-xs text-gray-400">
              Unassigned
            </span>
          );
        }

        const name = `${row.assignedTo.firstName || ""} ${
          row.assignedTo.lastName || ""
        }`.trim();

        return (
          <div className="max-w-[160px]">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
              {name || row.assignedTo.email || "Assigned"}
            </p>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => {
        const badge = getStatusBadge(row.status);
        const labels: Record<LeadStatus, string> = {
          NEW: "New",
          CONTACTED: "Contacted",
          QUALIFIED: "Qualified",
          PROPOSAL_SENT: "Proposal Sent",
          NEGOTIATION: "Negotiation",
          WON: "Won",
          LOST: "Lost",
        };

        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${badge.bg}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            <span>{labels[row.status]}</span>
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (row) => {
        const date = new Date(row.createdAt);

        return (
          <span className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
            {Number.isNaN(date.getTime())
              ? "—"
              : date.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
        </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (row) => {
        const alreadyConverted = Boolean(row.clientId);
        const isLost = row.status === "LOST";
        const isConverting = convertingLeadId === row.id;

        return (
          <div
            className="flex items-center justify-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedLead(row)}
              title="View Details"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition"
            >
              <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7.274-1.274 4.057-5.064 7-9.542 7z" />
              </svg>
            </button>

            <Link
              href={`/leads/${row.id}/edit`}
              title="Edit Lead"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50 hover:text-brand-700 dark:text-brand-400 dark:hover:bg-brand-500/10 transition"
            >
              <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Link>

            {!alreadyConverted && !isLost && (
              <button
                type="button"
                onClick={() => handleConvertToClient(row)}
                disabled={isConverting}
                title="Convert to Client"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 transition"
              >
                {isConverting ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                ) : (
                  <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                )}
              </button>
            )}

            {alreadyConverted && (
              <span
                title="Already Converted to Client"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              >
                <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}

            <button
              type="button"
              onClick={() => setLeadToDelete(row)}
              title="Delete Lead"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-error-500 hover:bg-error-50 hover:text-error-600 dark:text-error-400 dark:hover:bg-error-500/10 transition"
            >
              <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-99999 flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-theme-xl dark:bg-white dark:text-gray-900 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb */}
      <Breadcrumb
        pageTitle="Leads Management"
        items={[
          { label: "Admin Portal", href: "/dashboard" },
          { label: "Leads" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/leads/create">
              <Button
                variant="primary"
                size="sm"
                leftIcon={
                  <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                Register New Lead
              </Button>
            </Link>
          </div>
        }
      />

      {/* Section 1: Lead Pipeline Analysis */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Lead Pipeline Performance Analysis
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Live CRM lead metrics and lifecycle tracking
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
          <MetricCard
            title="Total Registered Leads"
            value={stats ? stats.total : leads.length}
            change={`${stats?.new || 0} new`}
            changeType="increase"
            period="current CRM records"
            icon={
              <svg
                className="w-6 h-6 fill-current text-brand-600 dark:text-brand-400"
                viewBox="0 0 24 24"
              >
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            }
          />

          <MetricCard
            title="Active Pipeline Leads"
            value={
              stats
                ? stats.contacted +
                  stats.qualified +
                  stats.proposalSent +
                  stats.negotiation
                : 0
            }
            change={`${stats?.negotiation || 0} in negotiation`}
            changeType="increase"
            period="active opportunities"
            icon={
              <svg
                className="w-6 h-6 fill-current text-blue-600 dark:text-blue-400"
                viewBox="0 0 24 24"
              >
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
              </svg>
            }
          />

          <MetricCard
            title="Won Leads"
            value={stats ? stats.won : 0}
            change={`${stats?.won || 0} converted`}
            changeType="increase"
            period="successful conversions"
            icon={
              <svg
                className="w-6 h-6 fill-current text-emerald-600 dark:text-emerald-400"
                viewBox="0 0 24 24"
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
              </svg>
            }
          />

          <MetricCard
            title="Lost Leads"
            value={stats ? stats.lost : 0}
            change={`${stats?.new || 0} new leads`}
            changeType="decrease"
            period="current lifecycle"
            icon={
              <svg
                className="w-6 h-6 fill-current text-rose-600 dark:text-rose-400"
                viewBox="0 0 24 24"
              >
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Quick Filter Pills Row */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 me-1">
          Quick Filters:
        </span>

        {[
          {
            label: "All Leads",
            value: "ALL",
            count: leads.length,
            color: "gray",
          },
          {
            label: "New",
            value: "NEW",
            count: stats?.new || 0,
            color: "gray",
          },
          {
            label: "Active Pipeline",
            value: "ACTIVE",
            count:
              (stats?.contacted || 0) +
              (stats?.qualified || 0) +
              (stats?.proposalSent || 0) +
              (stats?.negotiation || 0),
            color: "blue",
          },
          {
            label: "Won",
            value: "WON",
            count: stats?.won || 0,
            color: "emerald",
          },
          {
            label: "Lost",
            value: "LOST",
            count: stats?.lost || 0,
            color: "rose",
          },
        ].map((pill) => {
          const isActive = quickStatusFilter === pill.value;

          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => setQuickStatusFilter(pill.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? "bg-brand-500 text-white shadow-theme-xs font-semibold"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <span>{pill.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section 2: DynamicTable Component for Lead Data */}
      <section className="space-y-4">
        <DynamicTable<LeadItem>
          title="CRM Leads & Inspection Pipeline Records"
          description="Real-time CRM lead search, sortable columns, and full lifecycle tracking"
          columns={columns}
          data={displayData}
          searchPlaceholder="Search leads by association, contact, source, or lead ID..."
          searchable={true}
          filterable={true}
          filterOptions={filterOptions}
          pageSizeOptions={[5, 10, 20]}
          initialPageSize={5}
          onRowClick={(row) => setSelectedLead(row)}
          onAddRecord={() => router.push("/leads/create")}
        />
      </section>

      {/* Modal 1: Lead Details Drawer / Modal */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 font-bold dark:bg-brand-500/15 dark:text-brand-400">
                  {selectedLead.id.slice(0, 6).toUpperCase()}
                </span>

                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {selectedLead.associationName}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-mono">{selectedLead.id}</span>
                    <span>&bull;</span>
                    <span>{selectedLead.contactName}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-5 space-y-5 text-sm">
              {/* Status Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Status:
                  </span>

                  {(() => {
                    const b = getStatusBadge(selectedLead.status);
                    const labels: Record<LeadStatus, string> = {
                      NEW: "New",
                      CONTACTED: "Contacted",
                      QUALIFIED: "Qualified",
                      PROPOSAL_SENT: "Proposal Sent",
                      NEGOTIATION: "Negotiation",
                      WON: "Won",
                      LOST: "Lost",
                    };

                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${b.bg}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${b.dot}`}
                        />
                        <span>{labels[selectedLead.status]}</span>
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Source:
                  </span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                    {selectedLead.source || "Not specified"}
                  </span>
                </div>
              </div>

              {/* Grid Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Association / Contact Card */}
                <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800 bg-white dark:bg-gray-800/30">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Association & Contact
                  </h4>

                  <p className="font-semibold text-gray-800 dark:text-white">
                    {selectedLead.associationName}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Contact:{" "}
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {selectedLead.contactName}
                    </span>
                  </p>

                  {selectedLead.mobile && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Mobile:{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {selectedLead.mobile}
                      </span>
                    </p>
                  )}

                  {selectedLead.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-all">
                      Email:{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {selectedLead.email}
                      </span>
                    </p>
                  )}
                </div>

                {/* Assignment Card */}
                <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800 bg-white dark:bg-gray-800/30">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    CRM Assignment
                  </h4>

                  <p className="font-semibold text-gray-800 dark:text-white">
                    {selectedLead.assignedTo
                      ? `${selectedLead.assignedTo.firstName || ""} ${
                          selectedLead.assignedTo.lastName || ""
                        }`.trim() ||
                        selectedLead.assignedTo.email ||
                        "Assigned BDE"
                      : "Unassigned"}
                  </p>

                  {selectedLead.assignedTo?.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
                      {selectedLead.assignedTo.email}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Created by:{" "}
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {selectedLead.createdBy
                        ? `${selectedLead.createdBy.firstName || ""} ${
                            selectedLead.createdBy.lastName || ""
                          }`.trim() ||
                          selectedLead.createdBy.email ||
                          "CRM User"
                        : "CRM User"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Dates & Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-gray-100 p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 text-xs">
                <div>
                  <span className="text-gray-400">Created Date:</span>
                  <p className="font-semibold text-gray-800 dark:text-white mt-0.5">
                    {new Date(selectedLead.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400">Last Updated:</span>
                  <p className="font-semibold text-gray-800 dark:text-white mt-0.5">
                    {new Date(selectedLead.updatedAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {selectedLead.notes && (
                <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800 bg-white dark:bg-gray-800/30">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Lead Notes
                  </h4>

                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {selectedLead.notes}
                  </p>
                </div>
              )}

              {/* Fast Status Transition Buttons */}
              <div className="pt-2">
                <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  Update Lifecycle Status:
                </span>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "NEW",
                      "CONTACTED",
                      "QUALIFIED",
                      "PROPOSAL_SENT",
                      "NEGOTIATION",
                      "WON",
                      "LOST",
                    ] as LeadStatus[]
                  ).map((st) => {
                    const isSelected = selectedLead.status === st;

                    const labels: Record<LeadStatus, string> = {
                      NEW: "New",
                      CONTACTED: "Contacted",
                      QUALIFIED: "Qualified",
                      PROPOSAL_SENT: "Proposal Sent",
                      NEGOTIATION: "Negotiation",
                      WON: "Won",
                      LOST: "Lost",
                    };

                    const getActiveStyle = (status: LeadStatus) => {
                      switch (status) {
                        case "WON":
                          return "bg-emerald-600 text-white font-bold shadow-theme-xs";
                        case "LOST":
                          return "bg-rose-600 text-white font-bold shadow-theme-xs";
                        case "CONTACTED":
                        case "QUALIFIED":
                        case "PROPOSAL_SENT":
                        case "NEGOTIATION":
                          return "bg-blue-600 text-white font-bold shadow-theme-xs";
                        case "NEW":
                        default:
                          return "bg-gray-600 text-white font-bold shadow-theme-xs";
                      }
                    };

                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={isSelected}
                        onClick={async () => {
                          try {
                            const updated = await leadService.updateLead(
                              selectedLead.id,
                              { status: st }
                            );

                            if (updated) {
                              setSelectedLead(updated);
                            }

                            showToast(
                              `Status updated to "${labels[st]}"`
                            );
                            await refreshData();
                          } catch (err) {
                            console.error(
                              "Error updating lead status:",
                              err
                            );
                            showToast("Failed to update lead status.");
                          }
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          isSelected
                            ? `${getActiveStyle(st)} cursor-default`
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        }`}
                      >
                        {labels[st]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setLeadToDelete(selectedLead)}
                className="text-xs font-semibold text-error-600 hover:text-error-700 dark:text-error-400"
              >
                Delete Lead
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLead(null)}
                >
                  Close
                </Button>
                <Link href={`/leads/${selectedLead.id}/edit`}>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={
                      <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    }
                  >
                    Edit Record
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Delete Confirmation Dialog */}
      {leadToDelete && (
        <div
          className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setLeadToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Delete Lead Record?
            </h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-gray-800 dark:text-white">
                {leadToDelete.associationName} ({leadToDelete.id})
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLeadToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
              >
                Yes, Delete Lead
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
