import { ServiceItem } from "@/types/service";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;

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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || "Something went wrong"
    );
  }

  return data;
}

export const serviceService = {
  async getAllServices(): Promise<ServiceItem[]> {
    const response = await apiRequest<{
      success: boolean;
      data?: {
        services?: ServiceItem[];
      };
    }>("/services");

    return response.data?.services || [];
  },

  async getServiceById(
    id: string
  ): Promise<ServiceItem | null> {
    const response = await apiRequest<{
      success: boolean;
      data?: {
        service?: ServiceItem;
      };
    }>(`/services/${id}`);

    return response.data?.service || null;
  },
};