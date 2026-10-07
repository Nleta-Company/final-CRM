"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  LeadItem,
  CreateLeadInput,
  UpdateLeadInput,
  LeadStatus,
} from "@/types/lead";

import {
  leadService,
  LeadServiceSelectionItem,
} from "@/services/leadService";

import { serviceService } from "@/services/serviceService";

import {
  ServiceItem,
  ServicePricingRule,
} from "@/types/service";

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
  role?: { name: string } | null;
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

interface ExtendedLeadItem extends LeadItem {
  customerType?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  nextFollowUpAt?: string | null;
  followUpRemarks?: string | null;
  nextAction?: string | null;
}

type AssetType =
  | "LIFT"
  | "ESCALATOR"
  | "OTHER";

interface AssetServiceDraft {
  tempId: string;
  serviceId: string;
  notes: string;

  // Existing backend selection ID.
  // New services do not have this.
  existingSelectionId?: string;
}

interface AssetDraft {
  tempId: string;
  assetType: AssetType;
  assetCategory: string;
  measurement: number;
  quantity: number;

  services: AssetServiceDraft[];
}

interface LeadDetailsDraft {
  customerType: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  nextFollowUpDate: string;
  nextFollowUpTime: string;
  followUpRemarks: string;
  nextAction: string;
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

const leadStatuses: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
];

const statusLabels: Record<
  LeadStatus,
  string
> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

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

function getCurrentUser(): StoredUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      localStorage.getItem("nleta_user");

    return raw
      ? (JSON.parse(raw) as StoredUser)
      : null;
  } catch {
    return null;
  }
}

function getCurrentRole(): string {
  const user = getCurrentUser();

  if (!user) return "";

  if (typeof user.role === "string") {
    return user.role;
  }

  if (
    user.role &&
    typeof user.role === "object"
  ) {
    return user.role.name || "";
  }

  return user.roleName || "";
}

function getBdeName(
  user?: BdeUser | null
): string {
  if (!user) return "";

  return `${user.firstName} ${user.lastName || ""
    }`.trim();
}

function safeNumber(
  value: unknown
): number {
  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(
  value: number
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(
    Number.isFinite(value)
      ? value
      : 0
  );
}

function getPricingBasis(
  rule?: ServicePricingRule
): string {
  const pricingBasis = (
    rule as
    | (ServicePricingRule & {
      pricingBasis?: string | null;
    })
    | undefined
  )?.pricingBasis;

  return String(
    pricingBasis || ""
  ).toUpperCase();
}

/**
 * Heavy Duty Escalator must also be treated
 * as ESCALATOR.
 */
function getAssetType(
  category?: string | null
): AssetType {
  const text = String(
    category || ""
  ).toLowerCase();

  if (
    text.includes("escalator") ||
    text.includes("heavy duty") ||
    text.includes("heavy-duty") ||
    text.includes("heavy_duty")
  ) {
    return "ESCALATOR";
  }

  if (
    text.includes("lift") ||
    text.includes("elevator")
  ) {
    return "LIFT";
  }

  return "OTHER";
}

function getAssetTypeLabel(
  type: AssetType
): string {
  if (type === "LIFT") {
    return "Lift";
  }

  if (type === "ESCALATOR") {
    return "Escalator";
  }

  return "Other";
}

function getFloorRange(
  category?: string | null
) {
  const text = String(
    category || ""
  )
    .toLowerCase()
    .replace(/–/g, "-")
    .replace(/—/g, "-");

  let match = text.match(
    /(\d+)\s*-\s*(\d+)\s*floor/
  );

  if (match) {
    return {
      min: Number(match[1]),
      max: Number(match[2]),
    };
  }

  match = text.match(
    /(?:up to|upto|maximum)\s*(\d+)\s*floor/
  );

  if (match) {
    return {
      min: 0,
      max: Number(match[1]),
    };
  }

  match = text.match(
    /(\d+)\s*\+\s*floor/
  );

  if (match) {
    return {
      min: Number(match[1]),
      max: Infinity,
    };
  }

  match = text.match(
    /(?:above|more than|greater than)\s*(\d+)\s*floor/
  );

  if (match) {
    return {
      min: Number(match[1]) + 1,
      max: Infinity,
    };
  }

  return null;
}

function getRiseRange(
  category?: string | null
) {
  const text = String(
    category || ""
  )
    .toLowerCase()
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/,/g, "");

  let match = text.match(
    /(\d+(?:\.\d+)?)\s*(?:m|meter|meters)\s*-\s*(\d+(?:\.\d+)?)\s*(?:m|meter|meters)/
  );

  if (match) {
    return {
      min: Number(match[1]),
      max: Number(match[2]),
    };
  }

  match = text.match(
    /(?:up to|upto|maximum)\s*(\d+(?:\.\d+)?)\s*(?:m|meter|meters)/
  );

  if (match) {
    return {
      min: 0,
      max: Number(match[1]),
    };
  }

  match = text.match(
    /(\d+(?:\.\d+)?)\s*\+\s*(?:m|meter|meters)/
  );

  if (match) {
    return {
      min: Number(match[1]),
      max: Infinity,
    };
  }

  match = text.match(
    /(?:above|more than|greater than)\s*(\d+(?:\.\d+)?)\s*(?:m|meter|meters)/
  );

  if (match) {
    return {
      min: Number(match[1]) + 0.01,
      max: Infinity,
    };
  }

  return null;
}

function categoryMatches(
  category: string,
  type: AssetType,
  measurement: number
): boolean {
  const range =
    type === "ESCALATOR"
      ? getRiseRange(category)
      : getFloorRange(category);

  if (!range) {
    return false;
  }

  return (
    measurement >= range.min &&
    measurement <= range.max
  );
}

function findGlobalCategory(
  services: ServiceItem[],
  type: AssetType,
  measurement: number
): string {
  const unique =
    new Map<string, ServicePricingRule>();

  for (const service of services) {
    for (const rule of
      service.pricingRules || []) {
      const category = String(
        rule.assetCategory || ""
      ).trim();

      if (!category) {
        continue;
      }

      if (
        getAssetType(category) !== type
      ) {
        continue;
      }

      if (!unique.has(category)) {
        unique.set(category, rule);
      }
    }
  }

  const categories =
    Array.from(unique.keys());

  const matches = categories
    .filter((category) =>
      categoryMatches(
        category,
        type,
        measurement
      )
    )
    .map((category) => {
      const range =
        type === "ESCALATOR"
          ? getRiseRange(category)
          : getFloorRange(category);

      return {
        category,
        range,
      };
    })
    .sort((a, b) => {
      const aMax =
        a.range?.max ?? Infinity;

      const bMax =
        b.range?.max ?? Infinity;

      if (aMax !== bMax) {
        return aMax - bMax;
      }

      const aMin =
        a.range?.min ?? 0;

      const bMin =
        b.range?.min ?? 0;

      return bMin - aMin;
    });

  if (matches[0]?.category) {
    return matches[0].category;
  }

  const noRange =
    categories.find((category) =>
      type === "ESCALATOR"
        ? !getRiseRange(category)
        : !getFloorRange(category)
    );

  return (
    noRange ||
    categories[0] ||
    ""
  );
}

function findPricingRule(
  service:
    | ServiceItem
    | undefined,
  category: string,
  quantity: number
): ServicePricingRule | undefined {
  if (!service) {
    return undefined;
  }

  const rules =
    (service.pricingRules || []).filter(
      (rule) =>
        String(
          rule.assetCategory || ""
        ).trim() ===
        category.trim()
    );

  if (!rules.length) {
    return undefined;
  }

  // Quantity based rule
  const quantityRules =
    rules.filter(
      (rule) =>
        getPricingBasis(rule) ===
        "LIFT_COUNT"
    );

  if (quantityRules.length > 0) {
    return quantityRules.find(
      (rule) => {
        const min =
          rule.minQuantity == null
            ? 0
            : safeNumber(
              rule.minQuantity
            );

        const max =
          rule.maxQuantity == null
            ? Infinity
            : safeNumber(
              rule.maxQuantity
            );

        return (
          quantity >= min &&
          quantity <= max
        );
      }
    );
  }

  // Non-quantity based pricing
  return rules[0];
}

function getAmount(
  rule:
    | ServicePricingRule
    | undefined,
  quantity: number
) {
  if (!rule) {
    return {
      base: 0,
      gst: 0,
      total: 0,
    };
  }

  const unitRate =
    safeNumber(rule.unitRate);

  const gstPercent =
    safeNumber(rule.gstPercent);

  const qty = Math.max(
    safeNumber(quantity),
    0
  );

  const base =
    qty * unitRate;

  const gst =
    (base * gstPercent) / 100;

  return {
    base,
    gst,
    total: base + gst,
  };
}

function getServicesForAsset(
  services: ServiceItem[],
  asset: AssetDraft
): ServiceItem[] {
  return services.filter(
    (service) => {
      const hasType =
        (service.pricingRules || []).some(
          (rule) =>
            getAssetType(
              rule.assetCategory
            ) === asset.assetType
        );

      const hasCategory =
        (service.pricingRules || []).some(
          (rule) =>
            String(
              rule.assetCategory || ""
            ).trim() ===
            asset.assetCategory.trim()
        );

      return (
        hasType &&
        hasCategory
      );
    }
  );
}

/**
 * Find existing selection by service.
 */
function findSelectionForService(
  selections: LeadServiceSelectionItem[],
  serviceId: string
) {
  return selections.find(
    (item) =>
      item.serviceId === serviceId
  );
}

export default function LeadForm({
  initialLead,
  isEdit = false,
}: LeadFormProps) {
  const router = useRouter();

  const extendedInitialLead =
    initialLead as ExtendedLeadItem | undefined;

  const [currentRole, setCurrentRole] =
    useState("");

  const userIsAdmin =
    currentRole === "Admin";

  const userIsBde =
    currentRole === "BDE/Sales";

  const [
    associationName,
    setAssociationName,
  ] = useState(
    initialLead?.associationName || ""
  );

  const [
    contactName,
    setContactName,
  ] = useState(
    initialLead?.contactName || ""
  );

  const [email, setEmail] =
    useState(initialLead?.email || "");

  const [mobile, setMobile] =
    useState(
      initialLead?.mobile || ""
    );

  const [source, setSource] =
    useState(
      initialLead?.source || ""
    );

  const [notes, setNotes] =
    useState(
      initialLead?.notes || ""
    );

  const [customerType, setCustomerType] =
    useState(
      extendedInitialLead?.customerType || ""
    );

  const [address, setAddress] =
    useState(
      extendedInitialLead?.address || ""
    );

  const [city, setCity] =
    useState(
      extendedInitialLead?.city || ""
    );

  const [state, setState] =
    useState(
      extendedInitialLead?.state || ""
    );

  const [pincode, setPincode] =
    useState(
      extendedInitialLead?.pincode || ""
    );

  const [nextFollowUpDate, setNextFollowUpDate] =
    useState("");

  const [nextFollowUpTime, setNextFollowUpTime] =
    useState("");

  const [followUpRemarks, setFollowUpRemarks] =
    useState(
      extendedInitialLead?.followUpRemarks || ""
    );

  const [nextAction, setNextAction] =
    useState(
      extendedInitialLead?.nextAction || ""
    );

  const [status, setStatus] =
    useState<LeadStatus>(
      initialLead?.status || "NEW"
    );

  const [
    assignedToId,
    setAssignedToId,
  ] = useState(
    initialLead?.assignedToId || ""
  );

  const [bdesList, setBdesList] =
    useState<BdeUser[]>([]);

  const [
    loadingBdes,
    setLoadingBdes,
  ] = useState(false);

  const [services, setServices] =
    useState<ServiceItem[]>([]);

  const [
    loadingServices,
    setLoadingServices,
  ] = useState(true);

  const [assets, setAssets] =
    useState<AssetDraft[]>([]);

  const [
    loadingSelections,
    setLoadingSelections,
  ] = useState(false);

  const [
    existingSelections,
    setExistingSelections,
  ] = useState<
    LeadServiceSelectionItem[]
  >([]);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  const [
    successToast,
    setSuccessToast,
  ] = useState<string | null>(
    null
  );

  // ==========================================================
  // LOAD EDIT-LEAD FOLLOW-UP DATE / TIME
  // ==========================================================

  useEffect(() => {
    if (!extendedInitialLead?.nextFollowUpAt) {
      return;
    }

    const date = new Date(
      extendedInitialLead.nextFollowUpAt
    );

    if (Number.isNaN(date.getTime())) {
      return;
    }

    const pad = (value: number) =>
      String(value).padStart(2, "0");

    setNextFollowUpDate(
      `${date.getFullYear()}-${pad(
        date.getMonth() + 1
      )}-${pad(date.getDate())}`
    );

    setNextFollowUpTime(
      `${pad(date.getHours())}:${pad(
        date.getMinutes()
      )}`
    );
  }, [extendedInitialLead?.nextFollowUpAt]);

  // ==========================================================
  // LOAD ROLE
  // ==========================================================

  useEffect(() => {
    const role = getCurrentRole();

    setCurrentRole(role);

    if (
      role === "BDE/Sales" &&
      !isEdit
    ) {
      setAssignedToId("");
    }
  }, [isEdit]);

  // ==========================================================
  // LOAD BDE USERS FOR ADMIN
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadBdes() {
      if (!userIsAdmin) {
        setBdesList([]);
        setLoadingBdes(false);
        return;
      }

      try {
        setLoadingBdes(true);

        const token =
          getAuthToken();

        if (!token) {
          throw new Error(
            "Authentication token is missing."
          );
        }

        const response =
          await fetch(
            `${API_BASE_URL}/users`,
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              cache: "no-store",
            }
          );

        let result:
          | UsersApiResponse
          | null = null;

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

        const activeBdes =
          (
            result?.data?.users ||
            []
          ).filter(
            (user) =>
              user.status ===
              "ACTIVE" &&
              user.role?.name ===
              "BDE/Sales"
          );

        if (!cancelled) {
          setBdesList(
            activeBdes
          );
        }
      } catch (error) {
        console.error(
          "Failed to load BDEs:",
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

  // ==========================================================
  // KEEP ASSIGNED BDE IN LIST IN EDIT MODE
  // ==========================================================

  useEffect(() => {
    if (
      !initialLead?.assignedToId ||
      !initialLead.assignedTo
    ) {
      return;
    }

    const alreadyLoaded =
      bdesList.some(
        (bde) =>
          bde.id ===
          initialLead.assignedToId
      );

    if (alreadyLoaded) {
      return;
    }

    const assignedUser =
      initialLead.assignedTo;

    if (
      assignedUser.role?.name !==
      "BDE/Sales" &&
      assignedUser.role?.name !==
      "Admin"
    ) {
      return;
    }

    setBdesList(
      (current) => [
        {
          id: assignedUser.id,
          firstName:
            assignedUser.firstName,
          lastName:
            assignedUser.lastName ||
            null,
          email:
            assignedUser.email ||
            null,
          status: "ACTIVE",
          role:
            assignedUser.role
              ? {
                name:
                  assignedUser.role
                    .name,
              }
              : null,
        },
        ...current,
      ]
    );
  }, [initialLead, bdesList]);

  // ==========================================================
  // LOAD SERVICES
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      try {
        setLoadingServices(true);

        const result =
          await serviceService.getAllServices();

        if (!cancelled) {
          setServices(result);
        }
      } catch (error) {
        console.error(
          "Failed to load services:",
          error
        );

        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load services and pricing."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingServices(false);
        }
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // LOAD SAVED LEAD SERVICE SELECTIONS
  // ==========================================================

  useEffect(() => {
    if (
      !isEdit ||
      !initialLead?.id ||
      loadingServices ||
      services.length === 0
    ) {
      return;
    }

    let cancelled = false;

    async function loadExistingSelections() {
      try {
        setLoadingSelections(true);

        const selections =
          await leadService.getServiceSelections(
            initialLead!.id
          );

        if (cancelled) {
          return;
        }

        setExistingSelections(
          selections
        );

        const groups =
          new Map<
            string,
            AssetDraft
          >();

        for (const selection of selections) {
          const category =
            String(
              selection.assetCategory ||
              ""
            ).trim();

          if (!category) {
            continue;
          }

          const assetType =
            getAssetType(
              category
            );

          const key =
            `${assetType}:${category}`;

          let asset =
            groups.get(key);

          if (!asset) {
            const newAsset: AssetDraft = {
              tempId:
                `asset-${selection.id}`,

              assetType,

              assetCategory:
                category,

              // The current DB stores
              // category + quantity, not
              // the original rise/floor.
              //
              // Keep a safe editable
              // value until user changes it.
              measurement: 1,

              quantity:
                Math.max(
                  safeNumber(
                    selection.quantity
                  ),
                  1
                ),

              services: [],
            };

            groups.set(
              key,
              newAsset
            );

            asset = newAsset;
          }

          // Map#get is narrowed through
          // this explicit assignment above.
          const currentAsset: AssetDraft =
            asset;

          const alreadyAdded =
            currentAsset.services.some(
              (item) =>
                item.serviceId ===
                selection.serviceId
            );

          if (
            !alreadyAdded
          ) {
            currentAsset.services.push(
              {
                tempId:
                  `asset-service-${selection.id}`,

                serviceId:
                  selection.serviceId,

                existingSelectionId:
                  selection.id,

                notes:
                  selection.notes ||
                  "",
              }
            );
          }
        }

        const groupedAssets =
          Array.from(
            groups.values()
          );

        // The LeadAsset table stores detailed asset information
        // separately from LeadServiceSelection. Match saved
        // details by index when the current service-selection
        // grouping is available.
        const hydratedAssets =
          groupedAssets.map(
            (asset, index) => {
              return asset;
            }
          );

        setAssets(
          hydratedAssets
        );
      } catch (error) {
        console.error(
          "LOAD LEAD SERVICE SELECTIONS ERROR:",
          error
        );

        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load saved lead services."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSelections(
            false
          );
        }
      }
    }

    loadExistingSelections();

    return () => {
      cancelled = true;
    };
  }, [
    isEdit,
    initialLead?.id,
    loadingServices,
    services,
  ]);

  const selectedBde =
    bdesList.find(
      (bde) =>
        bde.id === assignedToId
    );

  // ==========================================================
  // ADD ASSET
  // ==========================================================

  function addAsset() {
    if (!services.length) {
      setErrorMessage(
        "No active service is available."
      );

      return;
    }

    const availableTypes =
      Array.from(
        new Set(
          services.flatMap(
            (service) =>
              (
                service.pricingRules ||
                []
              )
                .map((rule) =>
                  getAssetType(
                    rule.assetCategory
                  )
                )
                .filter(Boolean)
          )
        )
      ) as AssetType[];

    const assetType: AssetType =
      availableTypes.includes(
        "LIFT"
      )
        ? "LIFT"
        : availableTypes.includes(
          "ESCALATOR"
        )
          ? "ESCALATOR"
          : "OTHER";

    const measurement = 1;

    const category =
      findGlobalCategory(
        services,
        assetType,
        measurement
      );

    if (!category) {
      setErrorMessage(
        `No ${getAssetTypeLabel(
          assetType
        )} pricing category is configured.`
      );

      return;
    }

    const compatibleServices =
      services.filter(
        (service) =>
          (
            service.pricingRules ||
            []
          ).some(
            (rule) =>
              String(
                rule.assetCategory ||
                ""
              ).trim() ===
              category
          )
      );

    setAssets(
      (current) => [
        ...current,
        {
          tempId:
            `asset-${Date.now()}-${Math.random()}`,
          assetType,
          assetCategory:
            category,
          measurement,
          quantity: 1,


          services:
            compatibleServices[0]
              ? [
                {
                  tempId:
                    `asset-service-${Date.now()}-${Math.random()}`,

                  serviceId:
                    compatibleServices[0]
                      .id,

                  notes: "",
                },
              ]
              : [],
        },
      ]
    );

    setErrorMessage(null);
  }

  // ==========================================================
  // REMOVE ASSET
  // ==========================================================

  function removeAsset(
    assetId: string
  ) {
    setAssets(
      (current) =>
        current.filter(
          (asset) =>
            asset.tempId !==
            assetId
        )
    );
  }

  // ==========================================================
  // CHANGE ASSET TYPE
  // ==========================================================

  function changeAssetType(
    assetId: string,
    assetType: AssetType
  ) {
    setAssets(
      (current) =>
        current.map(
          (asset) => {
            if (
              asset.tempId !==
              assetId
            ) {
              return asset;
            }

            const category =
              findGlobalCategory(
                services,
                assetType,
                asset.measurement
              );

            const compatibleServices =
              services.filter(
                (service) =>
                  (
                    service.pricingRules ||
                    []
                  ).some(
                    (rule) =>
                      String(
                        rule.assetCategory ||
                        ""
                      ).trim() ===
                      category
                  )
              );

            const preserved =
              asset.services.filter(
                (selected) =>
                  compatibleServices.some(
                    (service) =>
                      service.id ===
                      selected.serviceId
                  )
              );

            return {
              ...asset,
              assetType,
              assetCategory:
                category,

              services:
                preserved.length > 0
                  ? preserved
                  : compatibleServices[0]
                    ? [
                      {
                        tempId:
                          `asset-service-${Date.now()}-${Math.random()}`,

                        serviceId:
                          compatibleServices[0]
                            .id,

                        notes: "",
                      },
                    ]
                    : [],
            };
          }
        )
    );
  }

  // ==========================================================
  // CHANGE MEASUREMENT
  // ==========================================================

  function changeMeasurement(
    assetId: string,
    value: string
  ) {
    const measurement =
      Math.max(
        safeNumber(value),
        0
      );

    setAssets(
      (current) =>
        current.map(
          (asset) => {
            if (
              asset.tempId !==
              assetId
            ) {
              return asset;
            }

            const category =
              findGlobalCategory(
                services,
                asset.assetType,
                measurement
              );

            const compatibleServices =
              services.filter(
                (service) =>
                  (
                    service.pricingRules ||
                    []
                  ).some(
                    (rule) =>
                      String(
                        rule.assetCategory ||
                        ""
                      ).trim() ===
                      category
                  )
              );

            const preserved =
              asset.services.filter(
                (selected) =>
                  compatibleServices.some(
                    (service) =>
                      service.id ===
                      selected.serviceId
                  )
              );

            return {
              ...asset,
              measurement,
              assetCategory:
                category,

              services:
                preserved.length > 0
                  ? preserved
                  : compatibleServices[0]
                    ? [
                      {
                        tempId:
                          `asset-service-${Date.now()}-${Math.random()}`,

                        serviceId:
                          compatibleServices[0]
                            .id,

                        notes: "",
                      },
                    ]
                    : [],
            };
          }
        )
    );
  }

  // ==========================================================
  // CHANGE QUANTITY
  // ==========================================================

  function changeQuantity(
    assetId: string,
    value: string
  ) {
    const quantity =
      Math.max(
        Math.floor(
          safeNumber(value)
        ),
        1
      );

    setAssets(
      (current) =>
        current.map(
          (asset) =>
            asset.tempId ===
              assetId
              ? {
                ...asset,
                quantity,
              }
              : asset
        )
    );
  }

  // ==========================================================
  // TOGGLE SERVICE
  // ==========================================================

  function toggleService(
    assetId: string,
    serviceId: string
  ) {
    setAssets(
      (current) =>
        current.map(
          (asset) => {
            if (
              asset.tempId !==
              assetId
            ) {
              return asset;
            }

            const selected =
              asset.services.some(
                (item) =>
                  item.serviceId ===
                  serviceId
              );

            if (selected) {
              if (
                asset.services
                  .length === 1
              ) {
                setErrorMessage(
                  "At least one service must be selected for every asset."
                );

                return asset;
              }

              return {
                ...asset,

                services:
                  asset.services.filter(
                    (item) =>
                      item.serviceId !==
                      serviceId
                  ),
              };
            }

            setErrorMessage(null);

            return {
              ...asset,

              services: [
                ...asset.services,
                {
                  tempId:
                    `asset-service-${Date.now()}-${Math.random()}`,

                  serviceId,

                  notes: "",
                },
              ],
            };
          }
        )
    );
  }

  // ==========================================================
  // SERVICE NOTES
  // ==========================================================

  function changeServiceNotes(
    assetId: string,
    serviceId: string,
    notesValue: string
  ) {
    setAssets(
      (current) =>
        current.map(
          (asset) =>
            asset.tempId ===
              assetId
              ? {
                ...asset,

                services:
                  asset.services.map(
                    (
                      selected
                    ) =>
                      selected.serviceId ===
                        serviceId
                        ? {
                          ...selected,
                          notes:
                            notesValue,
                        }
                        : selected
                  ),
              }
              : asset
        )
    );
  }

  // ==========================================================
  // ASSET TOTALS
  // ==========================================================

  function getAssetTotals(
    asset: AssetDraft
  ) {
    return asset.services.reduce(
      (summary, selected) => {
        const service =
          services.find(
            (item) =>
              item.id ===
              selected.serviceId
          );

        const rule =
          findPricingRule(
            service,
            asset.assetCategory,
            asset.quantity
          );

        const amount =
          getAmount(
            rule,
            asset.quantity
          );

        return {
          base:
            summary.base +
            amount.base,

          gst:
            summary.gst +
            amount.gst,

          total:
            summary.total +
            amount.total,
        };
      },
      {
        base: 0,
        gst: 0,
        total: 0,
      }
    );
  }

  const grandTotals =
    useMemo(
      () =>
        assets.reduce(
          (summary, asset) => {
            const amount =
              getAssetTotals(
                asset
              );

            return {
              base:
                summary.base +
                amount.base,

              gst:
                summary.gst +
                amount.gst,

              total:
                summary.total +
                amount.total,
            };
          },
          {
            base: 0,
            gst: 0,
            total: 0,
          }
        ),
      [assets, services]
    );

  // ==========================================================
  // VALIDATE FORM
  // ==========================================================

  const validateForm =
    (): boolean => {
      setErrorMessage(null);

      if (
        !associationName.trim()
      ) {
        setErrorMessage(
          "Association / Organization Name is required."
        );

        return false;
      }

      if (
        associationName.trim()
          .length < 2
      ) {
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

      if (
        contactName.trim()
          .length < 2
      ) {
        setErrorMessage(
          "Contact Person Name must contain at least 2 characters."
        );

        return false;
      }

      if (email.trim()) {
        const emailPattern =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
          !emailPattern.test(
            email.trim()
          )
        ) {
          setErrorMessage(
            "Please enter a valid email address."
          );

          return false;
        }
      }

      if (mobile.trim()) {
        const mobileDigits =
          mobile.replace(
            /\D/g,
            ""
          );

        if (
          mobileDigits.length <
          7 ||
          mobileDigits.length >
          15
        ) {
          setErrorMessage(
            "Please enter a valid mobile number."
          );

          return false;
        }
      }

      if (pincode.trim()) {
        const pincodeDigits =
          pincode.replace(
            /\D/g,
            ""
          );

        if (
          pincodeDigits.length !== 6
        ) {
          setErrorMessage(
            "Pincode must contain 6 digits."
          );

          return false;
        }
      }

      if (
        nextFollowUpDate &&
        !nextFollowUpTime
      ) {
        setErrorMessage(
          "Please select a follow-up time."
        );

        return false;
      }

      if (
        nextFollowUpTime &&
        !nextFollowUpDate
      ) {
        setErrorMessage(
          "Please select a follow-up date."
        );

        return false;
      }

      if (
        nextFollowUpDate &&
        nextFollowUpTime
      ) {
        const followUpAt =
          new Date(
            `${nextFollowUpDate}T${nextFollowUpTime}`
          );

        if (
          Number.isNaN(
            followUpAt.getTime()
          )
        ) {
          setErrorMessage(
            "Please enter a valid follow-up date and time."
          );

          return false;
        }
      }

      // Same service can be selected multiple times
      // for the same lead. Backend now creates a
      // separate lead-service selection record for
      // every selection.
      for (const asset of assets) {
        if (
          asset.measurement <= 0
        ) {
          setErrorMessage(
            asset.assetType ===
              "ESCALATOR"
              ? "Escalator rise must be greater than 0 meters."
              : "No. of floors served must be greater than 0."
          );

          return false;
        }

        if (!asset.assetCategory) {
          setErrorMessage(
            "No pricing category found for this asset."
          );

          return false;
        }

        if (asset.quantity <= 0) {
          setErrorMessage(
            "Quantity / Units must be greater than 0."
          );

          return false;
        }

        if (
          asset.services.length ===
          0
        ) {
          setErrorMessage(
            "Please select at least one service for every asset."
          );

          return false;
        }

        for (const selected of asset.services) {
          const service =
            services.find(
              (item) =>
                item.id ===
                selected.serviceId
            );

          if (!service) {
            setErrorMessage(
              "Selected service was not found."
            );

            return false;
          }

          const rule =
            findPricingRule(
              service,
              asset.assetCategory,
              asset.quantity
            );

          if (!rule) {
            setErrorMessage(
              `No pricing is configured for ${service.name} in ${asset.assetCategory}.`
            );

            return false;
          }
        }
      }

      return true;
    };

  // ==========================================================
  // SAVE LEAD SERVICE SELECTIONS
  // ==========================================================

  async function saveLeadServiceSelections(
    leadId: string
  ) {
    const currentSelectionIds =
      new Set<string>();

    // --------------------------------------------------------
    // ADD / UPDATE
    // --------------------------------------------------------

    for (const asset of assets) {
      for (const selected of asset.services) {
        const service =
          services.find(
            (item) =>
              item.id ===
              selected.serviceId
          );

        if (!service) {
          throw new Error(
            `Service not found: ${selected.serviceId}`
          );
        }

        const rule =
          findPricingRule(
            service,
            asset.assetCategory,
            asset.quantity
          );

        if (!rule) {
          throw new Error(
            `No pricing rule found for ${service.name} in ${asset.assetCategory}.`
          );
        }

        const pricingRuleId =
          String(
            rule.id || ""
          ).trim();

        if (!pricingRuleId) {
          throw new Error(
            `Pricing rule ID is missing for ${service.name}.`
          );
        }

        if (
          selected.existingSelectionId
        ) {
          currentSelectionIds.add(
            selected.existingSelectionId
          );

          await leadService.updateServiceSelection(
            leadId,
            selected.existingSelectionId,
            {
              pricingRuleId,
              quantity:
                asset.quantity,
              notes:
                selected.notes.trim() ||
                undefined,
            }
          );
        } else {
          await leadService.addServiceSelection(
            leadId,
            {
              serviceId:
                service.id,

              pricingRuleId,

              quantity:
                asset.quantity,

              notes:
                selected.notes.trim() ||
                undefined,
            }
          );
        }
      }
    }

    // --------------------------------------------------------
    // DELETE REMOVED SELECTIONS
    // --------------------------------------------------------

    if (isEdit) {
      const selectionsToDelete =
        existingSelections.filter(
          (existing) =>
            !currentSelectionIds.has(
              existing.id
            )
        );

      for (const selection of selectionsToDelete) {
        await leadService.deleteServiceSelection(
          leadId,
          selection.id
        );
      }
    }

    // Refresh local snapshot
    const latestSelections =
      await leadService.getServiceSelections(
        leadId
      );

    setExistingSelections(
      latestSelections
    );
  }

  function getNextFollowUpAt():
    string | undefined {
    if (
      !nextFollowUpDate ||
      !nextFollowUpTime
    ) {
      return undefined;
    }

    const value =
      new Date(
        `${nextFollowUpDate}T${nextFollowUpTime}`
      );

    if (
      Number.isNaN(
        value.getTime()
      )
    ) {
      return undefined;
    }

    return value.toISOString();
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================

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
      if (
        isEdit &&
        initialLead
      ) {
        const updateData =
          {
            associationName:
              associationName.trim(),

            contactName:
              contactName.trim(),

            email:
              email.trim() ||
              undefined,

            mobile:
              mobile.trim() ||
              undefined,

            source:
              source.trim() ||
              undefined,

            notes:
              notes.trim() ||
              undefined,

            status,

            customerType:
              customerType.trim() ||
              undefined,

            address:
              address.trim() ||
              undefined,

            city:
              city.trim() ||
              undefined,

            state:
              state.trim() ||
              undefined,

            pincode:
              pincode.trim() ||
              undefined,

            nextFollowUpAt:
              getNextFollowUpAt(),

            followUpRemarks:
              followUpRemarks.trim() ||
              undefined,

            nextAction:
              nextAction.trim() ||
              undefined,

          } as UpdateLeadInput & {
            customerType?: string;
            address?: string;
            city?: string;
            state?: string;
            pincode?: string;
            nextFollowUpAt?: string;
            followUpRemarks?: string;
            nextAction?: string;
          };

        const updatedLead =
          await leadService.updateLead(
            initialLead.id,
            updateData
          );

        // ----------------------------------------------------
        // ADMIN BDE ASSIGNMENT
        // ----------------------------------------------------
        // Only Admin can change lead assignment.
        // BDE edit requests do not send assignedToId,
        // so the existing BDE assignment remains unchanged.

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

        if (
          userIsAdmin &&
          !assignedToId &&
          initialLead.assignedToId
        ) {
          throw new Error(
            "BDE unassignment is not available from the current CRM API. Please keep the existing BDE assignment."
          );
        }

        // ----------------------------------------------------
        // SAVE SERVICES
        // ----------------------------------------------------

        await saveLeadServiceSelections(
          initialLead.id
        );
        leadService.notifyChange();

        setSuccessToast(
          `Lead ${updatedLead.id} updated successfully.`
        );
      } else {
        const createData =
          {
            associationName:
              associationName.trim(),

            contactName:
              contactName.trim(),

            email:
              email.trim() ||
              undefined,

            mobile:
              mobile.trim() ||
              undefined,

            source:
              source.trim() ||
              undefined,

            notes:
              notes.trim() ||
              undefined,

            customerType:
              customerType.trim() ||
              undefined,

            address:
              address.trim() ||
              undefined,

            city:
              city.trim() ||
              undefined,

            state:
              state.trim() ||
              undefined,

            pincode:
              pincode.trim() ||
              undefined,

            nextFollowUpAt:
              getNextFollowUpAt(),

            followUpRemarks:
              followUpRemarks.trim() ||
              undefined,

            nextAction:
              nextAction.trim() ||
              undefined,

          } as CreateLeadInput & {
            customerType?: string;
            address?: string;
            city?: string;
            state?: string;
            pincode?: string;
            nextFollowUpAt?: string;
            followUpRemarks?: string;
            nextAction?: string;
          };

        if (
          userIsAdmin &&
          assignedToId
        ) {
          createData.assignedToId =
            assignedToId;
        }

        // ----------------------------------------------------
        // CREATE LEAD
        // ----------------------------------------------------

        const createdLead =
          await leadService.createLead(
            createData
          );

        // ----------------------------------------------------
        // SAVE SERVICES
        // ----------------------------------------------------

        if (assets.length > 0) {
          await saveLeadServiceSelections(
            createdLead.id
          );
        }
        leadService.notifyChange();

        setSuccessToast(
          `Lead created successfully with ID: ${createdLead.id}`
        );
      }

      setTimeout(() => {
        router.push(
          userIsBde
            ? "/bde/leads"
            : "/leads"
        );

        router.refresh();
      }, 1000);
    } catch (error: unknown) {
      console.error(
        "Failed to save lead:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An error occurred while saving the lead."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelRoute =
    userIsBde
      ? "/bde/leads"
      : "/leads";

  return (
    <div className="relative space-y-6">
      {successToast && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-theme-xl">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />

          <span className="font-medium">
            {successToast}
          </span>
        </div>
      )}

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
        <div className="space-y-6 lg:col-span-2">
          <Section
            title="Association / Customer Information"
            description="Basic customer and contact details"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Association / Organization Name"
                required
                value={associationName}
                onChange={
                  setAssociationName
                }
                placeholder="e.g. ABC Residents Welfare Association"
                className="sm:col-span-2"
              />

              <Input
                label="Contact Person Name"
                required
                value={contactName}
                onChange={
                  setContactName
                }
                placeholder="e.g. Rahul Sharma"
              />

              <Input
                label="Mobile Number"
                type="tel"
                value={mobile}
                onChange={setMobile}
                placeholder="e.g. +91 9876543210"
              />

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="e.g. contact@example.com"
                className="sm:col-span-2"
              />
            </div>
          </Section>

          <Section
            title="Customer Details"
            description="Customer type and contact address"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Customer Type
                </label>

                <select
                  value={customerType}
                  onChange={(e) =>
                    setCustomerType(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">
                    -- Select Customer Type --
                  </option>
                  <option value="Association">
                    Association
                  </option>
                  <option value="Society">
                    Society
                  </option>
                  <option value="Builder">
                    Builder
                  </option>
                  <option value="Commercial">
                    Commercial
                  </option>
                  <option value="Industrial">
                    Industrial
                  </option>
                  <option value="Government">
                    Government
                  </option>
                  <option value="Individual">
                    Individual
                  </option>
                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <Input
                label="Pincode"
                value={pincode}
                onChange={setPincode}
                placeholder="e.g. 201301"
              />

              <Input
                label="Address"
                value={address}
                onChange={setAddress}
                placeholder="Customer address"
                className="sm:col-span-2"
              />

              <Input
                label="City"
                value={city}
                onChange={setCity}
                placeholder="e.g. Noida"
              />

              <Input
                label="State"
                value={state}
                onChange={setState}
                placeholder="e.g. Uttar Pradesh"
              />
            </div>
          </Section>

          <Section
            title="Follow-up & Next Action"
            description="Plan the next sales follow-up"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Next Follow-up Date"
                type="date"
                value={nextFollowUpDate}
                onChange={setNextFollowUpDate}
              />

              <Input
                label="Next Follow-up Time"
                type="time"
                value={nextFollowUpTime}
                onChange={setNextFollowUpTime}
              />

              <Input
                label="Next Action"
                value={nextAction}
                onChange={setNextAction}
                placeholder="e.g. Call customer / Schedule site visit"
                className="sm:col-span-2"
              />

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Follow-up Remarks
                </label>

                <textarea
                  rows={3}
                  value={followUpRemarks}
                  onChange={(e) =>
                    setFollowUpRemarks(
                      e.target.value
                    )
                  }
                  placeholder="Add follow-up remarks..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
                />
              </div>
            </div>
          </Section>

          <Section
            title="Lead Source"
            description="Select where this lead came from"
          >
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Acquisition Source
            </label>

            <select
              value={source}
              onChange={(e) =>
                setSource(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="">
                -- Select Source --
              </option>

              {leadSources.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </Section>

          <Section
            title="Assets, Services & Pricing"
            description="Add assets, select services and calculate pricing from configured service rates."
            action={
              <button
                type="button"
                onClick={addAsset}
                disabled={
                  loadingServices
                }
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add Asset
              </button>
            }
          >
            {loadingServices ||
              loadingSelections ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                {loadingSelections
                  ? "Loading saved lead services..."
                  : "Loading services and pricing..."}
              </div>
            ) : assets.length ===
              0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <p className="text-sm text-gray-500">
                  No assets added yet.
                </p>

                <button
                  type="button"
                  onClick={addAsset}
                  className="mt-3 text-sm font-semibold text-gray-900 underline"
                >
                  Add first asset
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {assets.map(
                  (
                    asset,
                    index
                  ) => {
                    const compatibleServices =
                      getServicesForAsset(
                        services,
                        asset
                      );

                    const assetTotals =
                      getAssetTotals(
                        asset
                      );

                    return (
                      <div
                        key={
                          asset.tempId
                        }
                        className="rounded-xl border border-gray-200 bg-gray-50 p-5"
                      >
                        <div className="mb-5 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Asset{" "}
                              {index +
                                1}
                            </h3>

                            <p className="mt-0.5 text-xs text-gray-500">
                              {getAssetTypeLabel(
                                asset.assetType
                              )}{" "}
                              •{" "}
                              {asset.assetCategory ||
                                "No category"}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeAsset(
                                asset.tempId
                              )
                            }
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                              Asset Type
                            </label>

                            <select
                              value={
                                asset.assetType
                              }
                              onChange={(
                                e
                              ) =>
                                changeAssetType(
                                  asset.tempId,
                                  e.target
                                    .value as AssetType
                                )
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                            >
                              <option value="LIFT">
                                Lift
                              </option>

                              <option value="ESCALATOR">
                                Escalator
                              </option>

                              <option value="OTHER">
                                Other
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                              {asset.assetType ===
                                "ESCALATOR"
                                ? "Rise (Meters)"
                                : "No. of Floors"}
                            </label>

                            <input
                              type="number"
                              min={
                                asset.assetType ===
                                  "ESCALATOR"
                                  ? 0.1
                                  : 1
                              }
                              step={
                                asset.assetType ===
                                  "ESCALATOR"
                                  ? 0.1
                                  : 1
                              }
                              value={
                                asset.measurement
                              }
                              onChange={(
                                e
                              ) =>
                                changeMeasurement(
                                  asset.tempId,
                                  e.target
                                    .value
                                )
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                              Quantity / Units
                            </label>

                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={
                                asset.quantity
                              }
                              onChange={(
                                e
                              ) =>
                                changeQuantity(
                                  asset.tempId,
                                  e.target
                                    .value
                                )
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                            />
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                          <p className="text-xs text-blue-700">
                            Pricing Category
                          </p>

                          <p className="mt-1 text-sm font-semibold text-blue-900">
                            {asset.assetCategory ||
                              "No matching category"}
                          </p>

                          <p className="mt-1 text-xs text-blue-700">
                            Category and price update automatically from the selected{" "}
                            {asset.assetType ===
                              "ESCALATOR"
                              ? "rise"
                              : "floor count"}
                            .
                          </p>
                        </div>

                        <div className="mt-5 border-t border-gray-200 pt-5">
                          <div className="mb-3">
                            <h4 className="text-sm font-semibold text-gray-900">
                              Services
                            </h4>

                            <p className="mt-1 text-xs text-gray-500">
                              Select one or more services for this asset.
                            </p>
                          </div>

                          {compatibleServices.length ===
                            0 ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                              No service is configured for this pricing category.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              {compatibleServices.map(
                                (
                                  service
                                ) => {
                                  const selected =
                                    asset.services.some(
                                      (
                                        item
                                      ) =>
                                        item.serviceId ===
                                        service.id
                                    );

                                  const rule =
                                    findPricingRule(
                                      service,
                                      asset.assetCategory,
                                      asset.quantity
                                    );

                                  const amount =
                                    getAmount(
                                      rule,
                                      asset.quantity
                                    );

                                  const selectedDraft =
                                    asset.services.find(
                                      (
                                        item
                                      ) =>
                                        item.serviceId ===
                                        service.id
                                    );

                                  return (
                                    <div
                                      key={
                                        service.id
                                      }
                                      className={`rounded-lg border p-4 ${selected
                                          ? "border-brand-500 bg-brand-50/50"
                                          : "border-gray-200 bg-white"
                                        }`}
                                    >
                                      <label className="flex cursor-pointer gap-3">
                                        <input
                                          type="checkbox"
                                          checked={
                                            selected
                                          }
                                          onChange={() =>
                                            toggleService(
                                              asset.tempId,
                                              service.id
                                            )
                                          }
                                          className="mt-1 h-4 w-4"
                                        />

                                        <div className="min-w-0 flex-1">
                                          <div className="flex justify-between gap-3">
                                            <p className="text-sm font-semibold text-gray-900">
                                              {service.code
                                                ? `${service.code} — `
                                                : ""}
                                              {
                                                service.name
                                              }
                                            </p>

                                            {rule && (
                                              <span className="shrink-0 text-sm font-bold text-gray-900">
                                                {formatCurrency(
                                                  amount.total
                                                )}
                                              </span>
                                            )}
                                          </div>

                                          {service.description && (
                                            <p className="mt-1 text-xs text-gray-500">
                                              {
                                                service.description
                                              }
                                            </p>
                                          )}

                                          {rule && (
                                            <p className="mt-2 text-xs text-gray-600">
                                              Unit:{" "}
                                              {formatCurrency(
                                                safeNumber(
                                                  rule.unitRate
                                                )
                                              )}{" "}
                                              • GST:{" "}
                                              {safeNumber(
                                                rule.gstPercent
                                              )}
                                              %
                                            </p>
                                          )}
                                        </div>
                                      </label>

                                      {selected && (
                                        <div className="mt-3">
                                          <label className="mb-1.5 block text-xs font-medium text-gray-700">
                                            Service Notes
                                          </label>

                                          <textarea
                                            rows={
                                              2
                                            }
                                            value={
                                              selectedDraft?.notes ||
                                              ""
                                            }
                                            onChange={(
                                              e
                                            ) =>
                                              changeServiceNotes(
                                                asset.tempId,
                                                service.id,
                                                e.target
                                                  .value
                                              )
                                            }
                                            placeholder="Optional service notes..."
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                                          />

                                          {rule && (
                                            <div className="mt-2 flex justify-between text-xs text-gray-500">
                                              <span>
                                                Base:{" "}
                                                {formatCurrency(
                                                  amount.base
                                                )}
                                              </span>

                                              <span>
                                                GST:{" "}
                                                {formatCurrency(
                                                  amount.gst
                                                )}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-5 rounded-lg bg-gray-900 p-4 text-white">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-gray-400">
                                Base
                              </p>

                              <p className="mt-1 font-semibold">
                                {formatCurrency(
                                  assetTotals.base
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-400">
                                GST
                              </p>

                              <p className="mt-1 font-semibold">
                                {formatCurrency(
                                  assetTotals.gst
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-400">
                                Total
                              </p>

                              <p className="mt-1 text-lg font-bold">
                                {formatCurrency(
                                  assetTotals.total
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {assets.length > 0 && (
              <div className="mt-6 rounded-xl bg-gray-900 p-5 text-white">
                <p className="text-xs text-gray-400">
                  Total Estimate
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {formatCurrency(
                    grandTotals.total
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Base{" "}
                  {formatCurrency(
                    grandTotals.base
                  )}{" "}
                  + GST{" "}
                  {formatCurrency(
                    grandTotals.gst
                  )}
                </p>
              </div>
            )}
          </Section>

          <Section
            title="Lead Notes"
            description="Customer requirements and sales remarks"
          >
            <textarea
              rows={5}
              value={notes}
              onChange={(e) =>
                setNotes(
                  e.target.value
                )
              }
              placeholder="Add customer requirements, discussion notes, expected services, commercial remarks, or follow-up information..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
            />
          </Section>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
            <h3 className="mb-4 border-b border-gray-100 pb-3 text-base font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">
              Workflow
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Lead Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target
                        .value as LeadStatus
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                >
                  {leadStatuses.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {
                          statusLabels[
                          item
                          ]
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {userIsAdmin && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Assigned BDE
                  </label>

                  <select
                    value={
                      assignedToId
                    }
                    onChange={(e) =>
                      setAssignedToId(
                        e.target.value
                      )
                    }
                    disabled={
                      loadingBdes
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none disabled:opacity-60 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <option value="">
                      {loadingBdes
                        ? "Loading BDEs..."
                        : "-- Unassigned --"}
                    </option>

                    {bdesList.map(
                      (bde) => (
                        <option
                          key={bde.id}
                          value={bde.id}
                        >
                          {getBdeName(
                            bde
                          )}
                        </option>
                      )
                    )}
                  </select>

                  {selectedBde && (
                    <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2">
                      <p className="text-[11px] font-semibold text-emerald-700">
                        Assigned to
                      </p>

                      <p className="mt-0.5 text-xs font-medium text-emerald-800">
                        {getBdeName(
                          selectedBde
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {userIsBde && (
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                    Lead Ownership
                  </p>

                  <p className="mt-1 text-xs leading-5 text-brand-700">
                    This lead will automatically be assigned to your BDE account.
                  </p>
                </div>
              )}

              {isEdit &&
                initialLead && (
                  <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                    <div className="flex justify-between gap-3 py-1">
                      <span>
                        Record ID:
                      </span>

                      <span className="break-all text-right font-mono font-bold text-gray-800">
                        {
                          initialLead.id
                        }
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 py-1">
                      <span>
                        Created:
                      </span>

                      <span className="font-semibold text-gray-800">
                        {new Date(
                          initialLead.createdAt
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 py-1">
                      <span>
                        Updated:
                      </span>

                      <span className="font-semibold text-gray-800">
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

            <div className="mt-6 space-y-2.5 border-t border-gray-100 pt-4">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={
                  isSubmitting
                }
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

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 p-5 shadow-theme-xs">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                Lead Preview
              </span>

              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600">
                {isEdit
                  ? initialLead?.id ||
                  "EDIT"
                  : "NEW"}
              </span>
            </div>

            <h4 className="truncate text-base font-bold text-gray-900">
              {associationName ||
                "Association / Organization"}
            </h4>

            <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs">
              <PreviewRow
                label="Contact"
                value={
                  contactName ||
                  "Contact Person"
                }
              />

              <PreviewRow
                label="Email"
                value={
                  email ||
                  "Not provided"
                }
              />

              <PreviewRow
                label="Mobile"
                value={
                  mobile ||
                  "Not provided"
                }
              />

              <PreviewRow
                label="Source"
                value={
                  source ||
                  "Not selected"
                }
              />

              <PreviewRow
                label="Customer Type"
                value={
                  customerType ||
                  "Not selected"
                }
              />

              <PreviewRow
                label="City"
                value={
                  city ||
                  "Not provided"
                }
              />

              <PreviewRow
                label="Next Action"
                value={
                  nextAction ||
                  "Not planned"
                }
              />

              <PreviewRow
                label="Status"
                value={
                  statusLabels[
                  status
                  ]
                }
              />

              {nextFollowUpDate && (
                <PreviewRow
                  label="Follow-up"
                  value={
                    `${nextFollowUpDate}${nextFollowUpTime
                      ? ` ${nextFollowUpTime}`
                      : ""
                    }`
                  }
                />
              )}

              <PreviewRow
                label="BDE"
                value={
                  userIsBde
                    ? "You"
                    : getBdeName(
                      selectedBde
                    ) ||
                    "Unassigned"
                }
              />

              {assets.length >
                0 && (
                  <>
                    <PreviewRow
                      label="Assets"
                      value={String(
                        assets.length
                      )}
                    />

                    <PreviewRow
                      label="Estimate"
                      value={formatCurrency(
                        grandTotals.total
                      )}
                    />
                  </>
                )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h3>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>

        {action}
      </div>

      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
        {label}{" "}
        {required && (
          <span className="text-error-500">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white"
      />
    </div>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3 text-gray-600">
      <span>
        {label}:
      </span>

      <span className="max-w-[170px] truncate text-right font-semibold text-gray-800">
        {value}
      </span>
    </div>
  );
}