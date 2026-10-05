"use client";

import React from "react";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import BdeForm from "@/components/bde/BdeForm";

export default function CreateBdePage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle="Register New BDE Executive"
        items={[
          { label: "Admin Portal", href: "/dashboard" },
          { label: "BDE Sales Team", href: "/bde" },
          { label: "New Executive Onboarding" },
        ]}
      />

      <BdeForm isEdit={false} />
    </div>
  );
}
