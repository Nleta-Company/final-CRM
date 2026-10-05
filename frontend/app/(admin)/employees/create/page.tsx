import React from "react";
import type { Metadata } from "next";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import EmployeeForm from "@/components/employees/EmployeeForm";

export const metadata: Metadata = {
  title: "Register New Employee",
  description:
    "Add a new employee, field inspection engineer, or safety auditor to NLETA workforce.",
};

export default function CreateEmployeePage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        pageTitle="Register New Employee"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: "Register New Employee" },
        ]}
      />

      <div className="mx-auto max-w-5xl">
        <EmployeeForm />
      </div>
    </div>
  );
}
