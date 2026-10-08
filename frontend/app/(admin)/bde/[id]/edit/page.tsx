"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import BdeForm from "@/components/bde/BdeForm";
import { bdeService } from "@/services/bdeService";
import { BdeItem } from "@/types/bde";
import Button from "@/components/ui/Button";

export default function EditBdePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const bdeId = resolvedParams.id;

  const [bde, setBde] = useState<BdeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchBde() {
      try {
        setLoading(true);
        setNotFound(false);

        const data = await bdeService.getBdeById(bdeId);

        if (data) {
          setBde(data);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Error fetching BDE:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    void fetchBde();
  }, [bdeId]);

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
          Loading executive profile...
        </p>
      </div>
    );
  }

  if (notFound || !bde) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Executive Not Found"
          items={[
            {
              label: "Admin Portal",
              href: "/dashboard",
            },
            {
              label: "BDE Sales Team",
              href: "/bde",
            },
            {
              label: "Not Found",
            },
          ]}
        />

        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            BDE Executive &ldquo;{bdeId}&rdquo; Not Found
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This executive record may have been removed or the link is invalid.
          </p>

          <div className="mt-6 flex justify-center">
            <Link href="/bde">
              <Button variant="primary">Return to BDE Team</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle={`Edit Executive: ${bde.fullName} (${bde.id})`}
        items={[
          {
            label: "Admin Portal",
            href: "/dashboard",
          },
          {
            label: "BDE Sales Team",
            href: "/bde",
          },
          {
            label: `Edit ${bde.id}`,
          },
        ]}
        actions={
          <Link href="/bde">
            <Button variant="outline" size="sm">
              Back to Team
            </Button>
          </Link>
        }
      />

      <BdeForm isEdit initialData={bde} />
    </div>
  );
}
