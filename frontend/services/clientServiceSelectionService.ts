import {
  ClientServiceSelection,
  ClientServiceSelectionsResponse,
  CreateClientServiceSelectionInput,
  UpdateClientServiceSelectionInput,
} from "@/types/clientServiceSelection";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken")
  );
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
        ...(options.headers || {}),
      },
    }
  );

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        "Something went wrong"
    );
  }

  return data;
}

export const clientServiceSelectionService = {
  // ==========================================================
  // GET
  // GET /api/client-services/:clientId
  // ==========================================================

  async getSelections(
    clientId: string
  ): Promise<ClientServiceSelectionsResponse> {
    const response =
      await apiRequest<{
        success: boolean;
        data?: ClientServiceSelectionsResponse;
      }>(
        `/client-services/${clientId}`
      );

    return (
      response.data || {
        clientId,
        selections: [],
        summary: {
          serviceCount: 0,
          baseAmount: 0,
          gstAmount: 0,
          totalAmount: 0,
        },
      }
    );
  },

  // ==========================================================
  // CREATE
  // POST /api/client-services/:clientId
  // ==========================================================

  async createSelection(
    clientId: string,
    input: CreateClientServiceSelectionInput
  ): Promise<ClientServiceSelection> {
    const response =
      await apiRequest<{
        success: boolean;
        data?: {
          selection?: ClientServiceSelection;
        };
      }>(
        `/client-services/${clientId}`,
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      );

    if (
      !response.data?.selection
    ) {
      throw new Error(
        "Service selection was not created"
      );
    }

    return response.data.selection;
  },

  // ==========================================================
  // UPDATE
  // PUT /api/client-services/:clientId/:selectionId
  // ==========================================================

  async updateSelection(
    clientId: string,
    selectionId: string,
    input: UpdateClientServiceSelectionInput
  ): Promise<ClientServiceSelection> {
    const response =
      await apiRequest<{
        success: boolean;
        data?: {
          selection?: ClientServiceSelection;
        };
      }>(
        `/client-services/${clientId}/${selectionId}`,
        {
          method: "PUT",
          body: JSON.stringify(input),
        }
      );

    if (
      !response.data?.selection
    ) {
      throw new Error(
        "Service selection was not updated"
      );
    }

    return response.data.selection;
  },

  // ==========================================================
  // DELETE
  // DELETE /api/client-services/:clientId/:selectionId
  // ==========================================================

  async deleteSelection(
    clientId: string,
    selectionId: string
  ): Promise<void> {
    await apiRequest(
      `/client-services/${clientId}/${selectionId}`,
      {
        method: "DELETE",
      }
    );
  },
};
