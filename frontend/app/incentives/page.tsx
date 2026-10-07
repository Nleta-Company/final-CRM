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

type ClientProcessStage =
  | "CLIENT_CREATED"
  | "FSO_GENERATED"
  | "PSGA_GENERATED"
  | "PSGA_COMPLETED";

type IncentiveStatus =
  | "NOT_ELIGIBLE"
  | "ELIGIBLE"
  | "APPROVED"
  | "PAID";

type IncentiveRole =
  | "PRIMARY"
  | "SUPPORTING";

type RecipientType =
  | "BDE"
  | "ADMIN";

interface UserSummary {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  mobile?: string | null;
}

interface ClientRecord {
  id: string;

  companyName?: string | null;
  associationName?: string | null;

  contactPerson?: string | null;
  contactName?: string | null;

  contactEmail?: string | null;
  email?: string | null;

  contactPhone?: string | null;
  mobile?: string | null;

  city?: string | null;
  state?: string | null;
  address?: string | null;
  pincode?: string | null;

  processStage?: ClientProcessStage | null;

  externalClientId?: string | null;

  fsoNumber?: string | null;
  fsoGeneratedAt?: string | null;

  psgaGeneratedAt?: string | null;

  processUpdatedAt?: string | null;

  assignedBde?: UserSummary | null;

  assignedBdeId?: string | null;

  sourceLead?: {
    id: string;
    associationName?: string | null;
    status?: string | null;
    assignedToId?: string | null;
    createdById?: string | null;
    assignedTo?: UserSummary | null;
    createdBy?: UserSummary | null;
  } | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

interface ClientListResponse {
  success: boolean;

  count?: number;

  data?: ClientRecord[];

  message?: string;
}

interface IncentiveAllocation {
  id: string;

  bdeId?: string | null;

  adminId?: string | null;

  recipientType?: RecipientType;

  role?: IncentiveRole | null;

  reason?: string | null;

  incentivePercent: number | string;

  status: IncentiveStatus;

  approvedAt?: string | null;

  paidAt?: string | null;

  createdAt?: string;

  updatedAt?: string;

  bde?: UserSummary | null;

  admin?: UserSummary | null;

  approvedBy?: UserSummary | null;
}

interface IncentiveResponse {
  success: boolean;

  data?: {
    clientId?: string;

    psgId?: string;

    psgNumber?: string;

    totalPoolPercent?: number;

    supportingTotalPercent: number;

    primaryRemainingPercent?: number;

    allocations: IncentiveAllocation[];
  };

  message?: string;
}

interface CreateIncentiveResponse {
  success: boolean;

  message?: string;

  data?: {
    allocation: IncentiveAllocation;

    incentivePool?: {
      explicitlyAllocatedSupportingPercent?: number;

      supportingPercent?: number;

      primaryPercent?: number;
    };
  };
}

interface UpdateIncentiveResponse {
  success: boolean;

  message?: string;

  data?: IncentiveAllocation;
}

interface BdeListResponse {
  success: boolean;

  data?:
    | UserSummary[]
    | {
        users?: UserSummary[];

        bdes?: UserSummary[];
      };

  message?: string;
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
   CLIENT LIST
   IMPORTANT:
   Incentive page now gets eligible records from CLIENTS.
   No /psga dependency here.
============================================================ */

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

/* ============================================================
   PSGA INCENTIVES
   NOTE:
   Current backend still exposes this endpoint by PSGA ID.
   This function is retained only for existing allocation
   functionality. It will be changed in the backend step.
============================================================ */

async function getPSGAIncentives(
  psgId: string
): Promise<IncentiveResponse["data"]> {
  const result =
    await apiFetch<IncentiveResponse>(
      `/incentives/psga/${encodeURIComponent(
        psgId
      )}`
    );

  if (
    !result?.success ||
    !result.data
  ) {
    throw new Error(
      result?.message ||
        "Unable to fetch incentive details."
    );
  }

  return result.data;
}

/* ============================================================
   BDE LIST
============================================================ */

async function getBDEs(): Promise<UserSummary[]> {
  const result =
    await apiFetch<BdeListResponse>(
      "/users?role=BDE%2FSales&status=ACTIVE"
    );

  if (!result?.success) {
    throw new Error(
      result?.message ||
        "Unable to fetch BDE users."
    );
  }

  if (Array.isArray(result.data)) {
    return result.data;
  }

  if (
    result.data &&
    !Array.isArray(result.data)
  ) {
    if (
      Array.isArray(
        result.data.users
      )
    ) {
      return result.data.users;
    }

    if (
      Array.isArray(
        result.data.bdes
      )
    ) {
      return result.data.bdes;
    }
  }

  return [];
}

/* ============================================================
   CREATE INCENTIVE
   Existing backend contract retained for now.
============================================================ */

async function createIncentive(
  payload: {
    psgId: string;
    bdeId: string;
    role: "SUPPORTING";
    reason: string;
    incentivePercent: number;
  }
): Promise<CreateIncentiveResponse> {
  return apiFetch<CreateIncentiveResponse>(
    "/incentives",
    {
      method: "POST",

      body: JSON.stringify(
        payload
      ),
    }
  );
}

/* ============================================================
   UPDATE INCENTIVE
============================================================ */

async function updateIncentive(
  allocationId: string,
  payload: {
    reason?: string;

    incentivePercent?: number;

    status?: IncentiveStatus;
  }
): Promise<UpdateIncentiveResponse> {
  return apiFetch<UpdateIncentiveResponse>(
    `/incentives/${encodeURIComponent(
      allocationId
    )}`,
    {
      method: "PUT",

      body: JSON.stringify(
        payload
      ),
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

function getClientName(
  client?: ClientRecord | null
): string {
  if (!client) {
    return "—";
  }

  return (
    client.companyName ||
    client.associationName ||
    "—"
  );
}

function getClientContactName(
  client?: ClientRecord | null
): string {
  if (!client) {
    return "—";
  }

  return (
    client.contactPerson ||
    client.contactName ||
    "—"
  );
}

function getClientEmail(
  client?: ClientRecord | null
): string {
  if (!client) {
    return "—";
  }

  return (
    client.contactEmail ||
    client.email ||
    "—"
  );
}

function getClientPhone(
  client?: ClientRecord | null
): string {
  if (!client) {
    return "—";
  }

  return (
    client.contactPhone ||
    client.mobile ||
    "—"
  );
}

function getRecipientType(
  client: ClientRecord
): RecipientType {
  /*
   * Lead-origin client -> BDE
   * Direct Admin-created client -> ADMIN
   */
  return client.sourceLead
    ? "BDE"
    : "ADMIN";
}

function getRecipientName(
  client: ClientRecord
): string {
  if (client.sourceLead) {
    return (
      getFullName(
        client.sourceLead.assignedTo
      ) ||
      getFullName(
        client.assignedBde
      ) ||
      "BDE"
    );
  }

  return "Admin";
}

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
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
    Number.isNaN(
      date.getTime()
    )
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

function formatPercent(
  value?: number | string | null
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const numberValue =
    Number(value);

  if (
    Number.isNaN(
      numberValue
    )
  ) {
    return String(value);
  }

  return `${numberValue}%`;
}

function processStageLabel(
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
      return "—";
  }
}

/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({
  status,
}: {
  status: IncentiveStatus;
}) {
  const config: Record<
    IncentiveStatus,
    {
      label: string;

      className: string;
    }
  > = {
    NOT_ELIGIBLE: {
      label: "Not Eligible",

      className:
        "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
    },

    ELIGIBLE: {
      label: "Eligible",

      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
    },

    APPROVED: {
      label: "Approved",

      className:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400",
    },

    PAID: {
      label: "Paid",

      className:
        "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400",
    },
  };

  const item =
    config[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.className}`}
    >
      {item.label}
    </span>
  );
}

/* ============================================================
   RECIPIENT BADGE
============================================================ */

function RecipientBadge({
  type,
}: {
  type: RecipientType;
}) {
  const isBde =
    type === "BDE";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        isBde
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400"
          : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400"
      }`}
    >
      {isBde
        ? "BDE"
        : "Admin"}
    </span>
  );
}

/* ============================================================
   METRIC CARD
============================================================ */

function MetricCard({
  title,

  value,

  description,
}: {
  title: string;

  value: string | number;

  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
        {description}
      </p>
    </div>
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function IncentivesPage() {
  /*
   * IMPORTANT:
   * We now keep CLIENT records instead of PSGA records.
   */
  const [clients, setClients] =
    useState<ClientRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "ALL" | IncentiveStatus
  >("ALL");

  const [
    selectedClient,
    setSelectedClient,
  ] = useState<ClientRecord | null>(
    null
  );

  /*
   * Current backend still returns incentive details
   * using PSGA ID.
   *
   * This remains nullable because a client may now
   * appear here without a PSGA database record.
   */
  const [
    selectedIncentiveData,
    setSelectedIncentiveData,
  ] = useState<
    IncentiveResponse["data"] | null
  >(null);

  const [
    loadingDetails,
    setLoadingDetails,
  ] = useState(false);

  const [
    detailsError,
    setDetailsError,
  ] = useState<string | null>(
    null
  );

  /* ==========================================================
     BDE DATA
  ========================================================== */

  const [bdes, setBdes] =
    useState<UserSummary[]>([]);

  const [
    loadingBdes,
    setLoadingBdes,
  ] = useState(false);

  const [
    bdeLoadError,
    setBdeLoadError,
  ] = useState<string | null>(
    null
  );

  /* ==========================================================
     CREATE MODAL
  ========================================================== */

  const [
    showCreateModal,
    setShowCreateModal,
  ] = useState(false);

  const [
    createClient,
    setCreateClient,
  ] = useState<ClientRecord | null>(
    null
  );

  const [
    selectedBdeId,
    setSelectedBdeId,
  ] = useState("");

  const [
    createReason,
    setCreateReason,
  ] = useState("");

  const [
    createPercent,
    setCreatePercent,
  ] = useState("");

  const [
    creatingIncentive,
    setCreatingIncentive,
  ] = useState(false);

  const [
    createError,
    setCreateError,
  ] = useState<string | null>(
    null
  );

  const [
    createMessage,
    setCreateMessage,
  ] = useState<string | null>(
    null
  );

  /* ==========================================================
     EDIT MODAL
  ========================================================== */

  const [
    editingAllocation,
    setEditingAllocation,
  ] = useState<
    IncentiveAllocation | null
  >(null);

  const [
    editReason,
    setEditReason,
  ] = useState("");

  const [
    editPercent,
    setEditPercent,
  ] = useState("");

  const [
    updatingAllocation,
    setUpdatingAllocation,
  ] = useState(false);

  const [
    editError,
    setEditError,
  ] = useState<string | null>(
    null
  );

  /* ==========================================================
     LOAD CLIENTS
  ========================================================== */

  const loadClients = async () => {
    try {
      setLoading(true);

      setErrorMessage(null);

      const data =
        await getClients();

      /*
       * IMPORTANT:
       * Incentive page automatically takes only
       * PSGA_COMPLETED clients.
       */
      const completedClients =
        data.filter(
          (client) =>
            client.processStage ===
            "PSGA_COMPLETED"
        );

      setClients(
        completedClients
      );
    } catch (error) {
      console.error(
        "Failed to load incentive clients:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load incentive records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  /* ==========================================================
     FILTER
  ========================================================== */

  const filteredClients =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return clients.filter(
        (client) => {
          const clientName =
            getClientName(
              client
            ).toLowerCase();

          const contactName =
            getClientContactName(
              client
            ).toLowerCase();

          const email =
            getClientEmail(
              client
            ).toLowerCase();

          const clientId =
            client.id
              ?.toLowerCase() ||
            "";

          const fsoNumber =
            client.fsoNumber
              ?.toLowerCase() ||
            "";

          const externalId =
            client.externalClientId
              ?.toLowerCase() ||
            "";

          const bdeName =
            getFullName(
              client.assignedBde
            ).toLowerCase();

          const matchesSearch =
            !query ||
            clientName.includes(
              query
            ) ||
            contactName.includes(
              query
            ) ||
            email.includes(
              query
            ) ||
            clientId.includes(
              query
            ) ||
            fsoNumber.includes(
              query
            ) ||
            externalId.includes(
              query
            ) ||
            bdeName.includes(
              query
            );

          /*
           * All clients in this page are PSGA_COMPLETED.
           * Status is therefore automatically eligible
           * until an allocation reaches another state.
           */
          const matchesStatus =
            statusFilter ===
            "ALL" ||
            statusFilter ===
              "ELIGIBLE";

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      clients,
      search,
      statusFilter,
    ]);

  /* ==========================================================
     METRICS
  ========================================================== */

  const metrics =
    useMemo(() => {
      const total =
        clients.length;

      /*
       * PSGA_COMPLETED means eligible.
       */
      const eligible =
        clients.length;

      return {
        total,

        eligible,

        approved: 0,

        paid: 0,
      };
    }, [clients]);

  /* ==========================================================
     LOAD BDE
  ========================================================== */

  const loadBDEs = async () => {
    try {
      setLoadingBdes(true);

      setBdeLoadError(null);

      const data =
        await getBDEs();

      setBdes(data);
    } catch (error) {
      console.error(
        "Failed to load BDEs:",
        error
      );

      setBdeLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load BDE users."
      );
    } finally {
      setLoadingBdes(false);
    }
  };

  /* ==========================================================
     OPEN DETAILS
  ========================================================== */

  const openDetails = async (
    client: ClientRecord
  ) => {
    try {
      setSelectedClient(
        client
      );

      setSelectedIncentiveData(
        null
      );

      setDetailsError(null);

      /*
       * Since PSGA is maintained in the separate process
       * system and may not have a CRM PSGA row, we do not
       * invent a PSGA ID here.
       *
       * Details/allocation API will be connected to clientId
       * in the backend step.
       */
      setLoadingDetails(false);
    } catch (error) {
      console.error(
        "Failed to load incentive details:",
        error
      );

      setDetailsError(
        error instanceof Error
          ? error.message
          : "Unable to load incentive details."
      );

      setLoadingDetails(false);
    }
  };

  /* ==========================================================
     CLOSE DETAILS
  ========================================================== */

  const closeDetails = () => {
    setSelectedClient(null);

    setSelectedIncentiveData(
      null
    );

    setDetailsError(null);
  };

  /* ==========================================================
     OPEN CREATE
  ========================================================== */

  const openCreateAllocation =
    async (
      client: ClientRecord
    ) => {
      /*
       * We can only open the supporting BDE modal
       * for Lead-origin clients.
       *
       * Direct Admin clients are already assigned
       * to Admin as incentive recipient.
       */
      if (
        getRecipientType(
          client
        ) !== "BDE"
      ) {
        setCreateError(
          "This client is directly created by Admin. The incentive recipient is Admin."
        );

        return;
      }

      setCreateClient(
        client
      );

      setSelectedBdeId("");

      setCreateReason("");

      setCreatePercent("");

      setCreateError(null);

      setCreateMessage(null);

      setShowCreateModal(true);

      if (!bdes.length) {
        await loadBDEs();
      }
    };

  /* ==========================================================
     CLOSE CREATE
  ========================================================== */

  const closeCreateAllocation =
    () => {
      if (
        creatingIncentive
      ) {
        return;
      }

      setShowCreateModal(
        false
      );

      setCreateClient(null);

      setSelectedBdeId("");

      setCreateReason("");

      setCreatePercent("");

      setCreateError(null);

      setCreateMessage(null);
    };

  /* ==========================================================
     CREATE ALLOCATION
  ========================================================== */

  const handleCreateAllocation =
    async () => {
      if (!createClient) {
        return;
      }

      try {
        setCreatingIncentive(
          true
        );

        setCreateError(null);

        setCreateMessage(null);

        if (
          createClient.processStage !==
          "PSGA_COMPLETED"
        ) {
          throw new Error(
            "Incentive can be allocated only after the client reaches PSGA_COMPLETED."
          );
        }

        if (
          getRecipientType(
            createClient
          ) !== "BDE"
        ) {
          throw new Error(
            "This client is a direct Admin-created client. Its incentive recipient is Admin."
          );
        }

        /*
         * IMPORTANT:
         * The current backend still requires psgId.
         * We intentionally DO NOT invent a fake PSGA ID.
         */
        throw new Error(
          "Supporting BDE allocation is ready in the UI, but the current backend still requires a PSGA record. Next we need to change the incentive API to use clientId."
        );

        /*
         * Existing validation retained for the next backend step.
         */

        if (!selectedBdeId) {
          throw new Error(
            "Please select a supporting BDE."
          );
        }

        if (
          !createReason.trim()
        ) {
          throw new Error(
            "Please enter the reason for supporting BDE allocation."
          );
        }

        const numericPercent =
          Number(
            createPercent
          );

        if (
          !createPercent.trim() ||
          Number.isNaN(
            numericPercent
          ) ||
          numericPercent <= 0 ||
          numericPercent > 100
        ) {
          throw new Error(
            "Incentive percentage must be greater than 0 and up to 100."
          );
        }

        /*
         * This call is intentionally unreachable
         * until backend is changed to clientId.
         */
        const result =
          await createIncentive(
            {
              psgId:
                "",

              bdeId:
                selectedBdeId,

              role:
                "SUPPORTING",

              reason:
                createReason.trim(),

              incentivePercent:
                numericPercent,
            }
          );

        if (!result.success) {
          throw new Error(
            result.message ||
              "Unable to create incentive allocation."
          );
        }

        setCreateMessage(
          result.message ||
            "Supporting BDE incentive allocation created successfully."
        );

        await loadClients();

        setTimeout(() => {
          setShowCreateModal(
            false
          );

          setCreateClient(
            null
          );

          setSelectedBdeId("");

          setCreateReason("");

          setCreatePercent("");

          setCreateMessage(
            null
          );
        }, 700);
      } catch (error) {
        console.error(
          "Create incentive error:",
          error
        );

        setCreateError(
          error instanceof Error
            ? error.message
            : "Unable to create incentive allocation."
        );
      } finally {
        setCreatingIncentive(
          false
        );
      }
    };

  /* ==========================================================
     OPEN EDIT
  ========================================================== */

  const openEditAllocation = (
    allocation: IncentiveAllocation
  ) => {
    if (
      allocation.role ===
      "PRIMARY"
    ) {
      return;
    }

    if (
      allocation.status ===
      "PAID"
    ) {
      return;
    }

    setEditingAllocation(
      allocation
    );

    setEditReason(
      allocation.reason || ""
    );

    setEditPercent(
      String(
        allocation.incentivePercent
      )
    );

    setEditError(null);
  };

  /* ==========================================================
     CLOSE EDIT
  ========================================================== */

  const closeEditAllocation =
    () => {
      if (
        updatingAllocation
      ) {
        return;
      }

      setEditingAllocation(
        null
      );

      setEditReason("");

      setEditPercent("");

      setEditError(null);
    };

  /* ==========================================================
     UPDATE ALLOCATION
  ========================================================== */

  const handleUpdateAllocation =
    async () => {
      if (
        !editingAllocation
      ) {
        return;
      }

      try {
        setUpdatingAllocation(
          true
        );

        setEditError(null);

        if (
          editingAllocation.status ===
          "APPROVED"
        ) {
          throw new Error(
            "Approved incentive can only be marked as PAID."
          );
        }

        if (
          !editReason.trim()
        ) {
          throw new Error(
            "Reason is required."
          );
        }

        const numericPercent =
          Number(editPercent);

        if (
          Number.isNaN(
            numericPercent
          ) ||
          numericPercent <= 0 ||
          numericPercent > 100
        ) {
          throw new Error(
            "Incentive percentage must be greater than 0 and up to 100."
          );
        }

        const result =
          await updateIncentive(
            editingAllocation.id,
            {
              reason:
                editReason.trim(),

              incentivePercent:
                numericPercent,
            }
          );

        if (!result.success) {
          throw new Error(
            result.message ||
              "Unable to update incentive allocation."
          );
        }

        closeEditAllocation();
      } catch (error) {
        console.error(
          "Update incentive error:",
          error
        );

        setEditError(
          error instanceof Error
            ? error.message
            : "Unable to update incentive allocation."
        );
      } finally {
        setUpdatingAllocation(
          false
        );
      }
    };

  /* ==========================================================
     STATUS UPDATE
  ========================================================== */

  const handleStatusUpdate =
    async (
      allocation: IncentiveAllocation,
      status:
        | "ELIGIBLE"
        | "APPROVED"
        | "PAID"
    ) => {
      try {
        setUpdatingAllocation(
          true
        );

        setEditError(null);

        await updateIncentive(
          allocation.id,
          {
            status,
          }
        );
      } catch (error) {
        console.error(
          "Status update error:",
          error
        );

        setEditError(
          error instanceof Error
            ? error.message
            : "Unable to update incentive status."
        );
      } finally {
        setUpdatingAllocation(
          false
        );
      }
    };

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Incentive Management"
          items={[
            {
              label:
                "Admin Portal",
              href:
                "/dashboard",
            },

            {
              label:
                "Incentives",
            },
          ]}
        />

        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
            </div>

            <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
              Loading incentive
              records...
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
        pageTitle="Incentive Management"
        items={[
          {
            label:
              "Admin Portal",
            href:
              "/dashboard",
          },

          {
            label:
              "Incentives",
          },
        ]}
      />

      {/* HEADER */}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
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
                    d="M12 3v18M17 7.5c0-1.7-2.2-3-5-3s-5 1.3-5 3 2.2 3 5 3 5 1.3 5 3-2.2 3-5 3-5-1.3-5-3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  Incentive
                  Management
                </h1>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Clients automatically
                  become incentive
                  eligible after PSGA
                  completion.
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={
              loadClients
            }
          >
            Refresh
          </Button>
        </div>
      </section>

      {/* ERROR */}

      {errorMessage && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          {errorMessage}
        </div>
      )}

      {/* METRICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="PSGA Completed"
          value={
            metrics.total
          }
          description="Clients whose PSGA process is completed"
        />

        <MetricCard
          title="Eligible"
          value={
            metrics.eligible
          }
          description="Clients automatically eligible for incentive"
        />

        <MetricCard
          title="Approved"
          value={
            metrics.approved
          }
          description="Allocation approvals"
        />

        <MetricCard
          title="Paid"
          value={
            metrics.paid
          }
          description="Paid incentive allocations"
        />
      </div>

      {/* FILTERS */}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label
              htmlFor="incentive-search"
              className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
            >
              Search
            </label>

            <input
              id="incentive-search"
              type="text"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search client, contact, FSO, BDE..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="w-full lg:w-56">
            <label
              htmlFor="incentive-status"
              className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
            >
              Incentive Status
            </label>

            <select
              id="incentive-status"
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target
                    .value as
                    | "ALL"
                    | IncentiveStatus
                )
              }
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="ALL">
                All Statuses
              </option>

              <option value="ELIGIBLE">
                Eligible
              </option>

              <option value="APPROVED">
                Approved
              </option>

              <option value="PAID">
                Paid
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* TABLE */}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                PSGA Completed
                Clients
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {
                  filteredClients.length
                }{" "}
                record
                {filteredClients.length ===
                1
                  ? ""
                  : "s"}{" "}
                found
              </p>
            </div>
          </div>
        </div>

        {filteredClients.length ===
        0 ? (
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
                  d="M9 12h6M9 16h4M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              No PSGA completed
              clients found
            </p>

            <p className="mt-1 text-xs text-gray-400">
              A client will appear
              here automatically
              when its process stage
              becomes PSGA_COMPLETED.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-800/40">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Client
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Contact
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    FSO
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    PSGA
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Recipient
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Process
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Eligible
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredClients.map(
                  (
                    client
                  ) => {
                    const recipientType =
                      getRecipientType(
                        client
                      );

                    return (
                      <tr
                        key={
                          client.id
                        }
                        className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/30"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {getClientName(
                              client
                            )}
                          </p>

                          <p className="mt-1 text-[11px] text-gray-400">
                            {
                              client.id
                            }
                          </p>

                          {client.externalClientId && (
                            <p className="mt-1 text-[11px] text-gray-400">
                              External:{" "}
                              {
                                client.externalClientId
                              }
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {getClientContactName(
                              client
                            )}
                          </p>

                          <p className="mt-1 text-[11px] text-gray-400">
                            {getClientEmail(
                              client
                            )}
                          </p>

                          <p className="mt-1 text-[11px] text-gray-400">
                            {getClientPhone(
                              client
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {client.fsoNumber ||
                              "—"}
                          </p>

                          <p className="mt-1 text-[11px] text-gray-400">
                            {formatDate(
                              client.fsoGeneratedAt
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {client.psgaGeneratedAt
                              ? "Completed"
                              : "—"}
                          </p>

                          <p className="mt-1 text-[11px] text-gray-400">
                            {formatDate(
                              client.psgaGeneratedAt
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-2">
                            <RecipientBadge
                              type={
                                recipientType
                              }
                            />

                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {getRecipientName(
                                client
                              )}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                            {processStageLabel(
                              client.processStage
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status="ELIGIBLE"
                          />
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {recipientType ===
                              "BDE" && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                  openCreateAllocation(
                                    client
                                  )
                                }
                              >
                                Add BDE
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openDetails(
                                  client
                                )
                              }
                            >
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ======================================================
          DETAILS MODAL
      ======================================================= */}

      {selectedClient && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Incentive Details
                  </h2>

                  <StatusBadge
                    status="ELIGIBLE"
                  />
                </div>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Client:{" "}
                  <span className="font-semibold">
                    {getClientName(
                      selectedClient
                    )}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeDetails
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
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

            <div className="max-h-[calc(90vh-85px)] overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Client
                  </p>

                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {getClientName(
                      selectedClient
                    )}
                  </p>

                  <p className="mt-1 text-[11px] text-gray-400">
                    {
                      selectedClient.id
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Process Stage
                  </p>

                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {processStageLabel(
                      selectedClient.processStage
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Incentive Recipient
                  </p>

                  <div className="mt-2 flex flex-col items-start gap-2">
                    <RecipientBadge
                      type={getRecipientType(
                        selectedClient
                      )}
                    />

                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {getRecipientName(
                        selectedClient
                      )}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Incentive Status
                  </p>

                  <div className="mt-2">
                    <StatusBadge
                      status="ELIGIBLE"
                    />
                  </div>
                </div>
              </div>

              {/* CLIENT PROCESS */}

              <div className="mt-5 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Process Information
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[11px] text-gray-400">
                      FSO Number
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {
                        selectedClient.fsoNumber ||
                        "—"
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-gray-400">
                      FSO Generated
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {formatDate(
                        selectedClient.fsoGeneratedAt
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-gray-400">
                      PSGA Generated
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {formatDate(
                        selectedClient.psgaGeneratedAt
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-gray-400">
                      Process Updated
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {formatDateTime(
                        selectedClient.processUpdatedAt
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* RECIPIENT */}

              <div className="mt-5 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Incentive Attribution
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] text-gray-400">
                      Recipient Type
                    </p>

                    <div className="mt-2">
                      <RecipientBadge
                        type={getRecipientType(
                          selectedClient
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] text-gray-400">
                      Recipient
                    </p>

                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                      {getRecipientName(
                        selectedClient
                      )}
                    </p>
                  </div>
                </div>

                {selectedClient.sourceLead ? (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      Lead-origin client
                    </p>

                    <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                      This client originated
                      from a Lead, so the
                      incentive recipient is
                      the BDE.
                    </p>

                    <p className="mt-2 text-xs text-blue-700 dark:text-blue-400">
                      Lead ID:{" "}
                      {
                        selectedClient
                          .sourceLead
                          .id
                      }
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/20 dark:bg-violet-500/10">
                    <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">
                      Direct Admin client
                    </p>

                    <p className="mt-1 text-xs text-violet-700 dark:text-violet-400">
                      This client was created
                      directly by Admin, so
                      the incentive recipient
                      is Admin.
                    </p>
                  </div>
                )}
              </div>

              {/* ELIGIBILITY */}

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
                    Incentive Eligible
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-400">
                    This client has reached
                    PSGA_COMPLETED. The
                    incentive recipient is
                    determined from the
                    client's origin.
                  </p>
                </div>
              </div>

              {/* CURRENT BACKEND NOTE */}

              {!selectedIncentiveData && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Allocation API pending
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-400">
                    This client is correctly
                    showing as incentive eligible.
                    The existing allocation API
                    still expects a PSGA database
                    ID. We will change that API
                    to use this client directly,
                    so no manual PSGA entry is
                    required.
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-end border-t border-gray-100 pt-5 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={
                    closeDetails
                  }
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          CREATE MODAL
      ======================================================= */}

      {showCreateModal &&
        createClient && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Add Supporting BDE
                    Incentive
                  </h2>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Client:{" "}
                    <span className="font-semibold">
                      {getClientName(
                        createClient
                      )}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeCreateAllocation
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
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
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Client
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {getClientName(
                      createClient
                    )}
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Process:{" "}
                    {processStageLabel(
                      createClient.processStage
                    )}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <RecipientBadge
                      type={getRecipientType(
                        createClient
                      )}
                    />

                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {getRecipientName(
                        createClient
                      )}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Backend update required
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-400">
                    The client is already PSGA
                    completed and eligible. The
                    current backend still requires
                    a PSGA record ID for creating
                    an allocation. We will update
                    the backend next to accept
                    this client ID directly.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="supporting-bde"
                    className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Supporting BDE
                    <span className="ml-1 text-error-500">
                      *
                    </span>
                  </label>

                  <select
                    id="supporting-bde"
                    value={
                      selectedBdeId
                    }
                    onChange={(
                      event
                    ) =>
                      setSelectedBdeId(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      loadingBdes ||
                      creatingIncentive
                    }
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">
                      {loadingBdes
                        ? "Loading BDEs..."
                        : "Select supporting BDE"}
                    </option>

                    {bdes.map(
                      (
                        bde
                      ) => (
                        <option
                          key={
                            bde.id
                          }
                          value={
                            bde.id
                          }
                        >
                          {getFullName(
                            bde
                          ) ||
                            bde.email ||
                            bde.id}
                        </option>
                      )
                    )}
                  </select>

                  {bdeLoadError && (
                    <p className="mt-2 text-xs text-error-600 dark:text-error-400">
                      {
                        bdeLoadError
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="supporting-reason"
                    className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Reason
                    <span className="ml-1 text-error-500">
                      *
                    </span>
                  </label>

                  <textarea
                    id="supporting-reason"
                    rows={4}
                    value={
                      createReason
                    }
                    onChange={(
                      event
                    ) =>
                      setCreateReason(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      creatingIncentive
                    }
                    placeholder="Enter the reason for supporting BDE allocation..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="supporting-percent"
                    className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Incentive Percentage
                    <span className="ml-1 text-error-500">
                      *
                    </span>
                  </label>

                  <div className="relative">
                    <input
                      id="supporting-percent"
                      type="number"
                      min="0.01"
                      max="100"
                      step="0.01"
                      value={
                        createPercent
                      }
                      onChange={(
                        event
                      ) =>
                        setCreatePercent(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        creatingIncentive
                      }
                      placeholder="Enter percentage"
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                      %
                    </span>
                  </div>

                  <p className="mt-1.5 text-[11px] text-gray-400">
                    Enter the percentage
                    decided by Admin. No
                    automatic percentage is
                    being invented here.
                  </p>
                </div>

                {createError && (
                  <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
                    {createError}
                  </div>
                )}

                {createMessage && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                    {createMessage}
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={
                      closeCreateAllocation
                    }
                    disabled={
                      creatingIncentive
                    }
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={
                      handleCreateAllocation
                    }
                    disabled={
                      creatingIncentive ||
                      loadingBdes
                    }
                  >
                    {creatingIncentive
                      ? "Creating..."
                      : "Create Allocation"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* ======================================================
          EDIT MODAL
      ======================================================= */}

      {editingAllocation && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Edit Incentive
                  Allocation
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Supporting BDE
                  allocation
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeEditAllocation
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
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
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] text-gray-400">
                      Recipient
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {getFullName(
                        editingAllocation.bde
                      ) ||
                        getFullName(
                          editingAllocation.admin
                        ) ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-gray-400">
                      Role
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {
                        editingAllocation.role
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-gray-400">
                      Status
                    </p>

                    <div className="mt-1">
                      <StatusBadge
                        status={
                          editingAllocation.status
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {editingAllocation.status ===
                "APPROVED" && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400">
                  This allocation is
                  approved. Only the{" "}
                  <strong>
                    PAID
                  </strong>{" "}
                  status transition is
                  allowed.
                </div>
              )}

              <div>
                <label
                  htmlFor="edit-reason"
                  className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  Reason
                </label>

                <textarea
                  id="edit-reason"
                  rows={4}
                  value={
                    editReason
                  }
                  onChange={(
                    event
                  ) =>
                    setEditReason(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    updatingAllocation ||
                    editingAllocation.status ===
                      "APPROVED"
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-percent"
                  className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  Incentive Percentage
                </label>

                <div className="relative">
                  <input
                    id="edit-percent"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={
                      editPercent
                    }
                    onChange={(
                      event
                    ) =>
                      setEditPercent(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      updatingAllocation ||
                      editingAllocation.status ===
                        "APPROVED"
                    }
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                    %
                  </span>
                </div>
              </div>

              {editError && (
                <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={
                    closeEditAllocation
                  }
                  disabled={
                    updatingAllocation
                  }
                >
                  Cancel
                </Button>

                {editingAllocation.status !==
                  "APPROVED" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={
                      handleUpdateAllocation
                    }
                    disabled={
                      updatingAllocation
                    }
                  >
                    {updatingAllocation
                      ? "Updating..."
                      : "Save Changes"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}