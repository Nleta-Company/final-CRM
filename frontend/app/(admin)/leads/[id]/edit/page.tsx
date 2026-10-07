"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import LeadForm from "@/components/leads/LeadForm";
import { leadService } from "@/services/leadService";
import { LeadItem } from "@/types/lead";
import Button from "@/components/ui/Button";

interface StoredUser {
  role?: string | { name?: string };
  roleName?: string;
}

function getCurrentRole(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const rawUser = localStorage.getItem("nleta_user");

    if (!rawUser) {
      return "";
    }

    const user = JSON.parse(rawUser) as StoredUser;

    if (typeof user.role === "string") {
      return user.role;
    }

    if (
      user.role &&
      typeof user.role === "object" &&
      typeof user.role.name === "string"
    ) {
      return user.role.name;
    }

    return user.roleName || "";
  } catch (error) {
    console.error("Failed to read current user:", error);
    return "";
  }
}

export default function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const leadId = resolvedParams.id;

  const [lead, setLead] = useState<LeadItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentRole, setCurrentRole] = useState("");

  const isBde = currentRole === "BDE/Sales";

  const leadsPath = isBde ? "/bde/leads" : "/leads";
  const dashboardPath = isBde ? "/bde/dashboard" : "/dashboard";
  const portalLabel = isBde ? "BDE / Sales" : "Admin Portal";

  useEffect(() => {
    setCurrentRole(getCurrentRole());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchLead() {
      try {
        setLoading(true);
        setNotFound(false);

        const data = await leadService.getLeadById(leadId);

        if (cancelled) {
          return;
        }

        if (data) {
          setLead(data);
        } else {
          setLead(null);
          setNotFound(true);
        }
      } catch (error) {
        console.error("Error fetching lead:", error);

        if (!cancelled) {
          setLead(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLead();

    return () => {
      cancelled = true;
    };
  }, [leadId]);

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
          Loading lead details...
        </p>
      </div>
    );
  }

  if (notFound || !lead) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Lead Not Found"
          items={[
            { label: portalLabel, href: dashboardPath },
            { label: "Leads", href: leadsPath },
            { label: "Not Found" },
          ]}
        />

        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Lead Not Found
          </h2>

          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
            This lead may have been removed or the ID in the URL may be
            incorrect.
          </p>

          <div className="mt-6 flex justify-center">
            <Link href={leadsPath}>
              <Button variant="primary">Back to Leads</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle={`Edit Lead: ${lead.associationName}`}
        items={[
          { label: portalLabel, href: dashboardPath },
          { label: "Leads", href: leadsPath },
          { label: `Edit ${lead.id}` },
        ]}
        actions={
          <Link href={leadsPath}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={
                <svg
                  className="h-4 w-4 fill-none stroke-current"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              }
            >
              Back to Leads
            </Button>
          </Link>
        }
      />

      <LeadForm initialLead={lead} isEdit />
    </div>
  );
}
