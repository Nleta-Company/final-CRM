"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

import DynamicTable, { Column } from "./DynamicTable";
import { leadService } from "@/services/leadService";
import { LeadItem, LeadStatus } from "@/types/lead";

const statusLabels: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

function getStatusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case "WON":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30";

    case "LOST":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30";

    case "NEGOTIATION":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30";

    case "PROPOSAL_SENT":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30";

    case "QUALIFIED":
      return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30";

    case "CONTACTED":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30";

    case "NEW":
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getAssignedBdeName(row: LeadItem): string {
  if (!row.assignedTo) {
    return "Unassigned";
  }

  const firstName = row.assignedTo.firstName || "";
  const lastName = row.assignedTo.lastName || "";

  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || row.assignedTo.email || "Assigned";
}

export default function LeadsTable() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(
    null
  );

  const loadData = async () => {
    try {
      setLoading(true);

      const data = await leadService.getAllLeads();

      setLeads(data);
    } catch (err) {
      console.error("Error loading leads for dashboard:", err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = leadService.subscribe(loadData);

    return () => unsubscribe();
  }, []);

  /**
   * Convert Lead → Client
   *
   * Backend endpoint:
   * POST /api/leads/:id/convert-to-client
   *
   * Backend handles:
   * - Client creation
   * - Lead status → WON
   * - Lead.clientId
   * - Lead service selections → Client service selections
   * - Assigned BDE preservation
   */
  const handleConvertToClient = async (lead: LeadItem) => {
    if (lead.clientId) {
      window.alert("This lead has already been converted to a client.");
      return;
    }

    if (lead.status === "LOST") {
      window.alert("A lost lead cannot be converted to a client.");
      return;
    }

    const confirmed = window.confirm(
      `Convert "${lead.associationName}" to a client?\n\n` +
        "This will create a new client record and link it with this lead."
    );

    if (!confirmed) {
      return;
    }

    try {
      setConvertingLeadId(lead.id);

      await leadService.convertLeadToClient(lead.id, {});

      window.alert(
        "Lead successfully converted to client."
      );

      await loadData();
    } catch (error) {
      console.error("Error converting lead to client:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Failed to convert lead to client.";

      window.alert(message);
    } finally {
      setConvertingLeadId(null);
    }
  };

  const columns: Column<LeadItem>[] = [
    {
      key: "id",
      header: "Lead ID",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-brand-600 dark:text-brand-400">
          {row.id}
        </span>
      ),
    },

    {
      key: "associationName",
      header: "Association & Contact",
      sortable: true,
      render: (row) => (
        <div className="min-w-[180px]">
          <span className="block font-medium text-gray-900 dark:text-white">
            {row.associationName}
          </span>

          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
            {row.contactName}
          </span>
        </div>
      ),
    },

    {
      key: "contactName",
      header: "Contact",
      sortable: true,
      render: (row) => (
        <div className="min-w-[150px]">
          <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">
            {row.contactName}
          </span>

          {row.mobile && (
            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
              {row.mobile}
            </span>
          )}

          {row.email && (
            <span className="block max-w-[220px] truncate text-xs text-gray-500 dark:text-gray-400">
              {row.email}
            </span>
          )}
        </div>
      ),
    },

    {
      key: "source",
      header: "Source",
      sortable: true,
      render: (row) => (
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {row.source || "—"}
        </span>
      ),
    },

    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "center",
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
            row.status
          )}`}
        >
          {statusLabels[row.status] || row.status}
        </span>
      ),
    },

    {
      key: "assignedTo",
      header: "Assigned BDE",
      sortable: false,
      render: (row) => (
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {getAssignedBdeName(row)}
        </span>
      ),
    },

    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
          {formatDate(row.createdAt)}
        </span>
      ),
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
          <div className="flex items-center justify-center gap-2">
            {/* View */}
            <Link
              href={`/leads/${row.id}`}
              title="View Lead"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>

            {/* Edit */}
            <Link
              href={`/leads/${row.id}`}
              title="Edit Lead"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                />
              </svg>
            </Link>

            {/* Convert to Client */}
            {!alreadyConverted && !isLost && (
              <button
                type="button"
                title="Convert to Client"
                disabled={isConverting}
                onClick={() => handleConvertToClient(row)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
              >
                {isConverting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20 12a8 8 0 11-16 0 8 8 0 0116 0z"
                    />
                  </svg>
                )}
              </button>
            )}

            {/* Already converted indicator */}
            {alreadyConverted && (
              <span
                title="Already Converted to Client"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
            )}
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />

        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Loading pipeline leads...
        </p>
      </div>
    );
  }

  return (
    <DynamicTable<LeadItem>
      title="Recent Leads"
      description="Real-time pipeline synchronization with NLETA centralized CRM records"
      columns={columns}
      data={leads}
      searchPlaceholder="Search association, contact, lead ID..."
      initialPageSize={5}
      pageSizeOptions={[5, 10, 20]}
      filterOptions={[
        {
          label: "All Leads",
          value: "ALL",
          field: "status",
        },
        {
          label: "New",
          value: "NEW",
          field: "status",
        },
        {
          label: "Contacted",
          value: "CONTACTED",
          field: "status",
        },
        {
          label: "Qualified",
          value: "QUALIFIED",
          field: "status",
        },
        {
          label: "Proposal Sent",
          value: "PROPOSAL_SENT",
          field: "status",
        },
        {
          label: "Negotiation",
          value: "NEGOTIATION",
          field: "status",
        },
        {
          label: "Won",
          value: "WON",
          field: "status",
        },
        {
          label: "Lost",
          value: "LOST",
          field: "status",
        },
      ]}
    />
  );
}