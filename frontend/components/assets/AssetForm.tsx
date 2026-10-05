"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AssetRecord,
  CreateAssetInput,
  UpdateAssetInput,
  AssetEquipmentType,
  AssetOperationalStatus,
} from "@/types/asset";
import { assetService } from "@/services/assetService";
import { clientService } from "@/services/clientService";
import { ClientItem } from "@/types/client";
import Button from "@/components/ui/Button";

interface AssetFormProps {
  initialAsset?: AssetRecord;
  isEdit?: boolean;
}

const equipmentTypes: AssetEquipmentType[] = [
  "Traction Passenger Lift",
  "Heavy Transit Escalator",
  "Moving Walkway / Travelator",
  "Hydraulic Bed Elevator",
  "Service / Freight Elevator",
  "Panoramic Observation Lift",
];

const assetStatuses: AssetOperationalStatus[] = [
  "Certified & Operational",
  "Due for Audit",
  "Audit In-Progress",
  "Defect Rectification",
  "Decommissioned",
];

const inspectors = [
  "Inspector Rajesh Sharma",
  "Inspector Amitav Sen",
  "Inspector Meera Joshi",
  "Senior Eng. Harish Chander",
  "Inspector Priya Sundaram",
];

export default function AssetForm({ initialAsset, isEdit = false }: AssetFormProps) {
  const router = useRouter();

  // Clients for dropdown
  const [clientsList, setClientsList] = useState<ClientItem[]>([]);

  // State
  const [assetName, setAssetName] = useState(initialAsset?.assetName || "");
  const [clientId, setClientId] = useState(initialAsset?.clientId || "");
  const [clientName, setClientName] = useState(initialAsset?.clientName || "");
  const [equipmentType, setEquipmentType] = useState<AssetEquipmentType>(
    initialAsset?.equipmentType || "Traction Passenger Lift"
  );
  const [facilityName, setFacilityName] = useState(initialAsset?.facilityName || "");
  const [locationInFacility, setLocationInFacility] = useState(
    initialAsset?.locationInFacility || ""
  );
  const [manufacturer, setManufacturer] = useState(
    initialAsset?.manufacturer || "Schindler 7000"
  );
  const [installationYear, setInstallationYear] = useState<number>(
    initialAsset?.installationYear || 2022
  );
  const [capacity, setCapacity] = useState(
    initialAsset?.capacity || "1600 kg / 21 Persons"
  );
  const [speed, setSpeed] = useState(initialAsset?.speed || "2.5 m/s");
  const [status, setStatus] = useState<AssetOperationalStatus>(
    initialAsset?.status || "Certified & Operational"
  );
  const [lastAuditDate, setLastAuditDate] = useState(
    initialAsset?.lastAuditDate || ""
  );
  const [nextAuditDueDate, setNextAuditDueDate] = useState(
    initialAsset?.nextAuditDueDate || ""
  );
  const [assignedInspector, setAssignedInspector] = useState(
    initialAsset?.assignedInspector || inspectors[0]
  );
  const [safetyComplianceScore, setSafetyComplianceScore] = useState<number>(
    initialAsset?.safetyComplianceScore || 96
  );
  const [notes, setNotes] = useState(initialAsset?.notes || "");

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    async function loadClients() {
      const cls = await clientService.getAllClients();
      setClientsList(cls);
      if (!clientId && cls.length > 0) {
        setClientId(cls[0].id);
        setClientName(cls[0].companyName);
        if (!facilityName) {
          setFacilityName(cls[0].companyName);
        }
      }
    }
    loadClients();
  }, [clientId, facilityName]);

  const handleClientChange = (cId: string) => {
    setClientId(cId);
    const found = clientsList.find((c) => c.id === cId);
    if (found) {
      setClientName(found.companyName);
      if (!facilityName) {
        setFacilityName(found.companyName);
      }
    }
  };

  const validate = (): boolean => {
    if (!assetName.trim()) {
      setErrorMessage("Asset Name / Serial identifier is required.");
      return false;
    }
    if (!facilityName.trim()) {
      setErrorMessage("Facility Name is required.");
      return false;
    }
    if (!clientName.trim()) {
      setErrorMessage("Client Owner organization is required.");
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (isEdit && initialAsset) {
        const updateData: UpdateAssetInput = {
          assetName: assetName.trim(),
          clientId,
          clientName: clientName.trim(),
          equipmentType,
          facilityName: facilityName.trim(),
          locationInFacility: locationInFacility.trim(),
          manufacturer: manufacturer.trim(),
          installationYear: Number(installationYear),
          capacity: capacity.trim(),
          speed: speed.trim(),
          status,
          lastAuditDate: lastAuditDate || new Date().toISOString().split("T")[0],
          nextAuditDueDate: nextAuditDueDate || "",
          assignedInspector,
          safetyComplianceScore: Number(safetyComplianceScore),
          notes: notes.trim(),
        };

        await assetService.updateAsset(initialAsset.id, updateData);
        setSuccessToast(`Asset ${initialAsset.id} updated successfully!`);
      } else {
        const createData: CreateAssetInput = {
          assetName: assetName.trim(),
          clientId: clientId || "CL-101",
          clientName: clientName.trim() || "DLF CyberCity Developers Ltd",
          equipmentType,
          facilityName: facilityName.trim(),
          locationInFacility: locationInFacility.trim() || "Main Core Elevator Bank",
          manufacturer: manufacturer.trim() || "Schindler",
          installationYear: Number(installationYear),
          capacity: capacity.trim() || "1350 kg / 18 Persons",
          speed: speed.trim() || "2.0 m/s",
          status,
          lastAuditDate: lastAuditDate || new Date().toISOString().split("T")[0],
          nextAuditDueDate: nextAuditDueDate || "",
          assignedInspector,
          safetyComplianceScore: Number(safetyComplianceScore),
          notes: notes.trim(),
        };

        const created = await assetService.createAsset(createData);
        setSuccessToast(`Asset added with ID: ${created.id}`);
      }

      setTimeout(() => {
        router.push("/client-assets");
      }, 1200);
    } catch (err: unknown) {
      console.error("Failed to save asset:", err);
      const msg = err instanceof Error ? err.message : "Error saving asset";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative space-y-6">
      {successToast && (
        <div className="fixed bottom-6 right-6 z-99999 flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-theme-xl dark:bg-white dark:text-gray-900 animate-bounce">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl bg-error-50 p-4 border border-error-200 text-sm text-error-700 dark:bg-error-500/10 dark:border-error-500/20 dark:text-error-400">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-semibold">Validation Error</h4>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Equipment Specification */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Equipment Profile & Identification
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Lift, escalator, or travelator unit specifications and client link
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Asset Unit Identifier / Name <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g. High-Rise Passenger Lift #04 (Tower B) or Atrium Escalator ESC-01"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Client Owner Account
                </label>
                <select
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
                >
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Equipment Category
                </label>
                <select
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value as AssetEquipmentType)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
                >
                  {equipmentTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Facility / Site Name <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  placeholder="e.g. DLF CyberHub Tower B"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Shaft / Location in Building
                </label>
                <input
                  type="text"
                  value={locationInFacility}
                  onChange={(e) => setLocationInFacility(e.target.value)}
                  placeholder="e.g. Core 2, Shaft L4 (Floors G - 32)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  OEM / Manufacturer & Model
                </label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. Otis 515 NPE or Schindler 7000"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Commissioning / Install Year
                </label>
                <input
                  type="number"
                  min="1980"
                  max="2030"
                  value={installationYear}
                  onChange={(e) => setInstallationYear(parseInt(e.target.value, 10) || 2020)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Rated Capacity
                </label>
                <input
                  type="text"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g. 1600 kg / 21 Persons"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Rated Speed
                </label>
                <input
                  type="text"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  placeholder="e.g. 2.5 m/s or 0.65 m/s"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Safety Audit & Inspection Protocol */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Testing Compliance & Inspector Allocation
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Assigned safety auditor and certification due dates
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Assigned Safety Auditor
                </label>
                <select
                  value={assignedInspector}
                  onChange={(e) => setAssignedInspector(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
                >
                  {inspectors.map((ins) => (
                    <option key={ins} value={ins}>
                      {ins}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Safety Compliance Score (0 - 100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={safetyComplianceScore}
                  onChange={(e) => setSafetyComplianceScore(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Last Certified Audit Date
                </label>
                <input
                  type="date"
                  value={lastAuditDate}
                  onChange={(e) => setLastAuditDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Next Audit Due Date
                </label>
                <input
                  type="date"
                  value={nextAuditDueDate}
                  onChange={(e) => setNextAuditDueDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Technical Defect Notes & Rectification Scope
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record rope wear metrics, governor trip speeds, door interlock safety observations..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
              Operational Status
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Compliance Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AssetOperationalStatus)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                >
                  {assetStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {isEdit && initialAsset && (
                <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Asset Code:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-white">{initialAsset.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audit Score:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{initialAsset.safetyComplianceScore}/100</span>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isSubmitting}
                  loadingText={isEdit ? "Updating Asset..." : "Registering Asset..."}
                >
                  {isEdit ? "Update Asset Record" : "Save Asset Unit"}
                </Button>

                <Link href="/client-assets" className="block">
                  <Button variant="outline" fullWidth>
                    Cancel / Return
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Real-time Asset Card Preview */}
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 p-5 shadow-theme-xs dark:border-gray-800 dark:from-gray-900/80 dark:to-gray-900/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Asset Card Preview
              </span>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                {isEdit ? initialAsset?.id : "NEW"}
              </span>
            </div>

            <h4 className="text-base font-bold text-gray-900 dark:text-white truncate">
              {assetName || "Equipment Unit Identifier"}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {equipmentType} &bull; {facilityName || "Site"}
            </p>

            <div className="mt-4 space-y-2 text-xs border-t border-gray-100 dark:border-gray-800 pt-3">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Client:</span>
                <span className="font-semibold text-gray-800 dark:text-white truncate max-w-[140px]">
                  {clientName}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>OEM / Model:</span>
                <span className="font-semibold text-gray-800 dark:text-white truncate max-w-[140px]">
                  {manufacturer}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Speed / Load:</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {speed} | {capacity}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Inspector:</span>
                <span className="font-medium text-gray-800 dark:text-white truncate max-w-[140px]">
                  {assignedInspector}
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
