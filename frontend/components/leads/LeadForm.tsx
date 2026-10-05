"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  LeadItem,
  CreateLeadInput,
  UpdateLeadInput,
  LeadStatus,
} from "@/types/lead";

import { leadService } from "@/services/leadService";

import Button from "@/components/ui/Button";

interface LeadFormProps {
  initialLead?: LeadItem;
  isEdit?: boolean;
}

interface BdeUser {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  mobile?: string | null;
  status?: string;
  role?: {
    name: string;
  } | null;
}

interface StoredUser {
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string | { name?: string };
  roleName?: string;
}

interface UsersApiResponse {
  success: boolean;
  message: string;
  data: {
    users: BdeUser[];
    total: number;
  };
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken")
  );
}

/**
 * Read currently logged-in user.
 */
function getCurrentUser(): StoredUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawUser = localStorage.getItem("nleta_user");

    if (!rawUser) {
      return null;
    }

    return JSON.parse(rawUser) as StoredUser;
  } catch (error) {
    console.error("Failed to read nleta_user:", error);
    return null;
  }
}

/**
 * Backend roles:
 *
 * Admin
 * BDE/Sales
 */
function getCurrentRole(): string {
  const user = getCurrentUser();

  if (!user) {
    return "";
  }

  if (typeof user.role === "string") {
    return user.role;
  }

  if (
    user.role &&
    typeof user.role === "object" &&
    typeof user.role.name === "string"
  ) {
    return user.role.name;
  }

  return user.roleName || "";
}

function getBdeName(user?: BdeUser | null): string {
  if (!user) {
    return "";
  }

  return `${user.firstName} ${user.lastName || ""}`.trim();
}

/**
 * Backend LeadStatus values.
 */
const leadStatuses: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
];

/**
 * Human-readable status labels.
 */
const statusLabels: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

/**
 * Common lead sources.
 */
const leadSources = [
  "Government Portal",
  "Inbound Call",
  "Direct Referral",
  "Annual Renewal",
  "Website Form",
  "Email",
  "Existing Client",
  "Other",
];

export default function LeadForm({
  initialLead,
  isEdit = false,
}: LeadFormProps) {
  const router = useRouter();

  /*
   * --------------------------------------------------
   * Current Role
   * --------------------------------------------------
   */

  const [currentRole, setCurrentRole] = useState("");

  const userIsAdmin = currentRole === "Admin";
  const userIsBde = currentRole === "BDE/Sales";

  /*
   * --------------------------------------------------
   * Form State
   * --------------------------------------------------
   */

  const [associationName, setAssociationName] = useState(
    initialLead?.associationName || ""
  );

  const [contactName, setContactName] = useState(
    initialLead?.contactName || ""
  );

  const [email, setEmail] = useState(
    initialLead?.email || ""
  );

  const [mobile, setMobile] = useState(
    initialLead?.mobile || ""
  );

  const [source, setSource] = useState(
    initialLead?.source || ""
  );

  const [notes, setNotes] = useState(
    initialLead?.notes || ""
  );

  const [status, setStatus] = useState<LeadStatus>(
    initialLead?.status || "NEW"
  );

  /*
   * Only Admin can control assignedToId.
   *
   * BDE create:
   * assignedToId is intentionally empty.
   *
   * Backend will assign the lead to logged-in BDE.
   */
  const [assignedToId, setAssignedToId] = useState(
    initialLead?.assignedToId || ""
  );

  /*
   * --------------------------------------------------
   * BDE List
   * --------------------------------------------------
   */

  const [bdesList, setBdesList] = useState<BdeUser[]>([]);
  const [loadingBdes, setLoadingBdes] = useState(false);

  /*
   * --------------------------------------------------
   * UI State
   * --------------------------------------------------
   */

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const [successToast, setSuccessToast] = useState<
    string | null
  >(null);

  /*
   * --------------------------------------------------
   * Detect Current Role
   * --------------------------------------------------
   */

  useEffect(() => {
    const role = getCurrentRole();

    setCurrentRole(role);

    /*
     * BDE should never manually select an assignee
     * when creating a lead.
     */
    if (role === "BDE/Sales" && !isEdit) {
      setAssignedToId("");
    }
  }, [isEdit]);

  /*
   * --------------------------------------------------
   * Load BDEs
   *
   * Only Admin needs the BDE list.
   * --------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    async function loadBdes() {
      /*
       * BDE does not need /users.
       */
      if (!userIsAdmin) {
        setBdesList([]);
        setLoadingBdes(false);
        return;
      }

      try {
        setLoadingBdes(true);

        const token = getAuthToken();

        if (!token) {
          throw new Error(
            "Authentication token is missing."
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/users`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        let result: UsersApiResponse | null = null;

        try {
          result =
            (await response.json()) as UsersApiResponse;
        } catch {
          result = null;
        }

        if (!response.ok) {
          throw new Error(
            result?.message ||
              `Unable to load BDE users. Status ${response.status}`
          );
        }

        const users = result?.data?.users || [];

        const activeBdes = users.filter(
          (user) =>
            user.status === "ACTIVE" &&
            user.role?.name === "BDE/Sales"
        );

        if (!cancelled) {
          setBdesList(activeBdes);
        }
      } catch (error) {
        console.error(
          "Failed to load BDEs in LeadForm:",
          error
        );

        if (!cancelled) {
          setBdesList([]);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load BDE users."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingBdes(false);
        }
      }
    }

    loadBdes();

    return () => {
      cancelled = true;
    };
  }, [userIsAdmin]);

  /*
   * --------------------------------------------------
   * Preserve Existing Assigned BDE While Editing
   * --------------------------------------------------
   */

  useEffect(() => {
    if (
      !initialLead?.assignedToId ||
      !initialLead.assignedTo
    ) {
      return;
    }

    const alreadyLoaded = bdesList.some(
      (bde) =>
        bde.id === initialLead.assignedToId
    );

    if (alreadyLoaded) {
      return;
    }

    const assignedUser = initialLead.assignedTo;

    if (
      assignedUser.role?.name !== "BDE/Sales" &&
      assignedUser.role?.name !== "Admin"
    ) {
      return;
    }

    setBdesList((current) => [
      {
        id: assignedUser.id,
        firstName: assignedUser.firstName,
        lastName:
          assignedUser.lastName || null,
        email:
          assignedUser.email || null,
        status: "ACTIVE",
        role: assignedUser.role
          ? {
              name: assignedUser.role.name,
            }
          : null,
      },
      ...current,
    ]);
  }, [initialLead, bdesList]);

  /*
   * --------------------------------------------------
   * Selected BDE
   * --------------------------------------------------
   */

  const selectedBde = bdesList.find(
    (bde) => bde.id === assignedToId
  );

  /*
   * --------------------------------------------------
   * Validation
   * --------------------------------------------------
   */

  const validateForm = (): boolean => {
    setErrorMessage(null);

    if (!associationName.trim()) {
      setErrorMessage(
        "Association / Organization Name is required."
      );

      return false;
    }

    if (associationName.trim().length < 2) {
      setErrorMessage(
        "Association / Organization Name must contain at least 2 characters."
      );

      return false;
    }

    if (!contactName.trim()) {
      setErrorMessage(
        "Contact Person Name is required."
      );

      return false;
    }

    if (contactName.trim().length < 2) {
      setErrorMessage(
        "Contact Person Name must contain at least 2 characters."
      );

      return false;
    }

    if (email.trim()) {
      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email.trim())) {
        setErrorMessage(
          "Please enter a valid email address."
        );

        return false;
      }
    }

    if (mobile.trim()) {
      const mobileDigits =
        mobile.replace(/\D/g, "");

      if (
        mobileDigits.length < 7 ||
        mobileDigits.length > 15
      ) {
        setErrorMessage(
          "Please enter a valid mobile number."
        );

        return false;
      }
    }

    /*
     * BDE must never send another BDE assignment.
     */
    if (userIsBde && assignedToId) {
      setErrorMessage(
        "BDE/Sales users cannot manually assign leads to another user."
      );

      return false;
    }

    return true;
  };

  /*
   * --------------------------------------------------
   * Submit
   * --------------------------------------------------
   */

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessToast(null);

    try {
      /*
       * ==================================================
       * EDIT EXISTING LEAD
       * ==================================================
       */

      if (isEdit && initialLead) {
        const updateData: UpdateLeadInput = {
          associationName:
            associationName.trim(),

          contactName:
            contactName.trim(),

          email:
            email.trim() || undefined,

          mobile:
            mobile.trim() || undefined,

          source:
            source.trim() || undefined,

          notes:
            notes.trim() || undefined,

          status,
        };

        const updatedLead =
          await leadService.updateLead(
            initialLead.id,
            updateData
          );

        /*
         * -----------------------------------------------
         * ADMIN CAN CHANGE BDE ASSIGNMENT
         * -----------------------------------------------
         */

        if (
          userIsAdmin &&
          assignedToId &&
          assignedToId !==
            initialLead.assignedToId
        ) {
          await leadService.assignBdeToLead(
            initialLead.id,
            assignedToId
          );
        }

        /*
         * Current API has no unassign endpoint.
         *
         * Therefore we don't allow Admin to accidentally
         * remove an existing BDE assignment.
         */
        if (
          userIsAdmin &&
          !assignedToId &&
          initialLead.assignedToId
        ) {
          throw new Error(
            "BDE unassignment is not available from the current CRM API. Please keep the existing BDE assignment."
          );
        }

        /*
         * BDE cannot change assignment.
         */
        if (
          userIsBde &&
          assignedToId &&
          assignedToId !==
            initialLead.assignedToId
        ) {
          throw new Error(
            "BDE/Sales users cannot reassign a lead to another BDE."
          );
        }

        leadService.notifyChange();

        setSuccessToast(
          `Lead ${updatedLead.id} updated successfully.`
        );
      }

      /*
       * ==================================================
       * CREATE NEW LEAD
       * ==================================================
       */

      else {
        /*
         * Base payload.
         *
         * IMPORTANT:
         * BDE does NOT send assignedToId.
         *
         * Backend automatically sets:
         *
         * assignedToId = req.user.userId
         * createdById = req.user.userId
         */
        const createData: CreateLeadInput = {
          associationName:
            associationName.trim(),

          contactName:
            contactName.trim(),

          email:
            email.trim() || undefined,

          mobile:
            mobile.trim() || undefined,

          source:
            source.trim() || undefined,

          notes:
            notes.trim() || undefined,
        };

        /*
         * Only Admin can send assignedToId.
         */
        if (
          userIsAdmin &&
          assignedToId
        ) {
          createData.assignedToId =
            assignedToId;
        }

        const createdLead =
          await leadService.createLead(
            createData
          );

        leadService.notifyChange();

        setSuccessToast(
          `Lead created successfully with ID: ${createdLead.id}`
        );
      }

      /*
       * --------------------------------------------------
       * Role-based redirect
       * --------------------------------------------------
       */

      setTimeout(() => {
        if (userIsBde) {
          router.push("/bde/leads");
        } else {
          router.push("/leads");
        }

        router.refresh();
      }, 1000);
    } catch (error: unknown) {
      console.error(
        "Failed to save lead:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "An error occurred while saving the lead.";

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * --------------------------------------------------
   * Cancel Route
   * --------------------------------------------------
   */

  const cancelRoute = userIsBde
    ? "/bde/leads"
    : "/leads";

  /*
   * --------------------------------------------------
   * Render
   * --------------------------------------------------
   */

  return (
    <div className="relative space-y-6">
      {/* =====================================================
          SUCCESS TOAST
      ====================================================== */}

      {successToast && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-theme-xl dark:bg-white dark:text-gray-900">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />

          <span className="font-medium">
            {successToast}
          </span>
        </div>
      )}

      {/* =====================================================
          ERROR ALERT
      ====================================================== */}

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>

          <div className="flex-1">
            <h4 className="font-semibold">
              Validation / API Error
            </h4>

            <p className="mt-0.5">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {/* =====================================================
            MAIN FORM
        ====================================================== */}

        <div className="space-y-6 lg:col-span-2">
          {/* =====================================================
              ASSOCIATION / CONTACT
          ====================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5 border-b border-gray-100 pb-4 dark:border-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                <svg
                  className="h-4 w-4 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm4 0h2v2h-2V5zm-4 4h2v2H7V9zm4 0h2v2h-2V9zm-4 4h2v2H7v-2zm4 0h2v2h-2v-2z" />
                </svg>
              </span>

              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Association / Customer Information
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Basic customer and primary contact details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Association */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Association / Organization Name{" "}
                  <span className="text-error-500">*</span>
                </label>

                <input
                  type="text"
                  value={associationName}
                  onChange={(e) =>
                    setAssociationName(
                      e.target.value
                    )
                  }
                  placeholder="e.g. ABC Residents Welfare Association"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                  required
                />
              </div>

              {/* Contact */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Contact Person Name{" "}
                  <span className="text-error-500">*</span>
                </label>

                <input
                  type="text"
                  value={contactName}
                  onChange={(e) =>
                    setContactName(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                  required
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Mobile Number
                </label>

                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value)
                  }
                  placeholder="e.g. +91 9876543210"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                />
              </div>

              {/* Email */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="e.g. contact@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* =====================================================
              LEAD SOURCE
          ====================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5 border-b border-gray-100 pb-4 dark:border-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <svg
                  className="h-4 w-4 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>

              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Lead Source
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Record how this business opportunity was received
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Acquisition Source
              </label>

              <select
                value={source}
                onChange={(e) =>
                  setSource(e.target.value)
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="">
                  -- Select Source --
                </option>

                {leadSources.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* =====================================================
              NOTES
          ====================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5 border-b border-gray-100 pb-4 dark:border-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <svg
                  className="h-4 w-4 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm2 1v10h8V5H6zm1 2h6v1H7V7zm0 3h6v1H7v-1zm0 3h4v1H7v-1z" />
                </svg>
              </span>

              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Lead Notes
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Customer requirements and sales remarks
                </p>
              </div>
            </div>

            <textarea
              rows={5}
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              placeholder="Add customer requirements, discussion notes, expected services, commercial remarks, or follow-up information..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
            />
          </div>
        </div>

        {/* =====================================================
            SIDEBAR
        ====================================================== */}

        <div className="space-y-6">
          {/* =====================================================
              WORKFLOW
          ====================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
            <h3 className="mb-4 border-b border-gray-100 pb-3 text-base font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">
              Workflow
            </h3>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Lead Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as LeadStatus
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                >
                  {leadStatuses.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {statusLabels[item]}
                    </option>
                  ))}
                </select>
              </div>

              {/* =================================================
                  ADMIN ASSIGNMENT
              ================================================== */}

              {userIsAdmin && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Assigned BDE
                  </label>

                  <select
                    value={assignedToId}
                    onChange={(e) =>
                      setAssignedToId(
                        e.target.value
                      )
                    }
                    disabled={loadingBdes}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <option value="">
                      {loadingBdes
                        ? "Loading BDEs..."
                        : "-- Unassigned --"}
                    </option>

                    {bdesList.map((bde) => (
                      <option
                        key={bde.id}
                        value={bde.id}
                      >
                        {getBdeName(bde)}
                      </option>
                    ))}
                  </select>

                  {!loadingBdes &&
                    bdesList.length === 0 && (
                      <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        No active BDE/Sales users are
                        available.
                      </p>
                    )}

                  {selectedBde && (
                    <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
                      <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        Assigned to
                      </p>

                      <p className="mt-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                        {getBdeName(selectedBde)}
                      </p>
                    </div>
                  )}

                  {!selectedBde && (
                    <p className="mt-2 text-[11px] text-gray-400">
                      Lead will remain unassigned unless a
                      BDE is selected.
                    </p>
                  )}
                </div>
              )}

              {/* =================================================
                  BDE OWNERSHIP
              ================================================== */}

              {userIsBde && (
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-3 dark:border-brand-500/20 dark:bg-brand-500/10">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                    Lead Ownership
                  </p>

                  <p className="mt-1 text-xs leading-5 text-brand-700 dark:text-brand-300">
                    This lead will automatically be assigned
                    to your BDE account.
                  </p>
                </div>
              )}

              {/* =================================================
                  EDIT METADATA
              ================================================== */}

              {isEdit && initialLead && (
                <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                  <div className="flex justify-between gap-3 py-1">
                    <span>Record ID:</span>

                    <span className="break-all text-right font-mono font-bold text-gray-800 dark:text-white">
                      {initialLead.id}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 py-1">
                    <span>Created:</span>

                    <span className="text-right font-semibold text-gray-800 dark:text-white">
                      {new Date(
                        initialLead.createdAt
                      ).toLocaleDateString(
                        "en-IN"
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 py-1">
                    <span>Updated:</span>

                    <span className="text-right font-semibold text-gray-800 dark:text-white">
                      {new Date(
                        initialLead.updatedAt
                      ).toLocaleDateString(
                        "en-IN"
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* =====================================================
                ACTIONS
            ====================================================== */}

            <div className="mt-6 space-y-2.5 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isSubmitting}
                loadingText={
                  isEdit
                    ? "Updating Lead..."
                    : "Creating Lead..."
                }
                leftIcon={
                  <svg
                    className="h-4 w-4 fill-none stroke-current"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                }
              >
                {isEdit
                  ? "Update Lead"
                  : "Create Lead"}
              </Button>

              <Link
                href={cancelRoute}
                className="block"
              >
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                >
                  Cancel
                </Button>
              </Link>
            </div>
          </div>

          {/* =====================================================
              LIVE PREVIEW
          ====================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 p-5 shadow-theme-xs dark:border-gray-800 dark:from-gray-900/80 dark:to-gray-900/40">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Lead Preview
              </span>

              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                {isEdit
                  ? initialLead?.id || "EDIT"
                  : "NEW"}
              </span>
            </div>

            <h4 className="truncate text-base font-bold text-gray-900 dark:text-white">
              {associationName ||
                "Association / Organization"}
            </h4>

            <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
              <div className="flex justify-between gap-3 text-gray-600 dark:text-gray-400">
                <span>Contact:</span>

                <span className="max-w-[150px] truncate text-right font-semibold text-gray-800 dark:text-white">
                  {contactName ||
                    "Contact Person"}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-gray-600 dark:text-gray-400">
                <span>Email:</span>

                <span className="max-w-[150px] truncate text-right font-semibold text-gray-800 dark:text-white">
                  {email || "Not provided"}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-gray-600 dark:text-gray-400">
                <span>Mobile:</span>

                <span className="font-semibold text-gray-800 dark:text-white">
                  {mobile || "Not provided"}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-gray-600 dark:text-gray-400">
                <span>Source:</span>

                <span className="max-w-[150px] truncate text-right font-semibold text-gray-800 dark:text-white">
                  {source || "Not selected"}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-gray-600 dark:text-gray-400">
                <span>Status:</span>

                <span className="font-semibold text-brand-600 dark:text-brand-400">
                  {statusLabels[status]}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-gray-600 dark:text-gray-400">
                <span>BDE:</span>

                <span className="max-w-[150px] truncate text-right font-semibold text-brand-600 dark:text-brand-400">
                  {userIsBde
                    ? "You"
                    : getBdeName(
                        selectedBde
                      ) || "Unassigned"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}