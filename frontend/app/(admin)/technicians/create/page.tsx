"use client";

import React from "react";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import TechnicianForm from "@/components/technicians/TechnicianForm";

export default function CreateTechnicianPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle="Register Inspection Inspector"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inspection Inspectors", href: "/technicians" },
          { label: "Add Inspector" },
        ]}
      />

      <TechnicianForm isEdit={false} />
    </div>
  );
}
