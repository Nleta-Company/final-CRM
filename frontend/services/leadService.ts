import {
  LeadItem,
  CreateLeadInput,
  UpdateLeadInput,
  LeadStats,
  LeadFilterOptions,
  LeadStatus,
  AssignLeadBdeInput,
  ConvertLeadToClientInput,
} from "@/types/lead";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

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

function getApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${API_BASE_URL}${normalizedEndpoint}`;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const url = getApiUrl(endpoint);

  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Accept", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    console.error("CRM API network error:", {
      url,
      error,
    });

    throw new Error(
      `Unable to connect to CRM API at ${url}. ` +
        `Make sure the backend is running on port 5000.`
    );
  }

  let result: any = null;

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      result = await response.json();
    } catch {
      result = null;
    }
  } else {
    try {
      const text = await response.text();
      result = text ? { message: text } : null;
    } catch {
      result = null;
    }
  }

  if (!response.ok) {
    const message =
      result?.message ||
      result?.error ||
      `Request failed with status ${response.status}`;

    if (response.status === 401) {
      console.error("CRM API authentication error:", message);
    }

    throw new Error(message);
  }

  return result as T;
}

function buildQueryString(filters?: LeadFilterOptions): string {
  if (!filters) {
    return "";
  }

  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

interface LeadListApiResponse {
  success: boolean;
  message: string;
  data: {
    leads: LeadItem[];
    total: number;
  };
}

interface LeadApiResponse {
  success: boolean;
  message: string;
  data: {
    lead: LeadItem;
  };
}

interface LeadStatsApiResponse {
  success: boolean;
  message?: string;
  data: LeadStats;
}

interface ConvertLeadApiResponse {
  success: boolean;
  message: string;
  data: {
    client: unknown;
    lead: LeadItem;
  };
}

export function parseINR(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const cleaned = value.replace(/[₹,\s]/g, "");

  if (!cleaned) {
    return 0;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatINR(value: unknown): string {
  const amount = parseINR(value);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatStandardINR(value: unknown): string {
  const amount = parseINR(value);

  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

export const leadService = {
  async getAllLeads(
    filters?: LeadFilterOptions
  ): Promise<LeadItem[]> {
    const query = buildQueryString(filters);

    const response = await apiRequest<LeadListApiResponse>(
      `/leads${query}`
    );

    if (!response?.data) {
      return [];
    }

    return response.data.leads || [];
  },

  async getLeadById(
    id: string
  ): Promise<LeadItem | null> {
    try {
      const response = await apiRequest<LeadApiResponse>(
        `/leads/${encodeURIComponent(id)}`
      );

      return response?.data?.lead || null;
    } catch (error: any) {
      const message = String(error?.message || "").toLowerCase();

      if (
        message.includes("lead not found") ||
        message.includes("not found")
      ) {
        return null;
      }

      throw error;
    }
  },

  async createLead(
    input: CreateLeadInput
  ): Promise<LeadItem> {
    const response = await apiRequest<LeadApiResponse>(
      "/leads",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );

    this.notifyChange();

    return response.data.lead;
  },

  async updateLead(
    id: string,
    updates: UpdateLeadInput
  ): Promise<LeadItem> {
    const response = await apiRequest<LeadApiResponse>(
      `/leads/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(updates),
      }
    );

    this.notifyChange();

    return response.data.lead;
  },

  async deleteLead(id: string): Promise<boolean> {
    await apiRequest<{
      success: boolean;
      message: string;
    }>(
      `/leads/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    );

    this.notifyChange();

    return true;
  },

  async getLeadStats(): Promise<LeadStats> {
    const response =
      await apiRequest<LeadStatsApiResponse>(
        "/leads/stats"
      );

    return response.data;
  },

  async updateLeadStage(
    id: string,
    status: LeadStatus
  ): Promise<LeadItem> {
    const response = await apiRequest<LeadApiResponse>(
      `/leads/${encodeURIComponent(id)}/stage`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    );

    this.notifyChange();

    return response.data.lead;
  },

  async assignBdeToLead(
    leadId: string,
    bdeId: string
  ): Promise<LeadItem> {
    const body: AssignLeadBdeInput = {
      bdeId,
    };

    const response = await apiRequest<LeadApiResponse>(
      `/leads/${encodeURIComponent(leadId)}/assign-bde`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );

    this.notifyChange();

    return response.data.lead;
  },

  async convertLeadToClient(
    leadId: string,
    input: ConvertLeadToClientInput = {}
  ): Promise<ConvertLeadApiResponse["data"]> {
    const response =
      await apiRequest<ConvertLeadApiResponse>(
        `/leads/${encodeURIComponent(
          leadId
        )}/convert-to-client`,
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      );

    this.notifyChange();

    return response.data;
  },

  subscribe(
    callback: () => void
  ): () => void {
    if (typeof window === "undefined") {
      return () => {};
    }

    const eventName = "nleta_leads_updated";
    const handler = () => callback();

    window.addEventListener(eventName, handler);

    return () => {
      window.removeEventListener(eventName, handler);
    };
  },

  notifyChange(): void {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new Event("nleta_leads_updated")
    );
  },
};

export default leadService;
