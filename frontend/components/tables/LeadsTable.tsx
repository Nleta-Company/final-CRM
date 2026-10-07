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
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400";

    case "LOST":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400";

    case "NEGOTIATION":
      return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400";

    case "PROPOSAL_SENT":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400";

    case "QUALIFIED":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-400";

    case "CONTACTED":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400";

    case "NEW":
    default:
      return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
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

function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function getBdeInitials(row: LeadItem): string {
  if (!row.assignedTo) {
    return "?";
  }

  const first =
    row.assignedTo.firstName?.charAt(0) || "";

  const last =
    row.assignedTo.lastName?.charAt(0) || "";

  const initials = `${first}${last}`.toUpperCase();

  return initials || "B";
}

function getSourceClass(source?: string | null): string {
  if (!source) {
    return "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }

  const normalized = source.toLowerCase();

  if (normalized.includes("website")) {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400";
  }

  if (normalized.includes("referral")) {
    return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400";
  }

  if (normalized.includes("call")) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400";
  }

  if (normalized.includes("email")) {
    return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-400";
  }

  return "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

export default function LeadsTable() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingLeadId, setConvertingLeadId] =
    useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);

      const data = await leadService.getAllLeads();

      setLeads(data);
    } catch (err) {
      console.error(
        "Error loading leads for dashboard:",
        err
      );

      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe =
      leadService.subscribe(loadData);

    return () => unsubscribe();
  }, []);

  /*
   * ============================================================
   * LEAD → CLIENT CONVERSION
   * ============================================================
   */

  const handleConvertToClient = async (
    lead: LeadItem
  ) => {
    if (lead.clientId) {
      window.alert(
        "This lead has already been converted to a client."
      );
      return;
    }

    if (lead.status === "LOST") {
      window.alert(
        "A lost lead cannot be converted to a client."
      );
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

      await leadService.convertLeadToClient(
        lead.id,
        {}
      );

      window.alert(
        "Lead successfully converted to client."
      );

      await loadData();
    } catch (error) {
      console.error(
        "Error converting lead to client:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to convert lead to client.";

      window.alert(message);
    } finally {
      setConvertingLeadId(null);
    }
  };

  /*
   * ============================================================
   * TABLE COLUMNS
   * ============================================================
   */

  const columns: Column<LeadItem>[] = [
    {
      key: "id",
      header: "Lead",
      sortable: true,
      width: "150px",
      render: (row) => (
        <div className="min-w-[120px]">
          <span
            title={row.id}
            className="block max-w-[130px] truncate font-semibold text-brand-600 dark:text-brand-400"
          >
            {row.id}
          </span>

          <span className="mt-1 block text-[11px] text-gray-400 dark:text-gray-500">
            Lead Record
          </span>
        </div>
      ),
    },

    {
      key: "associationName",
      header: "Customer",
      sortable: true,
      width: "230px",
      render: (row) => (
        <div className="min-w-[190px]">
          <Link
            href={`/leads/${row.id}`}
            onClick={(event) =>
              event.stopPropagation()
            }
            className="block max-w-[220px] truncate font-semibold text-gray-900 transition hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
          >
            {row.associationName}
          </Link>

          <span className="mt-1 block max-w-[220px] truncate text-xs text-gray-500 dark:text-gray-400">
            {row.contactName || "No contact name"}
          </span>
        </div>
      ),
    },

    {
      key: "contactName",
      header: "Contact Details",
      sortable: true,
      width: "220px",
      render: (row) => (
        <div className="min-w-[180px]">
          {row.mobile ? (
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
              <PhoneIcon />
              <span>{row.mobile}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">
              No mobile
            </span>
          )}

          {row.email && (
            <div
              title={row.email}
              className="mt-1 max-w-[210px] truncate text-xs text-gray-500 dark:text-gray-400"
            >
              {row.email}
            </div>
          )}
        </div>
      ),
    },

    {
      key: "source",
      header: "Source",
      sortable: true,
      width: "150px",
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium ${getSourceClass(
            row.source
          )}`}
        >
          {row.source || "—"}
        </span>
      ),
    },

    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "center",
      width: "145px",
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
            row.status
          )}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusLabels[row.status] ||
            row.status}
        </span>
      ),
    },

    {
      key: "assignedTo",
      header: "Assigned BDE",
      sortable: false,
      width: "180px",
      render: (row) => {
        const name = getAssignedBdeName(row);

        return (
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              {getBdeInitials(row)}
            </span>

            <div className="min-w-0">
              <span className="block max-w-[130px] truncate text-xs font-semibold text-gray-700 dark:text-gray-300">
                {name}
              </span>

              {!row.assignedTo && (
                <span className="text-[10px] text-gray-400">
                  Awaiting assignment
                </span>
              )}
            </div>
          </div>
        );
      },
    },

    {
      key: "clientId",
      header: "Client Status",
      sortable: false,
      align: "center",
      width: "145px",
      render: (row) => {
        const converted = Boolean(row.clientId);

        return converted ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckIcon />
            Client Created
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            Lead Only
          </span>
        );
      },
    },

    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      width: "145px",
      render: (row) => (
        <div className="whitespace-nowrap">
          <span className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            {formatDate(row.createdAt)}
          </span>

          <span className="mt-1 block text-[10px] text-gray-400 dark:text-gray-500">
            {formatDateTime(row.createdAt)
              .split(", ")
              .slice(1)
              .join(", ")}
          </span>
        </div>
      ),
    },

    {
      key: "actions",
      header: "Actions",
      align: "center",
      width: "155px",
      render: (row) => {
        const alreadyConverted =
          Boolean(row.clientId);

        const isLost =
          row.status === "LOST";

        const isConverting =
          convertingLeadId === row.id;

        return (
          <div
            className="flex items-center justify-center gap-1.5"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* View */}
            <Link
              href={`/leads/${row.id}`}
              title="View lead"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
            >
              <EyeIcon />
            </Link>

            {/* Edit */}
            <Link
              href={`/leads/${row.id}`}
              title="Edit lead"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
            >
              <EditIcon />
            </Link>

            {/* Convert */}
            {!alreadyConverted && !isLost && (
              <button
                type="button"
                title="Convert to client"
                disabled={isConverting}
                onClick={() =>
                  handleConvertToClient(row)
                }
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
              >
                {isConverting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                ) : (
                  <ConvertIcon />
                )}
              </button>
            )}

            {alreadyConverted && (
              <span
                title="Already converted to client"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
              >
                <CheckIcon />
              </span>
            )}
          </div>
        );
      },
    },
  ];

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>

        <p className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Loading lead pipeline
        </p>

        <p className="mt-1 text-xs text-gray-400">
          Fetching live CRM records...
        </p>
      </div>
    );
  }

  return (
    <DynamicTable<LeadItem>
      title="Lead Pipeline"
      description="Live lead records synchronized with the CRM"
      columns={columns}
      data={leads}
      searchPlaceholder="Search lead, customer, contact or source..."
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

/* ============================================================
   ICONS
============================================================ */

function EyeIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
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
  );
}

function EditIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
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
  );
}

function ConvertIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
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
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
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
  );
}

function PhoneIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.17 3.511a1 1 0 01-.502 1.21l-2.05 1.025a11.042 11.042 0 005.014 5.014l1.025-2.05a1 1 0 011.21-.502l3.511 1.17a1 1 0 01.684.949V18a2 2 0 01-2 2h-1C9.716 20 4 14.284 4 7V6a2 2 0 01-1-1z"
      />
    </svg>
  );
}