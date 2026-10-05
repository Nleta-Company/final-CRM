"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import BdeClientForm from "@/components/clients/BdeClientForm";

import { clientService } from "@/services/clientService";
import type { ClientItem } from "@/types/client";

export default function EditBdeClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const clientId = params?.id || "";

  const [client, setClient] = useState<ClientItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadClient = useCallback(async () => {
    if (!clientId) {
      setError("Client ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await clientService.getClientById(clientId);

      if (!data) {
        setClient(null);
        setError("Client not found.");
        return;
      }

      setClient(data);
    } catch (err: unknown) {
      console.error("FAILED TO LOAD CLIENT:", err);

      setClient(null);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load client."
      );
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const breadcrumb = (
    <Breadcrumb
      pageTitle="Edit Client"
      items={[
        {
          label: "Dashboard",
          href: "/bde/dashboard",
        },
        {
          label: "My Clients",
          href: "/bde/clients",
        },
        ...(client
          ? [
            {
              label: client.companyName,
              href: `/bde/clients/${client.id}`,
            },
          ]
          : []),
        {
          label: "Edit Client",
        },
      ]}
    />
  );

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <div className="space-y-6">
        {breadcrumb}

        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-white" />

            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Loading client...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     ERROR
  ============================================================ */

  if (error || !client) {
    return (
      <div className="space-y-6">
        {breadcrumb}

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">
          <h2 className="font-semibold text-red-800 dark:text-red-400">
            Unable to load client
          </h2>

          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {error || "Client not found."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadClient}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-gray-800"
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/bde/clients")
              }
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
            >
              Back to My Clients
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     EDIT CLIENT
  ============================================================ */

  return (
    <div className="space-y-6">
      {breadcrumb}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Edit Client
        </h1>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Update client information, assets, services and
          pricing.
        </p>
      </div>

      <BdeClientForm
        initialClient={client}
        isEdit
      />
    </div>
  );
}