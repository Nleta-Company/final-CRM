"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import Button from "@/components/ui/Button";
import { employeeService } from "@/services/employeeService";
import { EmployeeItem, EmployeeStatus } from "@/types/employee";

export default function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;

  const [employee, setEmployee] = useState<EmployeeItem | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getEmployeeById(employeeId);
      setEmployee(data);
    } catch (err) {
      console.error("Error loading employee profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = employeeService.subscribe(loadData);
    return () => unsub();
  }, [employeeId]);

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
          Loading employee profile...
        </p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Employee Not Found"
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Employees", href: "/employees" },
            { label: "Not Found" },
          ]}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Employee &ldquo;{employeeId}&rdquo; Not Found
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This employee profile may have been removed or does not exist.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/employees">
              <Button variant="primary">Return to Employee Directory</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
      case "Active":
        return "bg-success-50 text-success-700 border-success-200 dark:bg-success-500/10 dark:text-success-400 dark:border-success-500/20";
      case "On Field Duty":
        return "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20";
      case "On Leave":
        return "bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-500/10 dark:text-warning-400 dark:border-warning-500/20";
      case "Probation":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Breadcrumbs */}
      <Breadcrumb
        pageTitle={`Staff Profile: ${employee.fullName}`}
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: employee.fullName },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/employees">
              <Button variant="outline" size="md">
                &larr; Staff Directory
              </Button>
            </Link>
            <Link href={`/employees/${employee.id}/edit`}>
              <Button variant="primary" size="md">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                <span>Edit Profile</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Hero Profile Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-5">
            {/* Initials Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-500 font-black text-xl text-white shadow-lg">
              {employee.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {employee.fullName}
                </h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(employee.status)}`}>
                  {employee.status}
                </span>
              </div>
              <p className="text-sm font-medium text-brand-600 dark:text-brand-400 mt-0.5">
                {employee.designation} &bull; <span className="font-mono">{employee.employeeCode}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {employee.department} &bull; Stationed at {employee.workLocation}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-2.5 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <span className="block text-[10px] font-bold uppercase text-gray-400">Assigned Audits</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{employee.assignedProjectsCount}</span>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-2.5 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <span className="block text-[10px] font-bold uppercase text-gray-400">Tenure Since</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white mt-1 block">{employee.joiningDate}</span>
            </div>
          </div>
        </div>

        {/* Contact Info Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
          <div>
            <span className="block text-gray-400 font-semibold uppercase">Official Work Email</span>
            <span className="block text-gray-900 dark:text-white font-medium mt-0.5">{employee.email}</span>
          </div>
          <div>
            <span className="block text-gray-400 font-semibold uppercase">Official Phone</span>
            <span className="block text-gray-900 dark:text-white font-medium mt-0.5">{employee.phone}</span>
          </div>
          <div>
            <span className="block text-gray-400 font-semibold uppercase">Emergency Contact</span>
            <span className="block text-gray-900 dark:text-white font-medium mt-0.5">{employee.emergencyContact || "Not Specified"}</span>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Organizational & Employment Details */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
            Organizational Position & Station
          </h3>
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-50 dark:border-gray-800/60">
              <span className="text-gray-400">Department</span>
              <span className="font-semibold text-gray-900 dark:text-white">{employee.department}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50 dark:border-gray-800/60">
              <span className="text-gray-400">Designation</span>
              <span className="font-semibold text-gray-900 dark:text-white">{employee.designation}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50 dark:border-gray-800/60">
              <span className="text-gray-400">Employment Type</span>
              <span className="font-semibold text-gray-900 dark:text-white">{employee.employmentType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50 dark:border-gray-800/60">
              <span className="text-gray-400">Base Regional Station</span>
              <span className="font-semibold text-gray-900 dark:text-white">{employee.workLocation}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50 dark:border-gray-800/60">
              <span className="text-gray-400">Salary Pay Grade</span>
              <span className="font-semibold text-gray-900 dark:text-white">{employee.salaryBand || "Standard Grade"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-400">Date of Joining</span>
              <span className="font-semibold text-gray-900 dark:text-white">{employee.joiningDate}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Technical Certifications & Safety Licenses */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
            Safety Licenses & Accreditations
          </h3>

          {employee.safetyCertifications && employee.safetyCertifications.length > 0 ? (
            <div className="space-y-2.5">
              {employee.safetyCertifications.map((cert) => (
                <div
                  key={cert}
                  className="flex items-center gap-2.5 rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-xs font-semibold text-brand-900 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300"
                >
                  <svg className="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{cert}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No active safety licenses recorded for this profile.</p>
          )}

          {employee.notes && (
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Profile Remarks:
              </span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {employee.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
