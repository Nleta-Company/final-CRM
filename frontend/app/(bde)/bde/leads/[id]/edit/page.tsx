"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useParams } from "next/navigation";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import LeadForm from "@/components/leads/LeadForm";

import { leadService } from "@/services/leadService";
import type { LeadItem } from "@/types/lead";

export default function EditBdeLeadPage() {
  const params = useParams();

  const leadId =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [lead, setLead] =
    useState<LeadItem | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
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
        "Failed to load BDE lead for edit:",
        err
      );

      setError(
        err?.message ||
          "Unable to load lead."
      );

      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  /*
   * Loading state
   */
  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Edit Lead"
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
              label: "Edit Lead",
            },
          ]}
        />

        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <p className="text-sm text-gray-500">
            Loading lead...
          </p>
        </div>
      </div>
    );
  }

  /*
   * Error / not found state
   */
  if (error || !lead) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Edit Lead"
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
              label: "Edit Lead",
            },
          ]}
        />

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-800">
            Unable to load lead
          </h2>

          <p className="mt-1 text-sm text-red-700">
            {error || "Lead not found."}
          </p>
        </div>
      </div>
    );
  }

  /*
   * Edit page
   *
   * IMPORTANT:
   * LeadForm handles the actual BDE/Admin role logic.
   * We do not change the existing LeadForm UI here.
   */
  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle="Edit Lead"
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
            href: `/bde/leads/${lead.id}`,
          },
          {
            label: "Edit Lead",
          },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Edit Lead
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Update your lead information and sales status.
        </p>
      </div>

      <LeadForm
        initialLead={lead}
        isEdit
      />
    </div>
  );
}