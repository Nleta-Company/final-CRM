"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import BdeClientForm from "@/components/clients/BdeClientForm";

import { clientService } from "@/services/clientService";

import type {
  ClientItem,
  ClientProcessStage,
} from "@/types/client";

// ============================================================
// PROCESS CONFIG
// ============================================================

const PROCESS_STAGES: {
  value: ClientProcessStage;
  label: string;
  description: string;
}[] = [
  {
    value: "CLIENT_CREATED",
    label: "Client Created",
    description:
      "Client account has been created in CRM.",
  },
  {
    value: "FSO_GENERATED",
    label: "FSO Generated",
    description:
      "FSO has been generated externally. Enter the FSO number before moving to PSGA.",
  },
  {
    value: "PSGA_GENERATED",
    label: "PSGA Generated",
    description:
      "PSGA has been generated externally. Enter the PSGA number before completing the process.",
  },
  {
    value: "PSGA_COMPLETED",
    label: "PSGA Completed",
    description:
      "PSGA process is completed and the client becomes incentive eligible.",
  },
];

const PROCESS_ORDER: Record<
  ClientProcessStage,
  number
> = {
  CLIENT_CREATED: 0,
  FSO_GENERATED: 1,
  PSGA_GENERATED: 2,
  PSGA_COMPLETED: 3,
};

// ============================================================
// DATE HELPERS
// ============================================================

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatDateInput(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
}

// ============================================================
// PAGE
// ============================================================

export default function EditBdeClientPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const router = useRouter();

  const clientId =
    params?.id || "";

  // ==========================================================
  // CLIENT STATE
  // ==========================================================

  const [client, setClient] =
    useState<ClientItem | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ==========================================================
  // PROCESS STATE
  // ==========================================================

  const [
    processStage,
    setProcessStage,
  ] =
    useState<ClientProcessStage>(
      "CLIENT_CREATED"
    );

  const [
    externalClientId,
    setExternalClientId,
  ] = useState("");

  const [fsoNumber, setFsoNumber] =
    useState("");

  const [
    fsoGeneratedAt,
    setFsoGeneratedAt,
  ] = useState("");

  const [psgaNumber, setPsgaNumber] =
    useState("");

  const [
    psgaGeneratedAt,
    setPsgaGeneratedAt,
  ] = useState("");

  const [
    processUpdatedAt,
    setProcessUpdatedAt,
  ] = useState("");

  const [
    savingProcess,
    setSavingProcess,
  ] = useState(false);

  const [
    processError,
    setProcessError,
  ] = useState("");

  const [
    processSuccess,
    setProcessSuccess,
  ] = useState("");

  // ==========================================================
  // LOAD CLIENT
  // ==========================================================

  const loadClient =
    useCallback(async () => {
      if (!clientId) {
        setError(
          "Client ID is missing."
        );

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
          setClient(null);

          setError(
            "Client not found."
          );

          return;
        }

        setClient(data);

        // ====================================================
        // LOAD PROCESS DATA
        // ====================================================

        setProcessStage(
          data.processStage ||
            "CLIENT_CREATED"
        );

        setExternalClientId(
          data.externalClientId ||
            ""
        );

        setFsoNumber(
          data.fsoNumber || ""
        );

        setFsoGeneratedAt(
          formatDateInput(
            data.fsoGeneratedAt
          )
        );

        setPsgaNumber(
          data.psgaNumber || ""
        );

        setPsgaGeneratedAt(
          formatDateInput(
            data.psgaGeneratedAt
          )
        );

        setProcessUpdatedAt(
          data.processUpdatedAt ||
            ""
        );
      } catch (err: unknown) {
        console.error(
          "FAILED TO LOAD BDE CLIENT:",
          err
        );

        setClient(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load client."
        );
      } finally {
        setLoading(false);
      }
    }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  // ==========================================================
  // BREADCRUMB
  // ==========================================================

  const breadcrumb = (
    <Breadcrumb
      pageTitle="Edit Client"
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
                label:
                  client.companyName,
                href: `/bde/clients/${client.id}`,
              },
            ]
          : []),
        {
          label: "Edit Client",
        },
      ]}
    />
  );

  // ==========================================================
  // PROCESS VALIDATION
  // ==========================================================

  function validateProcess() {
    // ========================================================
    // FSO VALIDATION
    // ========================================================

    if (
      processStage ===
        "FSO_GENERATED" ||
      processStage ===
        "PSGA_GENERATED" ||
      processStage ===
        "PSGA_COMPLETED"
    ) {
      if (!fsoNumber.trim()) {
        return "FSO number is required.";
      }

      if (!fsoGeneratedAt) {
        return "FSO generated date is required.";
      }
    }

    // ========================================================
    // PSGA VALIDATION
    // ========================================================

    if (
      processStage ===
        "PSGA_GENERATED" ||
      processStage ===
        "PSGA_COMPLETED"
    ) {
      if (!psgaNumber.trim()) {
        return "PSGA number is required.";
      }

      if (!psgaGeneratedAt) {
        return "PSGA generated date is required.";
      }
    }

    return "";
  }

  // ==========================================================
  // SAVE PROCESS
  // ==========================================================

  async function handleProcessUpdate() {
    setProcessError("");

    setProcessSuccess("");

    const validationError =
      validateProcess();

    if (validationError) {
      setProcessError(
        validationError
      );

      return;
    }

    if (!clientId) {
      setProcessError(
        "Client ID is missing."
      );

      return;
    }

    try {
      setSavingProcess(true);

      // ======================================================
      // API CALL
      // ======================================================

      const updatedClient =
        await clientService.updateClientProcess(
          clientId,
          {
            processStage,

            externalClientId:
              externalClientId.trim() ||
              undefined,

            fsoNumber:
              fsoNumber.trim() ||
              undefined,

            fsoGeneratedAt:
              fsoGeneratedAt
                ? new Date(
                    `${fsoGeneratedAt}T00:00:00`
                  ).toISOString()
                : undefined,

            psgaNumber:
              psgaNumber.trim() ||
              undefined,

            psgaGeneratedAt:
              psgaGeneratedAt
                ? new Date(
                    `${psgaGeneratedAt}T00:00:00`
                  ).toISOString()
                : undefined,
          }
        );

      // ======================================================
      // UPDATE LOCAL CLIENT
      // ======================================================

      setClient(
        updatedClient
      );

      setProcessStage(
        updatedClient.processStage ||
          processStage
      );

      setExternalClientId(
        updatedClient.externalClientId ||
          ""
      );

      setFsoNumber(
        updatedClient.fsoNumber ||
          ""
      );

      setFsoGeneratedAt(
        formatDateInput(
          updatedClient.fsoGeneratedAt
        )
      );

      setPsgaNumber(
        updatedClient.psgaNumber ||
          ""
      );

      setPsgaGeneratedAt(
        formatDateInput(
          updatedClient.psgaGeneratedAt
        )
      );

      setProcessUpdatedAt(
        updatedClient.processUpdatedAt ||
          ""
      );

      // ======================================================
      // SUCCESS MESSAGE
      // ======================================================

      if (
        processStage ===
        "PSGA_COMPLETED"
      ) {
        setProcessSuccess(
          "PSGA completed. This client is now eligible for incentive."
        );
      } else if (
        processStage ===
        "FSO_GENERATED"
      ) {
        setProcessSuccess(
          "FSO generated successfully. Enter the FSO number before moving to PSGA Generated."
        );
      } else if (
        processStage ===
        "PSGA_GENERATED"
      ) {
        setProcessSuccess(
          "PSGA generated successfully. Enter the PSGA number before completing the process."
        );
      } else {
        setProcessSuccess(
          "Client process updated successfully."
        );
      }
    } catch (err: unknown) {
      console.error(
        "UPDATE CLIENT PROCESS ERROR:",
        err
      );

      setProcessError(
        err instanceof Error
          ? err.message
          : "Unable to update client process."
      );
    } finally {
      setSavingProcess(false);
    }
  }

  // ==========================================================
  // PROCESS STAGE CHANGE
  // ==========================================================

  function handleStageChange(
    value: ClientProcessStage
  ) {
    setProcessError("");

    setProcessSuccess("");

    const currentOrder =
      PROCESS_ORDER[
        processStage
      ];

    const nextOrder =
      PROCESS_ORDER[value];

    // ========================================================
    // BACKWARD MOVEMENT BLOCK
    // ========================================================

    if (
      nextOrder <
      currentOrder
    ) {
      setProcessError(
        "Process stage cannot be moved backward."
      );

      return;
    }

    // ========================================================
    // SKIP PROCESS BLOCK
    // ========================================================

    if (
      nextOrder >
      currentOrder + 1
    ) {
      setProcessError(
        "Process stages must be completed in order."
      );

      return;
    }

    // ========================================================
    // FSO NUMBER CHECK
    // ========================================================

    if (
      processStage ===
        "FSO_GENERATED" &&
      value ===
        "PSGA_GENERATED"
    ) {
      if (!fsoNumber.trim()) {
        setProcessError(
          "Enter the FSO number first. You cannot move to PSGA Generated without an FSO number."
        );

        return;
      }

      if (!fsoGeneratedAt) {
        setProcessError(
          "Enter the FSO generated date first."
        );

        return;
      }
    }

    // ========================================================
    // PSGA NUMBER CHECK
    // ========================================================

    if (
      processStage ===
        "PSGA_GENERATED" &&
      value ===
        "PSGA_COMPLETED"
    ) {
      if (!psgaNumber.trim()) {
        setProcessError(
          "Enter the PSGA number first. You cannot complete the process without a PSGA number."
        );

        return;
      }

      if (!psgaGeneratedAt) {
        setProcessError(
          "Enter the PSGA generated date first."
        );

        return;
      }
    }

    setProcessStage(value);

    // ========================================================
    // AUTO DATE
    // ========================================================

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    if (
      value ===
        "FSO_GENERATED" &&
      !fsoGeneratedAt
    ) {
      setFsoGeneratedAt(
        today
      );
    }

    if (
      value ===
        "PSGA_GENERATED" &&
      !psgaGeneratedAt
    ) {
      setPsgaGeneratedAt(
        today
      );
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="space-y-6">
        {breadcrumb}

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="text-sm text-gray-500">
            Loading client...
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

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900">
            Unable to load client
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {error ||
              "Client not found."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/bde/clients"
              )
            }
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Back to My Clients
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // CURRENT PROCESS ORDER
  // ==========================================================

  const currentProcessOrder =
    PROCESS_ORDER[
      processStage
    ];

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="space-y-6">
      {breadcrumb}

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Edit Client
        </h1>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Update client information, assets,
          services, pricing and process status.
        </p>
      </div>

      {/* ======================================================
          PROCESS TRACKING
      ====================================================== */}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              FSO / PSGA Process Tracking
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              FSO and PSGA are generated externally.
              CRM only tracks their numbers and process
              status.
            </p>
          </div>

          {processStage ===
            "PSGA_COMPLETED" && (
            <span className="inline-flex w-fit items-center rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
              Incentive Eligible
            </span>
          )}
        </div>

        {/* ====================================================
            PROCESS STEPS
        ==================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          {PROCESS_STAGES.map(
            (stage) => {
              const stageOrder =
                PROCESS_ORDER[
                  stage.value
                ];

              const completed =
                stageOrder <=
                currentProcessOrder;

              const current =
                stage.value ===
                processStage;

              return (
                <div
                  key={
                    stage.value
                  }
                  className={`rounded-xl border p-4 ${
                    current
                      ? "border-gray-900 bg-gray-900 text-white"
                      : completed
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        current
                          ? "bg-white text-gray-900"
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
                            ? "text-white"
                            : "text-gray-900"
                        }`}
                      >
                        {stage.label}
                      </p>

                      <p
                        className={`mt-1 text-xs ${
                          current
                            ? "text-gray-300"
                            : "text-gray-500"
                        }`}
                      >
                        {completed &&
                        !current
                          ? "Completed"
                          : current
                            ? "Current Stage"
                            : "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* ====================================================
            PROCESS FORM
        ==================================================== */}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* PROCESS STAGE */}

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Current Process Stage
              </label>

              <select
                value={processStage}
                onChange={(event) =>
                  handleStageChange(
                    event.target
                      .value as ClientProcessStage
                  )
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              >
                {PROCESS_STAGES.map(
                  (stage) => {
                    const stageOrder =
                      PROCESS_ORDER[
                        stage.value
                      ];

                    let disabled =
                      false;

                    // BACKWARD

                    if (
                      stageOrder <
                      currentProcessOrder
                    ) {
                      disabled = true;
                    }

                    // SKIP

                    if (
                      stageOrder >
                      currentProcessOrder + 1
                    ) {
                      disabled = true;
                    }

                    // FSO NUMBER

                    if (
                      processStage ===
                        "FSO_GENERATED" &&
                      stage.value ===
                        "PSGA_GENERATED" &&
                      !fsoNumber.trim()
                    ) {
                      disabled = true;
                    }

                    // FSO DATE

                    if (
                      processStage ===
                        "FSO_GENERATED" &&
                      stage.value ===
                        "PSGA_GENERATED" &&
                      !fsoGeneratedAt
                    ) {
                      disabled = true;
                    }

                    // PSGA NUMBER

                    if (
                      processStage ===
                        "PSGA_GENERATED" &&
                      stage.value ===
                        "PSGA_COMPLETED" &&
                      !psgaNumber.trim()
                    ) {
                      disabled = true;
                    }

                    // PSGA DATE

                    if (
                      processStage ===
                        "PSGA_GENERATED" &&
                      stage.value ===
                        "PSGA_COMPLETED" &&
                      !psgaGeneratedAt
                    ) {
                      disabled = true;
                    }

                    return (
                      <option
                        key={
                          stage.value
                        }
                        value={
                          stage.value
                        }
                        disabled={
                          disabled
                        }
                      >
                        {stage.label}
                      </option>
                    );
                  }
                )}
              </select>

              <p className="mt-1.5 text-xs text-gray-500">
                {
                  PROCESS_STAGES.find(
                    (item) =>
                      item.value ===
                      processStage
                  )?.description
                }
              </p>

              {/* FSO HOLD */}

              {processStage ===
                "FSO_GENERATED" &&
                !fsoNumber.trim() && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-medium text-amber-800">
                      FSO number required
                    </p>

                    <p className="mt-1 text-xs text-amber-700">
                      Enter the FSO number below.
                      PSGA Generated will remain locked
                      until the FSO number is saved.
                    </p>
                  </div>
                )}

              {/* PSGA HOLD */}

              {processStage ===
                "PSGA_GENERATED" &&
                !psgaNumber.trim() && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-medium text-amber-800">
                      PSGA number required
                    </p>

                    <p className="mt-1 text-xs text-amber-700">
                      Enter the PSGA number below.
                      PSGA Completed will remain locked
                      until the PSGA number is saved.
                    </p>
                  </div>
                )}
            </div>

            {/* EXTERNAL CLIENT ID */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                External Client ID
              </label>

              <input
                type="text"
                value={
                  externalClientId
                }
                onChange={(event) =>
                  setExternalClientId(
                    event.target.value
                  )
                }
                placeholder="Enter external client ID if available"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />

              <p className="mt-1.5 text-xs text-gray-500">
                Optional external system client reference.
              </p>
            </div>

            {/* FSO NUMBER */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                FSO Number

                {(processStage ===
                  "FSO_GENERATED" ||
                  processStage ===
                    "PSGA_GENERATED" ||
                  processStage ===
                    "PSGA_COMPLETED") && (
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                )}
              </label>

              <input
                type="text"
                value={
                  fsoNumber
                }
                onChange={(event) => {
                  setFsoNumber(
                    event.target.value
                  );

                  setProcessError("");

                  setProcessSuccess("");
                }}
                placeholder="Enter FSO number"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />

              <p className="mt-1.5 text-xs text-gray-500">
                Enter the FSO number once FSO is generated.
              </p>
            </div>

            {/* FSO DATE */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                FSO Generated Date

                {(processStage ===
                  "FSO_GENERATED" ||
                  processStage ===
                    "PSGA_GENERATED" ||
                  processStage ===
                    "PSGA_COMPLETED") && (
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                )}
              </label>

              <input
                type="date"
                value={
                  fsoGeneratedAt
                }
                onChange={(event) =>
                  setFsoGeneratedAt(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>

            {/* PSGA NUMBER */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                PSGA Number

                {(processStage ===
                  "PSGA_GENERATED" ||
                  processStage ===
                    "PSGA_COMPLETED") && (
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                )}
              </label>

              <input
                type="text"
                value={
                  psgaNumber
                }
                onChange={(event) => {
                  setPsgaNumber(
                    event.target.value
                  );

                  setProcessError("");

                  setProcessSuccess("");
                }}
                placeholder="Enter PSGA number"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />

              <p className="mt-1.5 text-xs text-gray-500">
                Enter the PSGA number once PSGA is generated.
              </p>
            </div>

            {/* PSGA DATE */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                PSGA Generated Date

                {(processStage ===
                  "PSGA_GENERATED" ||
                  processStage ===
                    "PSGA_COMPLETED") && (
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                )}
              </label>

              <input
                type="date"
                value={
                  psgaGeneratedAt
                }
                onChange={(event) =>
                  setPsgaGeneratedAt(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>
          </div>

          {/* PROCESS ERROR */}

          {processError && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {processError}
            </div>
          )}

          {/* PROCESS SUCCESS */}

          {processSuccess && (
            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {processSuccess}
            </div>
          )}

          {/* PROCESS SUMMARY */}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProcessInfo
              label="Current Stage"
              value={
                PROCESS_STAGES.find(
                  (stage) =>
                    stage.value ===
                    processStage
                )?.label ||
                "—"
              }
            />

            <ProcessInfo
              label="FSO Number"
              value={
                fsoNumber || "—"
              }
            />

            <ProcessInfo
              label="PSGA Number"
              value={
                psgaNumber || "—"
              }
            />

            <ProcessInfo
              label="Last Process Update"
              value={formatDateTime(
                processUpdatedAt
              )}
            />
          </div>

          {/* SAVE PROCESS */}

          <div className="mt-5 flex flex-col gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {processStage ===
                "PSGA_COMPLETED" && (
                <p className="text-sm font-medium text-green-700">
                  PSGA completed. Incentive eligibility
                  is now active for this client.
                </p>
              )}

              {processStage ===
                "FSO_GENERATED" &&
                !fsoNumber.trim() && (
                  <p className="text-sm font-medium text-amber-700">
                    Enter FSO number to continue to PSGA Generated.
                  </p>
                )}

              {processStage ===
                "PSGA_GENERATED" &&
                !psgaNumber.trim() && (
                  <p className="text-sm font-medium text-amber-700">
                    Enter PSGA number to continue to PSGA Completed.
                  </p>
                )}

              {processStage !==
                "PSGA_COMPLETED" &&
                !(
                  processStage ===
                    "FSO_GENERATED" &&
                  !fsoNumber.trim()
                ) &&
                !(
                  processStage ===
                    "PSGA_GENERATED" &&
                  !psgaNumber.trim()
                ) && (
                  <p className="text-xs text-gray-500">
                    Save the process stage after entering
                    the required details.
                  </p>
                )}
            </div>

            <button
              type="button"
              onClick={
                handleProcessUpdate
              }
              disabled={
                savingProcess
              }
              className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingProcess
                ? "Saving Process..."
                : "Save Process Tracking"}
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================
          EXISTING BDE CLIENT FORM
      ====================================================== */}

      <BdeClientForm
        initialClient={client}
        isEdit
      />
    </div>
  );
}

// ============================================================
// PROCESS INFO
// ============================================================

function ProcessInfo({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}