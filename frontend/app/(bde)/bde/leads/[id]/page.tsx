"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import Button from "@/components/ui/Button";

import { leadService } from "@/services/leadService";
import type { LeadItem, LeadStatus } from "@/types/lead";

const statusLabels: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

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

function formatDate(value?: string) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

export default function BdeLeadDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const leadId =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [lead, setLead] = useState<LeadItem | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [converting, setConverting] = useState(false);
  const [convertMessage, setConvertMessage] =
    useState("");

  const loadLead = useCallback(async () => {
    if (!leadId) {
      setError("Lead ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data =
        await leadService.getLeadById(leadId);

      if (!data) {
        setError("Lead not found.");
        setLead(null);
        return;
      }

      setLead(data);
    } catch (err: any) {
      console.error(
        "Failed to load BDE lead:",
        err
      );

      setError(
        err?.message ||
          "Unable to load lead details."
      );

      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  const handleConvertToClient = async () => {
    if (!lead) {
      return;
    }

    if (lead.status === "WON" || lead.clientId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to convert this lead into a client?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setConverting(true);
      setConvertMessage("");

      const result =
        await leadService.convertLeadToClient(
          lead.id,
          {}
        );

      if (result?.lead) {
        setLead(result.lead);
      }

      setConvertMessage(
        "Lead converted to client successfully."
      );

      leadService.notifyChange();
    } catch (err: any) {
      console.error(
        "Failed to convert lead:",
        err
      );

      setConvertMessage(
        err?.message ||
          "Unable to convert lead to client."
      );
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Lead Details"
          items={[
            {
              label: "Dashboard",
              href: "/bde/dashboard",
            },
            {
              label: "My Leads",
              href: "/bde/leads",
            },
            {
              label: "Lead Details",
            },
          ]}
        />

        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <p className="text-sm text-gray-500">
            Loading lead details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Lead Details"
          items={[
            {
              label: "Dashboard",
              href: "/bde/dashboard",
            },
            {
              label: "My Leads",
              href: "/bde/leads",
            },
            {
              label: "Lead Details",
            },
          ]}
        />

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800">
            Unable to load lead
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {error || "Lead not found."}
          </p>

          <Link
            href="/bde/leads"
            className="mt-4 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Back to My Leads
          </Link>
        </div>
      </div>
    );
  }

  const isConverted =
    Boolean(lead.clientId) ||
    lead.status === "WON";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        pageTitle="Lead Details"
        items={[
          {
            label: "Dashboard",
            href: "/bde/dashboard",
          },
          {
            label: "My Leads",
            href: "/bde/leads",
          },
          {
            label: lead.associationName,
          },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {lead.associationName}
            </h1>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                lead.status
              )}`}
            >
              {statusLabels[lead.status]}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Lead ID: {lead.id}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/bde/leads">
            <Button variant="outline">
              Back
            </Button>
          </Link>

          <Link
            href={`/bde/leads/${lead.id}/edit`}
          >
            <Button variant="outline">
              Edit Lead
            </Button>
          </Link>

          {!isConverted && (
            <Button
              variant="primary"
              isLoading={converting}
              loadingText="Converting..."
              onClick={handleConvertToClient}
            >
              Convert to Client
            </Button>
          )}
        </div>
      </div>

      {/* Convert message */}
      {convertMessage && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {convertMessage}
        </div>
      )}

      {/* Main */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Contact Information */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Customer Information
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InfoItem
              label="Association / Organization"
              value={lead.associationName}
            />

            <InfoItem
              label="Contact Person"
              value={lead.contactName}
            />

            <InfoItem
              label="Mobile"
              value={lead.mobile || "-"}
            />

            <InfoItem
              label="Email"
              value={lead.email || "-"}
            />

            <InfoItem
              label="Lead Source"
              value={lead.source || "-"}
            />

            <InfoItem
              label="Status"
              value={statusLabels[lead.status]}
            />
          </div>
        </div>

        {/* Ownership */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Ownership
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Created By
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-900">
                {lead.createdBy
                  ? `${lead.createdBy.firstName} ${
                      lead.createdBy.lastName || ""
                    }`.trim()
                  : "You"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Assigned BDE
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-900">
                {lead.assignedTo
                  ? `${lead.assignedTo.firstName} ${
                      lead.assignedTo.lastName || ""
                    }`.trim()
                  : "You"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Created
              </p>

              <p className="mt-1 text-sm text-gray-700">
                {formatDate(lead.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Last Updated
              </p>

              <p className="mt-1 text-sm text-gray-700">
                {formatDate(lead.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Notes
          </h2>

          <div className="rounded-xl bg-gray-50 p-4">
            {lead.notes ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                {lead.notes}
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                No notes added for this lead.
              </p>
            )}
          </div>
        </div>

        {/* Client Status */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Conversion
          </h2>

          {lead.clientId ? (
            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-700">
                Converted to Client
              </p>

              <p className="mt-1 break-all text-xs text-green-600">
                Client ID: {lead.clientId}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">
                Not Converted
              </p>

              <p className="mt-1 text-xs text-gray-500">
                This lead has not been converted into a client yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}