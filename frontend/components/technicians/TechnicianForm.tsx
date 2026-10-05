"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TechnicianItem,
  CreateTechnicianInput,
  UpdateTechnicianInput,
  TechnicianStatus,
  TechnicianSpecialization,
  CertificationLevel,
  TechnicianZone,
} from "@/types/technician";
import { technicianService } from "@/services/technicianService";
import Button from "@/components/ui/Button";

interface TechnicianFormProps {
  initialTechnician?: TechnicianItem;
  isEdit?: boolean;
}

const specializations: TechnicianSpecialization[] = [
  "Traction & High-Rise Lifts",
  "Heavy Duty Transit Escalators",
  "Moving Walkways & Travelators",
  "Hydraulic & Freight Systems",
  "Electronics & Speed Governors",
  "Full-Scope Certified Inspector",
];

const certificationLevels: CertificationLevel[] = [
  "Master Auditor (Lead Inspector)",
  "Senior Certified Inspector (Level 3)",
  "Certified Field Engineer (Level 2)",
  "Junior Field Technician (Level 1)",
];

const operatingZones: TechnicianZone[] = [
  "North Zone (Delhi/NCR)",
  "West Zone (Mumbai/Pune)",
  "South Zone (Bengaluru)",
  "South Central (Hyderabad)",
  "East Zone (Kolkata)",
  "Chennai & Coastal Hub",
];

const statuses: TechnicianStatus[] = [
  "Available on Field",
  "On-Site Inspection",
  "In Transit",
  "On Leave",
  "Training / Off-Duty",
];

export default function TechnicianForm({
  initialTechnician,
  isEdit = false,
}: TechnicianFormProps) {
  const router = useRouter();

  // Form State
  const [fullName, setFullName] = useState(initialTechnician?.fullName || "");
  const [badgeNumber, setBadgeNumber] = useState(
    initialTechnician?.badgeNumber || ""
  );
  const [email, setEmail] = useState(initialTechnician?.email || "");
  const [phone, setPhone] = useState(initialTechnician?.phone || "");
  const [skillSpecialization, setSkillSpecialization] =
    useState<TechnicianSpecialization>(
      initialTechnician?.skillSpecialization || "Traction & High-Rise Lifts"
    );
  const [certificationLevel, setCertificationLevel] =
    useState<CertificationLevel>(
      initialTechnician?.certificationLevel ||
        "Senior Certified Inspector (Level 3)"
    );
  const [operatingZone, setOperatingZone] = useState<TechnicianZone>(
    initialTechnician?.operatingZone || "North Zone (Delhi/NCR)"
  );
  const [status, setStatus] = useState<TechnicianStatus>(
    initialTechnician?.status || "Available on Field"
  );
  const [licenseExpiryDate, setLicenseExpiryDate] = useState(
    initialTechnician?.licenseExpiryDate || "2028-12-31"
  );
  const [safetyRating, setSafetyRating] = useState<number>(
    initialTechnician?.safetyRating || 4.9
  );
  const [assignedAuditsCount, setAssignedAuditsCount] = useState<number>(
    initialTechnician?.assignedAuditsCount || 5
  );
  const [completedAuditsCount, setCompletedAuditsCount] = useState<number>(
    initialTechnician?.completedAuditsCount || 50
  );
  const [emergencyAvailable, setEmergencyAvailable] = useState<boolean>(
    initialTechnician?.emergencyAvailable ?? true
  );
  const [notes, setNotes] = useState(initialTechnician?.notes || "");

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!fullName.trim()) {
      setErrorMessage("Inspector / Technician Full Name is required.");
      return;
    }
    if (!badgeNumber.trim()) {
      setErrorMessage("Safety Badge Number is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid work email address.");
      return;
    }
    if (!phone.trim()) {
      setErrorMessage("Contact phone number is required.");
      return;
    }
    if (!licenseExpiryDate) {
      setErrorMessage("License & Certification expiry date is required.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEdit && initialTechnician) {
        const updatePayload: UpdateTechnicianInput = {
          fullName,
          badgeNumber,
          email,
          phone,
          skillSpecialization,
          certificationLevel,
          operatingZone,
          status,
          licenseExpiryDate,
          safetyRating,
          assignedAuditsCount,
          completedAuditsCount,
          emergencyAvailable,
          notes,
        };

        await technicianService.updateTechnician(
          initialTechnician.id,
          updatePayload
        );
        setSuccessToast(
          `Technician profile "${fullName}" updated successfully!`
        );
      } else {
        const createPayload: CreateTechnicianInput = {
          fullName,
          badgeNumber,
          email,
          phone,
          skillSpecialization,
          certificationLevel,
          operatingZone,
          status,
          licenseExpiryDate,
          safetyRating,
          assignedAuditsCount,
          completedAuditsCount,
          emergencyAvailable,
          joinedDate: new Date().toISOString().split("T")[0],
          notes,
        };

        const created = await technicianService.createTechnician(createPayload);
        setSuccessToast(
          `Technician "${created.fullName}" registered successfully with ID ${created.id}!`
        );
      }

      setTimeout(() => {
        router.push("/technicians");
      }, 1200);
    } catch (err: unknown) {
      console.error("Failed to save technician:", err);
      const msg =
        err instanceof Error ? err.message : "Error saving technician record";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-99999 flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-theme-xl dark:bg-white dark:text-gray-900 animate-bounce">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl bg-error-50 p-4 border border-error-200 text-sm text-error-700 dark:bg-error-500/10 dark:border-error-500/20 dark:text-error-400">
          <svg
            className="w-5 h-5 shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="font-semibold">Validation Error</h4>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Inspector Credentials */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Inspector Identity & Contact
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Field engineer identity and direct communication lines
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Full Name <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Safety Inspector Badge ID{" "}
                  <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="e.g. NLETA-T-130"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-mono text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Official Email <span className="text-error-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rajesh.s@nleta.gov.in"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Mobile / Field Contact Number{" "}
                  <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98110 54321"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Specialization & Accreditation */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Engineering Specialization & Zone
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Technical domain accreditation and geographic zone
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Technical Specialization{" "}
                  <span className="text-error-500">*</span>
                </label>
                <select
                  value={skillSpecialization}
                  onChange={(e) =>
                    setSkillSpecialization(
                      e.target.value as TechnicianSpecialization
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  {specializations.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Accreditation / Certification Level{" "}
                  <span className="text-error-500">*</span>
                </label>
                <select
                  value={certificationLevel}
                  onChange={(e) =>
                    setCertificationLevel(e.target.value as CertificationLevel)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  {certificationLevels.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Assigned Operating Zone{" "}
                  <span className="text-error-500">*</span>
                </label>
                <select
                  value={operatingZone}
                  onChange={(e) =>
                    setOperatingZone(e.target.value as TechnicianZone)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  {operatingZones.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Safety License Expiry Date{" "}
                  <span className="text-error-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={licenseExpiryDate}
                  onChange={(e) => setLicenseExpiryDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Technical Certifications & Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. BIS Lift Inspector License #2024-ND-992. Certified for high-speed counterweight drop tests and ultrasonic rope flaw detection."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Dispatch Status Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Status & Dispatch
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Real-time field availability
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Current Operational Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as TechnicianStatus)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Emergency Dispatch Availability */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3.5 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block">
                    Emergency Dispatch
                  </span>
                  <span className="text-[11px] text-gray-400 block">
                    24/7 on-call breakdown response
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergencyAvailable}
                    onChange={(e) => setEmergencyAvailable(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500" />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Safety Audit Rating (out of 5.0)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.01"
                  value={safetyRating}
                  onChange={(e) => setSafetyRating(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-brand-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-brand-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Active Audits
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={assignedAuditsCount}
                    onChange={(e) =>
                      setAssignedAuditsCount(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Completed
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={completedAuditsCount}
                    onChange={(e) =>
                      setCompletedAuditsCount(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 space-y-3">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving Profile...
                </span>
              ) : isEdit ? (
                "Update Technician Record"
              ) : (
                "Register Safety Inspector"
              )}
            </Button>

            <Link href="/technicians" className="block w-full">
              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full justify-center"
              >
                Cancel & Return
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
