"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";

interface BdeFormData {
  id?: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;
  status?: string | null;
  designation?: string | null;
  region?: string | null;
}

interface BdeFormProps {
  isEdit?: boolean;
  initialData?: BdeFormData | null;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toUpperCase();

  if (value === "INACTIVE") return "INACTIVE";
  if (value === "SUSPENDED") return "SUSPENDED";

  return "ACTIVE";
}

function displayStatus(status: string) {
  switch (status) {
    case "INACTIVE":
      return "Inactive";
    case "SUSPENDED":
      return "Suspended";
    default:
      return "Active";
  }
}

export default function BdeForm({
  isEdit = false,
  initialData = null,
}: BdeFormProps) {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  // Real BDE profile fields. These are entered by Admin; no fake/default value.
  const [designation, setDesignation] = useState("");
  const [region, setRegion] = useState("");

  const [status, setStatus] = useState("ACTIVE");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !initialData) return;

    const fullName = String(initialData.fullName || "").trim();
    const suppliedFirstName = String(initialData.firstName || "").trim();
    const suppliedLastName = String(initialData.lastName || "").trim();

    if (suppliedFirstName) {
      setFirstName(suppliedFirstName);
    } else if (fullName) {
      const parts = fullName.split(/\s+/);
      setFirstName(parts.shift() || "");
      setLastName(parts.join(" "));
    }

    if (suppliedLastName) {
      setLastName(suppliedLastName);
    }

    setEmail(String(initialData.email || "").trim());
    setMobile(String(initialData.mobile || initialData.phone || "").trim());
    setDesignation(String(initialData.designation || "").trim());
    setRegion(String(initialData.region || "").trim());
    setStatus(normalizeStatus(initialData.status));
  }, [isEdit, initialData]);

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const apiRequest = async (
    endpoint: string,
    method: "POST" | "PUT" | "PATCH",
    body: Record<string, unknown>
  ) => {
    const token = getToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        result?.message || `Request failed with status ${response.status}`
      );
    }

    return result;
  };

  const validatePassword = () => {
    if (!password && !confirmPassword) return null;

    if (password.length < 8) {
      return "New password must be at least 8 characters.";
    }

    if (password !== confirmPassword) {
      return "New password and confirm password do not match.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();
    const cleanDesignation = designation.trim();
    const cleanRegion = region.trim();

    if (!cleanFirstName) {
      setErrorMessage("First name is required.");
      return;
    }

    if (!cleanEmail) {
      setErrorMessage("Email address is required.");
      return;
    }

    if (!cleanMobile) {
      setErrorMessage("Mobile number is required.");
      return;
    }

    if (!cleanDesignation) {
      setErrorMessage("Designation is required.");
      return;
    }

    if (!cleanRegion) {
      setErrorMessage("Sales Territory is required.");
      return;
    }

    if (!isEdit) {
      if (password.length < 8) {
        setErrorMessage("Password must be at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage("Password and confirm password do not match.");
        return;
      }
    } else {
      const passwordError = validatePassword();

      if (passwordError) {
        setErrorMessage(passwordError);
        return;
      }

      if (!initialData?.id) {
        setErrorMessage("BDE user ID is missing.");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const editData = initialData;

      /*
       * IMPORTANT:
       * region/designation are now real form values, not hardcoded values.
       * The backend must accept these fields in createUser/updateUser
       * (or persist them in the BDE profile table) for them to be saved.
       */
      const profileFields = {
        designation: cleanDesignation,
        region: cleanRegion,
      };

      if (!isEdit) {
        await apiRequest("/users", "POST", {
          firstName: cleanFirstName,
          lastName: cleanLastName || undefined,
          email: cleanEmail,
          mobile: cleanMobile || undefined,
          password,
          role: "BDE/Sales",
          ...profileFields,
        });

        setSuccessMessage(
          `BDE/Sales account created successfully for ${cleanFirstName}.`
        );

        setFirstName("");
        setLastName("");
        setEmail("");
        setMobile("");
        setDesignation("");
        setRegion("");
        setPassword("");
        setConfirmPassword("");

        setTimeout(() => {
          router.push("/bde");
          router.refresh();
        }, 900);

        return;
      }

      if (!editData?.id) {
        throw new Error("BDE user ID is missing.");
      }

      const userId = encodeURIComponent(String(editData.id));

      await apiRequest(`/users/${userId}`, "PUT", {
        firstName: cleanFirstName,
        lastName: cleanLastName || undefined,
        email: cleanEmail,
        mobile: cleanMobile || undefined,
        role: "BDE/Sales",
        ...profileFields,
      });

      const oldStatus = normalizeStatus(editData.status);

      if (status !== oldStatus) {
        await apiRequest(`/users/${userId}/status`, "PATCH", {
          status,
        });
      }

      if (password) {
        await apiRequest(`/users/${userId}/password`, "PATCH", {
          newPassword: password,
        });
      }

      setSuccessMessage(
        `BDE/Sales account for ${cleanFirstName} updated successfully.`
      );

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/bde");
        router.refresh();
      }, 900);
    } catch (error: unknown) {
      console.error(
        isEdit ? "UPDATE BDE ACCOUNT ERROR:" : "CREATE BDE ACCOUNT ERROR:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEdit
          ? "Unable to update BDE/Sales account."
          : "Unable to create BDE/Sales account."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative space-y-6">
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-xl dark:bg-white dark:text-gray-900">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          <svg className="mt-0.5 h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="font-semibold">
              {isEdit ? "Unable to Update Account" : "Unable to Create Account"}
            </h4>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <form
        id="bde-account-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  BDE / Sales Account
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isEdit
                    ? "Update the existing Sales team member account"
                    : "Create login credentials and profile details for the Sales team member"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Rahul"
                  autoComplete="given-name"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  autoComplete="family-name"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Login Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahul@nleta.gov.in"
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
                <p className="mt-1.5 text-[11px] text-gray-400">
                  This email will be used by the BDE to log in.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Business Development Associate"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Sales Territory <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Delhi NCR / Jabalpur"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Enter the actual territory assigned to this BDE. No default value is used.
                </p>
              </div>

              {isEdit && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Account Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5a2 2 0 002 2zm10-9V7a4 4 0 00-8 0v3h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  {isEdit ? "Password" : "Login Credentials"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isEdit
                    ? "Leave blank to keep the existing password"
                    : "Admin sets the initial password for the BDE"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {isEdit ? "New Password" : "Password"}{" "}
                  {!isEdit && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!isEdit}
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isEdit ? "Leave blank to keep current" : "Minimum 8 characters"}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-11 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Confirm Password{" "}
                  {!isEdit && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required={!isEdit}
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={isEdit ? "Only required for password change" : "Re-enter password"}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-11 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-300">
                <strong>Security:</strong>{" "}
                {isEdit
                  ? "The existing password is never loaded or displayed. Enter a new password only if you want to change it."
                  : "The password is stored securely as a hash and is not displayed again after account creation."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
            <div className="mb-5 border-b border-gray-100 pb-4 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Account Summary
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {isEdit
                  ? "Current access and profile details for this team member"
                  : "Profile and access details for the new team member"}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Account Role
                </span>
                <span className="mt-1 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
                  BDE / Sales
                </span>
              </div>

              {isEdit && initialData?.id && (
                <div>
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    BDE ID
                  </span>
                  <p className="mt-1 break-all font-mono text-xs text-gray-700 dark:text-gray-300">
                    {initialData.id}
                  </p>
                </div>
              )}

              <div>
                <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Account Status
                </span>
                <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  {displayStatus(status)}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Designation
                </span>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {designation || "Not set"}
                </p>
              </div>

              <div>
                <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Sales Territory
                </span>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {region || "Not set"}
                </p>
              </div>

              <div>
                <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Dashboard
                </span>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  BDE / Sales Dashboard
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
            <button
              type="submit"
              disabled={isSubmitting}
              form="bde-account-form"
              className="flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {isEdit ? "Updating Account..." : "Creating Account..."}
                </span>
              ) : isEdit ? (
                "Update BDE Account"
              ) : (
                "Create BDE Account"
              )}
            </button>

            <Link href="/bde" className="block w-full">
              <Button type="button" variant="outline" size="md" className="w-full justify-center">
                Cancel & Return
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
