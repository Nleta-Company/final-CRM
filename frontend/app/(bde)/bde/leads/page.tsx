"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import { leadService } from "@/services/leadService";
import type {
    LeadItem,
    LeadStatus,
} from "@/types/lead";

const STATUS_OPTIONS: Array<{
    value: "ALL" | LeadStatus;
    label: string;
}> = [
        { value: "ALL", label: "All Leads" },
        { value: "NEW", label: "New" },
        { value: "CONTACTED", label: "Contacted" },
        { value: "QUALIFIED", label: "Qualified" },
        { value: "PROPOSAL_SENT", label: "Proposal Sent" },
        { value: "NEGOTIATION", label: "Negotiation" },
        { value: "WON", label: "Won" },
        { value: "LOST", label: "Lost" },
    ];

function getStatusLabel(status: LeadStatus) {
    return (
        STATUS_OPTIONS.find((item) => item.value === status)?.label ||
        status
    );
}

function getStatusClass(status: LeadStatus) {
    switch (status) {
        case "NEW":
            return "bg-blue-50 text-blue-700";

        case "CONTACTED":
            return "bg-yellow-50 text-yellow-700";

        case "QUALIFIED":
            return "bg-purple-50 text-purple-700";

        case "PROPOSAL_SENT":
            return "bg-indigo-50 text-indigo-700";

        case "NEGOTIATION":
            return "bg-orange-50 text-orange-700";

        case "WON":
            return "bg-green-50 text-green-700";

        case "LOST":
            return "bg-red-50 text-red-700";

        default:
            return "bg-gray-50 text-gray-700";
    }
}

function formatDate(value: string) {
    if (!value) return "-";

    try {
        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(value));
    } catch {
        return "-";
    }
}

export default function BdeLeadsPage() {
    const [leads, setLeads] = useState<LeadItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"ALL" | LeadStatus>("ALL");

    const loadLeads = useCallback(async (showRefresh = false) => {
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const data = await leadService.getAllLeads({
                search,
                status,
            });

            setLeads(data);
        } catch (err: any) {
            console.error("Failed to load BDE leads:", err);

            setError(
                err?.message || "Unable to load your leads."
            );

            setLeads([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search, status]);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    useEffect(() => {
        const unsubscribe = leadService.subscribe(() => {
            loadLeads(true);
        });

        return unsubscribe;
    }, [loadLeads]);

    const stats = useMemo(() => {
        return {
            total: leads.length,
            new: leads.filter((lead) => lead.status === "NEW").length,
            contacted: leads.filter(
                (lead) => lead.status === "CONTACTED"
            ).length,
            qualified: leads.filter(
                (lead) => lead.status === "QUALIFIED"
            ).length,
            won: leads.filter(
                (lead) => lead.status === "WON"
            ).length,
            lost: leads.filter(
                (lead) => lead.status === "LOST"
            ).length,
        };
    }, [leads]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <Breadcrumb
                        pageTitle="My Leads"
                        items={[
                            {
                                label: "Dashboard",
                                href: "/bde/dashboard",
                            },
                            {
                                label: "My Leads",
                            },
                        ]}
                    />

                    <h1 className="mt-3 text-2xl font-bold text-gray-900">
                        My Leads
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Manage and track your leads.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => loadLeads(true)}
                        disabled={refreshing}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>

                    <Link
                        href="/bde/leads/create"
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        + Create Lead
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <StatCard
                    title="Total"
                    value={stats.total}
                />

                <StatCard
                    title="New"
                    value={stats.new}
                />

                <StatCard
                    title="Contacted"
                    value={stats.contacted}
                />

                <StatCard
                    title="Qualified"
                    value={stats.qualified}
                />

                <StatCard
                    title="Won"
                    value={stats.won}
                />

                <StatCard
                    title="Lost"
                    value={stats.lost}
                />
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row">
                    <div className="flex-1">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                            Search
                        </label>

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search association, contact, email..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div className="w-full md:w-56">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                            Status
                        </label>

                        <select
                            value={status}
                            onChange={(event) =>
                                setStatus(
                                    event.target.value as "ALL" | LeadStatus
                                )
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Leads Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-5 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Lead List
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Showing leads assigned to you.
                            </p>
                        </div>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                            {leads.length} Leads
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex min-h-[300px] items-center justify-center">
                        <div className="text-sm text-gray-500">
                            Loading your leads...
                        </div>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
                            📋
                        </div>

                        <h3 className="text-base font-semibold text-gray-900">
                            No leads found
                        </h3>

                        <p className="mt-1 max-w-md text-sm text-gray-500">
                            {search || status !== "ALL"
                                ? "No leads match your current filters."
                                : "You haven't created any leads yet."}
                        </p>

                        {!search && status === "ALL" && (
                            <Link
                                href="/bde/leads/create"
                                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                Create Your First Lead
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Association
                                    </th>

                                    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Contact
                                    </th>

                                    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Mobile
                                    </th>

                                    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Source
                                    </th>

                                    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Status
                                    </th>

                                    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Created
                                    </th>

                                    <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200 bg-white">
                                {leads.map((lead) => (
                                    <tr
                                        key={lead.id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="max-w-[220px]">
                                                <p className="truncate text-sm font-semibold text-gray-900">
                                                    {lead.associationName}
                                                </p>

                                                {lead.email && (
                                                    <p className="mt-1 truncate text-xs text-gray-500">
                                                        {lead.email}
                                                    </p>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="text-sm text-gray-900">
                                                {lead.contactName}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="text-sm text-gray-700">
                                                {lead.mobile || "-"}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="text-sm text-gray-700">
                                                {lead.source || "-"}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                                    lead.status
                                                )}`}
                                            >
                                                {getStatusLabel(lead.status)}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                                            {formatDate(lead.createdAt)}
                                        </td>

                                        <td className="px-5 py-4 text-right">
                                            <Link
                                                href={`/bde/leads/${lead.id}`}
                                                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
}: {
    title: string;
    value: number;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {title}
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {value}
            </p>
        </div>
    );
}