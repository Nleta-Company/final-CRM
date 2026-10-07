"use client";

import React from "react";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import LeadForm from "@/components/leads/LeadForm";

export default function CreateLeadPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle="Create New Lead"
        items={[
          {
            label: "Admin",
            href: "/dashboard",
          },
          {
            label: "Leads",
            href: "/leads",
          },
          {
            label: "Create Lead",
          },
        ]}
      />

      <LeadForm isEdit={false} />
    </div>
  );
}