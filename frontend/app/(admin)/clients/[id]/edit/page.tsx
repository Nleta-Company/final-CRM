"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import ClientForm from "@/components/clients/ClientForm";
import { ClientItem } from "@/types/client";
import Button from "@/components/ui/Button";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

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

  /*
  |--------------------------------------------------------------------------
  | CLIENT PROCESS TRACKING
  |--------------------------------------------------------------------------
  */

  processStage?:
    | "CLIENT_CREATED"
    | "FSO_GENERATED"
    | "PSGA_GENERATED"
    | "PSGA_COMPLETED";

  externalClientId?: string | null;

  fsoNumber?: string | null;

  fsoGeneratedAt?: string | null;

  psgaGeneratedAt?: string | null;

  processUpdatedAt?: string | null;
}

/*
|--------------------------------------------------------------------------
| API RESPONSE
|--------------------------------------------------------------------------
|
| Backend returns:
|
| {
|   success: true,
|   data: {
|     client: {...}
|   }
| }
|
|--------------------------------------------------------------------------
*/

interface ApiResponse {
  success: boolean;

  data?: {
    client: BackendClient;
  };

  message?: string;
}

/*
|--------------------------------------------------------------------------
| AUTH TOKEN
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| GET CLIENT BY ID
|--------------------------------------------------------------------------
*/

async function getClientById(
  id: string
): Promise<BackendClient> {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/clients/${encodeURIComponent(id)}`,
    {
      method: "GET",

      headers: {
        "Content-Type": "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },

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

  /*
  |--------------------------------------------------------------------------
  | IMPORTANT
  |--------------------------------------------------------------------------
  |
  | Backend response:
  |
  | result.data.client
  |
  |--------------------------------------------------------------------------
  */

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

/*
|--------------------------------------------------------------------------
| FULL NAME
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| MAP BACKEND CLIENT
|--------------------------------------------------------------------------
*/

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

    /*
    |--------------------------------------------------------------------------
    | PINCODE
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | PROCESS TRACKING
    |--------------------------------------------------------------------------
    */

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

/*
|--------------------------------------------------------------------------
| EDIT CLIENT PAGE
|--------------------------------------------------------------------------
*/

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams =
    use(params);

  const clientId =
    resolvedParams.id;

  const [client, setClient] =
    useState<ClientItem | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [notFound, setNotFound] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  /*
  |--------------------------------------------------------------------------
  | FETCH CLIENT
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    async function fetchClient() {
      try {
        setLoading(true);

        setNotFound(false);

        setErrorMessage(null);

        const backendClient =
          await getClientById(
            clientId
          );

        if (!mounted) {
          return;
        }

        const mappedClient =
          mapBackendClientToClientItem(
            backendClient
          );

        setClient(mappedClient);
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

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | NOT FOUND / ERROR
  |--------------------------------------------------------------------------
  */

  if (
    notFound ||
    !client
  ) {
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

  /*
  |--------------------------------------------------------------------------
  | EDIT FORM
  |--------------------------------------------------------------------------
  */

  return (
    <div className="space-y-6">
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

      <ClientForm
        initialClient={client}
        isEdit={true}
      />
    </div>
  );
}