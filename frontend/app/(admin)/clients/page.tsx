"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricCard from "@/components/metrics/MetricCard";
import DynamicTable, { Column } from "@/components/tables/DynamicTable";
import Button from "@/components/ui/Button";
import { ClientItem } from "@/types/client";

export default function ClientsViewPage() {
  const router = useRouter();

  // State
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [stats, setStats] = useState<BackendClientStats | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quickStatusFilter, setQuickStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
  ).replace(/\/+$/, "");

  interface BackendClientStats {
    totalClients: number;
    activeClients: number;
    inactiveClients: number;
  }

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
      associationName: string;
      status: string;
    } | null;
  }

  const getAuthToken = (): string | null => {
    if (typeof window === "undefined") return null;

    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("authToken")
    );
  };

  const apiRequest = async <T,>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    let result: any = null;

    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      throw new Error(
        result?.message || `Request failed with status ${response.status}.`
      );
    }

    return result as T;
  };

  const mapClient = (client: BackendClient): ClientItem => {
    const assignedBdeName = client.assignedBde
      ? `${client.assignedBde.firstName || ""} ${client.assignedBde.lastName || ""}`.trim() ||
        client.assignedBde.email ||
        ""
      : "";

    return {
      id: client.id,
      companyName: client.associationName,
      clientType: "Association" as ClientItem["clientType"],
      contactPerson: client.contactName,
      contactEmail: client.email || "",
      contactPhone: client.mobile || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      totalAssetsCount: 0,
      contractStatus:
        client.status === "ACTIVE" ? "Active Agreement" : "Expired",
      contractValue: "—",
      numericContractValue: 0,
      accountManager: assignedBdeName || "Unassigned",
      assignedBdeId: client.assignedBdeId || undefined,
      assignedBdeName: assignedBdeName || undefined,
      assignedTechnicianId: undefined,
      assignedTechnicianName: undefined,
      joinedDate: client.createdAt
        ? new Date(client.createdAt).toISOString().slice(0, 10)
        : "",
      nextAuditDate: undefined,
      notes: client.sourceLead
        ? `Converted from Lead ${client.sourceLead.id}`
        : undefined,
    } as ClientItem;
  };

  interface ClientsApiResponse {
    success: boolean;
    data?: {
      clients?: BackendClient[];
      total?: number;
    };
    message?: string;
  }

  interface ClientStatsApiResponse {
    success: boolean;
    data?: BackendClientStats;
    message?: string;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshData = async () => {
    try {
      setLoading(true);

      const [clientsResponse, statsResponse] = await Promise.all([
        apiRequest<ClientsApiResponse>("/clients"),
        apiRequest<ClientStatsApiResponse>("/clients/stats"),
      ]);

      const backendClients = clientsResponse.data?.clients || [];
      const mappedClients = backendClients.map(mapClient);

      setClients(mappedClients);
      setStats(
        statsResponse.data || {
          totalClients: mappedClients.length,
          activeClients: mappedClients.filter(
            (client) => client.contractStatus === "Active Agreement"
          ).length,
          inactiveClients: mappedClients.filter(
            (client) => client.contractStatus !== "Active Agreement"
          ).length,
        }
      );
    } catch (err) {
      console.error("Error loading clients from CRM API:", err);
      showToast(
        err instanceof Error
          ? err.message
          : "Unable to load clients from CRM API."
      );
      setClients([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    try {
      await apiRequest(`/clients/${clientToDelete.id}`, {
        method: "DELETE",
      });
      showToast(`Client "${clientToDelete.id}" deleted successfully.`);
      setClientToDelete(null);
      if (selectedClient?.id === clientToDelete.id) {
        setSelectedClient(null);
      }
      refreshData();
    } catch (err) {
      console.error("Error deleting client:", err);
      showToast("Failed to delete client.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active Agreement":
        return {
          bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
          dot: "bg-emerald-500",
        };
      case "Pending Renewal":
        return {
          bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
          dot: "bg-amber-500",
        };
      case "Under Audit":
        return {
          bg: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
          dot: "bg-blue-500",
        };
      case "Onboarding":
        return {
          bg: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
          dot: "bg-purple-500",
        };
      case "Expired":
      default:
        return {
          bg: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
          dot: "bg-gray-400",
        };
    }
  };

  const filterOptions = [
    { label: "Active Agreement", value: "Active Agreement", field: "contractStatus" as keyof ClientItem },
    { label: "Pending Renewal", value: "Pending Renewal", field: "contractStatus" as keyof ClientItem },
    { label: "Under Audit", value: "Under Audit", field: "contractStatus" as keyof ClientItem },
    { label: "Onboarding", value: "Onboarding", field: "contractStatus" as keyof ClientItem },
    { label: "Expired", value: "Expired", field: "contractStatus" as keyof ClientItem },
  ];

  const displayData = useMemo(() => {
    if (quickStatusFilter === "ALL") return clients;
    return clients.filter((c) => c.contractStatus === quickStatusFilter);
  }, [clients, quickStatusFilter]);

  const columns: Column<ClientItem>[] = [
    {
      key: "id",
      header: "Client ID",
      sortable: true,
      width: "100px",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
          {row.id}
        </span>
      ),
    },
    {
      key: "companyName",
      header: "Organization & Sector",
      sortable: true,
      render: (row) => (
        <div className="max-w-[240px]">
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {row.companyName}
          </p>
          <span className="text-[11px] text-gray-400">{row.clientType}</span>
        </div>
      ),
    },
    {
      key: "contactPerson",
      header: "Primary Contact",
      sortable: true,
      render: (row) => (
        <div className="max-w-[180px]">
          <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
            {row.contactPerson}
          </p>
          <p className="text-[11px] text-gray-400 truncate">{row.contactPhone}</p>
        </div>
      ),
    },
    {
      key: "city",
      header: "City / Region",
      sortable: true,
      render: (row) => (
        <div className="text-xs text-gray-600 dark:text-gray-300">
          <p className="font-medium">{row.city}</p>
          <p className="text-[11px] text-gray-400">{row.state}</p>
        </div>
      ),
    },
    {
      key: "totalAssetsCount",
      header: "Assets",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {row.totalAssetsCount > 0 ? `${row.totalAssetsCount} Units` : "Managed separately"}
        </span>
      ),
    },
    {
      key: "numericContractValue",
      header: "Annual Value",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {row.contractValue || "—"}
        </span>
      ),
    },
    {
      key: "contractStatus",
      header: "Agreement Status",
      sortable: true,
      render: (row) => {
        const badge = getStatusBadge(row.contractStatus);
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${badge.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            <span>{row.contractStatus}</span>
          </span>
        );
      },
    },
    {
      key: "assignedTechnicianName",
      header: "Lead Technician",
      sortable: true,
      render: (row) =>
        row.assignedTechnicianName ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate max-w-[120px]">{row.assignedTechnicianName}</span>
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">Pending Allocation</span>
        ),
    },
    {
      key: "assignedBdeName",
      header: "Assigned BDE",
      sortable: true,
      render: (row) =>
        row.assignedBdeName ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="truncate max-w-[120px]">{row.assignedBdeName}</span>
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">Pending Allocation</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setSelectedClient(row)}
            title="View Details"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 transition"
          >
            <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>

          <Link
            href={`/clients/${row.id}/edit`}
            title="Edit Client"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50 hover:text-brand-700 dark:text-brand-400 dark:hover:bg-brand-500/10 transition"
          >
            <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={() => setClientToDelete(row)}
            title="Delete Client"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-error-500 hover:bg-error-50 hover:text-error-600 dark:text-error-400 transition"
          >
            <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading clients from CRM database...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-99999 flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-theme-xl dark:bg-white dark:text-gray-900 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Breadcrumb
        pageTitle="Clients Portfolio Management"
        items={[
          { label: "Admin Portal", href: "/dashboard" },
          { label: "Clients" },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/clients/create">
              <Button
                variant="primary"
                size="sm"
                leftIcon={
                  <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                Register Client
              </Button>
            </Link>
          </div>
        }
      />

      {/* Analysis Cards using MetricCard */}
      <section className="space-y-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
          <MetricCard
            title="Total Registered Clients"
            value={stats ? stats.totalClients : clients.length}
            change="Live database"
            changeType="increase"
            period="enterprise accounts"
            icon={
              <svg className="w-6 h-6 fill-current text-brand-600 dark:text-brand-400" viewBox="0 0 24 24">
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
              </svg>
            }
          />

          <MetricCard
            title="Active Audit Contracts"
            value={stats ? stats.activeClients : 0}
            change={`${stats ? stats.inactiveClients : 0} inactive`}
            changeType="increase"
            period="active CRM accounts"
            icon={
              <svg className="w-6 h-6 fill-current text-blue-600 dark:text-blue-400" viewBox="0 0 24 24">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
              </svg>
            }
          />

          <MetricCard
            title="Portfolio Contract Value"
            value="—"
            change="Technical contract data separate"
            changeType="increase"
            period="managed in technical system"
            icon={
              <svg className="w-6 h-6 fill-current text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
              </svg>
            }
          />

          <MetricCard
            title="Total Managed Assets"
            value="—"
            change="Technical system"
            changeType="increase"
            period="asset data managed separately"
            icon={
              <svg className="w-6 h-6 fill-current text-purple-600 dark:text-purple-400" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 14H7v-4h4v4zm0-6H7V7h4v4zm6 6h-4v-4h4v4zm0-6h-4V7h4v4z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 me-1">
          Quick Filter:
        </span>
        {[
          { label: "All Clients", value: "ALL", count: clients.length },
          {
            label: "Active",
            value: "Active Agreement",
            count: stats?.activeClients || 0,
          },
          {
            label: "Inactive",
            value: "Expired",
            count: stats?.inactiveClients || 0,
          },
        ].map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() => setQuickStatusFilter(pill.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
              quickStatusFilter === pill.value
                ? "bg-brand-500 text-white font-semibold shadow-theme-xs"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300"
            }`}
          >
            <span>{pill.label}</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${quickStatusFilter === pill.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
              {pill.count}
            </span>
          </button>
        ))}
      </div>

      {/* DynamicTable Component */}
      <section>
        <DynamicTable<ClientItem>
          title="Client Accounts Directory"
          description="Live CRM client accounts synchronized with the PostgreSQL backend"
          columns={columns}
          data={displayData}
          searchPlaceholder="Search clients by organization, contact, city, or manager..."
          searchable={true}
          filterable={true}
          filterOptions={filterOptions}
          pageSizeOptions={[5, 10, 20]}
          initialPageSize={5}
          onRowClick={(row) => setSelectedClient(row)}
          onAddRecord={() => router.push("/clients/create")}
        />
      </section>

      {/* Detail Modal */}
      {selectedClient && (
        <div
          className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedClient(null)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedClient.companyName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedClient.id} &bull; {selectedClient.clientType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="py-4 space-y-4 text-sm">
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400">Annual Contract:</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                    {selectedClient.contractValue}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Managed Inventory:</span>
                  <p className="font-bold text-gray-800 dark:text-white text-sm mt-0.5">
                    {selectedClient.totalAssetsCount} Units
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                <p><span className="font-semibold text-gray-800 dark:text-white">Representative:</span> {selectedClient.contactPerson}</p>
                <p><span className="font-semibold text-gray-800 dark:text-white">Email:</span> {selectedClient.contactEmail}</p>
                <p><span className="font-semibold text-gray-800 dark:text-white">Phone:</span> {selectedClient.contactPhone}</p>
                <p><span className="font-semibold text-gray-800 dark:text-white">Address:</span> {selectedClient.address}, {selectedClient.city}, {selectedClient.state}</p>
                <p><span className="font-semibold text-gray-800 dark:text-white">Account Lead:</span> {selectedClient.accountManager}</p>
                <p><span className="font-semibold text-gray-800 dark:text-white">Next Comprehensive Audit:</span> {selectedClient.nextAuditDate || "Not Scheduled"}</p>
              </div>

              {selectedClient.notes && (
                <div className="rounded-xl border border-gray-100 p-3.5 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                  <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Directives & Notes</h5>
                  <p>{selectedClient.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setClientToDelete(selectedClient)}
                className="text-xs font-semibold text-error-600 hover:text-error-700"
              >
                Delete Client
              </button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedClient(null)}>
                  Close
                </Button>
                <Link href={`/clients/${selectedClient.id}/edit`}>
                  <Button variant="primary" size="sm">
                    Edit Client
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div
          className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setClientToDelete(null)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Delete Client Record?
            </h3>
            <p className="mt-2 text-xs text-gray-500">
              Permanently delete &ldquo;{clientToDelete.companyName}&rdquo; ({clientToDelete.id})?
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setClientToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
                Yes, Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
