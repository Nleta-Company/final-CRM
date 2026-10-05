"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  EmployeeItem,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeDepartment,
  EmployeeStatus,
  EmploymentType,
  WorkLocation,
} from "@/types/employee";
import { employeeService } from "@/services/employeeService";
import Button from "@/components/ui/Button";

interface EmployeeFormProps {
  initialEmployee?: EmployeeItem;
  isEdit?: boolean;
}

const departments: EmployeeDepartment[] = [
  "Safety & Compliance",
  "Field Engineering",
  "Business Development",
  "Quality Assurance",
  "Operations & Logistics",
  "Executive Management",
];

const statuses: EmployeeStatus[] = [
  "Active",
  "On Field Duty",
  "On Leave",
  "Probation",
  "Inactive",
];

const employmentTypes: EmploymentType[] = [
  "Full-Time Permanent",
  "Contract Inspector",
  "Probationary",
  "Consultant",
];

const workLocations: WorkLocation[] = [
  "Headquarters (New Delhi)",
  "Mumbai Regional Office",
  "Bengaluru Tech Hub",
  "Hyderabad Operations",
  "Kolkata Hub",
  "Chennai Branch",
];

const availableCertifications = [
  "ISO 9001 Lead Auditor",
  "BIS Escalator Inspector",
  "EN 81-20/50 Specialist",
  "QCI Master Cert",
  "Hydraulic Lift Master",
  "ISO 17020 Inspection Body",
  "Six Sigma Green Belt",
  "Heavy Duty Escalator Master",
  "Emergency Braking Systems",
  "Controller Retrofit Inspection",
];

export default function EmployeeForm({
  initialEmployee,
  isEdit = false,
}: EmployeeFormProps) {
  const router = useRouter();

  // Form State
  const [fullName, setFullName] = useState(initialEmployee?.fullName || "");
  const [employeeCode, setEmployeeCode] = useState(initialEmployee?.employeeCode || "");
  const [email, setEmail] = useState(initialEmployee?.email || "");
  const [phone, setPhone] = useState(initialEmployee?.phone || "");
  const [department, setDepartment] = useState<EmployeeDepartment>(
    initialEmployee?.department || "Safety & Compliance"
  );
  const [designation, setDesignation] = useState(
    initialEmployee?.designation || ""
  );
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    initialEmployee?.employmentType || "Full-Time Permanent"
  );
  const [workLocation, setWorkLocation] = useState<WorkLocation>(
    initialEmployee?.workLocation || "Headquarters (New Delhi)"
  );
  const [status, setStatus] = useState<EmployeeStatus>(
    initialEmployee?.status || "Active"
  );
  const [joiningDate, setJoiningDate] = useState(
    initialEmployee?.joiningDate || new Date().toISOString().split("T")[0]
  );
  const [salaryBand, setSalaryBand] = useState(
    initialEmployee?.salaryBand || "Grade B (Senior Staff)"
  );
  const [emergencyContact, setEmergencyContact] = useState(
    initialEmployee?.emergencyContact || ""
  );
  const [assignedProjectsCount, setAssignedProjectsCount] = useState<number>(
    initialEmployee?.assignedProjectsCount || 0
  );
  const [certifications, setCertifications] = useState<string[]>(
    initialEmployee?.safetyCertifications || []
  );
  const [customCertInput, setCustomCertInput] = useState("");
  const [notes, setNotes] = useState(initialEmployee?.notes || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCertification = (cert: string) => {
    if (certifications.includes(cert)) {
      setCertifications(certifications.filter((c) => c !== cert));
    } else {
      setCertifications([...certifications, cert]);
    }
  };

  const handleAddCustomCert = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    if (!customCertInput.trim()) return;
    if (!certifications.includes(customCertInput.trim())) {
      setCertifications([...certifications, customCertInput.trim()]);
    }
    setCustomCertInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !phone.trim() || !designation.trim()) {
      setError("Please fill in all mandatory fields marked with an asterisk (*).");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid work email address.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (isEdit && initialEmployee) {
        const updatePayload: UpdateEmployeeInput = {
          fullName,
          employeeCode,
          email,
          phone,
          department,
          designation,
          employmentType,
          workLocation,
          status,
          joiningDate,
          salaryBand,
          emergencyContact,
          assignedProjectsCount,
          safetyCertifications: certifications,
          notes,
        };
        await employeeService.updateEmployee(initialEmployee.id, updatePayload);
      } else {
        const createPayload: CreateEmployeeInput = {
          fullName,
          employeeCode,
          email,
          phone,
          department,
          designation,
          employmentType,
          workLocation,
          status,
          joiningDate,
          salaryBand,
          emergencyContact,
          assignedProjectsCount,
          safetyCertifications: certifications,
          notes,
        };
        await employeeService.createEmployee(createPayload);
      }

      router.push("/employees");
    } catch (err) {
      console.error("Error saving employee record:", err);
      setError("An error occurred while saving the employee record. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          <svg className="w-5 h-5 shrink-0 text-error-500" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Personal & Contact Information */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            1. Identity & Contact Information
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Basic personal and contact details of the employee
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Full Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Full Name <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Rajesh Kumar Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
              required
            />
          </div>

          {/* Employee Code */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Employee Badge / Code
            </label>
            <input
              type="text"
              placeholder="e.g. NLETA-EMP-109 (Auto if blank)"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
            />
          </div>

          {/* Work Email */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Work Email Address <span className="text-error-500">*</span>
            </label>
            <input
              type="email"
              placeholder="r.sharma@nletacrm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Mobile Phone <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              placeholder="+91 98112 34567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
              required
            />
          </div>

          {/* Emergency Contact */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Emergency Contact Person & Number
            </label>
            <input
              type="text"
              placeholder="+91 98112 34500 (Spouse / Guardian)"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Department, Role & Work Location */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            2. Department, Designation & Station
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Operational department alignment and regional office station
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Department */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Department <span className="text-error-500">*</span>
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as EmployeeDepartment)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-400"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Designation */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Designation / Title <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Technical Safety Auditor"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
              required
            />
          </div>

          {/* Work Location */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Work Location / Base Branch
            </label>
            <select
              value={workLocation}
              onChange={(e) => setWorkLocation(e.target.value as WorkLocation)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-400"
            >
              {workLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Employment Type */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Employment Type
            </label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-400"
            >
              {employmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Current Status */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Operational Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-400"
            >
              {statuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Joining Date */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Date of Joining
            </label>
            <input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-900 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:focus:border-brand-400"
            />
          </div>

          {/* Salary Grade */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Pay Band / Grade
            </label>
            <input
              type="text"
              placeholder="e.g. Grade A (Executive) / Grade B"
              value={salaryBand}
              onChange={(e) => setSalaryBand(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
            />
          </div>

          {/* Assigned Projects */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Assigned Audits / Accounts Count
            </label>
            <input
              type="number"
              min="0"
              value={assignedProjectsCount}
              onChange={(e) => setAssignedProjectsCount(Math.max(0, parseInt(e.target.value) || 0))}
              className="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Safety & Technical Certifications */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            3. Safety Licenses & Technical Certifications
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Click to attach valid compliance credentials and safety accreditations
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2.5">
            {availableCertifications.map((cert) => {
              const isSelected = certifications.includes(cert);
              return (
                <button
                  key={cert}
                  type="button"
                  onClick={() => toggleCertification(cert)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-brand-500 text-white shadow-sm ring-2 ring-brand-500/20 dark:bg-brand-500"
                      : "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  <span>{cert}</span>
                  {isSelected ? (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="text-gray-400">+</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Add custom cert */}
          <div className="flex items-center gap-2 pt-2 max-w-md">
            <input
              type="text"
              placeholder="Add other custom certification..."
              value={customCertInput}
              onChange={(e) => setCustomCertInput(e.target.value)}
              onKeyDown={handleAddCustomCert}
              className="h-10 flex-1 rounded-xl border border-gray-300 bg-transparent px-3.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={handleAddCustomCert}
              className="h-10 rounded-xl bg-gray-100 px-3.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Notes & Remarks */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            4. Administrative Remarks & Profile Notes
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Internal notes, specializations, or audit privileges
          </p>
        </div>

        <div>
          <textarea
            rows={4}
            placeholder="Enter any additional background, regional jurisdiction, or specialized equipment clearances..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-transparent p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
          />
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Link href="/employees">
          <Button variant="outline" size="md" type="button">
            Cancel
          </Button>
        </Link>
        <Button variant="primary" size="md" type="submit" disabled={loading}>
          {loading
            ? "Saving Profile..."
            : isEdit
            ? "Save Changes"
            : "Register Employee"}
        </Button>
      </div>
    </form>
  );
}
