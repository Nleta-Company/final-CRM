"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricCard from "@/components/metrics/MetricCard";
import DynamicTable, { Column } from "@/components/tables/DynamicTable";
import Button from "@/components/ui/Button";
import { technicianService } from "@/services/technicianService";
import { clientTechnicianService } from "@/services/clientTechnicianService";
import { clientService } from "@/services/clientService";
import { TechnicianItem, TechnicianStatus } from "@/types/technician";
import { ClientItem } from "@/types/client";

export default function InspectorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const techId = resolvedParams.id;

  const [inspector, setInspector] = useState<TechnicianItem | null>(null);
  const [assignedClients, setAssignedClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [item, clients] = await Promise.all([
        technicianService.getTechnicianById(techId),
        clientTechnicianService.getClientsForTechnician(techId),
      ]);
      setInspector(item);
      setAssignedClients(clients);
    } catch (err) {
      console.error("Error loading inspector profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = clientTechnicianService.subscribe(loadData);
    return () => unsub();
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

  if (!inspector) {
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
          <div className="mt-6 flex justify-center">
            <Link href="/technicians">
              <Button variant="primary">Return to Inspectors Roster</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const clientColumns: Column<ClientItem>[] = [
    {
      key: "companyName",
      header: "Client Facility",
      sortable: true,
      render: (row) => (
        <div>
          <span className="block font-semibold text-gray-900 dark:text-white">
            {row.companyName}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {row.id} &bull; {row.clientType}
          </span>
        </div>
      ),
    },
    {
      key: "contactPerson",
      header: "Facility Manager",
      render: (row) => (
        <div>
          <span className="block text-xs font-medium text-gray-900 dark:text-white">
            {row.contactPerson}
          </span>
          <span className="block text-xs text-gray-400">{row.contactEmail}</span>
        </div>
      ),
    },
    {
      key: "contractValue",
      header: "Audit Scope / Value",
      sortable: true,
      render: (row) => (
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {row.contractValue}
        </span>
      ),
    },
    {
      key: "contractStatus",
      header: "Audit Status",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400">
          {row.contractStatus}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header & Breadcrumbs */}
      <Breadcrumb
        pageTitle={`Inspector Profile: ${inspector.fullName}`}
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inspection Inspectors", href: "/technicians" },
          { label: inspector.fullName },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/technicians/dashboard">
              <Button variant="outline" size="md">
                Inspector Dashboard
              </Button>
            </Link>
            <Link href={`/technicians/${inspector.id}/edit`}>
              <Button variant="primary" size="md">
                Edit Profile
              </Button>
            </Link>
          </div>
        }
      />

      {/* Hero Profile Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 font-black text-xl text-white shadow-lg">
              {inspector.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {inspector.fullName}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400">
                  {inspector.status}
                </span>
              </div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                {inspector.certificationLevel} &bull; <span className="font-mono">Badge: {inspector.badgeNumber}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Field Zone: <strong>{inspector.operatingZone}</strong> &bull; Specialization: <strong>{inspector.skillSpecialization}</strong>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 sm:w-72 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-gray-500 dark:text-gray-400">Safety Rating</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">⭐ {inspector.safetyRating?.toFixed(1) || "5.0"} / 5.0</span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Completed Audits: <strong>{inspector.completedAuditsCount} units certified</strong>
            </div>
          </div>
        </div>

        {/* Contact Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
          <div>
            <span className="block text-gray-400 font-semibold uppercase">Email</span>
            <span className="block text-gray-900 dark:text-white font-medium mt-0.5">{inspector.email}</span>
          </div>
          <div>
            <span className="block text-gray-400 font-semibold uppercase">Phone Number</span>
            <span className="block text-gray-900 dark:text-white font-medium mt-0.5">{inspector.phone}</span>
          </div>
          <div>
            <span className="block text-gray-400 font-semibold uppercase">Operating Zone</span>
            <span className="block text-gray-900 dark:text-white font-medium mt-0.5">{inspector.operatingZone}</span>
          </div>
        </div>
      </div>

      {/* KPI Performance Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        <MetricCard
          title="Safety Audits Conducted"
          value={`${inspector.completedAuditsCount} Units`}
          change="Certified"
          changeType="increase"
          period="cumulative audits"
          icon={
            <svg className="w-6 h-6 fill-current text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          }
        />
        <MetricCard
          title="Quality Score"
          value={`★ ${inspector.safetyRating?.toFixed(1) || "5.0"}`}
          change="98.8% Compliance"
          changeType="increase"
          period="audit precision"
          icon={
            <svg className="w-6 h-6 fill-current text-amber-500" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
        />
        <MetricCard
          title="Assigned Accounts"
          value={assignedClients.length.toString()}
          change="Active Sites"
          changeType="increase"
          period="portfolio management"
          icon={
            <svg className="w-6 h-6 fill-current text-blue-light-600 dark:text-blue-light-400" viewBox="0 0 20 20">
              <path d="M10 2a4 4 0 100 8 4 4 0 000-8zM3 16a7 7 0 1114 0H3z" />
            </svg>
          }
        />
        <MetricCard
          title="Field Deployment"
          value={inspector.status}
          change={inspector.operatingZone}
          changeType="neutral"
          period="zone allocation"
          icon={
            <svg className="w-6 h-6 fill-current text-purple-600 dark:text-purple-400" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" />
            </svg>
          }
        />
      </div>

      {/* Assigned Client Portfolios */}
      <DynamicTable<ClientItem>
        title="Assigned Client Facilities & Inspection Portfolio"
        description={`Sites and elevator installations actively inspected by ${inspector.fullName}`}
        columns={clientColumns}
        data={assignedClients}
        searchPlaceholder="Search facility name, manager, audit type..."
        initialPageSize={10}
        pageSizeOptions={[5, 10, 20]}
      />
    </div>
  );
}
