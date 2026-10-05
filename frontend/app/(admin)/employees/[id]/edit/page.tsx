"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import EmployeeForm from "@/components/employees/EmployeeForm";
import { employeeService } from "@/services/employeeService";
import { EmployeeItem } from "@/types/employee";
import Button from "@/components/ui/Button";

export default function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;
  const [employee, setEmployee] = useState<EmployeeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchEmployee() {
      try {
        setLoading(true);
        const data = await employeeService.getEmployeeById(employeeId);
        if (data) {
          setEmployee(data);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Error fetching employee:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployee();
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

  if (notFound || !employee) {
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
            This employee record may have been removed or the link is invalid.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/employees">
              <Button variant="primary">Return to Employees</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle={`Edit Profile: ${employee.fullName} (${employee.employeeCode})`}
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: `Edit ${employee.id}` },
        ]}
        actions={
          <Link href="/employees">
            <Button variant="outline" size="sm">
              Back to Employees
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-5xl">
        <EmployeeForm initialEmployee={employee} isEdit={true} />
      </div>
    </div>
  );
}
