"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricCard from "@/components/metrics/MetricCard";
import DynamicTable, { Column } from "@/components/tables/DynamicTable";
import Button from "@/components/ui/Button";
import { employeeService } from "@/services/employeeService";
import { EmployeeItem, EmployeeStats, EmployeeDepartment } from "@/types/employee";

export default function EmployeesPage() {
  const router = useRouter();

  // State
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>("ALL");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshData = async () => {
    try {
      const [list, currentStats] = await Promise.all([
        employeeService.getAllEmployees(),
        employeeService.getEmployeeStats(),
      ]);
      setEmployees(list);
      setStats(currentStats);
    } catch (err) {
      console.error("Error loading employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const unsub = employeeService.subscribe(() => refreshData());
    return () => unsub();
  }, []);

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await employeeService.deleteEmployee(employeeToDelete.id);
      showToast(`Employee ${employeeToDelete.fullName} removed successfully.`);
      setEmployeeToDelete(null);
      if (selectedEmployee?.id === employeeToDelete.id) {
        setSelectedEmployee(null);
      }
    } catch (err) {
      console.error("Error deleting employee:", err);
      showToast("Failed to remove employee record.");
    }
  };

  // Filtered employees for Quick Filter tabs
  const filteredEmployees = useMemo(() => {
    if (deptFilter === "ALL") return employees;
    return employees.filter((e) => e.department === deptFilter);
  }, [employees, deptFilter]);

  const departmentTabs: { label: string; value: string }[] = [
    { label: "All Workforce", value: "ALL" },
    { label: "Safety & Compliance", value: "Safety & Compliance" },
    { label: "Field Engineering", value: "Field Engineering" },
    { label: "Business Development", value: "Business Development" },
    { label: "Quality Assurance", value: "Quality Assurance" },
    { label: "Operations & Logistics", value: "Operations & Logistics" },
  ];

  const getStatusBadge = (status: string) => {
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

  const columns: Column<EmployeeItem>[] = [
    {
      key: "employeeCode",
      header: "Employee ID",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-bold text-xs text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {row.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-brand-600 dark:text-brand-400">
              {row.employeeCode}
            </span>
            <span className="block text-[10px] text-gray-400 font-mono">
              {row.id}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "fullName",
      header: "Staff Member",
      sortable: true,
      render: (row) => (
        <div>
          <span className="block font-semibold text-gray-900 dark:text-white">
            {row.fullName}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {row.designation}
          </span>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department & Station",
      sortable: true,
      render: (row) => (
        <div>
          <span className="block text-xs font-medium text-gray-900 dark:text-white">
            {row.department}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {row.workLocation}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "center",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
            row.status
          )}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Contact",
      render: (row) => (
        <div className="text-xs">
          <span className="block text-gray-800 dark:text-gray-200">{row.phone}</span>
          <span className="block text-gray-400 truncate max-w-[160px]">{row.email}</span>
        </div>
      ),
    },
    {
      key: "assignedProjectsCount",
      header: "Assigned Audits",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          {row.assignedProjectsCount} projects
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          {/* View Profile Button */}
          <Link
            href={`/employees/${row.id}`}
            title="View Employee Profile"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-400 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
          </Link>

          {/* Edit Button */}
          <Link
            href={`/employees/${row.id}/edit`}
            title="Edit Employee"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-400 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </Link>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => setEmployeeToDelete(row)}
            title="Remove Employee"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-400 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-99999 flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-theme-xl dark:bg-white dark:text-gray-900">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with Breadcrumb and Actions */}
      <Breadcrumb
        pageTitle="Employee & Workforce Directory"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees" },
        ]}
        actions={
          <Link href="/employees/create">
            <Button variant="primary" size="md">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Register Employee</span>
            </Button>
          </Link>
        }
      />

      {/* Workforce Metric KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        <MetricCard
          title="Total Workforce"
          value={stats ? stats.totalEmployees.toString() : "0"}
          change="+6.4%"
          changeType="increase"
          period="vs last quarter"
          icon={
            <svg className="w-6 h-6 fill-current text-brand-600 dark:text-brand-400" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          }
        />
        <MetricCard
          title="On Field Duty"
          value={stats ? stats.onFieldDuty.toString() : "0"}
          change="Deployments"
          changeType="increase"
          period="active audits"
          icon={
            <svg className="w-6 h-6 fill-current text-blue-light-600 dark:text-blue-light-400" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          }
        />
        <MetricCard
          title="Active Base Staff"
          value={stats ? stats.activeStaff.toString() : "0"}
          change="Operational"
          changeType="increase"
          period="at stations"
          icon={
            <svg className="w-6 h-6 fill-current text-success-600 dark:text-success-400" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          }
        />
        <MetricCard
          title="Departments"
          value={stats ? `${stats.departmentsCount} Units` : "0"}
          change="Pan-India"
          changeType="increase"
          period="operational coverage"
          icon={
            <svg className="w-6 h-6 fill-current text-purple-600 dark:text-purple-400" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" />
            </svg>
          }
        />
      </div>

      {/* Quick Department Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider me-2">
          Department:
        </span>
        {departmentTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setDeptFilter(tab.value)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              deptFilter === tab.value
                ? "bg-brand-500 text-white shadow-theme-xs"
                : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Dynamic Table */}
      <DynamicTable<EmployeeItem>
        title="NLETA Personnel Records"
        description="Inspect, manage, and filter certified testing personnel, field inspectors, and agency staff"
        columns={columns}
        data={filteredEmployees}
        searchPlaceholder="Search by name, employee ID, designation, location..."
        initialPageSize={10}
        pageSizeOptions={[5, 10, 20]}
        filterOptions={[
          { label: "All Statuses", value: "ALL", field: "status" },
          { label: "Active", value: "Active", field: "status" },
          { label: "On Field Duty", value: "On Field Duty", field: "status" },
          { label: "On Leave", value: "On Leave", field: "status" },
          { label: "Probation", value: "Probation", field: "status" },
        ]}
      />

      {/* Employee Quick View Drawer / Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-500 font-bold text-lg text-white shadow-md">
                  {selectedEmployee.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedEmployee.fullName}
                  </h3>
                  <p className="text-sm font-medium text-brand-600 dark:text-brand-400">
                    {selectedEmployee.designation} &bull; {selectedEmployee.employeeCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.486 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.486l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <span className="block text-[11px] font-semibold text-gray-400 uppercase">
                    Department
                  </span>
                  <span className="mt-1 block text-sm font-bold text-gray-900 dark:text-white">
                    {selectedEmployee.department}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <span className="block text-[11px] font-semibold text-gray-400 uppercase">
                    Status
                  </span>
                  <span
                    className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                      selectedEmployee.status
                    )}`}
                  >
                    {selectedEmployee.status}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <span className="block text-[11px] font-semibold text-gray-400 uppercase">
                    Station Location
                  </span>
                  <span className="mt-1 block text-sm font-bold text-gray-900 dark:text-white truncate">
                    {selectedEmployee.workLocation}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <span className="block text-[11px] font-semibold text-gray-400 uppercase">
                    Work Email
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-gray-900 dark:text-white truncate">
                    {selectedEmployee.email}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <span className="block text-[11px] font-semibold text-gray-400 uppercase">
                    Phone Number
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-gray-900 dark:text-white">
                    {selectedEmployee.phone}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <span className="block text-[11px] font-semibold text-gray-400 uppercase">
                    Employment Type
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-gray-900 dark:text-white">
                    {selectedEmployee.employmentType}
                  </span>
                </div>
              </div>

              {/* Safety & Technical Accreditations */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2.5">
                  Certifications & Qualifications
                </h4>
                {selectedEmployee.safetyCertifications && selectedEmployee.safetyCertifications.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployee.safetyCertifications.map((cert) => (
                      <span
                        key={cert}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 border border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20"
                      >
                        ✓ {cert}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No active certifications recorded.</p>
                )}
              </div>

              {/* Notes */}
              {selectedEmployee.notes && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                  <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Administrative Notes:
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedEmployee.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="outline"
                size="md"
                onClick={() => setSelectedEmployee(null)}
              >
                Close
              </Button>
              <Link href={`/employees/${selectedEmployee.id}/edit`}>
                <Button variant="primary" size="md">
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3 text-error-600 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
                <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Remove Employee
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete the record for{" "}
              <strong>{employeeToDelete.fullName}</strong> ({employeeToDelete.employeeCode})? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setEmployeeToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDelete}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
