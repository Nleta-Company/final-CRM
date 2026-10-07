import { ServiceItem } from "@/types/service";

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
    if (response.status === 429) {
      throw new Error(
        "Too many requests. Please wait a moment and try again."
      );
    }

    throw new Error(
      data?.message ||
        "Something went wrong"
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| SERVICES CACHE
|--------------------------------------------------------------------------
| Prevents multiple components / React StrictMode from repeatedly
| calling GET /services.
|--------------------------------------------------------------------------
*/

let servicesCache:
  | ServiceItem[]
  | null = null;

let servicesCacheTime = 0;

let servicesRequest:
  | Promise<ServiceItem[]>
  | null = null;

const SERVICES_CACHE_TIME =
  30 * 1000;

/*
|--------------------------------------------------------------------------
| GET ALL SERVICES
|--------------------------------------------------------------------------
*/

async function getAllServices(): Promise<
  ServiceItem[]
> {
  const now = Date.now();

  /*
  |--------------------------------------------------------------------------
  | RETURN CACHE
  |--------------------------------------------------------------------------
  */

  if (
    servicesCache &&
    now - servicesCacheTime <
      SERVICES_CACHE_TIME
  ) {
    return servicesCache;
  }

  /*
  |--------------------------------------------------------------------------
  | RETURN EXISTING REQUEST
  |--------------------------------------------------------------------------
  | If two components request services at the same time,
  | only ONE API request will be made.
  |--------------------------------------------------------------------------
  */

  if (servicesRequest) {
    return servicesRequest;
  }

  /*
  |--------------------------------------------------------------------------
  | CREATE REQUEST
  |--------------------------------------------------------------------------
  */

  servicesRequest =
    apiRequest<{
      success: boolean;

      data?: {
        services?: ServiceItem[];
      };
    }>("/services")
      .then((response) => {
        const services =
          response.data?.services || [];

        servicesCache =
          services;

        servicesCacheTime =
          Date.now();

        return services;
      })
      .finally(() => {
        servicesRequest = null;
      });

  return servicesRequest;
}

/*
|--------------------------------------------------------------------------
| GET SERVICE BY ID
|--------------------------------------------------------------------------
*/

async function getServiceById(
  id: string
): Promise<ServiceItem | null> {
  const response =
    await apiRequest<{
      success: boolean;

      data?: {
        service?: ServiceItem;
      };
    }>(`/services/${id}`);

  return (
    response.data?.service ||
    null
  );
}

/*
|--------------------------------------------------------------------------
| CLEAR SERVICES CACHE
|--------------------------------------------------------------------------
| Call this after adding/updating/deleting a service.
|--------------------------------------------------------------------------
*/

function clearServicesCache() {
  servicesCache = null;
  servicesCacheTime = 0;
  servicesRequest = null;
}

/*
|--------------------------------------------------------------------------
| SERVICE
|--------------------------------------------------------------------------
*/

export const serviceService = {
  getAllServices,
  getServiceById,
  clearServicesCache,
};