"use client";

import React, { useEffect, useState } from "react";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";

interface StoredUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  mobile?: string;
  role?: string | { name?: string };
}

function getRoleName(
  role?: string | { name?: string }
): string {
  if (!role) {
    return "";
  }

  if (typeof role === "string") {
    return role;
  }

  return role.name || "";
}

function formatRole(role: string): string {
  const normalizedRole = role.trim().toUpperCase();

  switch (normalizedRole) {
    case "ADMIN":
      return "Administrator";

    case "BDE":
    case "SALES":
    case "BDE/SALES":
    case "BDE_SALES":
      return "BDE / Sales";

    case "CLIENT":
    case "OWNER":
      return "Client";

    case "SUB_ADMIN":
    case "SUB ADMIN":
    case "SUB-ADMIN":
    case "SUBADMIN":
      return "Sub Administrator";

    default:
      return role || "User";
  }
}

export default function ProfilePage() {
  const [user, setUser] =
    useState<StoredUser | null>(null);

  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser =
          localStorage.getItem("nleta_user");

        if (!storedUser) {
          setUser(null);
          return;
        }

        const parsedUser =
          JSON.parse(storedUser);

        setUser(parsedUser);
      } catch (error) {
        console.error(
          "Failed to load profile:",
          error
        );

        setUser(null);
      }
    };

    loadUser();

    window.addEventListener(
      "nleta_user_updated",
      loadUser
    );

    window.addEventListener(
      "storage",
      loadUser
    );

    return () => {
      window.removeEventListener(
        "nleta_user_updated",
        loadUser
      );

      window.removeEventListener(
        "storage",
        loadUser
      );
    };
  }, []);

  const firstName =
    user?.firstName || "";

  const lastName =
    user?.lastName || "";

  const fullName =
    user?.fullName ||
    `${firstName} ${lastName}`.trim() ||
    "User";

  const role = formatRole(
    getRoleName(user?.role)
  );

  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((name) =>
        name.charAt(0)
      )
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}

      <Breadcrumb
        pageTitle="My Profile"
        items={[
          {
            label: "Dashboard",
            href: "/dashboard",
          },
          {
            label: "My Profile",
          },
        ]}
      />

      {/* Profile Header */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="h-32 bg-gradient-to-r from-brand-500 to-brand-600" />

        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {/* Avatar */}

              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-brand-500 text-2xl font-bold text-white shadow-lg dark:border-gray-900">
                {initials}
              </div>

              {/* User Name */}

              <div className="pb-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {fullName}
                </h1>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {role}
                </p>
              </div>
            </div>

            {/* Status */}

            <div className="pb-1">
              <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Information */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Personal Information
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Your account information
            </p>
          </div>

          <div className="space-y-5">
            {/* Full Name */}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Full Name
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {fullName}
              </p>
            </div>

            {/* Email */}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Email Address
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {user?.email ||
                  "No email available"}
              </p>
            </div>

            {/* Mobile */}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Mobile Number
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {user?.mobile ||
                  "No mobile number available"}
              </p>
            </div>
          </div>
        </div>

        {/* Account Information */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Account Information
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Your CRM account details
            </p>
          </div>

          <div className="space-y-5">
            {/* User ID */}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                User ID
              </p>

              <p className="mt-1 break-all text-sm font-medium text-gray-900 dark:text-white">
                {user?.id || "Not available"}
              </p>
            </div>

            {/* Role */}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Role
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {role}
              </p>
            </div>

            {/* Workspace */}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Workspace
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                Admin CRM Workspace
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Summary */}

      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-6 dark:border-brand-500/20 dark:bg-brand-500/10">
        <h2 className="text-base font-semibold text-brand-700 dark:text-brand-300">
          CRM Account
        </h2>

        <p className="mt-2 text-sm leading-6 text-brand-600/80 dark:text-brand-400/80">
          This profile belongs to your CRM account.
          Your account information is loaded from the
          currently logged-in user.
        </p>
      </div>
    </div>
  );
}