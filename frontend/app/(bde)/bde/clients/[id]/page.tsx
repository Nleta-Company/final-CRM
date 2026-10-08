"use client";



import React, {

  useCallback,

  useEffect,

  useMemo,

  useState,

} from "react";



import { useParams, useRouter } from "next/navigation";

import Link from "next/link";



import Breadcrumb from "@/components/breadcrumb/Breadcrumb";



import { clientService } from "@/services/clientService";

import { clientServiceSelectionService } from "@/services/clientServiceSelectionService";



import type { ClientItem } from "@/types/client";

import type { ClientServiceSelection } from "@/types/clientServiceSelection";



type GroupedAsset = {

  key: string;

  assetType: "Lift" | "Escalator" | "Asset";

  assetCategory: string;

  quantity: number;

  services: ClientServiceSelection[];

  baseAmount: number;

  gstAmount: number;

  totalAmount: number;

};



const CLIENT_PROCESS_STAGES = [
  { value: "CLIENT_CREATED", label: "Client Created" },
  { value: "FSO_GENERATED", label: "FSO Generated" },
  { value: "PSGA_GENERATED", label: "PSGA Generated" },
  { value: "PSGA_COMPLETED", label: "PSGA Completed" },
] as const;

const PROCESS_ORDER: Record<string, number> = {
  CLIENT_CREATED: 0,
  FSO_GENERATED: 1,
  PSGA_GENERATED: 2,
  PSGA_COMPLETED: 3,
};

function getProcessStageLabel(value?: string | null) {
  return (
    CLIENT_PROCESS_STAGES.find((stage) => stage.value === value)?.label ||
    "Client Created"
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BdeClientDetailsPage() {

  const params = useParams();

  const router = useRouter();



  const clientId =

    typeof params?.id === "string"

      ? params.id

      : "";



  const [client, setClient] =

    useState<ClientItem | null>(null);



  const [loading, setLoading] =

    useState(true);



  const [error, setError] =

    useState("");



  const [serviceSelections, setServiceSelections] =

    useState<ClientServiceSelection[]>([]);



  const [serviceLoading, setServiceLoading] =

    useState(false);



  const [serviceError, setServiceError] =

    useState("");



  // ==========================================================

  // DELETE STATE

  // ==========================================================



  const [deleteLoading, setDeleteLoading] =

    useState(false);



  // ==========================================================

  // LOAD CLIENT

  // ==========================================================



  const loadClient = useCallback(async () => {

    if (!clientId) {

      setError("Client ID is missing.");

      setLoading(false);

      return;

    }



    try {

      setLoading(true);

      setError("");



      const data =

        await clientService.getClientById(

          clientId

        );



      if (!data) {

        setError("Client not found.");

        return;

      }



      setClient(data);



      // Service/asset details are loaded separately so that

      // client details can still render even if the optional

      // service-selection request fails.

      setServiceLoading(true);

      setServiceError("");



      try {

        const response =

          await clientServiceSelectionService.getSelections(

            clientId

          );



        setServiceSelections(

          response?.selections || []

        );

      } catch (selectionError: any) {

        console.error(

          "FAILED TO LOAD CLIENT SERVICE SELECTIONS:",

          selectionError

        );



        setServiceSelections([]);



        setServiceError(

          selectionError?.message ||

            "Unable to load asset and service details."

        );

      } finally {

        setServiceLoading(false);

      }

    } catch (err: any) {

      console.error(

        "FAILED TO LOAD CLIENT:",

        err

      );



      setError(

        err?.message ||

          "Unable to load client."

      );

    } finally {

      setLoading(false);

    }

  }, [clientId]);



  // ==========================================================

  // INITIAL LOAD

  // ==========================================================



  useEffect(() => {

    loadClient();

  }, [loadClient]);



  // ==========================================================

  // DELETE CLIENT

  // ==========================================================



  const handleDeleteClient = async () => {

    if (!clientId || deleteLoading) {

      return;

    }



    const confirmed = window.confirm(

      `Are you sure you want to permanently delete "${

        client?.companyName ||

        "this client"

      }"?\n\nThis action cannot be undone.`

    );



    if (!confirmed) {

      return;

    }



    try {

      setDeleteLoading(true);

      setError("");



      await clientService.deleteClient(

        clientId

      );



      // After successful delete go back to BDE clients

      router.replace("/bde/clients");

      router.refresh();

    } catch (err: any) {

      console.error(

        "DELETE CLIENT ERROR:",

        err

      );



      setError(

        err?.message ||

          "Unable to permanently delete client."

      );



      setDeleteLoading(false);

    }

  };



  // ==========================================================

  // BREADCRUMB

  // ==========================================================



  const breadcrumb = (

    <Breadcrumb

      pageTitle="Client Details"

      items={[

        {

          label: "Dashboard",

          href: "/bde/dashboard",

        },

        {

          label: "My Clients",

          href: "/bde/clients",

        },

        ...(client

          ? [

              {

                label: client.companyName,

              },

            ]

          : []),

      ]}

    />

  );



  // ==========================================================

  // GROUPED ASSETS

  // ==========================================================



  const groupedAssets = useMemo(

    () =>

      groupServiceSelections(

        serviceSelections

      ),

    [serviceSelections]

  );



  // ==========================================================

  // SERVICE TOTALS

  // ==========================================================



  const serviceTotals = useMemo(

    () =>

      serviceSelections.reduce(

        (summary, item) => ({

          baseAmount:

            summary.baseAmount +

            toNumber(

              item.baseAmount

            ),



          gstAmount:

            summary.gstAmount +

            toNumber(

              item.gstAmount

            ),



          totalAmount:

            summary.totalAmount +

            toNumber(

              item.totalAmount

            ),

        }),

        {

          baseAmount: 0,

          gstAmount: 0,

          totalAmount: 0,

        }

      ),

    [serviceSelections]

  );



  // ==========================================================

  // TOTAL UNITS

  // ==========================================================



  const totalUnits = useMemo(

    () =>

      groupedAssets.reduce(

        (total, asset) =>

          total + asset.quantity,

        0

      ),

    [groupedAssets]

  );



  // ==========================================================

  // LOADING

  // ==========================================================



  if (loading) {

    return (

      <div className="space-y-6">

        {breadcrumb}



        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

          <div className="text-center">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-white" />



            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">

              Loading client details...

            </p>

          </div>

        </div>

      </div>

    );

  }



  // ==========================================================

  // ERROR

  // ==========================================================



  if (error || !client) {

    return (

      <div className="space-y-6">

        {breadcrumb}



        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">

          <h2 className="font-semibold text-red-800 dark:text-red-400">

            Unable to load client

          </h2>



          <p className="mt-1 text-sm text-red-700 dark:text-red-300">

            {error ||

              "Client not found."}

          </p>



          <div className="mt-4 flex gap-3">

            <button

              type="button"

              onClick={() =>

                loadClient()

              }

              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-gray-900 dark:text-red-300"

            >

              Try Again

            </button>



            <button

              type="button"

              onClick={() =>

                router.push(

                  "/bde/clients"

                )

              }

              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"

            >

              Back to My Clients

            </button>

          </div>

        </div>

      </div>

    );

  }



  // ==========================================================

  // ADDRESS

  // ==========================================================



  const fullAddress = [

    client.address,

    client.city,

    client.state,

  ]

    .filter(Boolean)

    .join(", ");



  const clientStatus =

    client.contractStatus ||

    "Active";



  // ==========================================================

  // PAGE

  // ==========================================================



  return (

    <div className="space-y-6">

      {breadcrumb}



      {/* =====================================================

          HEADER / HERO

      ===================================================== */}



      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

        <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-800 px-6 py-7 text-white md:px-8">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-start gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold ring-1 ring-white/20">

                {getInitials(

                  client.companyName

                )}

              </div>



              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <h1 className="text-2xl font-bold tracking-tight md:text-3xl">

                    {client.companyName}

                  </h1>



                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">

                    {clientStatus}

                  </span>

                </div>



                <p className="mt-2 text-sm text-gray-300">

                  Client account, assets,

                  services and pricing

                  overview

                </p>



                <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-300">

                  <span>

                    Client ID:{" "}

                    <strong className="text-white">

                      {client.id}

                    </strong>

                  </span>



                  <span>

                    Joined:{" "}

                    <strong className="text-white">

                      {formatDate(

                        client.joinedDate

                      )}

                    </strong>

                  </span>

                </div>

              </div>

            </div>



            {/* =================================================

                ACTION BUTTONS

            ================================================= */}



            <div className="flex flex-wrap gap-3">

              {client.contactPhone && (

                <a

                  href={`tel:${client.contactPhone}`}

                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15"

                >

                  Call Client

                </a>

              )}



              {client.contactEmail && (

                <a

                  href={`mailto:${client.contactEmail}`}

                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15"

                >

                  Email

                </a>

              )}



              <Link

                href={`/bde/clients/${client.id}/edit`}

                className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-100"

              >

                Edit Client

              </Link>



              {/* DELETE CLIENT */}



              <button

                type="button"

                onClick={

                  handleDeleteClient

                }

                disabled={

                  deleteLoading

                }

                className="rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-100 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"

              >

                {deleteLoading

                  ? "Deleting..."

                  : "Delete Client"}

              </button>

            </div>

          </div>

        </div>



        {/* Quick stats */}



        <div className="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-200 sm:grid-cols-4 dark:divide-gray-800 dark:border-gray-800">

          <QuickStat

            label="Assets"

            value={String(

              groupedAssets.length ||

                client.totalAssetsCount ||

                0

            )}

          />



          <QuickStat

            label="Total Units"

            value={String(

              totalUnits

            )}

          />



          <QuickStat

            label="Services"

            value={String(

              serviceSelections.length

            )}

          />



          <QuickStat

            label="Service Value"

            value={formatCurrency(

              serviceTotals.totalAmount

            )}

          />

        </div>

      </div>



      {/* =====================================================

          CLIENT INFORMATION + ACCOUNT SUMMARY

      ===================================================== */}



      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        <div className="xl:col-span-2">

          <SectionCard

            title="Client Information"

            subtitle="Organization and primary contact details"

          >

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

              <InfoItem

                label="Association / Company"

                value={

                  client.companyName

                }

              />



              <InfoItem

                label="Contact Person"

                value={

                  client.contactPerson

                }

              />



              <InfoItem

                label="Email"

                value={

                  client.contactEmail

                }

                isLink={Boolean(

                  client.contactEmail

                )}

                href={

                  client.contactEmail

                    ? `mailto:${client.contactEmail}`

                    : undefined

                }

              />



              <InfoItem

                label="Mobile"

                value={

                  client.contactPhone

                }

                isLink={Boolean(

                  client.contactPhone

                )}

                href={

                  client.contactPhone

                    ? `tel:${client.contactPhone}`

                    : undefined

                }

              />



              <InfoItem

                label="City"

                value={client.city}

              />



              <InfoItem

                label="State"

                value={client.state}

              />



              <InfoItem

                label="Address"

                value={fullAddress}

                className="md:col-span-2"

              />



              {client.notes && (

                <InfoItem

                  label="Notes"

                  value={

                    client.notes

                  }

                  className="md:col-span-2"

                />

              )}

            </div>

          </SectionCard>

        </div>



        <SectionCard

          title="Account Summary"

          subtitle="Current account ownership"

        >

          <div className="space-y-5">

            <SummaryItem

              label="Client ID"

              value={client.id}

            />



            <SummaryItem

              label="Status"

              value={clientStatus}

            />



            <SummaryItem

              label="Account Manager"

              value={

                client.accountManager ||

                "You"

              }

            />



            <SummaryItem

              label="Assigned BDE"

              value={

                client.assignedBdeName ||

                "You"

              }

            />



            <SummaryItem

              label="Joined Date"

              value={formatDate(

                client.joinedDate

              )}

            />

          </div>

        </SectionCard>

      </div>



      {/* =====================================================
          FSO / PSGA PROCESS TRACKING
      ===================================================== */}

      <SectionCard
        title="FSO / PSGA Process Tracking"
        subtitle="Current FSO and PSGA process status"
        rightContent={
          client.processStage === "PSGA_COMPLETED" ? (
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
              Incentive Eligible
            </span>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Current Process Stage" value={getProcessStageLabel(client.processStage)} />
          <InfoItem label="External Client ID" value={client.externalClientId} />
          <InfoItem label="FSO Number" value={client.fsoNumber} />
          <InfoItem label="FSO Generated Date" value={formatDate(client.fsoGeneratedAt)} />
          <InfoItem label="PSGA Number" value={client.psgaNumber} />
          <InfoItem label="PSGA Generated Date" value={formatDate(client.psgaGeneratedAt)} />
          <InfoItem label="Last Process Update" value={formatDateTime(client.processUpdatedAt)} className="md:col-span-2" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          {CLIENT_PROCESS_STAGES.map((stage) => {
            const currentProcessStage = client.processStage || "CLIENT_CREATED";
            const stageOrder = PROCESS_ORDER[stage.value];
            const currentOrder = PROCESS_ORDER[currentProcessStage] ?? 0;
            const completed = stageOrder <= currentOrder;
            const current = stage.value === currentProcessStage;

            return (
              <div
                key={stage.value}
                className={`rounded-xl border p-4 ${
                  current
                    ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                    : completed
                    ? "border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10"
                    : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      current
                        ? "bg-white text-gray-900 dark:bg-gray-900 dark:text-white"
                        : completed
                        ? "bg-green-600 text-white"
                        : "bg-gray-300 text-gray-700"
                    }`}
                  >
                    {stageOrder + 1}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        current
                          ? "text-white dark:text-gray-900"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {stage.label}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        current
                          ? "text-gray-300 dark:text-gray-600"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {completed && !current
                        ? "Completed"
                        : current
                        ? "Current Stage"
                        : "Pending"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {client.processStage === "PSGA_COMPLETED" && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-4 dark:border-green-500/20 dark:bg-green-500/10">
            <p className="text-sm font-semibold text-green-900 dark:text-green-300">
              PSGA Process Completed
            </p>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              PSGA has been completed for this client and the client is now eligible for incentive.
            </p>
          </div>
        )}
      </SectionCard>

      {/* =====================================================
          ASSET & SERVICE DETAILS
      ===================================================== */}

      {/* =====================================================

          ASSET & SERVICE DETAILS

      ===================================================== */}



      <SectionCard

        title="Asset & Service Details"

        subtitle="Assets and services added while creating this client"

        rightContent={

          serviceSelections.length >

          0 ? (

            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">

              {

                serviceSelections.length

              }{" "}

              service

              {serviceSelections.length ===

              1

                ? ""

                : "s"}

            </span>

          ) : undefined

        }

      >

        {serviceLoading ? (

          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">

            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-white" />



            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">

              Loading asset and service

              details...

            </p>

          </div>

        ) : serviceError ? (

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">

            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">

              Asset details could

              not be loaded

            </p>



            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">

              {serviceError}

            </p>



            <button

              type="button"

              onClick={() =>

                loadClient()

              }

              className="mt-3 text-sm font-semibold text-amber-900 underline dark:text-amber-300"

            >

              Retry

            </button>

          </div>

        ) : groupedAssets.length ===

          0 ? (

          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-lg dark:bg-gray-800">

              ⚙

            </div>



            <p className="mt-4 text-sm font-semibold text-gray-800 dark:text-gray-200">

              No assets or services

              found

            </p>



            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">

              Assets and services added

              during client creation

              will appear here.

            </p>

          </div>

        ) : (

          <div className="space-y-5">

            {groupedAssets.map(

              (asset, index) => (

                <AssetCard

                  key={asset.key}

                  asset={asset}

                  index={index}

                />

              )

            )}



            {/* Grand pricing summary */}



            <div className="rounded-2xl bg-gray-950 p-5 text-white">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-sm font-semibold">

                    Service Pricing

                    Summary

                  </p>



                  <p className="mt-1 text-xs text-gray-400">

                    Total calculated from

                    all saved service

                    selections.

                  </p>

                </div>



                <p className="text-2xl font-bold">

                  {formatCurrency(

                    serviceTotals.totalAmount

                  )}

                </p>

              </div>



              <div className="mt-5 grid grid-cols-1 gap-3 border-t border-gray-800 pt-5 sm:grid-cols-3">

                <DarkStat

                  label="Base Amount"

                  value={formatCurrency(

                    serviceTotals.baseAmount

                  )}

                />



                <DarkStat

                  label="GST Amount"

                  value={formatCurrency(

                    serviceTotals.gstAmount

                  )}

                />



                <DarkStat

                  label="Grand Total"

                  value={formatCurrency(

                    serviceTotals.totalAmount

                  )}

                />

              </div>

            </div>

          </div>

        )}

      </SectionCard>



      {/* =====================================================

          OWNERSHIP

      ===================================================== */}



      <SectionCard

        title="Ownership"

        subtitle="BDE ownership and client status"

      >

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

          <InfoItem

            label="Created By"

            value={

              client.accountManager ||

              "You"

            }

          />



          <InfoItem

            label="Assigned BDE"

            value={

              client.assignedBdeName ||

              "You"

            }

          />



          <InfoItem

            label="Client Status"

            value={clientStatus}

          />

        </div>



        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 dark:border-blue-500/20 dark:bg-blue-500/10">

          <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">

            BDE Ownership

          </p>



          <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">

            This client remains associated

            with your BDE workspace. Client

            assignment cannot be changed from

            the BDE workspace.

          </p>

        </div>

      </SectionCard>



      {/* =====================================================

          FOOTER ACTIONS

      ===================================================== */}



      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">

        <Link

          href="/bde/clients"

          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"

        >

          ← Back to My Clients

        </Link>



        <div className="flex flex-col gap-3 sm:flex-row">

          <Link

            href={`/bde/clients/${client.id}/edit`}

            className="rounded-lg bg-gray-900 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"

          >

            Edit Client

          </Link>



          {/* PERMANENT DELETE */}



          <button

            type="button"

            onClick={

              handleDeleteClient

            }

            disabled={deleteLoading}

            className="rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-center text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"

          >

            {deleteLoading

              ? "Deleting..."

              : "Delete Client Permanently"}

          </button>

        </div>

      </div>

    </div>

  );

}



/* ============================================================

   ASSET CARD

============================================================ */



function AssetCard({

  asset,

  index,

}: {

  asset: GroupedAsset;

  index: number;

}) {

  return (

    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/40">

      <div className="border-b border-gray-200 bg-white px-5 py-5 dark:border-gray-700 dark:bg-gray-900">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-gray-900">

                Asset {index + 1}

              </span>



              <span

                className={`rounded-full px-3 py-1 text-xs font-semibold ${

                  asset.assetType ===

                  "Escalator"

                    ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"

                    : asset.assetType ===

                        "Lift"

                      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"

                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"

                }`}

              >

                {asset.assetType}

              </span>



              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">

                {asset.quantity} unit

                {asset.quantity === 1

                  ? ""

                  : "s"}

              </span>

            </div>



            <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">

              {asset.assetCategory}

            </h3>



            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">

              {asset.services.length}{" "}

              service

              {asset.services.length ===

              1

                ? ""

                : "s"}{" "}

              attached to this asset

            </p>

          </div>



          <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 lg:min-w-[190px] dark:border-gray-700 dark:bg-gray-800">

            <p className="text-xs text-gray-500 dark:text-gray-400">

              Asset Total

            </p>



            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">

              {formatCurrency(

                asset.totalAmount

              )}

            </p>



            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">

              Base{" "}

              {formatCurrency(

                asset.baseAmount

              )}{" "}

              + GST{" "}

              {formatCurrency(

                asset.gstAmount

              )}

            </p>

          </div>

        </div>

      </div>



      <div className="space-y-3 p-5">

        {asset.services.map(

          (service) => (

            <div

              key={service.id}

              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"

            >

              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                <div className="min-w-0 flex-1">

                  <div className="flex flex-wrap items-center gap-2">

                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">

                      {service.serviceCode

                        ? `${service.serviceCode} — `

                        : ""}

                      {service.serviceName}

                    </h4>



                    {service.pricingLabel && (

                      <span className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">

                        {

                          service.pricingLabel

                        }

                      </span>

                    )}

                  </div>



                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">

                    <DetailBox

                      label="Quantity"

                      value={String(

                        service.quantity

                      )}

                    />



                    <DetailBox

                      label="Unit Rate"

                      value={formatCurrency(

                        toNumber(

                          service.unitRate

                        )

                      )}

                    />



                    <DetailBox

                      label="GST"

                      value={`${toNumber(

                        service.gstPercent

                      )}%`}

                    />



                    <DetailBox

                      label="Service Total"

                      value={formatCurrency(

                        toNumber(

                          service.totalAmount

                        )

                      )}

                    />

                  </div>



                  {service.notes && (

                    <div className="mt-4 rounded-lg bg-gray-50 px-3 py-3 dark:bg-gray-800">

                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                        Service Notes

                      </p>



                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">

                        {service.notes}

                      </p>

                    </div>

                  )}

                </div>



                <div className="shrink-0 xl:min-w-[150px] xl:text-right">

                  <p className="text-xs text-gray-500 dark:text-gray-400">

                    Total

                  </p>



                  <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">

                    {formatCurrency(

                      toNumber(

                        service.totalAmount

                      )

                    )}

                  </p>

                </div>

              </div>

            </div>

          )

        )}

      </div>

    </div>

  );

}



/* ============================================================

   SECTION CARD

============================================================ */



function SectionCard({

  title,

  subtitle,

  children,

  rightContent,

}: {

  title: string;

  subtitle?: string;

  children: React.ReactNode;

  rightContent?: React.ReactNode;

}) {

  return (

    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

      <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">

        <div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">

            {title}

          </h2>



          {subtitle && (

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">

              {subtitle}

            </p>

          )}

        </div>



        {rightContent}

      </div>



      <div className="p-6">

        {children}

      </div>

    </div>

  );

}



/* ============================================================

   QUICK STAT

============================================================ */



function QuickStat({

  label,

  value,

}: {

  label: string;

  value: string;

}) {

  return (

    <div className="px-5 py-4">

      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">

        {label}

      </p>



      <p className="mt-1 truncate text-lg font-bold text-gray-900 dark:text-white">

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

  isLink = false,

  href,

  className = "",

}: {

  label: string;

  value?: string | null;

  isLink?: boolean;

  href?: string;

  className?: string;

}) {

  const displayValue =

    value && value.trim()

      ? value

      : "—";



  return (

    <div className={className}>

      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">

        {label}

      </p>



      {isLink &&

      href &&

      displayValue !== "—" ? (

        <a

          href={href}

          className="mt-1 block break-words text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"

        >

          {displayValue}

        </a>

      ) : (

        <p className="mt-1 break-words text-sm font-medium text-gray-900 dark:text-white">

          {displayValue}

        </p>

      )}

    </div>

  );

}



/* ============================================================

   SUMMARY ITEM

============================================================ */



function SummaryItem({

  label,

  value,

}: {

  label: string;

  value?: string | null;

}) {

  return (

    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0 dark:border-gray-800">

      <span className="text-sm text-gray-500 dark:text-gray-400">

        {label}

      </span>



      <span className="max-w-[60%] text-right text-sm font-semibold text-gray-900 dark:text-white">

        {value || "—"}

      </span>

    </div>

  );

}



/* ============================================================

   DETAIL BOX

============================================================ */



function DetailBox({

  label,

  value,

}: {

  label: string;

  value: string;

}) {

  return (

    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">

      <p className="text-xs text-gray-500 dark:text-gray-400">

        {label}

      </p>



      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">

        {value}

      </p>

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

    <div className="rounded-lg bg-white/5 p-3">

      <p className="text-xs text-gray-400">

        {label}

      </p>



      <p className="mt-1 text-sm font-bold text-white">

        {value}

      </p>

    </div>

  );

}



/* ============================================================

   HELPERS

============================================================ */



function toNumber(

  value:

    | number

    | string

    | null

    | undefined

) {

  const parsed = Number(value);



  return Number.isFinite(parsed)

    ? parsed

    : 0;

}



function formatCurrency(

  value: number

) {

  return new Intl.NumberFormat(

    "en-IN",

    {

      style: "currency",

      currency: "INR",

      maximumFractionDigits: 0,

    }

  ).format(toNumber(value));

}



function getInitials(

  value?: string | null

) {

  const words = String(value || "")

    .trim()

    .split(/\s+/)

    .filter(Boolean);



  if (words.length === 0) {

    return "CL";

  }



  if (words.length === 1) {

    return words[0]

      .slice(0, 2)

      .toUpperCase();

  }



  return `${words[0][0]}${words[1][0]}`.toUpperCase();

}



function inferAssetType(

  assetCategory?: string | null

): GroupedAsset["assetType"] {

  const value = String(

    assetCategory || ""

  ).toLowerCase();



  if (value.includes("escalator")) {

    return "Escalator";

  }



  if (value.includes("lift")) {

    return "Lift";

  }



  return "Asset";

}



function groupServiceSelections(

  selections: ClientServiceSelection[]

): GroupedAsset[] {

  const groups =

    new Map<string, GroupedAsset>();



  for (const selection of selections) {

    const assetCategory =

      String(

        selection.assetCategory || ""

      ).trim() ||

      "Uncategorized";



    const quantity = Math.max(

      Math.floor(

        toNumber(

          selection.quantity

        )

      ),

      1

    );



    const assetType =

      inferAssetType(

        selection.assetCategory

      );



    /*

     * Current backend stores service selections as flat rows.

     * Therefore the details page groups rows using:

     *

     * Asset Type + Asset Category + Quantity

     *

     * This keeps multiple services for the same asset together.

     */



    const key = [

      assetType,

      assetCategory,

      quantity,

    ].join("|");



    const existing =

      groups.get(key);



    if (existing) {

      existing.services.push(

        selection

      );



      existing.baseAmount +=

        toNumber(

          selection.baseAmount

        );



      existing.gstAmount +=

        toNumber(

          selection.gstAmount

        );



      existing.totalAmount +=

        toNumber(

          selection.totalAmount

        );

    } else {

      groups.set(key, {

        key,

        assetType,

        assetCategory,

        quantity,

        services: [selection],

        baseAmount: toNumber(

          selection.baseAmount

        ),

        gstAmount: toNumber(

          selection.gstAmount

        ),

        totalAmount: toNumber(

          selection.totalAmount

        ),

      });

    }

  }



  return Array.from(

    groups.values()

  );

}



function formatDate(

  value?: string | null

) {

  if (!value) {

    return "—";

  }



  const date = new Date(value);



  if (Number.isNaN(date.getTime())) {

    return value;

  }



  return date.toLocaleDateString(

    "en-IN",

    {

      day: "2-digit",

      month: "short",

      year: "numeric",

    }

  );

}