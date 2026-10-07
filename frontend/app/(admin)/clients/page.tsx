"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricCard from "@/components/metrics/MetricCard";
import DynamicTable, { Column } from "@/components/tables/DynamicTable";
import Button from "@/components/ui/Button";
import {
  ClientItem,
  ClientProcessStage,
} from "@/types/client";

interface BackendClientStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
}

interface BackendClient {
  id: string;
  associationName: string;
  contactName: string;
  email?: string | null;
  mobile?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
  assignedBdeId?: string | null;

  assignedBde?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
  } | null;

  createdBy?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
  } | null;

  sourceLead?: {
    id: string;
    associationName: string;
    status: string;
  } | null;

  totalAssetsCount?: number | null;
  contractValue?: string | null;
  numericContractValue?: number | null;
  clientType?: string | null;
  contractStatus?: string | null;
  accountManager?: string | null;
  joinedDate?: string | null;
  nextAuditDate?: string | null;
  notes?: string | null;

  // Process tracking
  processStage?: ClientProcessStage | null;
  externalClientId?: string | null;
  fsoNumber?: string | null;
  fsoGeneratedAt?: string | null;
  psgaGeneratedAt?: string | null;
  processUpdatedAt?: string | null;
}

interface ClientRow extends ClientItem {
  backendStatus: string;
  pincode: string;
  sourceLeadId: string;
  sourceLeadName: string;
  sourceLeadStatus: string;
  createdByName: string;
  createdByEmail: string;
  assignedBdeEmail: string;
  createdAtRaw: string;
  updatedAtRaw: string;
  backendClientType: string;

  // Process tracking
  processStage: ClientProcessStage;
  externalClientId: string;
  fsoNumber: string;
  fsoGeneratedAt: string;
  psgaGeneratedAt: string;
  processUpdatedAt: string;
}

interface ClientsApiResponse {
  success: boolean;
  data?: {
    clients?: BackendClient[];
    total?: number;
  };
  message?: string;
}

interface ClientStatsApiResponse {
  success: boolean;
  data?: BackendClientStats;
  message?: string;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken")
  );
}

function getDisplayName(
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null
): string {
  if (!user) return "";

  return (
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.email ||
    ""
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapContractStatus(
  backendStatus?: string | null,
  backendContractStatus?: string | null
): ClientItem["contractStatus"] {
  const value = String(
    backendContractStatus || backendStatus || ""
  )
    .trim()
    .toUpperCase();

  if (
    value === "ACTIVE" ||
    value === "ACTIVE AGREEMENT"
  ) {
    return "Active Agreement";
  }

  if (
    value === "PENDING_RENEWAL" ||
    value === "PENDING RENEWAL"
  ) {
    return "Pending Renewal";
  }

  if (
    value === "UNDER_AUDIT" ||
    value === "UNDER AUDIT"
  ) {
    return "Under Audit";
  }

  if (value === "ONBOARDING") {
    return "Onboarding";
  }

  return "Expired";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "Active Agreement":
      return {
        bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
        dot: "bg-emerald-500",
      };

    case "Pending Renewal":
      return {
        bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
        dot: "bg-amber-500",
      };

    case "Under Audit":
      return {
        bg: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
        dot: "bg-blue-500",
      };

    case "Onboarding":
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
}

function getProcessStageLabel(
  stage?: ClientProcessStage | null
): string {
  switch (stage) {
    case "CLIENT_CREATED":
      return "Client Created";

    case "FSO_GENERATED":
      return "FSO Generated";

    case "PSGA_GENERATED":
      return "PSGA Generated";

    case "PSGA_COMPLETED":
      return "PSGA Completed";

    default:
      return "Client Created";
  }
}

function getProcessStageBadge(
  stage?: ClientProcessStage | null
) {
  switch (stage) {
    case "FSO_GENERATED":
      return {
        bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-800/40",
        dot: "bg-blue-500",
      };

    case "PSGA_GENERATED":
      return {
        bg: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-800/40",
        dot: "bg-violet-500",
      };

    case "PSGA_COMPLETED":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-800/40",
        dot: "bg-emerald-500",
      };

    case "CLIENT_CREATED":
    default:
      return {
        bg: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
        dot: "bg-gray-400",
      };
  }
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-gray-800 dark:text-white">
        {value || "Not available"}
      </p>
    </div>
  );
}

export default function ClientsViewPage() {
  const router = useRouter();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [stats, setStats] =
    useState<BackendClientStats | null>(null);

  const [selectedClient, setSelectedClient] =
    useState<ClientRow | null>(null);

  const [clientToDelete, setClientToDelete] =
    useState<ClientRow | null>(null);

  const [toastMessage, setToastMessage] =
    useState<string | null>(null);

  const [quickStatusFilter, setQuickStatusFilter] =
    useState<string>("ALL");

  const [loading, setLoading] = useState(true);

  const API_BASE_URL = (
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000/api"
  ).replace(/\/+$/, "");

  const apiRequest = async <T,>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const token = getAuthToken();

    const response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
          ...(options.headers || {}),
        },
        credentials: "include",
        cache: "no-store",
      }
    );

    let result: any = null;

    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
          `Request failed with status ${response.status}.`
      );
    }

    return result as T;
  };

  const mapClient = (
    client: BackendClient
  ): ClientRow => {
    const assignedBdeName =
      getDisplayName(client.assignedBde);

    const createdByName =
      getDisplayName(client.createdBy);

    const contractStatus =
      mapContractStatus(
        client.status,
        client.contractStatus
      );

    const backendContractValue =
      client.contractValue ||
      (client.numericContractValue != null
        ? `₹${new Intl.NumberFormat("en-IN").format(
            Number(client.numericContractValue)
          )}`
        : "");

    return {
      id: client.id,

      companyName:
        client.associationName,

      clientType:
        (client.clientType ||
          "Association") as ClientItem["clientType"],

      contactPerson:
        client.contactName,

      contactEmail:
        client.email || "",

      contactPhone:
        client.mobile || "",

      address:
        client.address || "",

      city:
        client.city || "",

      state:
        client.state || "",

      totalAssetsCount:
        client.totalAssetsCount != null
          ? Number(client.totalAssetsCount)
          : 0,

      contractStatus,

      contractValue:
        backendContractValue || "Not available",

      numericContractValue:
        client.numericContractValue != null
          ? Number(client.numericContractValue)
          : 0,

      accountManager:
        client.accountManager ||
        assignedBdeName ||
        "Not assigned",

      assignedBdeId:
        client.assignedBdeId || undefined,

      assignedBdeName:
        assignedBdeName || undefined,

      assignedTechnicianId:
        undefined,

      assignedTechnicianName:
        undefined,

      joinedDate:
        client.joinedDate ||
        (client.createdAt
          ? new Date(client.createdAt)
              .toISOString()
              .slice(0, 10)
          : ""),

      nextAuditDate:
        client.nextAuditDate ||
        undefined,

      notes:
        client.notes ||
        (client.sourceLead
          ? `Converted from Lead ${client.sourceLead.id}`
          : undefined),

      backendStatus:
        client.status || "Not available",

      pincode:
        client.pincode || "",

      sourceLeadId:
        client.sourceLead?.id || "",

      sourceLeadName:
        client.sourceLead?.associationName || "",

      sourceLeadStatus:
        client.sourceLead?.status || "",

      createdByName,

      createdByEmail:
        client.createdBy?.email || "",

      assignedBdeEmail:
        client.assignedBde?.email || "",

      createdAtRaw:
        client.createdAt || "",

      updatedAtRaw:
        client.updatedAt || "",

      backendClientType:
        client.clientType ||
        "Association",

      // Process tracking
      processStage:
        client.processStage ||
        "CLIENT_CREATED",

      externalClientId:
        client.externalClientId || "",

      fsoNumber:
        client.fsoNumber || "",

      fsoGeneratedAt:
        client.fsoGeneratedAt || "",

      psgaGeneratedAt:
        client.psgaGeneratedAt || "",

      processUpdatedAt:
        client.processUpdatedAt || "",
    };
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);

    window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const refreshData = async () => {
    try {
      setLoading(true);

      const [
        clientsResponse,
        statsResponse,
      ] = await Promise.all([
        apiRequest<ClientsApiResponse>(
          "/clients"
        ),
        apiRequest<ClientStatsApiResponse>(
          "/clients/stats"
        ),
      ]);

      const backendClients =
        clientsResponse.data?.clients || [];

      const mappedClients =
        backendClients.map(mapClient);

      setClients(mappedClients);

      if (statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        setStats({
          totalClients:
            mappedClients.length,

          activeClients:
            mappedClients.filter(
              (client) =>
                client.contractStatus ===
                "Active Agreement"
            ).length,

          inactiveClients:
            mappedClients.filter(
              (client) =>
                client.contractStatus !==
                "Active Agreement"
            ).length,
        });
      }
    } catch (err) {
      console.error(
        "Error loading clients from CRM API:",
        err
      );

      showToast(
        err instanceof Error
          ? err.message
          : "Unable to load clients from CRM API."
      );

      setClients([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    try {
      await apiRequest(
        `/clients/${clientToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      showToast(
        `Client "${clientToDelete.id}" deleted successfully.`
      );

      setClientToDelete(null);

      if (
        selectedClient?.id ===
        clientToDelete.id
      ) {
        setSelectedClient(null);
      }

      await refreshData();
    } catch (err) {
      console.error(
        "Error deleting client:",
        err
      );

      showToast(
        err instanceof Error
          ? err.message
          : "Failed to delete client."
      );
    }
  };

  const filterOptions = [
    {
      label: "Active Agreement",
      value: "Active Agreement",
      field:
        "contractStatus" as keyof ClientItem,
    },
    {
      label: "Pending Renewal",
      value: "Pending Renewal",
      field:
        "contractStatus" as keyof ClientItem,
    },
    {
      label: "Under Audit",
      value: "Under Audit",
      field:
        "contractStatus" as keyof ClientItem,
    },
    {
      label: "Onboarding",
      value: "Onboarding",
      field:
        "contractStatus" as keyof ClientItem,
    },
    {
      label: "Expired",
      value: "Expired",
      field:
        "contractStatus" as keyof ClientItem,
    },
  ];

  const displayData = useMemo(() => {
    if (quickStatusFilter === "ALL") {
      return clients;
    }

    return clients.filter(
      (client) =>
        client.contractStatus ===
        quickStatusFilter
    );
  }, [
    clients,
    quickStatusFilter,
  ]);

  const columns: Column<ClientRow>[] = [
    {
      key: "id",
      header: "Client ID",
      sortable: true,
      width: "130px",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
          {row.id}
        </span>
      ),
    },

    {
      key: "companyName",
      header: "Organization",
      sortable: true,
      render: (row) => (
        <div className="max-w-[240px]">
          <p className="truncate font-semibold text-gray-900 dark:text-white">
            {row.companyName}
          </p>

          <span className="text-[11px] text-gray-400">
            {row.backendClientType}
          </span>
        </div>
      ),
    },

    {
      key: "contactPerson",
      header: "Contact",
      sortable: true,
      render: (row) => (
        <div className="max-w-[190px]">
          <p className="truncate font-medium text-gray-800 dark:text-gray-200">
            {row.contactPerson}
          </p>

          <p className="truncate text-[11px] text-gray-400">
            {row.contactPhone ||
              "No mobile"}
          </p>

          <p className="truncate text-[11px] text-gray-400">
            {row.contactEmail ||
              "No email"}
          </p>
        </div>
      ),
    },

    {
      key: "city",
      header: "Location",
      sortable: true,
      render: (row) => (
        <div className="text-xs text-gray-600 dark:text-gray-300">
          <p className="font-medium">
            {row.city || "Not available"}
          </p>

          <p className="text-[11px] text-gray-400">
            {row.state || "Not available"}
            {row.pincode
              ? ` - ${row.pincode}`
              : ""}
          </p>
        </div>
      ),
    },

    {
      key: "contractStatus",
      header: "Status",
      sortable: true,
      render: (row) => {
        const badge =
          getStatusBadge(
            row.contractStatus
          );

        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.bg}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}
            />

            <span>
              {row.contractStatus}
            </span>
          </span>
        );
      },
    },

    // NEW: Process Stage
    {
      key: "processStage",
      header: "Process Stage",
      sortable: true,
      render: (row) => {
        const badge =
          getProcessStageBadge(
            row.processStage
          );

        return (
          <div className="min-w-[150px]">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.bg}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}
              />

              {getProcessStageLabel(
                row.processStage
              )}
            </span>

            {row.processStage ===
              "PSGA_COMPLETED" && (
              <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Incentive Eligible
              </p>
            )}
          </div>
        );
      },
    },

    {
      key: "assignedBdeName",
      header: "Assigned BDE",
      sortable: true,
      render: (row) =>
        row.assignedBdeName ? (
          <div className="max-w-[150px]">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
              <svg
                className="h-3.5 w-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>

              <span className="truncate">
                {row.assignedBdeName}
              </span>
            </span>
          </div>
        ) : (
          <span className="text-xs italic text-gray-400">
            Not assigned
          </span>
        ),
    },

    {
      key: "createdAtRaw",
      header: "Created",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {formatDate(
            row.createdAtRaw
          )}
        </span>
      ),
    },

    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (row) => (
        <div
          className="flex items-center justify-center gap-1.5"
          onClick={(e) =>
            e.stopPropagation()
          }
        >
          <button
            type="button"
            onClick={() =>
              setSelectedClient(row)
            }
            title="View All Details"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg
              className="h-4 w-4 fill-none stroke-current"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>

          <Link
            href={`/clients/${row.id}/edit`}
            title="Edit Client"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-600 transition hover:bg-brand-50 hover:text-brand-700 dark:text-brand-400 dark:hover:bg-brand-500/10"
          >
            <svg
              className="h-4 w-4 fill-none stroke-current"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </Link>

          <button
            type="button"
            onClick={() =>
              setClientToDelete(row)
            }
            title="Delete Client"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-error-500 transition hover:bg-error-50 hover:text-error-600 dark:text-error-400"
          >
            <svg
              className="h-4 w-4 fill-none stroke-current"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />

        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading clients from CRM database...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-theme-xl dark:bg-white dark:text-gray-900">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Breadcrumb
        pageTitle="Clients"
        items={[
          {
            label: "Admin Portal",
            href: "/dashboard",
          },
          {
            label: "Clients",
          },
        ]}
        actions={
          <Link href="/clients/create">
            <Button
              variant="primary"
              size="sm"
              leftIcon={
                <svg
                  className="h-4 w-4 fill-none stroke-current"
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
              Register Client
            </Button>
          </Link>
        }
      />

      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
          <MetricCard
            title="Total Clients"
            value={
              stats?.totalClients ??
              clients.length
            }
            change="Live database"
            changeType="increase"
            period="CRM client records"
            icon={
              <svg
                className="h-6 w-6 fill-current text-brand-600 dark:text-brand-400"
                viewBox="0 0 24 24"
              >
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
              </svg>
            }
          />

          <MetricCard
            title="Active Clients"
            value={
              stats?.activeClients ?? 0
            }
            change="Live database"
            changeType="increase"
            period="active CRM accounts"
            icon={
              <svg
                className="h-6 w-6 fill-current text-blue-600 dark:text-blue-400"
                viewBox="0 0 24 24"
              >
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
              </svg>
            }
          />

          <MetricCard
            title="Inactive Clients"
            value={
              stats?.inactiveClients ?? 0
            }
            change="Live database"
            changeType="decrease"
            period="inactive CRM accounts"
            icon={
              <svg
                className="h-6 w-6 fill-current text-gray-600 dark:text-gray-400"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 13.17L15.17 16.59 12 13.41l-3.17 3.18-3.18-3.17 1.42-1.42L10.59 12 7.41 8.83l1.42-1.42L12 10.59l3.17-3.18 1.42 1.42L13.41 12l3.18 3.17z" />
              </svg>
            }
          />

          <MetricCard
            title="Clients With BDE"
            value={
              clients.filter(
                (client) =>
                  Boolean(
                    client.assignedBdeId
                  )
              ).length
            }
            change="From current client data"
            changeType="increase"
            period="assigned BDE records"
            icon={
              <svg
                className="h-6 w-6 fill-current text-violet-600 dark:text-violet-400"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            }
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="me-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
          Quick Filter:
        </span>

        {[
          {
            label: "All Clients",
            value: "ALL",
            count: clients.length,
          },
          {
            label: "Active",
            value: "Active Agreement",
            count:
              stats?.activeClients || 0,
          },
          {
            label: "Inactive",
            value: "Expired",
            count:
              stats?.inactiveClients || 0,
          },
        ].map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() =>
              setQuickStatusFilter(
                pill.value
              )
            }
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
              quickStatusFilter ===
              pill.value
                ? "bg-brand-500 font-semibold text-white shadow-theme-xs"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            }`}
          >
            <span>{pill.label}</span>

            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                quickStatusFilter ===
                pill.value
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {pill.count}
            </span>
          </button>
        ))}
      </div>

      <section>
        <DynamicTable<ClientRow>
          title="Client Accounts Directory"
          description="Live CRM client accounts from the PostgreSQL backend"
          columns={columns}
          data={displayData}
          searchPlaceholder="Search by organization, contact, email, phone, city, state, BDE, or client ID..."
          searchable
          filterable
          filterOptions={filterOptions}
          pageSizeOptions={[5, 10, 20]}
          initialPageSize={10}
          onRowClick={(row) =>
            setSelectedClient(row)
          }
          onAddRecord={() =>
            router.push(
              "/clients/create"
            )
          }
        />
      </section>

      {selectedClient && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"
          onClick={() =>
            setSelectedClient(null)
          }
        >
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xl dark:border-gray-800 dark:bg-gray-900"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold text-gray-900 dark:text-white">
                  {selectedClient.companyName}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {selectedClient.id}
                  </span>

                  <span>•</span>

                  <span>
                    {selectedClient.backendClientType}
                  </span>

                  <span>•</span>

                  <span>
                    {selectedClient.backendStatus}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedClient(null)
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg
                  className="h-5 w-5"
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

            <div className="py-5">
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Client Information
                  </h4>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      getStatusBadge(
                        selectedClient.contractStatus
                      ).bg
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        getStatusBadge(
                          selectedClient.contractStatus
                        ).dot
                      }`}
                    />

                    {selectedClient.contractStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailRow
                    label="Client ID"
                    value={
                      selectedClient.id
                    }
                  />

                  <DetailRow
                    label="Organization"
                    value={
                      selectedClient.companyName
                    }
                  />

                  <DetailRow
                    label="Client Type"
                    value={
                      selectedClient.backendClientType
                    }
                  />

                  <DetailRow
                    label="Contact Person"
                    value={
                      selectedClient.contactPerson
                    }
                  />

                  <DetailRow
                    label="Email"
                    value={
                      selectedClient.contactEmail ||
                      "Not available"
                    }
                  />

                  <DetailRow
                    label="Mobile"
                    value={
                      selectedClient.contactPhone ||
                      "Not available"
                    }
                  />
                </div>
              </div>

              <div className="mb-5">
                <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                  Address
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailRow
                    label="Address"
                    value={
                      selectedClient.address ||
                      "Not available"
                    }
                  />

                  <DetailRow
                    label="City"
                    value={
                      selectedClient.city ||
                      "Not available"
                    }
                  />

                  <DetailRow
                    label="State"
                    value={
                      selectedClient.state ||
                      "Not available"
                    }
                  />

                  <DetailRow
                    label="Pincode"
                    value={
                      selectedClient.pincode ||
                      "Not available"
                    }
                  />
                </div>
              </div>

              <div className="mb-5">
                <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                  CRM Assignment
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailRow
                    label="Assigned BDE"
                    value={
                      selectedClient.assignedBdeName ||
                      "Not assigned"
                    }
                  />

                  <DetailRow
                    label="BDE Email"
                    value={
                      selectedClient.assignedBdeEmail ||
                      "Not available"
                    }
                  />

                  <DetailRow
                    label="Account Manager"
                    value={
                      selectedClient.accountManager ||
                      "Not assigned"
                    }
                  />

                  <DetailRow
                    label="Created By"
                    value={
                      selectedClient.createdByName ||
                      "Not available"
                    }
                  />

                  <DetailRow
                    label="Creator Email"
                    value={
                      selectedClient.createdByEmail ||
                      "Not available"
                    }
                  />

                  <DetailRow
                    label="Joined Date"
                    value={formatDate(
                      selectedClient.joinedDate
                    )}
                  />
                </div>
              </div>

              {/* NEW: PROCESS TRACKING */}
              <div className="mb-5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Process Tracking
                  </h4>

                  {selectedClient.processStage ===
                    "PSGA_COMPLETED" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-500/15 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Incentive Eligible
                    </span>
                  )}
                </div>

                <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        "CLIENT_CREATED",
                        "FSO_GENERATED",
                        "PSGA_GENERATED",
                        "PSGA_COMPLETED",
                      ] as ClientProcessStage[]
                    ).map((stage, index) => {
                      const stageIndex = [
                        "CLIENT_CREATED",
                        "FSO_GENERATED",
                        "PSGA_GENERATED",
                        "PSGA_COMPLETED",
                      ].indexOf(
                        selectedClient.processStage
                      );

                      const completed =
                        index <= stageIndex;

                      return (
                        <React.Fragment key={stage}>
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                              completed
                                ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800/40 dark:bg-brand-500/15 dark:text-brand-400"
                                : "border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                completed
                                  ? "bg-brand-500"
                                  : "bg-gray-300 dark:bg-gray-600"
                              }`}
                            />

                            {getProcessStageLabel(
                              stage
                            )}
                          </div>

                          {index < 3 && (
                            <span className="text-gray-300 dark:text-gray-600">
                              →
                            </span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailRow
                    label="Current Stage"
                    value={
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          getProcessStageBadge(
                            selectedClient.processStage
                          ).bg
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            getProcessStageBadge(
                              selectedClient.processStage
                            ).dot
                          }`}
                        />

                        {getProcessStageLabel(
                          selectedClient.processStage
                        )}
                      </span>
                    }
                  />

                  <DetailRow
                    label="External Client ID"
                    value={
                      selectedClient.externalClientId ||
                      "Not available"
                    }
                  />

                  <DetailRow
                    label="FSO Number"
                    value={
                      selectedClient.fsoNumber ||
                      "Not generated"
                    }
                  />

                  <DetailRow
                    label="FSO Generated At"
                    value={
                      selectedClient.fsoGeneratedAt
                        ? formatDate(
                            selectedClient.fsoGeneratedAt
                          )
                        : "Not available"
                    }
                  />

                  <DetailRow
                    label="PSGA Generated At"
                    value={
                      selectedClient.psgaGeneratedAt
                        ? formatDate(
                            selectedClient.psgaGeneratedAt
                          )
                        : "Not available"
                    }
                  />

                  <DetailRow
                    label="Process Updated At"
                    value={
                      selectedClient.processUpdatedAt
                        ? formatDate(
                            selectedClient.processUpdatedAt
                          )
                        : "Not available"
                    }
                  />
                </div>
              </div>

              <div className="mb-5">
                <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                  Portfolio Information
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailRow
                    label="Assets"
                    value={
                      selectedClient.totalAssetsCount >
                      0
                        ? `${selectedClient.totalAssetsCount} Units`
                        : "Not available from client API"
                    }
                  />

                  <DetailRow
                    label="Contract Value"
                    value={
                      selectedClient.contractValue ||
                      "Not available from client API"
                    }
                  />

                  <DetailRow
                    label="Next Audit"
                    value={
                      selectedClient.nextAuditDate
                        ? formatDate(
                            selectedClient.nextAuditDate
                          )
                        : "Not available"
                    }
                  />

                  <DetailRow
                    label="Agreement Status"
                    value={
                      selectedClient.contractStatus
                    }
                  />
                </div>
              </div>

              <div className="mb-5">
                <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                  Source Lead
                </h4>

                {selectedClient.sourceLeadId ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <DetailRow
                      label="Lead ID"
                      value={
                        selectedClient.sourceLeadId
                      }
                    />

                    <DetailRow
                      label="Lead Organization"
                      value={
                        selectedClient.sourceLeadName
                      }
                    />

                    <DetailRow
                      label="Lead Status"
                      value={
                        selectedClient.sourceLeadStatus
                      }
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 p-4 text-xs text-gray-500 dark:border-gray-800">
                    No source lead information was returned by the API.
                  </div>
                )}
              </div>

              <div className="mb-5">
                <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                  Record Timeline
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailRow
                    label="Created At"
                    value={formatDate(
                      selectedClient.createdAtRaw
                    )}
                  />

                  <DetailRow
                    label="Last Updated"
                    value={formatDate(
                      selectedClient.updatedAtRaw
                    )}
                  />
                </div>
              </div>

              {selectedClient.notes && (
                <div>
                  <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                    Notes
                  </h4>

                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
                    {selectedClient.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() =>
                  setClientToDelete(
                    selectedClient
                  )
                }
                className="text-xs font-semibold text-error-600 hover:text-error-700"
              >
                Delete Client
              </button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedClient(
                      null
                    )
                  }
                >
                  Close
                </Button>

                <Link
                  href={`/clients/${selectedClient.id}/edit`}
                >
                  <Button
                    variant="primary"
                    size="sm"
                  >
                    Edit Client
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {clientToDelete && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"
          onClick={() =>
            setClientToDelete(null)
          }
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 text-center dark:bg-gray-900"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Delete Client Record?
            </h3>

            <p className="mt-2 text-xs text-gray-500">
              Permanently delete{" "}
              &ldquo;
              {clientToDelete.companyName}
              &rdquo;{" "}
              (
              {clientToDelete.id}
              )?
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setClientToDelete(
                    null
                  )
                }
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={
                  handleDeleteConfirm
                }
              >
                Yes, Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}