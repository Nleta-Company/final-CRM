"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import Button from "@/components/ui/Button";
import DynamicTable, {
  Column,
} from "@/components/tables/DynamicTable";

import { clientService } from "@/services/clientService";

import type {
  ClientItem,
  ClientContractStatus,
} from "@/types/client";

// ============================================================
// CONTRACT STATUSES
// ============================================================

const contractStatuses: Array<
  ClientContractStatus | "ALL"
> = [
  "ALL",
  "Active Agreement",
  "Pending Renewal",
  "Under Audit",
  "Expired",
  "Onboarding",
];

// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ============================================================
// STATUS CLASS
// ============================================================

function statusClass(
  status: ClientContractStatus
) {
  switch (status) {
    case "Active Agreement":
      return "bg-success-50 text-success-700 border-success-200 dark:bg-success-500/10 dark:text-success-400 dark:border-success-500/20";

    case "Pending Renewal":
      return "bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-500/10 dark:text-warning-400 dark:border-warning-500/20";

    case "Under Audit":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";

    case "Expired":
      return "bg-error-50 text-error-700 border-error-200 dark:bg-error-500/10 dark:text-error-400 dark:border-error-500/20";

    case "Onboarding":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20";

    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
  }
}

// ============================================================
// PAGE
// ============================================================

export default function BdeClientsPage() {
  const [clients, setClients] =
    useState<ClientItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [contractStatus, setContractStatus] =
    useState<ClientContractStatus | "ALL">(
      "ALL"
    );

  // ==========================================================
  // LOAD CLIENTS
  // ==========================================================

  const loadClients = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        /*
         * Backend decides which clients are accessible
         * to the logged-in BDE.
         *
         * We intentionally do NOT filter by BDE id
         * on the frontend.
         */

        const data =
          await clientService.getAllClients();

        setClients(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (err: unknown) {
        console.error(
          "FAILED TO LOAD BDE CLIENTS:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your clients."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ==========================================================
  // INITIAL LOAD + CLIENT CHANGE SUBSCRIPTION
  // ==========================================================

  useEffect(() => {
    loadClients();

    const unsubscribe =
      clientService.subscribe(
        () => {
          void loadClients();
        }
      );

    return unsubscribe;
  }, [loadClients]);

  // ==========================================================
  // FILTER CLIENTS
  // ==========================================================

  const filteredClients = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return clients.filter((client) => {
      // ------------------------------------------------------
      // SEARCH
      // ------------------------------------------------------

      if (query) {
        const matches =
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
            .includes(query);

        if (!matches) {
          return false;
        }
      }

      // ------------------------------------------------------
      // CONTRACT STATUS
      // ------------------------------------------------------

      if (
        contractStatus !== "ALL" &&
        client.contractStatus !==
          contractStatus
      ) {
        return false;
      }

      return true;
    });
  }, [
    clients,
    search,
    contractStatus,
  ]);

  // ==========================================================
  // STATS
  // ==========================================================

  const stats = useMemo(() => {
    const total =
      clients.length;

    const active =
      clients.filter(
        (client) =>
          client.contractStatus ===
          "Active Agreement"
      ).length;

    const pendingRenewal =
      clients.filter(
        (client) =>
          client.contractStatus ===
          "Pending Renewal"
      ).length;

    const onboarding =
      clients.filter(
        (client) =>
          client.contractStatus ===
          "Onboarding"
      ).length;

    /*
     * Internally the backend field is still
     * totalAssetsCount.
     *
     * In the UI we display this as Units.
     */

    const units =
      clients.reduce(
        (sum, client) =>
          sum +
          Number(
            client.totalAssetsCount || 0
          ),
        0
      );

    return {
      total,
      active,
      pendingRenewal,
      onboarding,
      units,
    };
  }, [clients]);

  // ==========================================================
  // CLEAR FILTERS
  // ==========================================================

  const clearFilters = () => {
    setSearch("");
    setContractStatus("ALL");
  };

  // ==========================================================
  // TABLE COLUMNS
  // ==========================================================

  const columns: Column<ClientItem>[] = [
    // --------------------------------------------------------
    // CLIENT ID
    // --------------------------------------------------------

    {
      key: "id",
      header: "Client ID",
      sortable: true,

      render: (row) => (
        <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
          {row.id}
        </span>
      ),
    },

    // --------------------------------------------------------
    // CLIENT
    // --------------------------------------------------------

    {
      key: "companyName",
      header: "Client",
      sortable: true,

      render: (row) => (
        <div className="min-w-[210px]">
          <span className="block font-semibold text-gray-900 dark:text-white">
            {row.companyName || "—"}
          </span>

          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
            {row.clientType || "—"}
          </span>
        </div>
      ),
    },

    // --------------------------------------------------------
    // CONTACT
    // --------------------------------------------------------

    {
      key: "contactPerson",
      header: "Contact",
      sortable: true,

      render: (row) => (
        <div className="min-w-[180px]">
          <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">
            {row.contactPerson || "—"}
          </span>

          {row.contactPhone && (
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {row.contactPhone}
            </span>
          )}

          {row.contactEmail && (
            <span className="block max-w-[220px] truncate text-xs text-gray-400 dark:text-gray-500">
              {row.contactEmail}
            </span>
          )}
        </div>
      ),
    },

    // --------------------------------------------------------
    // LOCATION
    // --------------------------------------------------------

    {
      key: "city",
      header: "Location",
      sortable: true,

      render: (row) => (
        <div>
          <span className="block text-sm text-gray-700 dark:text-gray-300">
            {row.city || "—"}
          </span>

          {row.state && (
            <span className="block text-xs text-gray-400 dark:text-gray-500">
              {row.state}
            </span>
          )}
        </div>
      ),
    },

    // --------------------------------------------------------
    // UNITS
    // --------------------------------------------------------

    {
      key: "totalAssetsCount",
      header: "Units",
      sortable: true,
      align: "center",

      render: (row) => (
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {Number(
            row.totalAssetsCount || 0
          )}
        </span>
      ),
    },

    // --------------------------------------------------------
    // CONTRACT
    // --------------------------------------------------------

    {
      key: "contractStatus",
      header: "Contract",
      sortable: true,
      align: "center",

      render: (row) => (
        <span
          className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
            row.contractStatus
          )}`}
        >
          {row.contractStatus}
        </span>
      ),
    },

    // --------------------------------------------------------
    // JOINED
    // --------------------------------------------------------

    {
      key: "joinedDate",
      header: "Joined",
      sortable: true,

      render: (row) => (
        <span className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
          {formatDate(
            row.joinedDate
          )}
        </span>
      ),
    },

    // --------------------------------------------------------
    // ACTION
    // --------------------------------------------------------

    {
      key: "actions",
      header: "Action",
      align: "center",

      render: (row) => (
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/bde/clients/${row.id}`}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400"
          >
            View →
          </Link>

          <Link
            href={`/bde/clients/${row.id}/edit`}
            className="text-xs font-semibold text-gray-600 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-white"
          >
            Edit
          </Link>
        </div>
      ),
    },
  ];

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="My Clients"
          items={[
            {
              label: "Dashboard",
              href: "/bde/dashboard",
            },
            {
              label: "My Clients",
            },
          ]}
        />

        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />

            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Loading your clients...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="space-y-6">
      {/* ======================================================
          BREADCRUMB
      ====================================================== */}

      <Breadcrumb
        pageTitle="My Clients"
        items={[
          {
            label: "Dashboard",
            href: "/bde/dashboard",
          },
          {
            label: "My Clients",
          },
        ]}
        actions={
          <Link href="/bde/clients/create">
            <Button
              variant="primary"
              size="md"
            >
              + Add Client
            </Button>
          </Link>
        }
      />

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/20 dark:bg-error-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-error-700 dark:text-error-400">
                Unable to load clients
              </p>

              <p className="mt-1 text-sm text-error-600 dark:text-error-400">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadClients();
              }}
              className="w-fit rounded-lg border border-error-200 bg-white px-4 py-2 text-sm font-medium text-error-700 hover:bg-error-50 dark:border-error-500/30 dark:bg-gray-900 dark:text-error-400 dark:hover:bg-gray-800"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* ======================================================
          PAGE HEADING
      ====================================================== */}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Clients
        </h1>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage clients accessible to your
          BDE account.
        </p>
      </div>

      {/* ======================================================
          STATS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* TOTAL CLIENTS */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Total Clients
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </p>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Accessible accounts
          </p>
        </div>

        {/* ACTIVE AGREEMENTS */}

        <div className="rounded-2xl border border-success-100 bg-success-50/40 p-5 shadow-theme-xs dark:border-success-500/20 dark:bg-success-500/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-success-700 dark:text-success-400">
            Active Agreements
          </p>

          <p className="mt-2 text-3xl font-bold text-success-700 dark:text-success-400">
            {stats.active}
          </p>

          <p className="mt-1 text-xs text-success-600/80 dark:text-success-400/70">
            Currently active
          </p>
        </div>

        {/* PENDING RENEWAL */}

        <div className="rounded-2xl border border-warning-100 bg-warning-50/40 p-5 shadow-theme-xs dark:border-warning-500/20 dark:bg-warning-500/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-warning-700 dark:text-warning-400">
            Pending Renewal
          </p>

          <p className="mt-2 text-3xl font-bold text-warning-700 dark:text-warning-400">
            {stats.pendingRenewal}
          </p>

          <p className="mt-1 text-xs text-warning-600/80 dark:text-warning-400/70">
            Requires follow-up
          </p>
        </div>

        {/* UNITS MANAGED */}

        <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5 shadow-theme-xs dark:border-brand-500/20 dark:bg-brand-500/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
            Units Managed
          </p>

          <p className="mt-2 text-3xl font-bold text-brand-700 dark:text-brand-400">
            {stats.units}
          </p>

          <p className="mt-1 text-xs text-brand-600/80 dark:text-brand-400/70">
            Across your clients
          </p>
        </div>
      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_240px_auto]">
          {/* SEARCH */}

          <div>
            <label
              htmlFor="client-search"
              className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400"
            >
              Search Clients
            </label>

            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3a6 6 0 100 12A6 6 0 009 3zM2 9a7 7 0 1112.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>

              <input
                id="client-search"
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search company, contact, city..."
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* STATUS */}

          <div>
            <label
              htmlFor="contract-status"
              className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400"
            >
              Contract Status
            </label>

            <select
              id="contract-status"
              value={contractStatus}
              onChange={(e) =>
                setContractStatus(
                  e.target.value as
                    | ClientContractStatus
                    | "ALL"
                )
              }
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {contractStatuses.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status === "ALL"
                      ? "All Statuses"
                      : status}
                  </option>
                )
              )}
            </select>
          </div>

          {/* CLEAR */}

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          RESULTS SUMMARY
      ====================================================== */}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing{" "}
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {filteredClients.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {clients.length}
          </span>{" "}
          clients
        </p>

        {(search ||
          contractStatus !==
            "ALL") && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-left text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400 sm:text-right"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* ======================================================
          EMPTY STATE
      ====================================================== */}

      {filteredClients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5v-9z"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 10h10M7 14h6"
              />
            </svg>
          </div>

          <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
            {clients.length === 0
              ? "No clients yet"
              : "No clients found"}
          </h3>

          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
            {clients.length === 0
              ? "Create your first client to start managing units, services and pricing."
              : "Try changing your search or contract status filter."}
          </p>

          {clients.length === 0 ? (
            <Link
              href="/bde/clients/create"
              className="mt-5 inline-flex"
            >
              <Button
                variant="primary"
                size="md"
              >
                + Add Client
              </Button>
            </Link>
          ) : (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        /* ====================================================
           CLIENT TABLE
        ==================================================== */

        <DynamicTable<ClientItem>
          title="Client Accounts"
          description="Clients assigned to or created through your BDE workspace."
          columns={columns}
          data={filteredClients}
          /*
           * Search is handled by the search field above.
           */
          initialPageSize={10}
          pageSizeOptions={[
            5,
            10,
            20,
            50,
          ]}
        />
      )}
    </div>
  );
}