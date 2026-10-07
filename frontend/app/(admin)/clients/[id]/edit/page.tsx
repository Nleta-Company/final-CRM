"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import ClientForm from "@/components/clients/ClientForm";
import { ClientItem, ClientProcessStage } from "@/types/client";
import Button from "@/components/ui/Button";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

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

  gstNumber?: string | null;

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
    associationName?: string | null;
    contactName?: string | null;
    status?: string | null;
  } | null;

  serviceSelections?: Array<{
    id: string;
    serviceId: string;
    quantity?: number | null;
    unitPrice?: number | null;
    totalPrice?: number | null;

    service?: {
      id: string;
      code?: string | null;
      name?: string | null;
    } | null;
  }>;

  /* ============================================================
     CLIENT PROCESS TRACKING
  ============================================================ */

  processStage?: ClientProcessStage;

  externalClientId?: string | null;

  fsoNumber?: string | null;

  fsoGeneratedAt?: string | null;

  psgaGeneratedAt?: string | null;

  processUpdatedAt?: string | null;
}

interface ApiResponse {
  success: boolean;

  data?: {
    client: BackendClient;
  };

  message?: string;
}

interface ProcessUpdateResponse {
  success: boolean;

  data?: {
    client?: BackendClient;
  };

  message?: string;
}

/* ============================================================
   AUTH TOKEN
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
   GET CLIENT
============================================================ */

async function getClientById(
  id: string
): Promise<BackendClient> {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/clients/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
      credentials: "include",
      cache: "no-store",
    }
  );

  let result: ApiResponse | null = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        `Failed to fetch client (${response.status})`
    );
  }

  if (
    !result?.success ||
    !result.data?.client
  ) {
    throw new Error(
      result?.message ||
        "Client record not found"
    );
  }

  return result.data.client;
}

/* ============================================================
   UPDATE PROCESS
============================================================ */

async function updateClientProcess(
  clientId: string,
  payload: {
    processStage: ClientProcessStage;
    externalClientId?: string;
    fsoNumber?: string;
    fsoGeneratedAt?: string;
    psgaGeneratedAt?: string;
  }
): Promise<BackendClient | null> {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/clients/${encodeURIComponent(
      clientId
    )}/process`,
    {
      method: "PATCH",

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },

      credentials: "include",

      body: JSON.stringify(payload),
    }
  );

  let result: ProcessUpdateResponse | null =
    null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        `Failed to update process (${response.status})`
    );
  }

  if (!result?.success) {
    throw new Error(
      result?.message ||
        "Unable to update client process."
    );
  }

  return result.data?.client || null;
}

/* ============================================================
   FULL NAME
============================================================ */

function getFullName(
  user?: {
    firstName: string;
    lastName?: string | null;
  } | null
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

/* ============================================================
   MAP BACKEND CLIENT
============================================================ */

function mapBackendClientToClientItem(
  client: BackendClient
): ClientItem {
  const assignedBdeName =
    getFullName(client.assignedBde);

  return {
    id: client.id,

    companyName:
      client.associationName,

    clientType:
      "Residential RWA" as ClientItem["clientType"],

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

    pincode:
      client.pincode || "",

    totalAssetsCount: 0,

    contractStatus:
      client.status === "ACTIVE"
        ? "Active Agreement"
        : "Expired",

    contractValue: "—",

    numericContractValue: 0,

    accountManager:
      assignedBdeName ||
      "Unassigned",

    assignedBdeId:
      client.assignedBdeId ||
      undefined,

    assignedBdeName:
      assignedBdeName ||
      undefined,

    assignedTechnicianId:
      undefined,

    assignedTechnicianName:
      undefined,

    joinedDate:
      client.createdAt
        ? new Date(
            client.createdAt
          )
            .toISOString()
            .slice(0, 10)
        : "",

    nextAuditDate:
      undefined,

    notes:
      client.sourceLead
        ? `Converted from Lead: ${client.sourceLead.id}`
        : "",

    processStage:
      client.processStage,

    externalClientId:
      client.externalClientId ||
      undefined,

    fsoNumber:
      client.fsoNumber ||
      undefined,

    fsoGeneratedAt:
      client.fsoGeneratedAt ||
      undefined,

    psgaGeneratedAt:
      client.psgaGeneratedAt ||
      undefined,

    processUpdatedAt:
      client.processUpdatedAt ||
      undefined,
  };
}

/* ============================================================
   PROCESS CONFIG
============================================================ */

const PROCESS_STAGES: Array<{
  value: ClientProcessStage;
  label: string;
  description: string;
}> = [
  {
    value: "CLIENT_CREATED",
    label: "Client Created",
    description:
      "Client account has been created in CRM.",
  },
  {
    value: "FSO_GENERATED",
    label: "FSO Generated",
    description:
      "FSO has been generated manually in the external process.",
  },
  {
    value: "PSGA_GENERATED",
    label: "PSGA Generated",
    description:
      "PSGA has been generated manually in the external process.",
  },
  {
    value: "PSGA_COMPLETED",
    label: "PSGA Completed",
    description:
      "PSGA process is completed and incentive becomes eligible.",
  },
];

/* ============================================================
   PROCESS LABEL
============================================================ */

function getProcessStageLabel(
  stage?: ClientProcessStage
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

/* ============================================================
   DATE HELPERS
============================================================ */

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "Not available";
  }

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

function formatDateTime(
  value?: string | null
): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateInputValue(
  value?: string | null
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

/* ============================================================
   PROCESS STEP COMPONENT
============================================================ */

function ProcessStep({
  index,
  label,
  description,
  active,
  completed,
  last,
}: {
  index: number;
  label: string;
  description: string;
  active: boolean;
  completed: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-start">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
            completed
              ? "border-emerald-500 bg-emerald-500 text-white"
              : active
              ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
              : "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
          }`}
        >
          {completed ? (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12l4 4L19 6"
              />
            </svg>
          ) : (
            index
          )}
        </div>

        <div className="min-w-0">
          <p
            className={`text-sm font-semibold ${
              completed || active
                ? "text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {label}
          </p>

          <p className="mt-1 text-[11px] leading-4 text-gray-400 dark:text-gray-500">
            {description}
          </p>
        </div>
      </div>

      {!last && (
        <div className="mt-4 hidden h-px w-8 shrink-0 bg-gray-200 dark:bg-gray-700 sm:block" />
      )}
    </div>
  );
}

/* ============================================================
   EDIT CLIENT PAGE
============================================================ */

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  const clientId =
    resolvedParams.id;

  const [client, setClient] =
    useState<ClientItem | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [notFound, setNotFound] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  /* ==========================================================
     PROCESS STATE
  ========================================================== */

  const [processStage, setProcessStage] =
    useState<ClientProcessStage>(
      "CLIENT_CREATED"
    );

  const [externalClientId, setExternalClientId] =
    useState("");

  const [fsoNumber, setFsoNumber] =
    useState("");

  const [fsoGeneratedAt, setFsoGeneratedAt] =
    useState("");

  const [psgaGeneratedAt, setPsgaGeneratedAt] =
    useState("");

  const [savingProcess, setSavingProcess] =
    useState(false);

  const [processMessage, setProcessMessage] =
    useState<string | null>(null);

  const [processError, setProcessError] =
    useState<string | null>(null);

  /* ==========================================================
     FETCH CLIENT
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function fetchClient() {
      try {
        setLoading(true);
        setNotFound(false);
        setErrorMessage(null);

        const backendClient =
          await getClientById(clientId);

        if (!mounted) {
          return;
        }

        const mappedClient =
          mapBackendClientToClientItem(
            backendClient
          );

        setClient(mappedClient);

        /* -----------------------------------------------
           PROCESS DATA
        ------------------------------------------------ */

        setProcessStage(
          backendClient.processStage ||
            "CLIENT_CREATED"
        );

        setExternalClientId(
          backendClient.externalClientId ||
            ""
        );

        setFsoNumber(
          backendClient.fsoNumber ||
            ""
        );

        setFsoGeneratedAt(
          toDateInputValue(
            backendClient.fsoGeneratedAt
          )
        );

        setPsgaGeneratedAt(
          toDateInputValue(
            backendClient.psgaGeneratedAt
          )
        );
      } catch (error) {
        console.error(
          "Error fetching client:",
          error
        );

        if (!mounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load client record.";

        setErrorMessage(message);
        setNotFound(true);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchClient();

    return () => {
      mounted = false;
    };
  }, [clientId]);

  /* ==========================================================
     SAVE PROCESS
  ========================================================== */

  const handleProcessUpdate = async () => {
    try {
      setSavingProcess(true);
      setProcessMessage(null);
      setProcessError(null);

      /* -----------------------------------------------
         Basic validation
      ------------------------------------------------ */

      if (
        processStage === "FSO_GENERATED" ||
        processStage === "PSGA_GENERATED" ||
        processStage === "PSGA_COMPLETED"
      ) {
        if (!fsoNumber.trim()) {
          throw new Error(
            "Please enter the FSO number before moving beyond Client Created."
          );
        }

        if (!fsoGeneratedAt) {
          throw new Error(
            "Please select the FSO generated date."
          );
        }
      }

      if (
        processStage === "PSGA_GENERATED" ||
        processStage === "PSGA_COMPLETED"
      ) {
        if (!psgaGeneratedAt) {
          throw new Error(
            "Please select the PSGA generated date."
          );
        }
      }

      const updatedClient =
        await updateClientProcess(
          clientId,
          {
            processStage,

            ...(externalClientId.trim()
              ? {
                  externalClientId:
                    externalClientId.trim(),
                }
              : {}),

            ...(fsoNumber.trim()
              ? {
                  fsoNumber:
                    fsoNumber.trim(),
                }
              : {}),

            ...(fsoGeneratedAt
              ? {
                  fsoGeneratedAt:
                    new Date(
                      `${fsoGeneratedAt}T00:00:00`
                    ).toISOString(),
                }
              : {}),

            ...(psgaGeneratedAt
              ? {
                  psgaGeneratedAt:
                    new Date(
                      `${psgaGeneratedAt}T00:00:00`
                    ).toISOString(),
                }
              : {}),
          }
        );

      if (updatedClient) {
        const mappedClient =
          mapBackendClientToClientItem(
            updatedClient
          );

        setClient(mappedClient);

        setProcessStage(
          updatedClient.processStage ||
            processStage
        );

        setExternalClientId(
          updatedClient.externalClientId ||
            ""
        );

        setFsoNumber(
          updatedClient.fsoNumber ||
            ""
        );

        setFsoGeneratedAt(
          toDateInputValue(
            updatedClient.fsoGeneratedAt
          )
        );

        setPsgaGeneratedAt(
          toDateInputValue(
            updatedClient.psgaGeneratedAt
          )
        );
      }

      setProcessMessage(
        "Client process updated successfully."
      );
    } catch (error) {
      console.error(
        "Error updating client process:",
        error
      );

      setProcessError(
        error instanceof Error
          ? error.message
          : "Unable to update client process."
      );
    } finally {
      setSavingProcess(false);
    }
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-white p-2 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <img
            src="/images/logo/nleta-logo.png"
            alt="Loading"
            className="h-10 w-10 animate-pulse object-contain"
          />
        </div>

        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading client record...
        </p>
      </div>
    );
  }

  /* ==========================================================
     NOT FOUND
  ========================================================== */

  if (notFound || !client) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Client Not Found"
          items={[
            {
              label: "Admin Portal",
              href: "/dashboard",
            },
            {
              label: "Clients",
              href: "/clients",
            },
            {
              label: "Not Found",
            },
          ]}
        />

        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Client &ldquo;
            {clientId}
            &rdquo; Not Found
          </h2>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {errorMessage ||
              "This client record may have been deleted or the link is invalid."}
          </p>

          <div className="mt-6 flex justify-center">
            <Link href="/clients">
              <Button variant="primary">
                Return to Clients
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
     PROCESS INDEX
  ========================================================== */

  const stageIndex =
    PROCESS_STAGES.findIndex(
      (stage) =>
        stage.value === processStage
    );

  /* ==========================================================
     EDIT PAGE
  ========================================================== */

  return (
    <div className="space-y-6">
      {/* ======================================================
          BREADCRUMB
      ======================================================= */}

      <Breadcrumb
        pageTitle={`Edit Client: ${client.companyName} (${client.id})`}
        items={[
          {
            label: "Admin Portal",
            href: "/dashboard",
          },
          {
            label: "Clients Portfolio",
            href: "/clients",
          },
          {
            label: `Edit ${client.id}`,
          },
        ]}
        actions={
          <Link href="/clients">
            <Button
              variant="outline"
              size="sm"
            >
              Back to Clients
            </Button>
          </Link>
        }
      />

      {/* ======================================================
          PROCESS TRACKING
      ======================================================= */}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}

        <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d="M4 12h16M12 4l8 8-8 8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Process Tracking
                </h2>
              </div>

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Manually track the client journey from
                Client Created to PSGA Completed.
              </p>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                processStage ===
                "PSGA_COMPLETED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  processStage ===
                  "PSGA_COMPLETED"
                    ? "bg-emerald-500"
                    : "bg-brand-500"
                }`}
              />

              {getProcessStageLabel(
                processStage
              )}
            </div>
          </div>
        </div>

        {/* Journey */}

        <div className="border-b border-gray-100 px-6 py-6 dark:border-gray-800">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {PROCESS_STAGES.map(
              (stage, index) => (
                <ProcessStep
                  key={stage.value}
                  index={index + 1}
                  label={stage.label}
                  description={
                    stage.description
                  }
                  active={
                    index === stageIndex
                  }
                  completed={
                    index < stageIndex ||
                    processStage ===
                      "PSGA_COMPLETED"
                  }
                  last={
                    index ===
                    PROCESS_STAGES.length - 1
                  }
                />
              )
            )}
          </div>
        </div>

        {/* Form */}

        <div className="p-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Current Stage */}

            <div>
              <label
                htmlFor="processStage"
                className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                Current Process Stage
              </label>

              <select
                id="processStage"
                value={processStage}
                onChange={(event) =>
                  setProcessStage(
                    event.target
                      .value as ClientProcessStage
                  )
                }
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                {PROCESS_STAGES.map(
                  (stage) => (
                    <option
                      key={stage.value}
                      value={stage.value}
                    >
                      {stage.label}
                    </option>
                  )
                )}
              </select>

              <p className="mt-1.5 text-[11px] text-gray-400">
                Select the stage that has actually been
                completed.
              </p>
            </div>

            {/* External Client ID */}

            <div>
              <label
                htmlFor="externalClientId"
                className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                External Client ID
                <span className="ml-1 font-normal text-gray-400">
                  (Optional)
                </span>
              </label>

              <input
                id="externalClientId"
                type="text"
                value={externalClientId}
                onChange={(event) =>
                  setExternalClientId(
                    event.target.value
                  )
                }
                placeholder="Enter external system client ID"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {/* FSO Number */}

            <div>
              <label
                htmlFor="fsoNumber"
                className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                FSO Number
                {(processStage ===
                  "FSO_GENERATED" ||
                  processStage ===
                    "PSGA_GENERATED" ||
                  processStage ===
                    "PSGA_COMPLETED") && (
                  <span className="ml-1 text-error-500">
                    *
                  </span>
                )}
              </label>

              <input
                id="fsoNumber"
                type="text"
                value={fsoNumber}
                onChange={(event) =>
                  setFsoNumber(
                    event.target.value
                  )
                }
                placeholder="Enter FSO number"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {/* FSO Date */}

            <div>
              <label
                htmlFor="fsoGeneratedAt"
                className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                FSO Generated Date
                {(processStage ===
                  "FSO_GENERATED" ||
                  processStage ===
                    "PSGA_GENERATED" ||
                  processStage ===
                    "PSGA_COMPLETED") && (
                  <span className="ml-1 text-error-500">
                    *
                  </span>
                )}
              </label>

              <input
                id="fsoGeneratedAt"
                type="date"
                value={fsoGeneratedAt}
                onChange={(event) =>
                  setFsoGeneratedAt(
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {/* PSGA Date */}

            <div>
              <label
                htmlFor="psgaGeneratedAt"
                className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                PSGA Generated Date
                {(processStage ===
                  "PSGA_GENERATED" ||
                  processStage ===
                    "PSGA_COMPLETED") && (
                  <span className="ml-1 text-error-500">
                    *
                  </span>
                )}
              </label>

              <input
                id="psgaGeneratedAt"
                type="date"
                value={psgaGeneratedAt}
                onChange={(event) =>
                  setPsgaGeneratedAt(
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Completion / Incentive */}

          {processStage ===
            "PSGA_COMPLETED" && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M5 12l4 4L19 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  PSGA Completed — Incentive Eligible
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-400">
                  This client has reached the PSGA completed
                  stage. The applicable incentive recipient can
                  now be determined from the client&apos;s
                  source/ownership information.
                </p>
              </div>
            </div>
          )}

          {/* Messages */}

          {processError && (
            <div className="mt-5 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
              {processError}
            </div>
          )}

          {processMessage && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              {processMessage}
            </div>
          )}

          {/* Actions */}

          <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Last process update
              </p>

              <p className="mt-1 text-xs text-gray-400">
                {client.processUpdatedAt
                  ? formatDateTime(
                      client.processUpdatedAt
                    )
                  : "No process update recorded"}
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={
                handleProcessUpdate
              }
              disabled={savingProcess}
            >
              {savingProcess
                ? "Updating Process..."
                : "Update Process"}
            </Button>
          </div>
        </div>
      </section>

      {/* ======================================================
          EXISTING CLIENT FORM
      ======================================================= */}

      <ClientForm
        initialClient={client}
        isEdit={true}
      />
    </div>
  );
}