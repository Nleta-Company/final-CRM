import {
  ClientItem,
  CreateClientInput,
  UpdateClientInput,
  ClientStats,
  ClientFilterOptions,
} from "@/types/client";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

const CLIENTS_CHANGE_EVENT = "nleta_clients_updated";

function getToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken")
  );
}

function getHeaders(): HeadersInit {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

function getFullName(user: any): string {
  return [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

/* ============================================================
   BACKEND CLIENT -> FRONTEND CLIENT
============================================================ */

function mapClient(client: any): ClientItem {
  const assignedBde = client?.assignedBde;
  const createdBy = client?.createdBy;

  return {
    id: client?.id || "",

    companyName:
      client?.associationName ||
      client?.companyName ||
      "",

    clientType:
      client?.clientType ||
      "Residential RWA",

    contactPerson:
      client?.contactName ||
      client?.contactPerson ||
      "",

    contactEmail:
      client?.email ||
      client?.contactEmail ||
      "",

    contactPhone:
      client?.mobile ||
      client?.contactPhone ||
      "",

    address: client?.address || "",

    city: client?.city || "",

    state: client?.state || "",

    totalAssetsCount:
      Number(client?.totalAssetsCount) || 0,

    contractStatus:
      client?.contractStatus ||
      "Active Agreement",

    contractValue:
      client?.contractValue ||
      "₹ 0",

    numericContractValue:
      Number(client?.numericContractValue) || 0,

    accountManager:
      client?.accountManager ||
      getFullName(createdBy) ||
      "—",

    assignedBdeId:
      client?.assignedBdeId ||
      assignedBde?.id ||
      undefined,

    assignedBdeName:
      client?.assignedBdeName ||
      getFullName(assignedBde) ||
      undefined,

    joinedDate:
      client?.joinedDate ||
      client?.createdAt ||
      "",

    nextAuditDate:
      client?.nextAuditDate ||
      undefined,

    notes:
      client?.notes ||
      undefined,
  };
}

function notifyChange() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new Event(CLIENTS_CHANGE_EVENT)
  );
}

async function handleResponse<T>(
  response: Response
): Promise<T> {
  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

/* ============================================================
   COMPLETE CLIENT TYPES
============================================================ */

export interface CompleteClientSelectionInput {
  serviceId: string;
  pricingRuleId: string;
  quantity: number;
  notes?: string;
}

export interface CreateCompleteClientInput
  extends CreateClientInput {
  selections: CompleteClientSelectionInput[];
}

/* ============================================================
   CLIENT SERVICE
============================================================ */

export const clientService = {
  /* ==========================================================
     GET ALL CLIENTS
  ========================================================== */

  async getAllClients(
    filters?: ClientFilterOptions
  ): Promise<ClientItem[]> {
    const response = await fetch(
      `${API_BASE_URL}/clients`,
      {
        method: "GET",
        headers: getHeaders(),
        credentials: "include",
        cache: "no-store",
      }
    );

    const data = await handleResponse<{
      success: boolean;
      data?: {
        clients?: any[];
        total?: number;
      };
    }>(response);

    let clients = (
      data.data?.clients || []
    ).map(mapClient);

    if (filters?.search?.trim()) {
      const query =
        filters.search
          .trim()
          .toLowerCase();

      clients = clients.filter(
        (client) => {
          return (
            client.companyName
              .toLowerCase()
              .includes(query) ||
            client.contactPerson
              .toLowerCase()
              .includes(query) ||
            client.contactEmail
              .toLowerCase()
              .includes(query) ||
            client.contactPhone
              .toLowerCase()
              .includes(query) ||
            client.city
              .toLowerCase()
              .includes(query) ||
            client.state
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }

    if (
      filters?.clientType &&
      filters.clientType !== "ALL"
    ) {
      clients = clients.filter(
        (client) =>
          client.clientType ===
          filters.clientType
      );
    }

    if (
      filters?.contractStatus &&
      filters.contractStatus !== "ALL"
    ) {
      clients = clients.filter(
        (client) =>
          client.contractStatus ===
          filters.contractStatus
      );
    }

    return clients;
  },

  /* ==========================================================
     GET CLIENT BY ID
  ========================================================== */

  async getClientById(
    id: string
  ): Promise<ClientItem | null> {
    if (!id) return null;

    const response = await fetch(
      `${API_BASE_URL}/clients/${id}`,
      {
        method: "GET",
        headers: getHeaders(),
        credentials: "include",
        cache: "no-store",
      }
    );

    if (response.status === 404) {
      return null;
    }

    const data = await handleResponse<{
      success: boolean;
      data?: {
        client?: any;
      };
    }>(response);

    if (!data.data?.client) {
      return null;
    }

    return mapClient(
      data.data.client
    );
  },

  /* ==========================================================
     CREATE CLIENT
  ========================================================== */

  async createClient(
    input: CreateClientInput
  ): Promise<ClientItem> {
    const payload = {
      associationName:
        input.companyName?.trim(),

      contactName:
        input.contactPerson?.trim(),

      email:
        input.contactEmail?.trim() ||
        undefined,

      mobile:
        input.contactPhone?.trim() ||
        undefined,

      address:
        input.address?.trim() ||
        undefined,

      city:
        input.city?.trim() ||
        undefined,

      state:
        input.state?.trim() ||
        undefined,

      pincode:
        (input as any).pincode?.trim() ||
        undefined,
    };

    const response = await fetch(
      `${API_BASE_URL}/clients`,
      {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );

    const data = await handleResponse<{
      success: boolean;
      data?: {
        client?: any;
      };
    }>(response);

    if (!data.data?.client) {
      throw new Error(
        "Client was created but no client data was returned."
      );
    }

    const client = mapClient(
      data.data.client
    );

    notifyChange();

    return client;
  },

  /* ==========================================================
     CREATE COMPLETE CLIENT
  ========================================================== */

  async createCompleteClient(
    input: CreateCompleteClientInput
  ): Promise<ClientItem> {
    if (
      !input.selections ||
      input.selections.length === 0
    ) {
      throw new Error(
        "At least one service selection is required."
      );
    }

    const normalizedSelections =
      input.selections.map(
        (selection) => ({
          serviceId:
            selection.serviceId?.trim(),

          pricingRuleId:
            selection.pricingRuleId?.trim(),

          quantity:
            Number(selection.quantity),

          notes:
            selection.notes?.trim() ||
            undefined,
        })
      );

    for (
      const selection of
        normalizedSelections
    ) {
      if (!selection.serviceId) {
        throw new Error(
          "Service is required for every selection."
        );
      }

      if (!selection.pricingRuleId) {
        throw new Error(
          "Pricing rule is required for every selection."
        );
      }

      if (
        !Number.isFinite(
          selection.quantity
        ) ||
        selection.quantity <= 0
      ) {
        throw new Error(
          "Quantity must be greater than zero."
        );
      }
    }

    const payload = {
      associationName:
        input.companyName?.trim(),

      contactName:
        input.contactPerson?.trim(),

      email:
        input.contactEmail?.trim() ||
        undefined,

      mobile:
        input.contactPhone?.trim() ||
        undefined,

      address:
        input.address?.trim() ||
        undefined,

      city:
        input.city?.trim() ||
        undefined,

      state:
        input.state?.trim() ||
        undefined,

      pincode:
        (input as any).pincode?.trim() ||
        undefined,

      selections:
        normalizedSelections,
    };

    const response = await fetch(
      `${API_BASE_URL}/clients/complete`,
      {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );

    const data = await handleResponse<{
      success: boolean;
      message?: string;
      data?: {
        client?: any;
      };
    }>(response);

    if (!data.data?.client) {
      throw new Error(
        "Complete client data was not returned."
      );
    }

    const client = mapClient(
      data.data.client
    );

    notifyChange();

    return client;
  },

  /* ==========================================================
     UPDATE CLIENT
  ========================================================== */

  async updateClient(
    id: string,
    updates: UpdateClientInput
  ): Promise<ClientItem> {
    if (!id) {
      throw new Error(
        "Client ID is required."
      );
    }

    const payload: Record<
      string,
      unknown
    > = {};

    /* --------------------------------------------------------
       IMPORTANT FIX

       Do NOT send null for optional Zod string fields.

       Backend schema expects:
         string | undefined

       Not:
         null

       This was causing:
         "Invalid client data"
       -------------------------------------------------------- */

    if (
      updates.companyName !==
      undefined
    ) {
      payload.associationName =
        updates.companyName
          .trim();
    }

    if (
      updates.contactPerson !==
      undefined
    ) {
      payload.contactName =
        updates.contactPerson
          .trim();
    }

    if (
      updates.contactEmail !==
      undefined
    ) {
      const email =
        updates.contactEmail
          .trim();

      if (email) {
        payload.email = email;
      } else {
        /*
         * Send undefined by simply
         * omitting the property.
         */
        delete payload.email;
      }
    }

    if (
      updates.contactPhone !==
      undefined
    ) {
      const mobile =
        updates.contactPhone
          .trim();

      if (mobile) {
        payload.mobile = mobile;
      } else {
        delete payload.mobile;
      }
    }

    if (
      updates.address !==
      undefined
    ) {
      const address =
        updates.address.trim();

      if (address) {
        payload.address = address;
      } else {
        delete payload.address;
      }
    }

    if (
      updates.city !==
      undefined
    ) {
      const city =
        updates.city.trim();

      if (city) {
        payload.city = city;
      } else {
        delete payload.city;
      }
    }

    if (
      updates.state !==
      undefined
    ) {
      const state =
        updates.state.trim();

      if (state) {
        payload.state = state;
      } else {
        delete payload.state;
      }
    }

    if (
      (updates as any).pincode !==
      undefined
    ) {
      const pincode =
        String(
          (updates as any)
            .pincode || ""
        ).trim();

      if (pincode) {
        payload.pincode = pincode;
      } else {
        delete payload.pincode;
      }
    }

    console.log(
      "UPDATE CLIENT PAYLOAD:",
      payload
    );

    const response = await fetch(
      `${API_BASE_URL}/clients/${id}`,
      {
        method: "PUT",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );

    const data = await handleResponse<{
      success: boolean;
      message?: string;
      data?: {
        client?: any;
      };
    }>(response);

    if (!data.data?.client) {
      throw new Error(
        "Updated client data was not returned."
      );
    }

    const client = mapClient(
      data.data.client
    );

    notifyChange();

    return client;
  },

  /* ==========================================================
     DELETE CLIENT
  ========================================================== */

  async deleteClient(
    id: string
  ): Promise<boolean> {
    const response = await fetch(
      `${API_BASE_URL}/clients/${id}`,
      {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
      }
    );

    await handleResponse(response);

    notifyChange();

    return true;
  },

  /* ==========================================================
     CLIENT STATS
  ========================================================== */

  async getClientStats(): Promise<ClientStats> {
    const response = await fetch(
      `${API_BASE_URL}/clients/stats`,
      {
        method: "GET",
        headers: getHeaders(),
        credentials: "include",
        cache: "no-store",
      }
    );

    const data =
      await handleResponse<{
        success: boolean;
        data?: {
          totalClients?: number;
          activeClients?: number;
          inactiveClients?: number;
        };
      }>(response);

    const totalClients =
      data.data?.totalClients || 0;

    const activeClients =
      data.data?.activeClients || 0;

    const inactiveClients =
      data.data?.inactiveClients || 0;

    return {
      totalClients,

      activeContracts:
        activeClients,

      totalContractValue: 0,

      formattedTotalValue:
        "₹ 0",

      totalAssetsManaged: 0,

      pendingRenewals: 0,

      statusBreakdown: {
        "Active Agreement":
          activeClients,

        "Pending Renewal": 0,

        "Under Audit": 0,

        Expired:
          inactiveClients,

        Onboarding: 0,
      },
    };
  },

  /* ==========================================================
     ADMIN ONLY: ASSIGN CLIENT TO BDE
  ========================================================== */

  async assignClientBde(
    clientId: string,
    bdeId: string
  ): Promise<ClientItem> {
    const response = await fetch(
      `${API_BASE_URL}/clients/${clientId}/assign-bde`,
      {
        method: "PATCH",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({
          bdeId,
        }),
      }
    );

    const data = await handleResponse<{
      success: boolean;
      data?: {
        client?: any;
      };
    }>(response);

    if (!data.data?.client) {
      throw new Error(
        "Updated client data was not returned."
      );
    }

    const client = mapClient(
      data.data.client
    );

    notifyChange();

    return client;
  },

  /* ==========================================================
     SUBSCRIBE
  ========================================================== */

  subscribe(
    callback: () => void
  ): () => void {
    if (
      typeof window ===
      "undefined"
    ) {
      return () => {};
    }

    const handler = () =>
      callback();

    window.addEventListener(
      CLIENTS_CHANGE_EVENT,
      handler
    );

    window.addEventListener(
      "storage",
      handler
    );

    return () => {
      window.removeEventListener(
        CLIENTS_CHANGE_EVENT,
        handler
      );

      window.removeEventListener(
        "storage",
        handler
      );
    };
  },
};

export default clientService;