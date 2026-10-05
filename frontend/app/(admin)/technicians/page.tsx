"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricCard from "@/components/metrics/MetricCard";
import DynamicTable, { Column } from "@/components/tables/DynamicTable";
import Button from "@/components/ui/Button";
import { technicianService } from "@/services/technicianService";
import { clientTechnicianService } from "@/services/clientTechnicianService";
import { clientService } from "@/services/clientService";
import { TechnicianItem, TechnicianStats, TechnicianStatus } from "@/types/technician";
import { ClientItem } from "@/types/client";

export default function TechniciansViewPage() {
  const router = useRouter();

  // State
  const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
  const [stats, setStats] = useState<TechnicianStats | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianItem | null>(null);
  const [technicianToDelete, setTechnicianToDelete] = useState<TechnicianItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quickStatusFilter, setQuickStatusFilter] = useState<string>("ALL");

  // Client Assignment State for Selected Technician
  const [assignedClients, setAssignedClients] = useState<ClientItem[]>([]);
  const [allClients, setAllClients] = useState<ClientItem[]>([]);
  const [clientToAssign, setClientToAssign] = useState<string>("");
  const [isAssigningClient, setIsAssigningClient] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshData = async () => {
    try {
      const [list, currentStats] = await Promise.all([
        technicianService.getAllTechnicians(),
        technicianService.getTechnicianStats(),
      ]);
      setTechnicians(list);
      setStats(currentStats);
    } catch (err) {
      console.error("Error loading technicians:", err);
    }
  };

  const loadTechnicianClients = async (techId: string) => {
    try {
      const [techClients, all] = await Promise.all([
        clientTechnicianService.getClientsForTechnician(techId),
        clientService.getAllClients(),
      ]);
      setAssignedClients(techClients);
      setAllClients(all);
    } catch (e) {
      console.error("Error loading clients for technician:", e);
    }
  };

  useEffect(() => {
    refreshData();
    const unsub1 = technicianService.subscribe(() => refreshData());
    const unsub2 = clientTechnicianService.subscribe(() => refreshData());
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  useEffect(() => {
    if (selectedTechnician) {
      loadTechnicianClients(selectedTechnician.id);
    } else {
      setAssignedClients([]);
      setClientToAssign("");
    }
  }, [selectedTechnician]);

  const handleAssignClientToTech = async () => {
    if (!selectedTechnician || !clientToAssign) return;
    setIsAssigningClient(true);
    try {
      await clientTechnicianService.assignTechnicianToClient(
        clientToAssign,
        selectedTechnician.id
      );
      showToast(`Client assigned to ${selectedTechnician.fullName}!`);
      setClientToAssign("");
      await loadTechnicianClients(selectedTechnician.id);
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign client";
      showToast(msg);
    } finally {
      setIsAssigningClient(false);
    }
  };

  const handleUnassignClient = async (clientId: string) => {
    if (!selectedTechnician) return;
    try {
      await clientTechnicianService.unassignTechnicianFromClient(clientId);
      showToast(`Client unassigned from technician.`);
      await loadTechnicianClients(selectedTechnician.id);
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unassign client";
      showToast(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!technicianToDelete) return;
    try {
      await technicianService.deleteTechnician(technicianToDelete.id);
      showToast(`Technician "${technicianToDelete.fullName}" removed successfully.`);
      setTechnicianToDelete(null);
      if (selectedTechnician?.id === technicianToDelete.id) {
        setSelectedTechnician(null);
      }
      refreshData();
    } catch (err) {
      console.error("Error deleting technician:", err);
      showToast("Failed to delete technician.");
    }
  };

  const getStatusBadge = (status: TechnicianStatus) => {
    switch (status) {
      case "Available on Field":
        return {
          bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
          dot: "bg-emerald-500",
        };
      case "On-Site Inspection":
        return {
          bg: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
          dot: "bg-blue-500",
        };
      case "In Transit":
        return {
          bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
          dot: "bg-amber-500",
        };
      case "On Leave":
        return {
          bg: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
          dot: "bg-purple-500",
        };
      case "Training / Off-Duty":
      default:
        return {
          bg: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
          dot: "bg-gray-400",
        };
    }
  };

  const filterOptions = [
    { label: "Available on Field", value: "Available on Field", field: "status" as keyof TechnicianItem },
    { label: "On-Site Inspection", value: "On-Site Inspection", field: "status" as keyof TechnicianItem },
    { label: "In Transit", value: "In Transit", field: "status" as keyof TechnicianItem },
    { label: "On Leave", value: "On Leave", field: "status" as keyof TechnicianItem },
  ];

  const displayData = useMemo(() => {
    if (quickStatusFilter === "ALL") return technicians;
    return technicians.filter((t) => t.status === quickStatusFilter);
  }, [technicians, quickStatusFilter]);

  const columns: Column<TechnicianItem>[] = [
    {
      key: "id",
      header: "Inspector Badge",
      sortable: true,
      width: "120px",
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 block">
            {row.id}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">{row.badgeNumber}</span>
        </div>
      ),
    },
    {
      key: "fullName",
      header: "Field Engineer & Level",
      sortable: true,
      render: (row) => (
        <div className="max-w-[220px]">
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {row.fullName}
          </p>
          <span className="text-[11px] text-gray-400 truncate block">
            {row.certificationLevel}
          </span>
        </div>
      ),
    },
    {
      key: "skillSpecialization",
      header: "Specialization",
      sortable: true,
      render: (row) => (
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {row.skillSpecialization}
        </span>
      ),
    },
    {
      key: "operatingZone",
      header: "Operating Zone",
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          {row.operatingZone}
        </span>
      ),
    },
    {
      key: "safetyRating",
      header: "Safety Rating",
      sortable: true,
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
          <svg className="w-4 h-4 fill-current text-amber-500" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>{row.safetyRating.toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: "completedAuditsCount",
      header: "Audits",
      sortable: true,
      align: "center",
      render: (row) => (
        <div className="text-xs">
          <span className="font-bold text-gray-800 dark:text-white">
            {row.completedAuditsCount} Done
          </span>
          <span className="text-[10px] text-gray-400 block">
            {row.assignedAuditsCount} in queue
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => {
        const badge = getStatusBadge(row.status);
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${badge.bg}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
              <span>{row.status}</span>
            </span>
            {row.emergencyAvailable && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-emerald-500 animate-ping" />
                24/7 Dispatch
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setSelectedTechnician(row)}
            title="View Inspector Profile"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => router.push(`/technicians/${row.id}/edit`)}
            title="Edit Technician"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-amber-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-amber-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setTechnicianToDelete(row)}
            title="Delete Technician"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-gray-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-99999 flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-theme-xl dark:bg-white dark:text-gray-900 animate-bounce">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Breadcrumbs */}
      <Breadcrumb
        pageTitle="Inspection Inspectors & Field Engineers"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inspection Inspectors" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/technicians/dashboard">
              <Button variant="outline" size="md">
                Inspector Dashboard
              </Button>
            </Link>
            <Link href="/technicians/create">
              <Button variant="primary" size="md">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Inspection Inspector
              </Button>
            </Link>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Certified Inspection Inspectors"
          value={stats?.totalTechnicians ?? "--"}
          change="BIS Accredited"
          changeType="increase"
          period="certified roster"
          icon={
            <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          }
        />
        <MetricCard
          title="Available on Field"
          value={stats?.availableOnField ?? "--"}
          change="Immediate"
          changeType="increase"
          period="ready for audit dispatch"
          icon={
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          title="On-Site Active Audits"
          value={stats?.onSiteInspection ?? "--"}
          change="In-Progress"
          changeType="neutral"
          period="active shafts / sites"
          icon={
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <MetricCard
          title="Avg Safety Rating"
          value={stats ? `${stats.averageRating} / 5.0` : "--"}
          change="98.8%"
          changeType="increase"
          period="audit quality score"
          icon={
            <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        {[
          { key: "ALL", label: "All Inspection Inspectors", count: technicians.length },
          { key: "Available on Field", label: "Available on Field", count: stats?.statusBreakdown["Available on Field"] || 0 },
          { key: "On-Site Inspection", label: "On-Site Inspection", count: stats?.statusBreakdown["On-Site Inspection"] || 0 },
          { key: "In Transit", label: "In Transit", count: stats?.statusBreakdown["In Transit"] || 0 },
          { key: "On Leave", label: "On Leave", count: stats?.statusBreakdown["On Leave"] || 0 },
        ].map((tab) => {
          const isActive = quickStatusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setQuickStatusFilter(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-brand-500 text-white shadow-theme-xs"
                  : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-900/60 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Table */}
      <DynamicTable
        title="Field Inspection Inspectors Roster"
        description="Monitor certified safety inspection inspectors, zone allocations, live audit assignments, and accreditation credentials"
        columns={columns}
        data={displayData}
        searchPlaceholder="Search by inspector name, badge, specialization, zone..."
        filterable={true}
        filterOptions={filterOptions}
        initialPageSize={10}
        onRowClick={(row) => setSelectedTechnician(row)}
        onAddRecord={() => router.push("/technicians/create")}
      />

      {/* View Detail Modal */}
      {selectedTechnician && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setSelectedTechnician(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div>
                <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                  {selectedTechnician.id} &bull; Badge: {selectedTechnician.badgeNumber}
                </span>
                <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {selectedTechnician.fullName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedTechnician.certificationLevel} &bull; {selectedTechnician.operatingZone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTechnician(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {/* Technical Profile Grid */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Technical Profile & Accreditation
                </h4>
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40 text-xs">
                  <div>
                    <span className="text-gray-400">Specialization</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedTechnician.skillSpecialization}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">License Expiry</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedTechnician.licenseExpiryDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Audit Safety Rating</span>
                    <p className="font-bold text-amber-600 dark:text-amber-400 mt-0.5 text-sm">
                      ★ {selectedTechnician.safetyRating.toFixed(2)} / 5.0
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Inspections Completed</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedTechnician.completedAuditsCount} units certified
                    </p>
                  </div>
                </div>
              </div>

              {/* Status & Contact */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Field Dispatch & Contact Details
                </h4>
                <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800 text-xs space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Status:</span>
                    <div>
                      {(() => {
                        const badge = getStatusBadge(selectedTechnician.status);
                        return (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold border ${badge.bg}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                            <span>{selectedTechnician.status}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Emergency 24/7 Dispatch:</span>
                    <span className={`font-semibold ${selectedTechnician.emergencyAvailable ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500"}`}>
                      {selectedTechnician.emergencyAvailable ? "Yes - On-Call Ready" : "No - Standard Shift Only"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Work Email:</span>
                    <a href={`mailto:${selectedTechnician.email}`} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                      {selectedTechnician.email}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Field Phone:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {selectedTechnician.phone}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Operating Zone:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {selectedTechnician.operatingZone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Clients Portfolio & Quick Allocation */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Assigned Client Accounts ({assignedClients.length})
                  </h4>
                  <span className="text-[11px] font-medium text-brand-600 dark:text-brand-400">
                    Active Audit Contracts
                  </span>
                </div>

                {/* Client Assignment Action Bar */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 mb-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Assign Client Account to {selectedTechnician.fullName}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={clientToAssign}
                      onChange={(e) => setClientToAssign(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <option value="">-- Select a Client Account to Assign --</option>
                      {allClients
                        .filter((c) => c.assignedTechnicianId !== selectedTechnician.id)
                        .map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.id} - {client.companyName} ({client.totalAssetsCount} units) {client.assignedTechnicianName ? `[Reassign from ${client.assignedTechnicianName}]` : "[Unassigned]"}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={!clientToAssign || isAssigningClient}
                      onClick={handleAssignClientToTech}
                      className="shrink-0 px-3.5 py-2 text-xs font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {isAssigningClient ? "Assigning..." : "Assign Client"}
                    </button>
                  </div>
                </div>

                {/* List of currently assigned clients */}
                {assignedClients.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center dark:border-gray-800">
                    <p className="text-xs text-gray-400">No client accounts currently assigned to this technician.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {assignedClients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-800/60 text-xs"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                              {client.id}
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-white truncate">
                              {client.companyName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                            <span>{client.clientType}</span>
                            <span>&bull;</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {client.totalAssetsCount} Units
                            </span>
                            <span>&bull;</span>
                            <span className="rounded bg-gray-100 px-1.5 py-0.2 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              {client.contractStatus}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnassignClient(client.id)}
                          title="Unassign client from technician"
                          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10 dark:hover:text-error-400 transition"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedTechnician.notes && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Certifications, Licensing & Notes
                  </h4>
                  <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                    {selectedTechnician.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedTechnician(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(`/technicians/${selectedTechnician.id}/edit`)}
              >
                Edit Technician Record
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {technicianToDelete && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setTechnicianToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Remove Technician Record?
            </h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Are you sure you want to remove inspector <span className="font-semibold text-gray-800 dark:text-gray-200">{technicianToDelete.fullName} ({technicianToDelete.badgeNumber})</span>? Any scheduled inspections must be reassigned.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setTechnicianToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
                Confirm Removal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
