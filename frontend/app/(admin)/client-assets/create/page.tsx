"use client";

import React from "react";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import AssetForm from "@/components/assets/AssetForm";

export default function CreateAssetPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle="Register New Equipment Asset"
        items={[
          { label: "Admin Portal", href: "/dashboard" },
          { label: "Client Assets Registry", href: "/client-assets" },
          { label: "New Asset Registration" },
        ]}
      />

      <AssetForm isEdit={false} />
    </div>
  );
}
