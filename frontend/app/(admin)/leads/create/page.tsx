"use client";

import React from "react";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import LeadForm from "@/components/leads/LeadForm";

export default function CreateLeadPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle="Register New Lead"
        items={[
          {
            label: "BDE / Sales",
            href: "/bde/dashboard",
          },
          {
            label: "My Leads",
            href: "/leads",
          },
          {
            label: "New Lead Registration",
          },
        ]}
      />

      <LeadForm isEdit={false} />
    </div>
  );
}