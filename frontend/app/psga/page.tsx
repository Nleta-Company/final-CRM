"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import Button from "@/components/ui/Button";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

/* ============================================================
   TYPES
============================================================ */

type PSGAStatus =
  | "GENERATED"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

type ClientProcessStage =
  | "CLIENT_CREATED"
  | "FSO_GENERATED"
  | "PSGA_GENERATED"
  | "PSGA_COMPLETED";

interface UserSummary {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobile?: string | null;
}

interface LeadSummary {
  id: string;
  associationName?: string | null;
  contactName?: string | null;
  status?: string | null;
  assignedToId?: string | null;
  createdById?: string | null;
}

interface ClientRecord {
  id: string;

  associationName?: string | null;

  contactName?: string | null;

  email?: string | null;

  mobile?: string | null;

  processStage?: ClientProcessStage | null;

  assignedBdeId?: string | null;

  assignedBde?: UserSummary | null;

  createdById?: string | null;

  sourceLead?: LeadSummary | null;
}

interface PSGARecord {
  id: string;

  psgNumber: string;

  status: PSGAStatus;

  incentiveStatus:
    | "NOT_ELIGIBLE"
    | "ELIGIBLE"
    | "APPROVED"
    | "PAID";

  generatedAt?: string | null;

  sentAt?: string | null;

  acceptedAt?: string | null;

  rejectedAt?: string | null;

  client?: {
    id: string;
    associationName?: string | null;
    contactName?: string | null;
    email?: string | null;
    mobile?: string | null;
    processStage?: ClientProcessStage | null;
    externalClientId?: string | null;
    fsoNumber?: string | null;
    fsoGeneratedAt?: string | null;
    psgaGeneratedAt?: string | null;
    processUpdatedAt?: string | null;
  } | null;

  lead?: LeadSummary | null;

  bde?: UserSummary | null;
}

interface PSGAListResponse {
  success: boolean;
  count?: number;
  data?: PSGARecord[];
  message?: string;
}

interface ClientListResponse {
  success: boolean;
  count?: number;
  data?: ClientRecord[];
  message?: string;
}

interface CreatePSGAResponse {
  success: boolean;
  message?: string;
  data?: PSGARecord;
  errors?: Array<{
    field?: string;
    message?: string;
  }>;
}

/* ============================================================
   AUTH
============================================================ */

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

/* ============================================================
   API
============================================================ */

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),

        ...(options.headers || {}),
      },

      credentials: "include",

      cache: "no-store",
    }
  );

  let result: T | null = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      result !== null &&
      "message" in result
        ? String(
            (
              result as {
                message?: unknown;
              }
            ).message ||
              `Request failed (${response.status})`
          )
        : `Request failed (${response.status})`;

    throw new Error(message);
  }

  return result as T;
}

/* ============================================================
   API FUNCTIONS
============================================================ */

async function getPSGAs(): Promise<PSGARecord[]> {
  const result =
    await apiFetch<PSGAListResponse>(
      "/psga"
    );

  if (!result?.success) {
    throw new Error(
      result?.message ||
        "Unable to fetch PSGA records."
    );
  }

  return Array.isArray(result.data)
    ? result.data
    : [];
}

async function getClients(): Promise<ClientRecord[]> {
  const result =
    await apiFetch<ClientListResponse>(
      "/clients"
    );

  if (!result?.success) {
    throw new Error(
      result?.message ||
        "Unable to fetch clients."
    );
  }

  return Array.isArray(result.data)
    ? result.data
    : [];
}

async function createPSGA(
  payload: {
    psgNumber: string;
    clientId: string;
    leadId?: string;
    bdeId?: string;
    status: PSGAStatus;
    generatedAt?: string;
    sentAt?: string;
    acceptedAt?: string;
    rejectedAt?: string;
  }
): Promise<CreatePSGAResponse> {
  return apiFetch<CreatePSGAResponse>(
    "/psga",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

/* ============================================================
   HELPERS
============================================================ */

function getFullName(
  user?: UserSummary | null
): string {
  if (!user) {
    return "";
  }

  return [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatDateTime(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function StatusBadge({
  status,
}: {
  status: PSGAStatus;
}) {
  const config: Record<
    PSGAStatus,
    {
      label: string;
      className: string;
    }
  > = {
    GENERATED: {
      label: "Generated",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400",
    },

    SENT: {
      label: "Sent",
      className:
        "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400",
    },

    ACCEPTED: {
      label: "Accepted",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
    },

    REJECTED: {
      label: "Rejected",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400",
    },

    CANCELLED: {
      label: "Cancelled",
      className:
        "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
    },
  };

  const item = config[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.className}`}
    >
      {item.label}
    </span>
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function PSGAPage() {
  const [psgas, setPsgas] =
    useState<PSGARecord[]>([]);

  const [clients, setClients] =
    useState<ClientRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingClients, setLoadingClients] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [clientError, setClientError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<"ALL" | PSGAStatus>(
      "ALL"
    );

  /* ==========================================================
     CREATE MODAL
  ========================================================== */

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [psgNumber, setPsgNumber] =
    useState("");

  const [selectedClientId, setSelectedClientId] =
    useState("");

  const [status, setStatus] =
    useState<PSGAStatus>(
      "GENERATED"
    );

  const [generatedAt, setGeneratedAt] =
    useState("");

  const [sentAt, setSentAt] =
    useState("");

  const [acceptedAt, setAcceptedAt] =
    useState("");

  const [rejectedAt, setRejectedAt] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  const [createError, setCreateError] =
    useState<string | null>(null);

  const [createSuccess, setCreateSuccess] =
    useState<string | null>(null);

  /* ==========================================================
     LOAD PSGA
  ========================================================== */

  const loadPSGAs = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const data =
        await getPSGAs();

      setPsgas(data);
    } catch (error) {
      console.error(
        "getPSGAs error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load PSGA records."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     LOAD CLIENTS
  ========================================================== */

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      setClientError(null);

      const data =
        await getClients();

      setClients(data);
    } catch (error) {
      console.error(
        "getClients error:",
        error
      );

      setClientError(
        error instanceof Error
          ? error.message
          : "Unable to load clients."
      );
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    loadPSGAs();
    loadClients();
  }, []);

  /* ==========================================================
     CLIENTS ELIGIBLE FOR PSGA TRACKING
  ========================================================== */

  const eligibleClients =
    useMemo(() => {
      return clients.filter(
        (client) =>
          client.processStage ===
            "PSGA_GENERATED" ||
          client.processStage ===
            "PSGA_COMPLETED"
      );
    }, [clients]);

  /* ==========================================================
     FILTER PSGA
  ========================================================== */

  const filteredPSGAs =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return psgas.filter(
        (psg) => {
          const matchesSearch =
            !query ||
            psg.psgNumber
              .toLowerCase()
              .includes(query) ||
            psg.client?.associationName
              ?.toLowerCase()
              .includes(query) ||
            psg.client?.id
              ?.toLowerCase()
              .includes(query) ||
            getFullName(psg.bde)
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter === "ALL" ||
            psg.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      psgas,
      search,
      statusFilter,
    ]);

  /* ==========================================================
     METRICS
  ========================================================== */

  const metrics =
    useMemo(() => {
      return {
        total: psgas.length,

        generated:
          psgas.filter(
            (item) =>
              item.status ===
              "GENERATED"
          ).length,

        sent:
          psgas.filter(
            (item) =>
              item.status ===
              "SENT"
          ).length,

        accepted:
          psgas.filter(
            (item) =>
              item.status ===
              "ACCEPTED"
          ).length,

        completed:
          psgas.filter(
            (item) =>
              item.client
                ?.processStage ===
              "PSGA_COMPLETED"
          ).length,
      };
    }, [psgas]);

  /* ==========================================================
     OPEN CREATE
  ========================================================== */

  const openCreateModal = async () => {
    setShowCreateModal(true);

    setPsgNumber("");
    setSelectedClientId("");
    setStatus("GENERATED");

    setGeneratedAt(
      new Date()
        .toISOString()
        .slice(0, 16)
    );

    setSentAt("");
    setAcceptedAt("");
    setRejectedAt("");

    setCreateError(null);
    setCreateSuccess(null);

    if (!clients.length) {
      await loadClients();
    }
  };

  /* ==========================================================
     CLOSE CREATE
  ========================================================== */

  const closeCreateModal = () => {
    if (creating) {
      return;
    }

    setShowCreateModal(false);

    setPsgNumber("");
    setSelectedClientId("");

    setStatus("GENERATED");

    setGeneratedAt("");
    setSentAt("");
    setAcceptedAt("");
    setRejectedAt("");

    setCreateError(null);
    setCreateSuccess(null);
  };

  /* ==========================================================
     CREATE PSGA
  ========================================================== */

  const handleCreatePSGA =
    async () => {
      try {
        setCreating(true);

        setCreateError(null);
        setCreateSuccess(null);

        if (!psgNumber.trim()) {
          throw new Error(
            "PSGA number is required."
          );
        }

        if (!selectedClientId) {
          throw new Error(
            "Please select a client."
          );
        }

        const selectedClient =
          clients.find(
            (client) =>
              client.id ===
              selectedClientId
          );

        if (!selectedClient) {
          throw new Error(
            "Selected client was not found."
          );
        }

        if (
          selectedClient.processStage !==
            "PSGA_GENERATED" &&
          selectedClient.processStage !==
            "PSGA_COMPLETED"
        ) {
          throw new Error(
            "PSGA tracking is allowed only when the client process has reached PSGA_GENERATED or PSGA_COMPLETED."
          );
        }

        const payload: {
          psgNumber: string;
          clientId: string;
          leadId?: string;
          bdeId?: string;
          status: PSGAStatus;
          generatedAt?: string;
          sentAt?: string;
          acceptedAt?: string;
          rejectedAt?: string;
        } = {
          psgNumber:
            psgNumber.trim(),

          clientId:
            selectedClient.id,

          status,
        };

        if (
          selectedClient.sourceLead
            ?.id
        ) {
          payload.leadId =
            selectedClient
              .sourceLead.id;
        }

        if (
          selectedClient.assignedBdeId
        ) {
          payload.bdeId =
            selectedClient.assignedBdeId;
        }

        if (generatedAt) {
          payload.generatedAt =
            new Date(
              generatedAt
            ).toISOString();
        }

        if (sentAt) {
          payload.sentAt =
            new Date(
              sentAt
            ).toISOString();
        }

        if (acceptedAt) {
          payload.acceptedAt =
            new Date(
              acceptedAt
            ).toISOString();
        }

        if (rejectedAt) {
          payload.rejectedAt =
            new Date(
              rejectedAt
            ).toISOString();
        }

        const result =
          await createPSGA(
            payload
          );

        if (!result.success) {
          throw new Error(
            result.message ||
              "Unable to create PSGA tracking record."
          );
        }

        setCreateSuccess(
          result.message ||
            "PSGA tracking record created successfully."
        );

        await loadPSGAs();

        setTimeout(() => {
          closeCreateModal();
        }, 800);
      } catch (error) {
        console.error(
          "createPSGA error:",
          error
        );

        setCreateError(
          error instanceof Error
            ? error.message
            : "Unable to create PSGA tracking record."
        );
      } finally {
        setCreating(false);
      }
    };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="PSGA Tracking"
          items={[
            {
              label:
                "Admin Portal",
              href:
                "/dashboard",
            },
            {
              label:
                "PSGA Tracking",
            },
          ]}
        />

        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
            </div>

            <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
              Loading PSGA records...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     MAIN
  ============================================================ */

  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle="PSGA Tracking"
        items={[
          {
            label:
              "Admin Portal",
            href:
              "/dashboard",
          },
          {
            label:
              "PSGA Tracking",
          },
        ]}
      />

      {/* HEADER */}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M8 8h8M8 12h8M8 16h5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                PSGA Tracking
              </h1>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Manually track PSGA records generated
                outside the CRM.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadPSGAs();
                loadClients();
              }}
            >
              Refresh
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={
                openCreateModal
              }
            >
              + Add PSGA
            </Button>
          </div>
        </div>
      </section>

      {/* ERROR */}

      {errorMessage && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          {errorMessage}
        </div>
      )}

      {/* METRICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500">
            Total PSGA
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.total}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500">
            Generated
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.generated}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500">
            Sent
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.sent}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500">
            Accepted
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.accepted}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500">
            PSGA Completed
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.completed}
          </p>
        </div>
      </div>

      {/* FILTER */}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label
              htmlFor="psga-search"
              className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
            >
              Search
            </label>

            <input
              id="psga-search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search PSGA, client or BDE..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="w-full lg:w-56">
            <label
              htmlFor="psga-status"
              className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
            >
              PSGA Status
            </label>

            <select
              id="psga-status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as
                    | "ALL"
                    | PSGAStatus
                )
              }
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="ALL">
                All Statuses
              </option>

              <option value="GENERATED">
                Generated
              </option>

              <option value="SENT">
                Sent
              </option>

              <option value="ACCEPTED">
                Accepted
              </option>

              <option value="REJECTED">
                Rejected
              </option>

              <option value="CANCELLED">
                Cancelled
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* PSGA TABLE */}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            PSGA Records
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            {filteredPSGAs.length} record
            {filteredPSGAs.length === 1
              ? ""
              : "s"}{" "}
            found
          </p>
        </div>

        {filteredPSGAs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 dark:bg-gray-800">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M8 8h8M8 12h8M8 16h5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              No PSGA records found
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Add a PSGA tracking record after the
              external PSGA has been generated.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-800/40">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    PSGA
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Client
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    BDE
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Process
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Generated
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Incentive
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredPSGAs.map(
                  (psg) => (
                    <tr
                      key={psg.id}
                      className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {psg.psgNumber}
                        </p>

                        <p className="mt-1 text-[11px] text-gray-400">
                          {psg.id}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {psg.client
                            ?.associationName ||
                            "—"}
                        </p>

                        <p className="mt-1 text-[11px] text-gray-400">
                          {psg.client?.id ||
                            "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {getFullName(
                            psg.bde
                          ) || "—"}
                        </p>

                        <p className="mt-1 text-[11px] text-gray-400">
                          {psg.bde?.email ||
                            ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            psg.status
                          }
                        />
                      </td>

                      <td className="px-5 py-4">
                        {psg.client
                          ?.processStage ===
                        "PSGA_COMPLETED" ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                            PSGA Completed
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {psg.client
                              ?.processStage ||
                              "—"}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {formatDate(
                            psg.generatedAt
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {psg.client
                          ?.processStage ===
                        "PSGA_COMPLETED" ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                            Eligible
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Not eligible
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ======================================================
          CREATE PSGA MODAL
      ======================================================= */}

      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Add PSGA Tracking
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter the PSGA number generated by the external system.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeCreateModal
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* PSGA NUMBER */}

              <div>
                <label
                  htmlFor="psg-number"
                  className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  PSGA Number
                  <span className="ml-1 text-error-500">
                    *
                  </span>
                </label>

                <input
                  id="psg-number"
                  type="text"
                  value={psgNumber}
                  onChange={(event) =>
                    setPsgNumber(
                      event.target.value
                    )
                  }
                  disabled={creating}
                  placeholder="Enter external PSGA number"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {/* CLIENT */}

              <div>
                <label
                  htmlFor="psga-client"
                  className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  Client
                  <span className="ml-1 text-error-500">
                    *
                  </span>
                </label>

                <select
                  id="psga-client"
                  value={
                    selectedClientId
                  }
                  onChange={(event) =>
                    setSelectedClientId(
                      event.target.value
                    )
                  }
                  disabled={
                    creating ||
                    loadingClients
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">
                    {loadingClients
                      ? "Loading clients..."
                      : "Select client"}
                  </option>

                  {eligibleClients.map(
                    (client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.associationName ||
                          client.id}{" "}
                        —{" "}
                        {client.processStage}
                      </option>
                    )
                  )}
                </select>

                <p className="mt-1.5 text-[11px] text-gray-400">
                  Only clients at PSGA_GENERATED or PSGA_COMPLETED are available.
                </p>

                {clientError && (
                  <p className="mt-2 text-xs text-error-600">
                    {clientError}
                  </p>
                )}
              </div>

              {/* STATUS */}

              <div>
                <label
                  htmlFor="psga-status-create"
                  className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  PSGA Status
                </label>

                <select
                  id="psga-status-create"
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target
                        .value as PSGAStatus
                    )
                  }
                  disabled={creating}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="GENERATED">
                    Generated
                  </option>

                  <option value="SENT">
                    Sent
                  </option>

                  <option value="ACCEPTED">
                    Accepted
                  </option>

                  <option value="REJECTED">
                    Rejected
                  </option>

                  <option value="CANCELLED">
                    Cancelled
                  </option>
                </select>
              </div>

              {/* GENERATED */}

              <div>
                <label
                  htmlFor="generated-at"
                  className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  PSGA Generated Date
                </label>

                <input
                  id="generated-at"
                  type="datetime-local"
                  value={
                    generatedAt
                  }
                  onChange={(event) =>
                    setGeneratedAt(
                      event.target.value
                    )
                  }
                  disabled={creating}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {/* SENT */}

              <div>
                <label
                  htmlFor="sent-at"
                  className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  Sent Date
                </label>

                <input
                  id="sent-at"
                  type="datetime-local"
                  value={sentAt}
                  onChange={(event) =>
                    setSentAt(
                      event.target.value
                    )
                  }
                  disabled={creating}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {/* ACCEPTED */}

              {status ===
                "ACCEPTED" && (
                <div>
                  <label
                    htmlFor="accepted-at"
                    className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Accepted Date
                  </label>

                  <input
                    id="accepted-at"
                    type="datetime-local"
                    value={
                      acceptedAt
                    }
                    onChange={(
                      event
                    ) =>
                      setAcceptedAt(
                        event.target
                          .value
                      )
                    }
                    disabled={creating}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* REJECTED */}

              {status ===
                "REJECTED" && (
                <div>
                  <label
                    htmlFor="rejected-at"
                    className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Rejected Date
                  </label>

                  <input
                    id="rejected-at"
                    type="datetime-local"
                    value={
                      rejectedAt
                    }
                    onChange={(
                      event
                    ) =>
                      setRejectedAt(
                        event.target
                          .value
                      )
                    }
                    disabled={creating}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* INFO */}

              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                <p className="text-xs leading-5 text-blue-700 dark:text-blue-400">
                  PSGA is generated outside the CRM. This screen only stores the external PSGA tracking record. Incentive eligibility is controlled separately by the client's PSGA_COMPLETED process stage.
                </p>
              </div>

              {/* ERRORS */}

              {createError && (
                <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
                  {createError}
                </div>
              )}

              {createSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {createSuccess}
                </div>
              )}

              {/* ACTIONS */}

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={
                    closeCreateModal
                  }
                  disabled={creating}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={
                    handleCreatePSGA
                  }
                  disabled={
                    creating ||
                    loadingClients
                  }
                >
                  {creating
                    ? "Saving..."
                    : "Save PSGA"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}