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
   CLIENT PROCESS TYPES
============================================================ */

export type ClientProcessStage =
  | "CLIENT_CREATED"
  | "FSO_GENERATED"
  | "PSGA_GENERATED"
  | "PSGA_COMPLETED";

export interface ClientProcessData {
  processStage: ClientProcessStage;
  externalClientId?: string | null;
  fsoNumber?: string | null;
  fsoGeneratedAt?: string | null;
  psgaGeneratedAt?: string | null;
  processUpdatedAt?: string | null;
}

export interface UpdateClientProcessInput {
  processStage: ClientProcessStage;
  externalClientId?: string;
  fsoNumber?: string;
  fsoGeneratedAt?: string;
  psgaGeneratedAt?: string;
}

export interface ClientProcessStats {
  clientCreated: number;
  fsoGenerated: number;
  psgaGenerated: number;
  psgaCompleted: number;
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

    /*
    |--------------------------------------------------------------------------
    | PROCESS TRACKING
    |--------------------------------------------------------------------------
    */

    processStage:
      client?.processStage ||
      "CLIENT_CREATED",

    externalClientId:
      client?.externalClientId ||
      undefined,

    fsoNumber:
      client?.fsoNumber ||
      undefined,

    fsoGeneratedAt:
      client?.fsoGeneratedAt ||
      undefined,

    psgaGeneratedAt:
      client?.psgaGeneratedAt ||
      undefined,

    processUpdatedAt:
      client?.processUpdatedAt ||
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

    /*
    |--------------------------------------------------------------------------
    | COMPANY NAME
    |--------------------------------------------------------------------------
    */

    if (
      updates.companyName !==
      undefined
    ) {
      payload.associationName =
        updates.companyName.trim();
    }

    /*
    |--------------------------------------------------------------------------
    | CONTACT PERSON
    |--------------------------------------------------------------------------
    */

    if (
      updates.contactPerson !==
      undefined
    ) {
      payload.contactName =
        updates.contactPerson.trim();
    }

    /*
    |--------------------------------------------------------------------------
    | EMAIL
    |--------------------------------------------------------------------------
    */

    if (
      updates.contactEmail !==
      undefined
    ) {
      const email =
        updates.contactEmail.trim();

      if (email) {
        payload.email = email;
      } else {
        delete payload.email;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | MOBILE
    |--------------------------------------------------------------------------
    */

    if (
      updates.contactPhone !==
      undefined
    ) {
      const mobile =
        updates.contactPhone.trim();

      if (mobile) {
        payload.mobile = mobile;
      } else {
        delete payload.mobile;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | ADDRESS
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | CITY
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | STATE
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | PINCODE
    |--------------------------------------------------------------------------
    */

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
     UPDATE CLIENT PROCESS
  ========================================================== */

  async updateClientProcess(
    id: string,
    input: UpdateClientProcessInput
  ): Promise<ClientItem> {
    if (!id) {
      throw new Error(
        "Client ID is required."
      );
    }

    if (!input.processStage) {
      throw new Error(
        "Client process stage is required."
      );
    }

    const payload: Record<
      string,
      unknown
    > = {
      processStage:
        input.processStage,
    };

    /*
    |--------------------------------------------------------------------------
    | EXTERNAL CLIENT ID
    |--------------------------------------------------------------------------
    */

    if (
      input.externalClientId !==
      undefined
    ) {
      const externalClientId =
        input.externalClientId
          .trim();

      if (externalClientId) {
        payload.externalClientId =
          externalClientId;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | FSO NUMBER
    |--------------------------------------------------------------------------
    */

    if (
      input.fsoNumber !==
      undefined
    ) {
      const fsoNumber =
        input.fsoNumber.trim();

      if (fsoNumber) {
        payload.fsoNumber =
          fsoNumber;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | FSO GENERATED DATE
    |--------------------------------------------------------------------------
    */

    if (
      input.fsoGeneratedAt !==
      undefined
    ) {
      payload.fsoGeneratedAt =
        input.fsoGeneratedAt;
    }

    /*
    |--------------------------------------------------------------------------
    | PSGA GENERATED DATE
    |--------------------------------------------------------------------------
    */

    if (
      input.psgaGeneratedAt !==
      undefined
    ) {
      payload.psgaGeneratedAt =
        input.psgaGeneratedAt;
    }

    const response = await fetch(
      `${API_BASE_URL}/clients/${id}/process`,
      {
        method: "PATCH",
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
        "Updated client process data was not returned."
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

          process?: {
            clientCreated?: number;
            fsoGenerated?: number;
            psgaGenerated?: number;
            psgaCompleted?: number;
          };
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
     GET CLIENT PROCESS STATS
  ========================================================== */

  async getClientProcessStats(): Promise<ClientProcessStats> {
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
          process?: {
            clientCreated?: number;
            fsoGenerated?: number;
            psgaGenerated?: number;
            psgaCompleted?: number;
          };
        };
      }>(response);

    return {
      clientCreated:
        data.data?.process
          ?.clientCreated || 0,

      fsoGenerated:
        data.data?.process
          ?.fsoGenerated || 0,

      psgaGenerated:
        data.data?.process
          ?.psgaGenerated || 0,

      psgaCompleted:
        data.data?.process
          ?.psgaCompleted || 0,
    };
  },

  /* ==========================================================
     ADMIN ONLY: ASSIGN CLIENT TO BDE
  ========================================================== */

  async assignClientBde(
    clientId: string,
    bdeId: string
  ): Promise<ClientItem> {
    if (!clientId) {
      throw new Error(
        "Client ID is required."
      );
    }

    if (!bdeId) {
      throw new Error(
        "BDE ID is required."
      );
    }

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