"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import MetricCard from "@/components/metrics/MetricCard";
import BarChart from "@/components/charts/BarChart";
import DynamicTable, { Column } from "@/components/tables/DynamicTable";
import Button from "@/components/ui/Button";
import { employeeService } from "@/services/employeeService";
import { EmployeeItem, EmployeeStats, EmployeeDepartment, EmployeeStatus } from "@/types/employee";

export default function EmployeeDashboardPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empList, empStats] = await Promise.all([
        employeeService.getAllEmployees(),
        employeeService.getEmployeeStats(),
      ]);
      setEmployees(empList);
      setStats(empStats);
    } catch (err) {
      console.error("Error loading Employee Dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = employeeService.subscribe(loadData);
    return () => unsub();
  }, []);

  const filteredEmployees = useMemo(() => {
    if (deptFilter === "ALL") return employees;
    return employees.filter((e) => e.department === deptFilter);
  }, [employees, deptFilter]);

  const departmentStaffingData = useMemo(() => {
    return [
      { month: "Safety", sales: stats?.departmentBreakdown["Safety & Compliance"] || 0 },
      { month: "Field Eng", sales: stats?.departmentBreakdown["Field Engineering"] || 0 },
      { month: "Sales & BD", sales: stats?.departmentBreakdown["Business Development"] || 0 },
      { month: "QA Testing", sales: stats?.departmentBreakdown["Quality Assurance"] || 0 },
      { month: "Operations", sales: stats?.departmentBreakdown["Operations & Logistics"] || 0 },
    ];
  }, [stats]);

  const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-800/40";
      case "On Field Duty":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-800/40";
      case "On Leave":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-800/40";
      case "Probation":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-800/40";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    }
  };

  const columns: Column<EmployeeItem>[] = [
    {
      key: "employeeCode",
      header: "Staff ID",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 block">
            {row.employeeCode}
          </span>
          <span className="text-[10px] text-gray-400 truncate max-w-[120px] block">{row.workLocation}</span>
        </div>
      ),
    },
    {
      key: "fullName",
      header: "Employee Name & Role",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 font-bold text-xs text-white">
            {row.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <span className="block font-semibold text-gray-900 dark:text-white">
              {row.fullName}
            </span>
            <span className="text-[11px] text-gray-400">{row.designation}</span>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {row.department}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusBadge(row.status)}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "salaryBand",
      header: "Grade / Band",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-xs text-gray-900 dark:text-white">
          {row.salaryBand || "Grade B (Staff)"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      align: "center",
      render: (row) => (
        <Link
          href={`/employees/${row.id}`}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400"
        >
          View Profile &rarr;
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header & Breadcrumbs */}
      <Breadcrumb
        pageTitle="Employee & Workforce Dashboard"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: "Employee Dashboard" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/employees">
              <Button variant="outline" size="md">
                Staff Directory
              </Button>
            </Link>
            <Link href="/employees/create">
              <Button variant="primary" size="md">
                + Register New Employee
              </Button>
            </Link>
          </div>
        }
      />

      {/* Workforce KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        <MetricCard
          title="Total Workforce"
          value={stats ? stats.totalEmployees.toString() : employees.length.toString()}
          change="+3 this quarter"
          changeType="increase"
          period="active staff headcount"
          icon={
            <svg className="w-6 h-6 fill-current text-brand-600 dark:text-brand-400" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          }
        />
        <MetricCard
          title="Active On Duty"
          value={stats ? stats.activeStaff.toString() : employees.length.toString()}
          change="92.5% Attendance"
          changeType="increase"
          period="active headquarters & office"
          icon={
            <svg className="w-6 h-6 fill-current text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          }
        />
        <MetricCard
          title="On Field Duty"
          value={stats ? stats.onFieldDuty.toString() : "0"}
          change="Active Site Deployment"
          changeType="increase"
          period="technical inspectors on-site"
          icon={
            <svg className="w-6 h-6 fill-current text-blue-light-600 dark:text-blue-light-400" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          }
        />
        <MetricCard
          title="Departments"
          value={stats ? `${stats.departmentsCount} Units` : "5 Units"}
          change="Cross-Functional"
          changeType="neutral"
          period="technical & business divisions"
          icon={
            <svg className="w-6 h-6 fill-current text-purple-600 dark:text-purple-400" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" />
            </svg>
          }
        />
      </div>

      {/* Desktop 50% / 50% Split Charts & HR Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Headcount Bar Chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <BarChart
            title="Headcount by Department"
            subtitle="Staff distribution across technical and business divisions"
            data={departmentStaffingData}
          />
        </div>

        {/* Safety Certifications & HR Compliance Watch */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Safety & Compliance Milestones
              </h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400">
                100% Compliant
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                    📜
                  </span>
                  <div>
                    <span className="block font-semibold text-xs text-gray-900 dark:text-white">
                      Elevator Safety Inspector Licenses (BIS)
                    </span>
                    <span className="text-[11px] text-gray-400">All field inspection engineers certified</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Verified</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-light-100 text-blue-light-700 dark:bg-blue-light-500/20 dark:text-blue-light-300">
                    🛡️
                  </span>
                  <div>
                    <span className="block font-semibold text-xs text-gray-900 dark:text-white">
                      Field Safety Induction & PPE Training
                    </span>
                    <span className="text-[11px] text-gray-400">Completed for Q3 2026 onboarding batch</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">Completed</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                    🏥
                  </span>
                  <div>
                    <span className="block font-semibold text-xs text-gray-900 dark:text-white">
                      Medical & Hazard Insurance Coverage
                    </span>
                    <span className="text-[11px] text-gray-400">Active group policy across all stations</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Active</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <span>Next Safety Audit Scheduled: <strong>15 Oct 2026</strong></span>
            <Link href="/employees" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Staff Directory &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Tabs by Department */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        {[
          { key: "ALL", label: "All Departments", count: employees.length },
          { key: "Safety & Compliance", label: "Safety & Compliance", count: stats?.departmentBreakdown["Safety & Compliance"] || 0 },
          { key: "Field Engineering", label: "Field Engineering", count: stats?.departmentBreakdown["Field Engineering"] || 0 },
          { key: "Business Development", label: "Sales & BD", count: stats?.departmentBreakdown["Business Development"] || 0 },
          { key: "Quality Assurance", label: "Quality Assurance", count: stats?.departmentBreakdown["Quality Assurance"] || 0 },
          { key: "Operations & Logistics", label: "Operations", count: stats?.departmentBreakdown["Operations & Logistics"] || 0 },
        ].map((tab) => {
          const isActive = deptFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setDeptFilter(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-brand-500 text-white shadow-theme-xs"
                  : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Staff Roster Dynamic Table */}
      <DynamicTable<EmployeeItem>
        title="Active Employee Staff Roster"
        description="Search, inspect, and manage verified workforce members across all branches and divisions"
        columns={columns}
        data={filteredEmployees}
        searchPlaceholder="Search by employee name, ID, role, department..."
        initialPageSize={10}
        pageSizeOptions={[5, 10, 20]}
      />
    </div>
  );
}
