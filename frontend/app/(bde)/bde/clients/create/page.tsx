"use client";

import React from "react";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import BdeClientForm from "@/components/clients/BdeClientForm";

export default function CreateBdeClientPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle="Create Client"
        items={[
          {
            label: "Dashboard",
            href: "/bde/dashboard",
          },
          {
            label: "My Clients",
            href: "/bde/clients",
          },
          {
            label: "Create Client",
          },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create Client
        </h1>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add a new client to your sales portfolio.
        </p>
      </div>

      <BdeClientForm />
    </div>
  );
}