"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import Button from "@/components/ui/Button";

import { leadService } from "@/services/leadService";
import { serviceService } from "@/services/serviceService";

import type {
  LeadItem,
  LeadStatus,
} from "@/types/lead";

import type {
  ServiceItem,
  ServicePricingRule,
} from "@/types/service";

/* ============================================================
   STATUS
============================================================ */

const statusLabels: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

function getStatusClass(status: LeadStatus) {
  switch (status) {
    case "NEW":
      return "bg-blue-50 text-blue-700";
    case "CONTACTED":
      return "bg-yellow-50 text-yellow-700";
    case "QUALIFIED":
      return "bg-purple-50 text-purple-700";
    case "PROPOSAL_SENT":
      return "bg-indigo-50 text-indigo-700";
    case "NEGOTIATION":
      return "bg-orange-50 text-orange-700";
    case "WON":
      return "bg-green-50 text-green-700";
    case "LOST":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-50 text-gray-700";
  }
}

/* ============================================================
   DATE
============================================================ */

function formatDate(value?: string | null) {
  if (!value) return "-";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "-";
  }
}

function formatDateOnly(value?: string | null) {
  if (!value) return "-";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "-";
  }
}

/* ============================================================
   NUMBER / CURRENCY
============================================================ */

function toNumber(
  value: number | string | null | undefined
) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(
  value: number | string | null | undefined
) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatCurrency(
  value: number | string | null | undefined
) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

/* ============================================================
   TYPES
============================================================ */

interface ExtendedLead extends LeadItem {
  customerType?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;

  nextFollowUpAt?: string | null;
  followUpRemarks?: string | null;
  nextAction?: string | null;
}

interface LeadServiceSelection {
  id: string;
  serviceId: string;

  pricingRuleId?: string | null;

  quantity?: number | string | null;

  notes?: string | null;

  baseAmount?: number | string | null;
  gstPercent?: number | string | null;
  gstAmount?: number | string | null;
  totalAmount?: number | string | null;
  unitRate?: number | string | null;

  pricingBasis?: string | null;
  pricingLabel?: string | null;
  assetCategory?: string | null;

  service?: {
    id?: string;
    code?: string | null;
    name?: string | null;
    description?: string | null;
  } | null;

  pricingRule?: {
    id?: string;
    assetCategory?: string | null;
    unitRate?: number | string | null;
    gstPercent?: number | string | null;
    pricingBasis?: string | null;
    pricingLabel?: string | null;
  } | null;
}

interface DisplayLeadService
  extends LeadServiceSelection {
  displayServiceName: string;
  displayServiceCode: string;
  displayDescription: string;
  displayAssetCategory: string;
  displayPricingLabel: string;
  displayPricingBasis: string;
  displayUnitRate: number;
  displayGstPercent: number;
}

/* ============================================================
   PAGE
============================================================ */

export default function BdeLeadDetailsPage() {
  const params = useParams();

  const leadId =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [lead, setLead] =
    useState<ExtendedLead | null>(null);

  const [
    serviceSelections,
    setServiceSelections,
  ] = useState<DisplayLeadService[]>([]);

  const [loading, setLoading] = useState(true);

  const [
    loadingServices,
    setLoadingServices,
  ] = useState(false);

  const [error, setError] = useState("");

  const [converting, setConverting] = useState(false);

  const [
    convertMessage,
    setConvertMessage,
  ] = useState("");

  /* ==========================================================
     LOAD LEAD
  ========================================================== */

  const loadLead = useCallback(async () => {
    if (!leadId) {
      setError("Lead ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data =
        await leadService.getLeadById(leadId);

      if (!data) {
        setError("Lead not found.");
        setLead(null);
        return;
      }

      setLead(data as ExtendedLead);

      setLoadingServices(true);

      try {
        const [
          selections,
          catalogResponse,
        ] = await Promise.all([
          leadService.getServiceSelections(leadId),
          serviceService.getAllServices(),
        ]);

        const rawSelections =
          (selections || []) as LeadServiceSelection[];

        const catalog =
          (catalogResponse || []) as ServiceItem[];

        const enriched =
          rawSelections.map((selection) =>
            enrichLeadService(selection, catalog)
          );

        setServiceSelections(enriched);
      } catch (serviceError) {
        console.error(
          "Failed to load lead service selections:",
          serviceError
        );

        setServiceSelections([]);
      } finally {
        setLoadingServices(false);
      }
    } catch (err: any) {
      console.error(
        "Failed to load BDE lead:",
        err
      );

      setError(
        err?.message ||
          "Unable to load lead details."
      );

      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  /* ==========================================================
     SERVICE TOTALS
  ========================================================== */

  const serviceTotals = useMemo(() => {
    return serviceSelections.reduce(
      (summary, service) => ({
        baseAmount:
          summary.baseAmount +
          toNumber(service.baseAmount),

        gstAmount:
          summary.gstAmount +
          toNumber(service.gstAmount),

        totalAmount:
          summary.totalAmount +
          toNumber(service.totalAmount),
      }),
      {
        baseAmount: 0,
        gstAmount: 0,
        totalAmount: 0,
      }
    );
  }, [serviceSelections]);

  /* ==========================================================
     CONVERT TO CLIENT
  ========================================================== */

  const handleConvertToClient = async () => {
    if (!lead) return;

    if (
      lead.status === "WON" ||
      lead.clientId
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to convert this lead into a client?"
    );

    if (!confirmed) return;

    try {
      setConverting(true);
      setConvertMessage("");

      const result =
        await leadService.convertLeadToClient(
          lead.id,
          {}
        );

      if (result?.lead) {
        setLead(
          result.lead as ExtendedLead
        );
      }

      setConvertMessage(
        "Lead converted to client successfully."
      );

      leadService.notifyChange();
    } catch (err: any) {
      console.error(
        "Failed to convert lead:",
        err
      );

      setConvertMessage(
        err?.message ||
          "Unable to convert lead to client."
      );
    } finally {
      setConverting(false);
    }
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Lead Details"
          items={[
            {
              label: "Dashboard",
              href: "/bde/dashboard",
            },
            {
              label: "My Leads",
              href: "/bde/leads",
            },
            {
              label: "Lead Details",
            },
          ]}
        />

        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />

            <p className="mt-4 text-sm text-gray-500">
              Loading lead details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error || !lead) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          pageTitle="Lead Details"
          items={[
            {
              label: "Dashboard",
              href: "/bde/dashboard",
            },
            {
              label: "My Leads",
              href: "/bde/leads",
            },
            {
              label: "Lead Details",
            },
          ]}
        />

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800">
            Unable to load lead
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {error || "Lead not found."}
          </p>

          <Link
            href="/bde/leads"
            className="mt-4 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Back to My Leads
          </Link>
        </div>
      </div>
    );
  }

  /* ==========================================================
     DERIVED DATA
  ========================================================== */

  const isConverted =
    Boolean(lead.clientId) ||
    lead.status === "WON";

  const fullAddress = [
    lead.address,
    lead.city,
    lead.state,
    lead.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  /* ==========================================================
     PAGE
  ========================================================== */

  return (
    <div className="space-y-6">
      {/* BREADCRUMB */}

      <Breadcrumb
        pageTitle="Lead Details"
        items={[
          {
            label: "Dashboard",
            href: "/bde/dashboard",
          },
          {
            label: "My Leads",
            href: "/bde/leads",
          },
          {
            label: lead.associationName,
          },
        ]}
      />

      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {lead.associationName}
            </h1>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                lead.status
              )}`}
            >
              {statusLabels[lead.status]}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Lead ID: {lead.id}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/bde/leads">
            <Button variant="outline">
              Back
            </Button>
          </Link>

          <Link
            href={`/bde/leads/${lead.id}/edit`}
          >
            <Button variant="outline">
              Edit Lead
            </Button>
          </Link>

          {!isConverted && (
            <Button
              variant="primary"
              isLoading={converting}
              loadingText="Converting..."
              onClick={handleConvertToClient}
            >
              Convert to Client
            </Button>
          )}
        </div>
      </div>

      {/* CONVERT MESSAGE */}

      {convertMessage && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {convertMessage}
        </div>
      )}

      {/* CUSTOMER + OWNERSHIP */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Customer Information
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InfoItem
              label="Association / Organization"
              value={lead.associationName}
            />

            <InfoItem
              label="Contact Person"
              value={lead.contactName}
            />

            <InfoItem
              label="Mobile"
              value={lead.mobile || "-"}
            />

            <InfoItem
              label="Email"
              value={lead.email || "-"}
            />

            <InfoItem
              label="Customer Type"
              value={lead.customerType || "-"}
            />

            <InfoItem
              label="Lead Source"
              value={lead.source || "-"}
            />

            <InfoItem
              label="City"
              value={lead.city || "-"}
            />

            <InfoItem
              label="State"
              value={lead.state || "-"}
            />

            <InfoItem
              label="Pincode"
              value={lead.pincode || "-"}
            />

            <InfoItem
              label="Status"
              value={statusLabels[lead.status]}
            />

            <div className="sm:col-span-2">
              <InfoItem
                label="Address"
                value={lead.address || "-"}
              />
            </div>
          </div>
        </div>

        {/* OWNERSHIP */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Ownership
          </h2>

          <div className="space-y-4">
            <InfoItem
              label="Created By"
              value={
                lead.createdBy
                  ? `${lead.createdBy.firstName} ${
                      lead.createdBy.lastName || ""
                    }`.trim()
                  : "You"
              }
            />

            <InfoItem
              label="Assigned BDE"
              value={
                lead.assignedTo
                  ? `${lead.assignedTo.firstName} ${
                      lead.assignedTo.lastName || ""
                    }`.trim()
                  : "You"
              }
            />

            <InfoItem
              label="Created"
              value={formatDate(lead.createdAt)}
            />

            <InfoItem
              label="Last Updated"
              value={formatDate(lead.updatedAt)}
            />
          </div>
        </div>

        {/* FOLLOW UP */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Follow-up & Next Action
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InfoItem
              label="Next Follow-up"
              value={
                lead.nextFollowUpAt
                  ? formatDate(
                      lead.nextFollowUpAt
                    )
                  : "-"
              }
            />

            <InfoItem
              label="Next Action"
              value={lead.nextAction || "-"}
            />

            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Follow-up Remarks
              </p>

              <div className="mt-2 rounded-xl bg-gray-50 p-4">
                {lead.followUpRemarks ? (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {lead.followUpRemarks}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">
                    No follow-up remarks added.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ADDRESS */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Address
          </h2>

          <div className="rounded-xl bg-gray-50 p-4">
            {fullAddress ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                {fullAddress}
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                Address not provided.
              </p>
            )}
          </div>
        </div>

        {/* NOTES */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Notes
          </h2>

          <div className="rounded-xl bg-gray-50 p-4">
            {lead.notes ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                {lead.notes}
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                No notes added for this lead.
              </p>
            )}
          </div>
        </div>

        {/* CONVERSION */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Conversion
          </h2>

          {lead.clientId ? (
            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-700">
                Converted to Client
              </p>

              <p className="mt-1 break-all text-xs text-green-600">
                Client ID: {lead.clientId}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">
                Not Converted
              </p>

              <p className="mt-1 text-xs text-gray-500">
                This lead has not been converted into a client yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SERVICES & PRICING */}

      <ServicesPricingSection
        services={serviceSelections}
        loading={loadingServices}
        totals={serviceTotals}
      />

      {/* RECORD INFORMATION */}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-gray-900">
          Record Information
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem
            label="Lead ID"
            value={lead.id}
          />

          <InfoItem
            label="Created"
            value={formatDate(lead.createdAt)}
          />

          <InfoItem
            label="Last Updated"
            value={formatDate(lead.updatedAt)}
          />

          <InfoItem
            label="Next Follow-up Date"
            value={
              lead.nextFollowUpAt
                ? formatDateOnly(
                    lead.nextFollowUpAt
                  )
                : "-"
            }
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SERVICES & PRICING SECTION
============================================================ */

function ServicesPricingSection({
  services,
  loading,
  totals,
}: {
  services: DisplayLeadService[];
  loading: boolean;
  totals: {
    baseAmount: number;
    gstAmount: number;
    totalAmount: number;
  };
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* SECTION HEADER */}

      <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Services & Pricing
          </h2>

          <p className="mt-0.5 text-sm text-gray-500">
            Selected services and pricing details.
          </p>
        </div>

        <span className="w-fit rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
          {services.length}{" "}
          {services.length === 1
            ? "Service"
            : "Services"}
        </span>
      </div>

      {/* BODY */}

      <div className="p-5">
        {loading ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />

            <p className="mt-3 text-sm text-gray-500">
              Loading services and pricing...
            </p>
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              ⚙
            </div>

            <p className="mt-4 text-sm font-semibold text-gray-700">
              No services selected
            </p>

            <p className="mt-1 text-sm text-gray-500">
              No service or pricing details are available for this lead.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service, index) => (
              <LeadServiceCard
                key={service.id}
                service={service}
                index={index}
              />
            ))}

            {/* TOTAL SUMMARY */}

            <PricingSummary totals={totals} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   LEAD SERVICE CARD
============================================================ */

function LeadServiceCard({
  service,
  index,
}: {
  service: DisplayLeadService;
  index: number;
}) {
  const quantity = toNumber(service.quantity);
  const unitRate = toNumber(service.displayUnitRate);
  const baseAmount = toNumber(service.baseAmount);
  const gstPercent = toNumber(service.displayGstPercent);
  const gstAmount = toNumber(service.gstAmount);
  const totalAmount = toNumber(service.totalAmount);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      {/* SERVICE HEADER */}

      <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-950 px-2.5 py-1 text-[11px] font-semibold text-white">
                Service {index + 1}
              </span>

              {service.displayServiceCode && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  {service.displayServiceCode}
                </span>
              )}

              {service.displayPricingBasis && (
                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700">
                  {formatPricingBasis(
                    service.displayPricingBasis
                  )}
                </span>
              )}
            </div>

            <h3 className="mt-2 text-base font-bold text-gray-900 sm:text-lg">
              {service.displayServiceName}
            </h3>

            {service.displayDescription && (
              <p className="mt-0.5 max-w-3xl text-sm leading-5 text-gray-500">
                {service.displayDescription}
              </p>
            )}
          </div>

          {/* SERVICE TOTAL */}

          <div className="flex shrink-0 items-center justify-between gap-5 rounded-lg bg-gray-950 px-4 py-3 text-white lg:min-w-[170px] lg:justify-center lg:text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Service Total
            </p>

            <p className="text-lg font-bold">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* SERVICE DETAILS */}

      <div className="p-4 sm:p-5">
        {/* MAIN PRICING DETAILS */}

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <CompactDetailBox
            label="Asset Category"
            value={
              service.displayAssetCategory ||
              "Not specified"
            }
          />

          <CompactDetailBox
            label="Quantity"
            value={formatNumber(quantity)}
          />

          <CompactDetailBox
            label="Unit Rate"
            value={formatCurrency(unitRate)}
          />

          <CompactDetailBox
            label="Pricing"
            value={
              service.displayPricingLabel ||
              "Not specified"
            }
          />
        </div>

        {/* AMOUNT DETAILS */}

        <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <CompactDetailBox
            label="Base Amount"
            value={formatCurrency(baseAmount)}
          />

          <CompactDetailBox
            label="GST"
            value={`${formatNumber(gstPercent)}%`}
          />

          <CompactDetailBox
            label="GST Amount"
            value={formatCurrency(gstAmount)}
          />
        </div>

        {/* TOTAL */}

        <div className="mt-2.5 flex flex-col gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-blue-700">
              Total Amount
            </p>

            <p className="text-[11px] text-blue-600">
              Base amount + GST
            </p>
          </div>

          <p className="text-lg font-bold text-blue-700">
            {formatCurrency(totalAmount)}
          </p>
        </div>

        {/* NOTES */}

        <div className="mt-4 border-t border-gray-200 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Service Notes
          </p>

          <div className="mt-2 rounded-lg bg-white px-3.5 py-3">
            {service.notes ? (
              <p className="whitespace-pre-wrap text-sm leading-5 text-gray-700">
                {service.notes}
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                No service notes added.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   COMPACT DETAIL BOX
============================================================ */

function CompactDetailBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-h-[68px] rounded-lg border border-gray-200 bg-white px-3.5 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold leading-5 text-gray-900">
        {value || "-"}
      </p>
    </div>
  );
}

/* ============================================================
   PRICING SUMMARY
============================================================ */

function PricingSummary({
  totals,
}: {
  totals: {
    baseAmount: number;
    gstAmount: number;
    totalAmount: number;
  };
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-950 p-4 text-white sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            Pricing Summary
          </p>

          <p className="mt-0.5 text-xs text-gray-400">
            Total from all saved service selections.
          </p>
        </div>

        <p className="text-xl font-bold">
          {formatCurrency(totals.totalAmount)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 border-t border-gray-800 pt-4 sm:grid-cols-3">
        <DarkStat
          label="Base Amount"
          value={formatCurrency(totals.baseAmount)}
        />

        <DarkStat
          label="GST Amount"
          value={formatCurrency(totals.gstAmount)}
        />

        <DarkStat
          label="Grand Total"
          value={formatCurrency(totals.totalAmount)}
        />
      </div>
    </div>
  );
}

/* ============================================================
   DARK STAT
============================================================ */

function DarkStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2.5">
      <p className="text-[11px] text-gray-400">
        {label}
      </p>

      <p className="mt-0.5 text-sm font-bold text-white">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   SERVICE ENRICHMENT
============================================================ */

function enrichLeadService(
  selection: LeadServiceSelection,
  catalog: ServiceItem[]
): DisplayLeadService {
  const serviceId =
    String(selection.serviceId || "").trim();

  const nestedService = selection.service;

  let catalogService = catalog.find(
    (item) => item.id === serviceId
  );

  const serviceName =
    nestedService?.name ||
    (catalogService as any)?.name ||
    "";

  const serviceCode =
    nestedService?.code ||
    (catalogService as any)?.code ||
    "";

  const description =
    nestedService?.description ||
    (catalogService as any)?.description ||
    "";

  let assetCategory =
    selection.assetCategory ||
    selection.pricingRule?.assetCategory ||
    "";

  let pricingLabel =
    selection.pricingLabel ||
    selection.pricingRule?.pricingLabel ||
    "";

  let pricingBasis =
    selection.pricingBasis ||
    selection.pricingRule?.pricingBasis ||
    "";

  let unitRate =
    selection.unitRate != null
      ? toNumber(selection.unitRate)
      : selection.pricingRule?.unitRate != null
      ? toNumber(
          selection.pricingRule.unitRate
        )
      : 0;

  let gstPercent =
    selection.gstPercent != null
      ? toNumber(selection.gstPercent)
      : selection.pricingRule?.gstPercent != null
      ? toNumber(
          selection.pricingRule.gstPercent
        )
      : 0;

  /*
   * Resolve missing pricing information
   * from the service catalog.
   */

  if (
    catalogService &&
    (
      !assetCategory ||
      !pricingLabel ||
      !pricingBasis ||
      unitRate === 0 ||
      gstPercent === 0
    )
  ) {
    const rules =
      ((catalogService as any)?.pricingRules ||
        []) as ServicePricingRule[];

    const quantity = Math.max(
      toNumber(selection.quantity),
      1
    );

    const matchingRules = rules.filter(
      (rule: any) => {
        const min =
          rule.minQuantity == null
            ? 0
            : toNumber(rule.minQuantity);

        const max =
          rule.maxQuantity == null
            ? Infinity
            : toNumber(rule.maxQuantity);

        const categoryMatches =
          !assetCategory ||
          !rule.assetCategory ||
          String(rule.assetCategory).trim() ===
            String(assetCategory).trim();

        return (
          quantity >= min &&
          quantity <= max &&
          categoryMatches
        );
      }
    );

    const matchingRule =
      matchingRules.find((rule: any) => {
        const sameRate =
          unitRate === 0 ||
          Math.abs(
            toNumber(rule.unitRate) -
              unitRate
          ) < 0.01;

        const sameGst =
          gstPercent === 0 ||
          Math.abs(
            toNumber(rule.gstPercent) -
              gstPercent
          ) < 0.01;

        return sameRate && sameGst;
      }) ||
      (matchingRules.length === 1
        ? matchingRules[0]
        : undefined);

    if (matchingRule) {
      if (!assetCategory) {
        assetCategory =
          matchingRule.assetCategory || "";
      }

      if (!pricingLabel) {
        pricingLabel =
          matchingRule.pricingLabel || "";
      }

      if (!pricingBasis) {
        pricingBasis =
          matchingRule.pricingBasis || "";
      }

      if (unitRate === 0) {
        unitRate = toNumber(
          matchingRule.unitRate
        );
      }

      if (gstPercent === 0) {
        gstPercent = toNumber(
          matchingRule.gstPercent
        );
      }
    }
  }

  /*
   * Fallback catalog lookup.
   */

  if (!catalogService) {
    catalogService = catalog.find(
      (item) =>
        (item as any).id ===
        nestedService?.id
    );
  }

  return {
    ...selection,

    displayServiceName:
      serviceName || "Service",

    displayServiceCode:
      serviceCode,

    displayDescription:
      description,

    displayAssetCategory:
      assetCategory,

    displayPricingLabel:
      pricingLabel,

    displayPricingBasis:
      pricingBasis,

    displayUnitRate:
      unitRate,

    displayGstPercent:
      gstPercent,
  };
}

/* ============================================================
   PRICING BASIS
============================================================ */

function formatPricingBasis(
  value?: string | null
) {
  if (!value) return "";

  return String(value)
    .replace(/\_/g, " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase()
    );
}