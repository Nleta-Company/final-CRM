"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import TechnicianForm from "@/components/technicians/TechnicianForm";
import { technicianService } from "@/services/technicianService";
import { TechnicianItem } from "@/types/technician";
import Button from "@/components/ui/Button";

export default function EditTechnicianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const techId = resolvedParams.id;
  const [technician, setTechnician] = useState<TechnicianItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchTechnician() {
      try {
        setLoading(true);
        const data = await technicianService.getTechnicianById(techId);
        if (data) {
          setTechnician(data);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Error fetching technician:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchTechnician();
  }, [techId]);

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
          Loading inspector profile...
        </p>
      </div>
    );
  }

  if (notFound || !technician) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Inspector Not Found"
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Inspection Inspectors", href: "/technicians" },
            { label: "Not Found" },
          ]}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Inspection Inspector &ldquo;{techId}&rdquo; Not Found
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This inspector record may have been removed or the link is invalid.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/technicians">
              <Button variant="primary">Return to Inspectors Roster</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle={`Edit Inspector: ${technician.fullName} (${technician.badgeNumber})`}
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inspection Inspectors", href: "/technicians" },
          { label: `Edit ${technician.id}` },
        ]}
        actions={
          <Link href="/technicians">
            <Button variant="outline" size="sm">
              Back to Inspectors
            </Button>
          </Link>
        }
      />

      <TechnicianForm initialTechnician={technician} isEdit={true} />
    </div>
  );
}
