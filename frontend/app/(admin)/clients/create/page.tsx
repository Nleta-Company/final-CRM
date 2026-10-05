"use client";

import React from "react";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import ClientForm from "@/components/clients/ClientForm";

export default function CreateClientPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle="Register New Client Account"
        items={[
          {
            label: "Admin Portal",
            href: "/dashboard",
          },
          {
            label: "Clients Portfolio",
            href: "/clients",
          },
          {
            label: "New Client Registration",
          },
        ]}
      />

      <ClientForm isEdit={false} />
    </div>
  );
}