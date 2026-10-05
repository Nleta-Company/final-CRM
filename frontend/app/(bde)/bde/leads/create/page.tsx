"use client";

import React from "react";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import LeadForm from "@/components/leads/LeadForm";

export default function CreateBdeLeadPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle="Create Lead"
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
            label: "Create Lead",
          },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Create Lead
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Add a new lead to your sales pipeline.
        </p>
      </div>

      {/* Existing LeadForm UI remains unchanged */}
      <LeadForm />
    </div>
  );
}