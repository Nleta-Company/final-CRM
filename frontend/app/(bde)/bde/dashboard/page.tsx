"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricCard from "@/components/metrics/MetricCard";
import DynamicTable, {
  Column,
} from "@/components/tables/DynamicTable";
import Button from "@/components/ui/Button";

import { leadService } from "@/services/leadService";
import { clientService } from "@/services/clientService";

import {
  LeadItem,
  LeadStatus,
} from "@/types/lead";

import { ClientItem } from "@/types/client";

type LoggedInUser = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  mobile?: string | null;
  role: string;
};

export default function BdeDashboardPage() {
  const [user, setUser] =
    useState<LoggedInUser | null>(null);

  const [leads, setLeads] =
    useState<LeadItem[]>([]);

  const [clients, setClients] =
    useState<ClientItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD CURRENT LOGGED-IN BDE
  |--------------------------------------------------------------------------
  */

  const loadCurrentUser = () => {
    try {
      if (typeof window === "undefined") {
        return null;
      }

      const storedUser =
        localStorage.getItem("nleta_user");

      if (!storedUser) {
        return null;
      }

      const parsedUser =
        JSON.parse(storedUser) as LoggedInUser;

      return parsedUser;
    } catch (error) {
      console.error(
        "Unable to read logged-in BDE:",
        error
      );

      return null;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD BDE DASHBOARD DATA
  |--------------------------------------------------------------------------
  |
  | Both leads and clients are loaded here.
  |
  | Backend automatically restricts the data
  | according to the authenticated BDE.
  |
  */

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const currentUser =
        loadCurrentUser();

      if (!currentUser) {
        throw new Error(
          "Authenticated BDE information was not found."
        );
      }

      setUser(currentUser);

      const [
        currentLeads,
        currentClients,
      ] = await Promise.all([
        leadService.getAllLeads(),
        clientService.getAllClients(),
      ]);

      setLeads(currentLeads);
      setClients(currentClients);
    } catch (error) {
      console.error(
        "BDE DASHBOARD LOAD ERROR:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load your sales dashboard."
      );

      setLeads([]);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const unsubscribeLead =
      leadService.subscribe(
        loadDashboardData
      );

    const unsubscribeClient =
      clientService.subscribe(
        loadDashboardData
      );

    return () => {
      unsubscribeLead();
      unsubscribeClient();
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LEAD STATISTICS
  |--------------------------------------------------------------------------
  */

  const leadStats = useMemo(() => {
    const total = leads.length;

    const newLeads = leads.filter(
      (lead) => lead.status === "NEW"
    ).length;

    const contacted = leads.filter(
      (lead) =>
        lead.status === "CONTACTED"
    ).length;

    const qualified = leads.filter(
      (lead) =>
        lead.status === "QUALIFIED"
    ).length;

    const proposalSent = leads.filter(
      (lead) =>
        lead.status === "PROPOSAL_SENT"
    ).length;

    const negotiation = leads.filter(
      (lead) =>
        lead.status === "NEGOTIATION"
    ).length;

    const won = leads.filter(
      (lead) => lead.status === "WON"
    ).length;

    const lost = leads.filter(
      (lead) => lead.status === "LOST"
    ).length;

    const active =
      contacted +
      qualified +
      proposalSent +
      negotiation;

    const closed = won + lost;

    const winRate =
      closed > 0
        ? Math.round(
            (won / closed) * 100
          )
        : 0;

    const convertedClients =
      leads.filter(
        (lead) =>
          Boolean(lead.clientId)
      ).length;

    return {
      total,
      newLeads,
      contacted,
      qualified,
      proposalSent,
      negotiation,
      active,
      won,
      lost,
      closed,
      winRate,
      convertedClients,
    };
  }, [leads]);

  /*
  |--------------------------------------------------------------------------
  | CLIENT STATISTICS
  |--------------------------------------------------------------------------
  */

  const clientStats = useMemo(() => {
    const total = clients.length;

    const active = clients.filter(
      (client) =>
        String(
          (client as any).status ||
            "ACTIVE"
        ).toUpperCase() === "ACTIVE"
    ).length;

    const inactive = clients.filter(
      (client) =>
        String(
          (client as any).status ||
            ""
        ).toUpperCase() === "INACTIVE"
    ).length;

    const totalUnits = clients.reduce(
      (sum, client) =>
        sum +
        (Number(
          client.totalAssetsCount
        ) || 0),
      0
    );

    return {
      total,
      active,
      inactive,
      totalUnits,
    };
  }, [clients]);

  /*
  |--------------------------------------------------------------------------
  | CURRENT PIPELINE
  |--------------------------------------------------------------------------
  */

  const pipelineStages = useMemo(() => {
    return [
      {
        label: "New",
        value: leadStats.newLeads,
        description:
          "Newly registered leads",
        className:
          "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50",
        valueClass:
          "text-gray-900 dark:text-white",
      },

      {
        label: "Contacted",
        value: leadStats.contacted,
        description:
          "Initial contact completed",
        className:
          "border-amber-100 bg-amber-50/60 dark:border-amber-900/30 dark:bg-amber-900/10",
        valueClass:
          "text-amber-700 dark:text-amber-400",
      },

      {
        label: "Qualified",
        value: leadStats.qualified,
        description:
          "Qualified opportunities",
        className:
          "border-cyan-100 bg-cyan-50/60 dark:border-cyan-900/30 dark:bg-cyan-900/10",
        valueClass:
          "text-cyan-700 dark:text-cyan-400",
      },

      {
        label: "Proposal Sent",
        value: leadStats.proposalSent,
        description:
          "Proposal stage",
        className:
          "border-blue-100 bg-blue-50/60 dark:border-blue-900/30 dark:bg-blue-900/10",
        valueClass:
          "text-blue-700 dark:text-blue-400",
      },

      {
        label: "Negotiation",
        value: leadStats.negotiation,
        description:
          "Active negotiations",
        className:
          "border-purple-100 bg-purple-50/60 dark:border-purple-900/30 dark:bg-purple-900/10",
        valueClass:
          "text-purple-700 dark:text-purple-400",
      },

      {
        label: "Won",
        value: leadStats.won,
        description:
          "Successfully converted",
        className:
          "border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/30 dark:bg-emerald-900/10",
        valueClass:
          "text-emerald-700 dark:text-emerald-400",
      },

      {
        label: "Lost",
        value: leadStats.lost,
        description:
          "Closed-lost leads",
        className:
          "border-rose-100 bg-rose-50/60 dark:border-rose-900/30 dark:bg-rose-900/10",
        valueClass:
          "text-rose-700 dark:text-rose-400",
      },
    ];
  }, [leadStats]);

  /*
  |--------------------------------------------------------------------------
  | RECENT LEADS
  |--------------------------------------------------------------------------
  */

  const recentLeads = useMemo(() => {
    return [...leads]
      .sort(
        (a, b) =>
          new Date(
            b.createdAt
          ).getTime() -
          new Date(
            a.createdAt
          ).getTime()
      )
      .slice(0, 8);
  }, [leads]);

  /*
  |--------------------------------------------------------------------------
  | RECENT CLIENTS
  |--------------------------------------------------------------------------
  */

  const recentClients = useMemo(() => {
    return [...clients]
      .sort(
        (a, b) =>
          new Date(
            b.joinedDate ||
              ""
          ).getTime() -
          new Date(
            a.joinedDate ||
              ""
          ).getTime()
      )
      .slice(0, 8);
  }, [clients]);

  /*
  |--------------------------------------------------------------------------
  | LEAD TABLE
  |--------------------------------------------------------------------------
  */

  const leadColumns: Column<LeadItem>[] = [
    {
      key: "id",
      header: "Lead ID",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
          {row.id}
        </span>
      ),
    },

    {
      key: "associationName",
      header: "Association",
      sortable: true,
      render: (row) => (
        <div className="min-w-[190px]">
          <span className="block font-semibold text-gray-900 dark:text-white">
            {row.associationName}
          </span>

          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {row.contactName}
          </span>
        </div>
      ),
    },

    {
      key: "contactName",
      header: "Contact",
      sortable: true,
      render: (row) => (
        <div className="min-w-[160px]">
          <span className="block text-xs font-medium text-gray-800 dark:text-gray-200">
            {row.contactName}
          </span>

          {row.mobile && (
            <span className="block text-[11px] text-gray-500 dark:text-gray-400">
              {row.mobile}
            </span>
          )}

          {row.email && (
            <span className="block max-w-[220px] truncate text-[11px] text-gray-400 dark:text-gray-500">
              {row.email}
            </span>
          )}
        </div>
      ),
    },

    {
      key: "source",
      header: "Source",
      sortable: true,
      render: (row) => (
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {row.source || "—"}
        </span>
      ),
    },

    {
      key: "status",
      header: "Stage",
      sortable: true,
      align: "center",
      render: (row) => {
        const labels: Record<
          LeadStatus,
          string
        > = {
          NEW: "New",
          CONTACTED: "Contacted",
          QUALIFIED: "Qualified",
          PROPOSAL_SENT:
            "Proposal Sent",
          NEGOTIATION: "Negotiation",
          WON: "Won",
          LOST: "Lost",
        };

        const styles: Record<
          LeadStatus,
          string
        > = {
          NEW:
            "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",

          CONTACTED:
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",

          QUALIFIED:
            "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20",

          PROPOSAL_SENT:
            "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",

          NEGOTIATION:
            "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",

          WON:
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",

          LOST:
            "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
        };

        return (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[row.status]}`}
          >
            {labels[row.status]}
          </span>
        );
      },
    },

    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (row) => {
        const date =
          new Date(row.createdAt);

        return (
          <span className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
            {Number.isNaN(
              date.getTime()
            )
              ? "—"
              : date.toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )}
          </span>
        );
      },
    },

    {
      key: "actions",
      header: "Action",
      align: "center",
      render: (row) => (
        <Link
          href={`/bde/leads/${row.id}`}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400"
        >
          Manage →
        </Link>
      ),
    },
  ];

  /*
  |--------------------------------------------------------------------------
  | CLIENT TABLE
  |--------------------------------------------------------------------------
  */

  const clientColumns: Column<ClientItem>[] = [
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

    {
      key: "companyName",
      header: "Client",
      sortable: true,
      render: (row) => (
        <div className="min-w-[190px]">
          <span className="block font-semibold text-gray-900 dark:text-white">
            {row.companyName}
          </span>

          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {row.contactPerson}
          </span>
        </div>
      ),
    },

    {
      key: "contactPhone",
      header: "Contact",
      sortable: true,
      render: (row) => (
        <div className="min-w-[150px]">
          <span className="block text-xs font-medium text-gray-800 dark:text-gray-200">
            {row.contactPhone || "—"}
          </span>

          {row.contactEmail && (
            <span className="block max-w-[220px] truncate text-[11px] text-gray-400 dark:text-gray-500">
              {row.contactEmail}
            </span>
          )}
        </div>
      ),
    },

    {
      key: "city",
      header: "Location",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {[row.city, row.state]
            .filter(Boolean)
            .join(", ") || "—"}
        </span>
      ),
    },

    {
      key: "totalAssetsCount",
      header: "Units",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {Number(
            row.totalAssetsCount
          ) || 0}
        </span>
      ),
    },

    {
      key: "joinedDate",
      header: "Joined",
      sortable: true,
      render: (row) => {
        const date =
          new Date(
            row.joinedDate || ""
          );

        return (
          <span className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
            {Number.isNaN(
              date.getTime()
            )
              ? "—"
              : date.toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )}
          </span>
        );
      },
    },

    {
      key: "actions",
      header: "Action",
      align: "center",
      render: (row) => (
        <Link
          href={`/bde/clients/${row.id}`}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400"
        >
          View →
        </Link>
      ),
    },
  ];

  /*
  |--------------------------------------------------------------------------
  | USER NAME
  |--------------------------------------------------------------------------
  */

  const fullName = user
    ? `${user.firstName || ""} ${
        user.lastName || ""
      }`.trim()
    : "Sales Executive";

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="My Sales Dashboard"
          items={[
            {
              label: "BDE / Sales",
            },
            {
              label: "My Dashboard",
            },
          ]}
        />

        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />

            <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              Loading your sales data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DASHBOARD
  |--------------------------------------------------------------------------
  */

  return (
    <div className="space-y-8">
      {/* Header */}

      <Breadcrumb
        pageTitle="My Sales Dashboard"
        items={[
          {
            label: "BDE / Sales",
          },
          {
            label: "My Dashboard",
          },
        ]}
        actions={
          <Link href="/bde/leads/create">
            <Button
              variant="primary"
              size="md"
            >
              + Register New Lead
            </Button>
          </Link>
        }
      />

      {/* Error */}

      {errorMessage && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          {errorMessage}
        </div>
      )}

      {/* Welcome Banner */}

      <div className="overflow-hidden rounded-2xl border border-brand-500/20 bg-gradient-to-r from-brand-600 to-indigo-700 p-6 text-white shadow-theme-md sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              BDE / Sales Workspace
            </span>

            <h1 className="mt-3 text-2xl font-black sm:text-3xl">
              Welcome, {fullName}
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-brand-100">
              This dashboard contains your
              accessible leads and clients.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-md lg:min-w-[230px]">
            <p className="text-xs font-semibold text-brand-100">
              Your Win Rate
            </p>

            <p className="mt-1 text-3xl font-black">
              {leadStats.winRate}%
            </p>

            <p className="mt-1 text-xs text-brand-100">
              Based on closed leads
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        {/* Leads */}

        <MetricCard
          title="My Leads"
          value={leadStats.total.toString()}
          change={`${leadStats.newLeads} new`}
          changeType="increase"
          period="current pipeline"
          icon={
            <svg
              className="h-6 w-6 text-brand-600 dark:text-brand-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
              />

              <circle
                cx="9"
                cy="7"
                r="4"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
              />
            </svg>
          }
        />

        {/* Active Leads */}

        <MetricCard
          title="Active Leads"
          value={leadStats.active.toString()}
          change={`${leadStats.qualified} qualified`}
          changeType="increase"
          period="in progress"
          icon={
            <svg
              className="h-6 w-6 text-blue-600 dark:text-blue-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          }
        />

        {/* Clients */}

        <MetricCard
          title="My Clients"
          value={clientStats.total.toString()}
          change={`${clientStats.active} active`}
          changeType="increase"
          period="current clients"
          icon={
            <svg
              className="h-6 w-6 text-purple-600 dark:text-purple-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a4 4 0 00-4-4h-1"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 20H4v-2a4 4 0 014-4h1"
              />

              <circle
                cx="12"
                cy="7"
                r="4"
              />
            </svg>
          }
        />

        {/* Units */}

        <MetricCard
          title="Total Units"
          value={clientStats.totalUnits.toString()}
          change={`${clientStats.active} active clients`}
          changeType="increase"
          period="managed units"
          icon={
            <svg
              className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 21h18"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 21V9l6-4 6 4v12"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 21v-6h6v6"
              />
            </svg>
          }
        />
      </div>

      {/* Lead Pipeline */}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              My Sales Pipeline
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Current lead stages belonging to
              your BDE workspace
            </p>
          </div>

          <Link
            href="/bde/leads"
            className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            View My Leads →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {pipelineStages.map(
            (stage) => (
              <div
                key={stage.label}
                className={`rounded-xl border p-4 ${stage.className}`}
              >
                <span className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  {stage.label}
                </span>

                <span
                  className={`mt-2 block text-3xl font-extrabold ${stage.valueClass}`}
                >
                  {stage.value}
                </span>

                <span className="mt-1 block text-[11px] leading-4 text-gray-500 dark:text-gray-400">
                  {stage.description}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Lead + Client Summary */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lead Summary */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Lead Summary
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Your current sales performance
              </p>
            </div>

            <Link
              href="/bde/leads"
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              View Leads →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total Leads
              </p>

              <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                {leadStats.total}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Active
              </p>

              <p className="mt-1 text-2xl font-black text-blue-700 dark:text-blue-400">
                {leadStats.active}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Won
              </p>

              <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {leadStats.won}
              </p>
            </div>

            <div className="rounded-xl bg-purple-50 p-4 dark:bg-purple-500/10">
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Converted
              </p>

              <p className="mt-1 text-2xl font-black text-purple-700 dark:text-purple-400">
                {leadStats.convertedClients}
              </p>
            </div>
          </div>
        </div>

        {/* Client Summary */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Client Summary
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Clients managed by your BDE account
              </p>
            </div>

            <Link
              href="/bde/clients"
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              View Clients →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-purple-50 p-4 dark:bg-purple-500/10">
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Total Clients
              </p>

              <p className="mt-1 text-2xl font-black text-purple-700 dark:text-purple-400">
                {clientStats.total}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Active Clients
              </p>

              <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {clientStats.active}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Total Units
              </p>

              <p className="mt-1 text-2xl font-black text-blue-700 dark:text-blue-400">
                {clientStats.totalUnits}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Inactive
              </p>

              <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                {clientStats.inactive}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leads */}

      <DynamicTable<LeadItem>
        title="My Recent Leads"
        description="Only leads accessible to your BDE account are shown here."
        columns={leadColumns}
        data={recentLeads}
        searchPlaceholder="Search your leads..."
        initialPageSize={8}
        pageSizeOptions={[
          5,
          8,
          10,
          20,
        ]}
      />

      {/* Recent Clients */}

      <DynamicTable<ClientItem>
        title="My Recent Clients"
        description="Only clients accessible to your BDE account are shown here."
        columns={clientColumns}
        data={recentClients}
        searchPlaceholder="Search your clients..."
        initialPageSize={8}
        pageSizeOptions={[
          5,
          8,
          10,
          20,
        ]}
      />

      {/* Quick Actions */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Link
          href="/bde/leads/create"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs transition hover:-translate-y-0.5 hover:shadow-theme-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            +
          </div>

          <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
            Register New Lead
          </h3>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Add a new customer or association
            opportunity.
          </p>
        </Link>

        <Link
          href="/bde/leads"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs transition hover:-translate-y-0.5 hover:shadow-theme-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            →
          </div>

          <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
            Manage My Leads
          </h3>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            View and manage your accessible
            sales pipeline.
          </p>
        </Link>

        <Link
          href="/bde/clients"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs transition hover:-translate-y-0.5 hover:shadow-theme-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            ✓
          </div>

          <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
            Manage My Clients
          </h3>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            View your active clients and
            managed units.
          </p>
        </Link>

        <Link
          href="/bde/activities"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs transition hover:-translate-y-0.5 hover:shadow-theme-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
            ✓
          </div>

          <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
            Follow-ups & Activities
          </h3>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Manage your customer calls, meetings
            and follow-ups.
          </p>
        </Link>
      </div>
    </div>
  );
}