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

  process.env.NEXT_PUBLIC_API_URL ||

  "http://localhost:5000/api"

).replace(/\/+$/, "");



// ============================================================

// AUTH

// ============================================================



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



// ============================================================

// API URL

// ============================================================



function getApiUrl(endpoint: string): string {

  const normalizedEndpoint =

    endpoint.startsWith("/")

      ? endpoint

      : `/${endpoint}`;



  return `${API_BASE_URL}${normalizedEndpoint}`;

}



// ============================================================

// API REQUEST

// ============================================================



async function apiRequest<T>(

  endpoint: string,

  options: RequestInit = {}

): Promise<T> {

  const token = getAuthToken();



  const url = getApiUrl(endpoint);



  const headers = new Headers(

    options.headers

  );



  if (

    !headers.has("Content-Type") &&

    options.body

  ) {

    headers.set(

      "Content-Type",

      "application/json"

    );

  }



  headers.set(

    "Accept",

    "application/json"

  );



  if (token) {

    headers.set(

      "Authorization",

      `Bearer ${token}`

    );

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

    console.error(

      "CRM API network error:",

      {

        url,

        error,

      }

    );



    throw new Error(

      `Unable to connect to CRM API at ${url}. ` +

        `Make sure the backend is running on port 5000.`

    );

  }



  let result: any = null;



  const contentType =

    response.headers.get(

      "content-type"

    ) || "";



  if (

    contentType.includes(

      "application/json"

    )

  ) {

    try {

      result =

        await response.json();

    } catch {

      result = null;

    }

  } else {

    try {

      const text =

        await response.text();



      result = text

        ? { message: text }

        : null;

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

      console.error(

        "CRM API authentication error:",

        message

      );

    }



    throw new Error(message);

  }



  return result as T;

}



// ============================================================

// QUERY

// ============================================================



function buildQueryString(

  filters?: LeadFilterOptions

): string {

  if (!filters) {

    return "";

  }



  const params =

    new URLSearchParams();



  if (filters.search?.trim()) {

    params.set(

      "search",

      filters.search.trim()

    );

  }



  if (

    filters.status &&

    filters.status !== "ALL"

  ) {

    params.set(

      "status",

      filters.status

    );

  }



  const query =

    params.toString();



  return query

    ? `?${query}`

    : "";

}



// ============================================================

// LEAD API RESPONSES

// ============================================================



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



// ============================================================

// LEAD SERVICE SELECTION

// ============================================================



export interface LeadServiceSelectionItem {

  id: string;



  leadId: string;



  serviceId: string;



  serviceCode: string;



  serviceName: string;



  pricingBasis: string;



  pricingLabel?: string | null;



  assetCategory?: string | null;



  quantity: number | string;



  unitRate: number | string;



  baseAmount: number | string;



  gstPercent: number | string;



  gstAmount: number | string;



  totalAmount: number | string;



  notes?: string | null;



  createdById: string;



  createdAt?: string;



  updatedAt?: string;

}



interface LeadServiceSelectionsResponse {

  success: boolean;



  message: string;



  data: {

    leadId: string;



    selections:

      LeadServiceSelectionItem[];



    total: number;

  };

}



interface LeadServiceSelectionResponse {

  success: boolean;



  message: string;



  data: {

    selection:

      LeadServiceSelectionItem;

  };

}



interface DeleteLeadServiceSelectionResponse {

  success: boolean;



  message: string;

}



// ============================================================


// ============================================================
// LEAD ASSETS
// ============================================================

export interface LeadAssetItem {
  id: string;
  leadId: string;
  assetName?: string | null;
  assetReference?: string | null;
  installationLocation?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  installationYear?: number | string | null;
  existingAmc?: string | null;
  currentServiceProvider?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadAssetInput {
  assetName?: string;
  assetReference?: string;
  installationLocation?: string;
  manufacturer?: string;
  model?: string;
  installationYear?: number;
  existingAmc?: string;
  currentServiceProvider?: string;
}

interface LeadAssetsResponse {
  success: boolean;
  message: string;
  data: {
    leadId: string;
    assets: LeadAssetItem[];
    total: number;
  };
}

interface LeadAssetResponse {
  success: boolean;
  message: string;
  data: {
    asset: LeadAssetItem;
  };
}

// NUMBER HELPERS

// ============================================================



export function parseINR(

  value: unknown

): number {

  if (typeof value === "number") {

    return Number.isFinite(value)

      ? value

      : 0;

  }



  if (typeof value !== "string") {

    return 0;

  }



  const cleaned =

    value.replace(

      /[₹,\s]/g,

      ""

    );



  if (!cleaned) {

    return 0;

  }



  const parsed =

    Number(cleaned);



  return Number.isFinite(parsed)

    ? parsed

    : 0;

}



export function formatINR(

  value: unknown

): string {

  const amount =

    parseINR(value);



  return new Intl.NumberFormat(

    "en-IN",

    {

      style: "currency",

      currency: "INR",

      maximumFractionDigits: 0,

    }

  ).format(amount);

}



export function formatStandardINR(

  value: unknown

): string {

  const amount =

    parseINR(value);



  return `₹${new Intl.NumberFormat(

    "en-IN",

    {

      maximumFractionDigits: 0,

    }

  ).format(amount)}`;

}



// ============================================================

// LEAD SERVICE

// ============================================================



export const leadService = {

  // ==========================================================

  // GET ALL LEADS

  // ==========================================================



  async getAllLeads(

    filters?: LeadFilterOptions

  ): Promise<LeadItem[]> {

    const query =

      buildQueryString(filters);



    const response =

      await apiRequest<LeadListApiResponse>(

        `/leads${query}`

      );



    if (!response?.data) {

      return [];

    }



    return (

      response.data.leads || []

    );

  },



  // ==========================================================

  // GET SINGLE LEAD

  // ==========================================================



  async getLeadById(

    id: string

  ): Promise<LeadItem | null> {

    try {

      const response =

        await apiRequest<LeadApiResponse>(

          `/leads/${encodeURIComponent(

            id

          )}`

        );



      return (

        response?.data?.lead ||

        null

      );

    } catch (error: any) {

      const message =

        String(

          error?.message || ""

        ).toLowerCase();



      if (

        message.includes(

          "lead not found"

        ) ||

        message.includes(

          "not found"

        )

      ) {

        return null;

      }



      throw error;

    }

  },



  // ==========================================================

  // CREATE LEAD

  // ==========================================================



  async createLead(

    input: CreateLeadInput

  ): Promise<LeadItem> {

    const response =

      await apiRequest<LeadApiResponse>(

        "/leads",

        {

          method: "POST",

          body: JSON.stringify(

            input

          ),

        }

      );



    this.notifyChange();



    return response.data.lead;

  },



  // ==========================================================

  // UPDATE LEAD

  // ==========================================================



  async updateLead(

    id: string,

    updates: UpdateLeadInput

  ): Promise<LeadItem> {

    const response =

      await apiRequest<LeadApiResponse>(

        `/leads/${encodeURIComponent(

          id

        )}`,

        {

          method: "PUT",

          body: JSON.stringify(

            updates

          ),

        }

      );



    this.notifyChange();



    return response.data.lead;

  },



  // ==========================================================

  // DELETE LEAD

  // ==========================================================



  async deleteLead(

    id: string

  ): Promise<boolean> {

    await apiRequest<{

      success: boolean;

      message: string;

    }>(

      `/leads/${encodeURIComponent(

        id

      )}`,

      {

        method: "DELETE",

      }

    );



    this.notifyChange();



    return true;

  },



  // ==========================================================

  // LEAD STATS

  // ==========================================================



  async getLeadStats(): Promise<LeadStats> {

    const response =

      await apiRequest<LeadStatsApiResponse>(

        "/leads/stats"

      );



    return response.data;

  },



  // ==========================================================

  // UPDATE LEAD STAGE

  // ==========================================================



  async updateLeadStage(

    id: string,

    status: LeadStatus

  ): Promise<LeadItem> {

    const response =

      await apiRequest<LeadApiResponse>(

        `/leads/${encodeURIComponent(

          id

        )}/stage`,

        {

          method: "PATCH",

          body: JSON.stringify({

            status,

          }),

        }

      );



    this.notifyChange();



    return response.data.lead;

  },



  // ==========================================================

  // ASSIGN BDE

  // ==========================================================



  async assignBdeToLead(

    leadId: string,

    bdeId: string

  ): Promise<LeadItem> {

    const body: AssignLeadBdeInput =

      {

        bdeId,

      };



    const response =

      await apiRequest<LeadApiResponse>(

        `/leads/${encodeURIComponent(

          leadId

        )}/assign-bde`,

        {

          method: "PATCH",

          body: JSON.stringify(

            body

          ),

        }

      );



    this.notifyChange();



    return response.data.lead;

  },



  // ==========================================================

  // CONVERT LEAD TO CLIENT

  // ==========================================================



  async convertLeadToClient(

    leadId: string,

    input: ConvertLeadToClientInput = {}

  ): Promise<

    ConvertLeadApiResponse["data"]

  > {

    const response =

      await apiRequest<ConvertLeadApiResponse>(

        `/leads/${encodeURIComponent(

          leadId

        )}/convert-to-client`,

        {

          method: "POST",

          body: JSON.stringify(

            input

          ),

        }

      );



    this.notifyChange();



    return response.data;

  },



  // ==========================================================

  // GET LEAD SERVICE SELECTIONS

  // ==========================================================



  async getServiceSelections(

    leadId: string

  ): Promise<

    LeadServiceSelectionItem[]

  > {

    const response =

      await apiRequest<LeadServiceSelectionsResponse>(

        `/lead-services/${encodeURIComponent(

          leadId

        )}`

      );



    return (

      response?.data?.selections ||

      []

    );

  },



  // ==========================================================

  // ADD SERVICE TO LEAD

  // ==========================================================



  async addServiceSelection(

    leadId: string,

    input: {

      serviceId: string;

      pricingRuleId: string;

      quantity: number;

      notes?: string;

    }

  ): Promise<LeadServiceSelectionItem> {

    const response =

      await apiRequest<LeadServiceSelectionResponse>(

        `/lead-services/${encodeURIComponent(

          leadId

        )}`,

        {

          method: "POST",

          body: JSON.stringify(

            input

          ),

        }

      );



    this.notifyChange();



    return response.data.selection;

  },



  // ==========================================================

  // UPDATE SERVICE SELECTION

  // ==========================================================



  async updateServiceSelection(

    leadId: string,

    selectionId: string,

    input: {

      pricingRuleId: string;

      quantity: number;

      notes?: string;

    }

  ): Promise<LeadServiceSelectionItem> {

    const response =

      await apiRequest<LeadServiceSelectionResponse>(

        `/lead-services/${encodeURIComponent(

          leadId

        )}/${encodeURIComponent(

          selectionId

        )}`,

        {

          method: "PUT",

          body: JSON.stringify(

            input

          ),

        }

      );



    this.notifyChange();



    return response.data.selection;

  },



  // ==========================================================

  // DELETE SERVICE SELECTION

  // ==========================================================



  async deleteServiceSelection(

    leadId: string,

    selectionId: string

  ): Promise<boolean> {

    await apiRequest<DeleteLeadServiceSelectionResponse>(

      `/lead-services/${encodeURIComponent(

        leadId

      )}/${encodeURIComponent(

        selectionId

      )}`,

      {

        method: "DELETE",

      }

    );



    this.notifyChange();



    return true;

  },



  // ==========================================================

  // SUBSCRIBE

  // ==========================================================



  // ==========================================================
  // GET LEAD ASSETS
  // ==========================================================

  async getLeadAssets(
    leadId: string
  ): Promise<LeadAssetItem[]> {
    const response =
      await apiRequest<LeadAssetsResponse>(
        `/leads/${encodeURIComponent(
          leadId
        )}/assets`
      );

    return (
      response?.data?.assets || []
    );
  },

  // ==========================================================
  // SAVE / REPLACE LEAD ASSETS
  // ==========================================================

  async saveLeadAssets(
    leadId: string,
    assets: LeadAssetInput[]
  ): Promise<LeadAssetItem[]> {
    const response =
      await apiRequest<LeadAssetsResponse>(
        `/leads/${encodeURIComponent(
          leadId
        )}/assets`,
        {
          method: "PUT",
          body: JSON.stringify({
            assets,
          }),
        }
      );

    this.notifyChange();

    return (
      response?.data?.assets || []
    );
  },

  // ==========================================================
  // ADD SINGLE LEAD ASSET
  // ==========================================================

  async addLeadAsset(
    leadId: string,
    input: LeadAssetInput
  ): Promise<LeadAssetItem> {
    const response =
      await apiRequest<LeadAssetResponse>(
        `/leads/${encodeURIComponent(
          leadId
        )}/assets`,
        {
          method: "POST",
          body: JSON.stringify(
            input
          ),
        }
      );

    this.notifyChange();

    return response.data.asset;
  },

  // ==========================================================
  // UPDATE SINGLE LEAD ASSET
  // ==========================================================

  async updateLeadAsset(
    leadId: string,
    assetId: string,
    input: LeadAssetInput
  ): Promise<LeadAssetItem> {
    const response =
      await apiRequest<LeadAssetResponse>(
        `/leads/${encodeURIComponent(
          leadId
        )}/assets/${encodeURIComponent(
          assetId
        )}`,
        {
          method: "PUT",
          body: JSON.stringify(
            input
          ),
        }
      );

    this.notifyChange();

    return response.data.asset;
  },

  // ==========================================================
  // DELETE SINGLE LEAD ASSET
  // ==========================================================

  async deleteLeadAsset(
    leadId: string,
    assetId: string
  ): Promise<boolean> {
    await apiRequest<{
      success: boolean;
      message: string;
    }>(
      `/leads/${encodeURIComponent(
        leadId
      )}/assets/${encodeURIComponent(
        assetId
      )}`,
      {
        method: "DELETE",
      }
    );

    this.notifyChange();

    return true;
  },

  subscribe(

    callback: () => void

  ): () => void {

    if (

      typeof window ===

      "undefined"

    ) {

      return () => {};

    }



    const eventName =

      "nleta_leads_updated";



    const handler =

      () => callback();



    window.addEventListener(

      eventName,

      handler

    );



    return () => {

      window.removeEventListener(

        eventName,

        handler

      );

    };

  },



  // ==========================================================

  // NOTIFY CHANGE

  // ==========================================================



  notifyChange(): void {

    if (

      typeof window ===

      "undefined"

    ) {

      return;

    }



    window.dispatchEvent(

      new Event(

        "nleta_leads_updated"

      )

    );

  },

};



export default leadService;