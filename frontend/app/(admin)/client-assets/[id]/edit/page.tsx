"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import AssetForm from "@/components/assets/AssetForm";
import { assetService } from "@/services/assetService";
import { AssetRecord } from "@/types/asset";
import Button from "@/components/ui/Button";

export default function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const assetId = resolvedParams.id;
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchAsset() {
      try {
        setLoading(true);
        const data = await assetService.getAssetById(assetId);
        if (data) {
          setAsset(data);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Error fetching asset:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchAsset();
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2 shadow-theme-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
          <img
            src="/images/logo/nleta-logo.png"
            alt="Loading"
            className="h-10 w-10 animate-pulse object-contain"
          />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading asset record...
        </p>
      </div>
    );
  }

  if (notFound || !asset) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Asset Not Found"
          items={[
            { label: "Admin Portal", href: "/dashboard" },
            { label: "Client Assets", href: "/client-assets" },
            { label: "Not Found" },
          ]}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Asset Unit &ldquo;{assetId}&rdquo; Not Found
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This equipment asset may have been removed or the URL link is invalid.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/client-assets">
              <Button variant="primary">Return to Assets Registry</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle={`Edit Asset: ${asset.assetName} (${asset.id})`}
        items={[
          { label: "Admin Portal", href: "/dashboard" },
          { label: "Client Assets Registry", href: "/client-assets" },
          { label: `Edit ${asset.id}` },
        ]}
        actions={
          <Link href="/client-assets">
            <Button variant="outline" size="sm">
              Back to Registry
            </Button>
          </Link>
        }
      />

      <AssetForm initialAsset={asset} isEdit={true} />
    </div>
  );
}
