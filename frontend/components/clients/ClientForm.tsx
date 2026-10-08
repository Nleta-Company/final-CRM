"use client";

import React, {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  ClientItem,
  CreateClientInput,
  ClientType,
  ClientContractStatus,
} from "@/types/client";

import {
  ClientServiceSelection,
} from "@/types/clientServiceSelection";

import {
  ServiceItem,
  ServicePricingRule,
} from "@/types/service";

import { serviceService } from "@/services/serviceService";
import { clientService } from "@/services/clientService";
import {
  clientServiceSelectionService,
} from "@/services/clientServiceSelectionService";

import Button from "@/components/ui/Button";

// ============================================================
// TYPES
// ============================================================

interface ClientFormProps {
  initialClient?: ClientItem;
  isEdit?: boolean;
}

type AssetType =
  | "LIFT"
  | "ESCALATOR"
  | "OTHER";

interface AssetServiceDraft {
  tempId: string;
  serviceId: string;
  notes: string;
  existingSelectionId?: string;
}

interface AssetSelectionDraft {
  tempId: string;
  assetType: AssetType;
  assetCategory: string;
  floorsServed: number;
  quantity: number;
  services: AssetServiceDraft[];
}

// ============================================================
// CLIENT OPTIONS
// ============================================================

const clientTypes: ClientType[] = [
  "Commercial Real Estate",
  "Hospitality",
  "Healthcare",
  "Government / Transit",
  "Residential RWA",
  "Industrial & Logistics",
];

const contractStatuses: ClientContractStatus[] = [
  "Active Agreement",
  "Pending Renewal",
  "Under Audit",
  "Expired",
  "Onboarding",
];

// ============================================================
// COMMON HELPERS
// ============================================================

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(
    Number.isFinite(value) ? value : 0
  );
}

function safeNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function getPricingBasis(
  rule?: ServicePricingRule
) {
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

// ============================================================
// ASSET TYPE
// ============================================================

function getAssetType(
  assetCategory?: string | null
): AssetType {
  const category = String(
    assetCategory || ""
  )
    .trim()
    .toLowerCase();

  // ----------------------------------------------------------
  // ESCALATOR
  // Includes:
  // - Escalator
  // - Heavy Duty
  // - Heavy-Duty
  // - Heavy_Duty
  // ----------------------------------------------------------
  if (
    category.includes("escalator") ||
    category.includes("heavy duty") ||
    category.includes("heavy-duty") ||
    category.includes("heavy_duty")
  ) {
    return "ESCALATOR";
  }

  // ----------------------------------------------------------
  // LIFT
  // ----------------------------------------------------------
  if (
    category.includes("lift") ||
    category.includes("elevator")
  ) {
    return "LIFT";
  }

  return "OTHER";
}

function getAssetTypeLabel(
  assetType: AssetType
) {
  switch (assetType) {
    case "LIFT":
      return "Lift";

    case "ESCALATOR":
      return "Escalator";

    default:
      return "Other";
  }
}

// ============================================================
// FLOOR / RISE HELPERS
// ============================================================

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
    /(\d+)\s*to\s*(\d+)\s*floor/
  );

  if (match) {
    return {
      min: Number(match[1]),
      max: Number(match[2]),
    };
  }

  match = text.match(
    /(\d+)\s*-\s*(\d+)/
  );

  if (
    match &&
    text.includes("floor")
  ) {
    return {
      min: Number(match[1]),
      max: Number(match[2]),
    };
  }

  return undefined;
}

function getRiseRange(
  category?: string | null
) {
  const text = String(
    category || ""
  )
    .toLowerCase()
    .replace(/–/g, "-")
    .replace(/—/g, "-");

  // Examples supported:
  // "Up to 4.5 m Rise"
  // "Up to 7.0 m Rise"
  const upToMatch = text.match(
    /up\s*to\s*(\d+(?:\.\d+)?)\s*m/
  );

  if (upToMatch) {
    return {
      min: 0,
      max: Number(upToMatch[1]),
    };
  }

  // Examples:
  // "4.5 - 7.0 m"
  // "4.5 to 7.0 m"
  const rangeMatch = text.match(
    /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*m/
  );

  if (rangeMatch) {
    return {
      min: Number(rangeMatch[1]),
      max: Number(rangeMatch[2]),
    };
  }

  // Examples:
  // "Above 4.5 m"
  // "More than 4.5 m"
  const aboveMatch = text.match(
    /(?:above|over|more\s*than)\s*(\d+(?:\.\d+)?)\s*m/
  );

  if (aboveMatch) {
    return {
      min: Number(aboveMatch[1]) + 0.000001,
      max: Infinity,
    };
  }

  return undefined;
}

function categoryMatchesFloors(
  category: string,
  floors: number
) {
  const range =
    getFloorRange(category);

  if (!range) {
    return false;
  }

  return (
    floors >= range.min &&
    floors <= range.max
  );
}

function categoryMatchesRise(
  category: string,
  rise: number
) {
  const range =
    getRiseRange(category);

  if (!range) {
    return false;
  }

  return (
    rise >= range.min &&
    rise <= range.max
  );
}

// ============================================================
// CATEGORY HELPERS
// ============================================================

function getCategoryRules(
  service?: ServiceItem
) {
  if (!service) {
    return [];
  }

  const unique = new Map<
    string,
    ServicePricingRule
  >();

  for (
    const rule of
      service.pricingRules || []
  ) {
    const category = String(
      rule.assetCategory || ""
    ).trim();

    if (!category) {
      continue;
    }

    if (!unique.has(category)) {
      unique.set(
        category,
        rule
      );
    }
  }

  return Array.from(
    unique.values()
  );
}

function getCategoriesForAssetType(
  service: ServiceItem | undefined,
  assetType: AssetType
) {
  return getCategoryRules(
    service
  ).filter(
    (rule) =>
      getAssetType(
        rule.assetCategory
      ) === assetType
  );
}

function getAvailableAssetTypes(
  services: ServiceItem[]
): AssetType[] {
  const types =
    new Set<AssetType>();

  for (
    const service of services
  ) {
    for (
      const rule of
        service.pricingRules || []
    ) {
      if (!rule.assetCategory) {
        continue;
      }

      types.add(
        getAssetType(
          rule.assetCategory
        )
      );
    }
  }

  return Array.from(types);
}

function serviceSupportsAssetType(
  service: ServiceItem,
  assetType: AssetType
) {
  return (
    getCategoriesForAssetType(
      service,
      assetType
    ).length > 0
  );
}

// ============================================================
// FIND CATEGORY
// ============================================================

function getAllCategoriesForAssetType(
  services: ServiceItem[],
  assetType: AssetType
) {
  const unique = new Map<
    string,
    ServicePricingRule
  >();

  for (const service of services) {
    for (const rule of getCategoriesForAssetType(
      service,
      assetType
    )) {
      const category = String(
        rule.assetCategory || ""
      ).trim();

      if (!category) {
        continue;
      }

      if (!unique.has(category)) {
        unique.set(category, rule);
      }
    }
  }

  return Array.from(unique.values());
}

function findCategoryForAssetMeasurement(
  services: ServiceItem[],
  assetType: AssetType,
  measurement: number
) {
  const categories =
    getAllCategoriesForAssetType(
      services,
      assetType
    );

  if (categories.length === 0) {
    return "";
  }

  const normalizedMeasurement =
    Math.max(
      safeNumber(measurement),
      0
    );

  // ==========================================================
  // ESCALATOR
  // ==========================================================
  //
  // Pricing category is selected ONLY from the rise entered by
  // the user. We do not force Heavy Duty for every escalator.
  //
  // Example:
  //   0 - 4.5 m  -> Commercial Escalator
  //   > 4.5 m    -> Heavy Duty / next configured category
  //
  // The actual category names/ranges come from the configured
  // service pricing rules.
  // ==========================================================

  if (assetType === "ESCALATOR") {
    // 1. First find the configured rise range that contains the
    // entered measurement. This handles 4.5m and anything below.
    // More than one category can match the same rise.
    // Example: 4.2m matches both "Up to 4.5m" and
    // "Up to 7.0m". Always choose the SMALLEST matching
    // range so 4.2m uses Commercial, not Heavy Duty.
    const matchingCategories =
      categories
        .map((rule) => ({
          rule,
          range: getRiseRange(
            String(rule.assetCategory || "")
          ),
        }))
        .filter(
          (item) =>
            !!item.range &&
            normalizedMeasurement >=
              item.range.min &&
            normalizedMeasurement <=
              item.range.max
        )
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

    const matching =
      matchingCategories[0]?.rule;

    if (matching) {
      return String(
        matching.assetCategory || ""
      );
    }

    // 2. If the entered rise is above all configured numeric
    // ranges, use the configured open-ended category.
    // Usually this is Heavy Duty. We intentionally do NOT use
    // Heavy Duty when the rise already matched Commercial.
    const ranges = categories
      .map((rule) => ({
        rule,
        range: getRiseRange(
          String(rule.assetCategory || "")
        ),
      }))
      .filter(
        (item) => !!item.range
      );

    const highestConfiguredRise =
      ranges.reduce(
        (max, item) =>
          Math.max(
            max,
            item.range?.max || 0
          ),
        0
      );

    if (
      normalizedMeasurement >
      highestConfiguredRise
    ) {
      // Prefer Heavy Duty when it is configured.
      const heavyDuty =
        categories.find((rule) => {
          const category = String(
            rule.assetCategory || ""
          )
            .trim()
            .toLowerCase();

          return (
            category.includes("heavy duty") ||
            category.includes("heavy-duty") ||
            category.includes("heavy_duty")
          );
        });

      if (heavyDuty) {
        return String(
          heavyDuty.assetCategory || ""
        );
      }

      // If the project uses another name for the open-ended
      // category, use a category without a numeric rise range.
      const noRangeCategory =
        categories.find(
          (rule) =>
            !getRiseRange(
              String(
                rule.assetCategory || ""
              )
            )
        );

      if (noRangeCategory) {
        return String(
          noRangeCategory.assetCategory || ""
        );
      }
    }

    // 3. If no category matches, return empty instead of showing
    // an incorrect pricing category.
    return "";
  }

  // ==========================================================
  // LIFT / OTHER
  // ==========================================================

  const matching =
    categories.find((rule) =>
      categoryMatchesFloors(
        String(rule.assetCategory || ""),
        normalizedMeasurement
      )
    );

  if (matching) {
    return String(
      matching.assetCategory || ""
    );
  }

  const fallback =
    categories.find(
      (rule) =>
        !getFloorRange(
          String(
            rule.assetCategory || ""
          )
        )
    );

  return String(
    fallback?.assetCategory ||
      categories[0]?.assetCategory ||
      ""
  );
}

function serviceSupportsAssetCategory(
  service: ServiceItem,
  assetType: AssetType,
  assetCategory: string
) {
  if (!assetCategory) {
    return false;
  }

  return getCategoriesForAssetType(
    service,
    assetType
  ).some(
    (rule) =>
      String(rule.assetCategory || "").trim() ===
      String(assetCategory || "").trim()
  );
}

// ============================================================
// PRICING
// ============================================================

function findPricingRuleForSelection(
  service: ServiceItem | undefined,
  assetCategory: string,
  quantity: number
) {
  if (!service) {
    return undefined;
  }

  const rules = (
    service.pricingRules || []
  ).filter(
    (rule) =>
      String(
        rule.assetCategory || ""
      ).trim() ===
      String(
        assetCategory || ""
      ).trim()
  );

  if (rules.length === 0) {
    return undefined;
  }

  const quantityRule =
    rules.find((rule) => {
      if (
        getPricingBasis(rule) !==
        "LIFT_COUNT"
      ) {
        return false;
      }

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
    });

  if (quantityRule) {
    return quantityRule;
  }

  return rules[0];
}

function getRuleAmount(
  rule:
    | ServicePricingRule
    | undefined,
  quantity: number
) {
  if (!rule) {
    return {
      baseAmount: 0,
      gstAmount: 0,
      totalAmount: 0,
    };
  }

  const unitRate =
    safeNumber(
      rule.unitRate
    );

  const gstPercent =
    safeNumber(
      rule.gstPercent
    );

  const safeQuantity =
    Math.max(
      safeNumber(quantity),
      0
    );

  const baseAmount =
    safeQuantity *
    unitRate;

  const gstAmount =
    (baseAmount *
      gstPercent) /
    100;

  return {
    baseAmount,
    gstAmount,
    totalAmount:
      baseAmount +
      gstAmount,
  };
}

// ============================================================
// COMPONENT
// ============================================================

export default function ClientForm({
  initialClient,
  isEdit = false,
}: ClientFormProps) {
  const router = useRouter();

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [loading, setLoading] =
    useState(false);

  const [
    loadingServices,
    setLoadingServices,
  ] = useState(true);

  const [
    loadingSelections,
    setLoadingSelections,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [successToast, setSuccessToast] =
    useState("");

  // ==========================================================
  // SERVICES / ASSETS
  // ==========================================================

  const [services, setServices] =
    useState<ServiceItem[]>([]);

  const [assets, setAssets] =
    useState<
      AssetSelectionDraft[]
    >([]);

  // ==========================================================
  // CLIENT FORM
  // ==========================================================

  const initialPincode =
    (
      initialClient as
        | (ClientItem & {
            pincode?: string | null;
          })
        | undefined
    )?.pincode;

  const [companyName, setCompanyName] =
    useState(
      initialClient?.companyName ||
        ""
    );

  const [clientType, setClientType] =
    useState<ClientType | "">(
      initialClient?.clientType ||
        ""
    );

  const [contactPerson, setContactPerson] =
    useState(
      initialClient?.contactPerson ||
        ""
    );

  const [contactEmail, setContactEmail] =
    useState(
      initialClient?.contactEmail ||
        ""
    );

  const [contactPhone, setContactPhone] =
    useState(
      initialClient?.contactPhone ||
        ""
    );

  const [address, setAddress] =
    useState(
      initialClient?.address ||
        ""
    );

  const [city, setCity] =
    useState(
      initialClient?.city ||
        ""
    );

  const [state, setState] =
    useState(
      initialClient?.state ||
        ""
    );

  const [pincode, setPincode] =
    useState(
      initialPincode || ""
    );

  const [contractStatus, setContractStatus] =
    useState<
      ClientContractStatus | ""
    >(
      initialClient?.contractStatus ||
        ""
    );

  const [notes, setNotes] =
    useState(
      initialClient?.notes ||
        ""
    );

  // ==========================================================
  // LOAD SERVICES
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    async function loadServices() {
      try {
        setLoadingServices(true);
        setError("");

        const result =
          await serviceService.getAllServices();

        if (!mounted) {
          return;
        }

        setServices(result);
      } catch (err: unknown) {
        console.error(
          "LOAD SERVICES ERROR:",
          err
        );

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load services."
          );
        }
      } finally {
        if (mounted) {
          setLoadingServices(false);
        }
      }
    }

    loadServices();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================================
  // LOAD EXISTING CLIENT SERVICES
  // ==========================================================

  useEffect(() => {
    if (
      !isEdit ||
      !initialClient?.id ||
      loadingServices ||
      services.length === 0
    ) {
      return;
    }

    let mounted = true;

    async function loadSelections() {
      try {
        setLoadingSelections(true);
        setError("");

        const response =
          await clientServiceSelectionService.getSelections(
            initialClient!.id
          );

        if (!mounted) {
          return;
        }

        const groups =
          new Map<
            string,
            AssetSelectionDraft
          >();

        for (
          const item of
            response.selections
        ) {
          const service =
            services.find(
              (serviceItem) =>
                serviceItem.id ===
                item.serviceId
            );

          if (!service) {
            continue;
          }

          const assetType =
            getAssetType(
              item.assetCategory
            );

          const groupKey =
            `${assetType}:${item.assetCategory}`;

          let group =
            groups.get(groupKey);

          if (!group) {
            const measurement =
              assetType ===
              "ESCALATOR"
                ? getRiseRange(
                    item.assetCategory
                  )?.min || 1
                : getFloorRange(
                    item.assetCategory
                  )?.min || 1;

            group = {
              tempId:
                `asset-${item.id}`,

              assetType,

              assetCategory:
                String(
                  item.assetCategory ||
                    ""
                ),

              floorsServed:
                measurement,

              quantity:
                safeNumber(
                  item.quantity
                ),

              services: [],
            };

            groups.set(
              groupKey,
              group
            );
          }

          group.services.push({
            tempId:
              `service-${item.id}`,

            serviceId:
              item.serviceId,

            notes:
              item.notes || "",

            existingSelectionId:
              item.id,
          });
        }

        setAssets(
          Array.from(
            groups.values()
          )
        );
      } catch (err: unknown) {
        console.error(
          "LOAD CLIENT SERVICES ERROR:",
          err
        );

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load client services."
          );
        }
      } finally {
        if (mounted) {
          setLoadingSelections(
            false
          );
        }
      }
    }

    loadSelections();

    return () => {
      mounted = false;
    };
  }, [
    isEdit,
    initialClient?.id,
    loadingServices,
    services,
  ]);

  // ==========================================================
  // SYNC CLIENT DATA
  // ==========================================================

  useEffect(() => {
    if (!initialClient) {
      return;
    }

    const clientPincode =
      (
        initialClient as ClientItem & {
          pincode?: string | null;
        }
      ).pincode;

    setCompanyName(
      initialClient.companyName ||
        ""
    );

    setClientType(
      initialClient.clientType ||
        ""
    );

    setContactPerson(
      initialClient.contactPerson ||
        ""
    );

    setContactEmail(
      initialClient.contactEmail ||
        ""
    );

    setContactPhone(
      initialClient.contactPhone ||
        ""
    );

    setAddress(
      initialClient.address ||
        ""
    );

    setCity(
      initialClient.city ||
        ""
    );

    setState(
      initialClient.state ||
        ""
    );

    setPincode(
      clientPincode || ""
    );

    setContractStatus(
      initialClient.contractStatus ||
        ""
    );

    setNotes(
      initialClient.notes ||
        ""
    );
  }, [initialClient]);

  // ==========================================================
  // ADD ASSET
  // ==========================================================

  function addAsset() {
    if (
      services.length === 0
    ) {
      setError(
        "No active service is available."
      );
      return;
    }

    const assetTypes =
      getAvailableAssetTypes(
        services
      );

    const assetType =
      assetTypes.includes("LIFT")
        ? "LIFT"
        : assetTypes.includes(
              "ESCALATOR"
            )
          ? "ESCALATOR"
          : assetTypes[0] ||
            "OTHER";

    const firstService =
      services.find(
        (service) =>
          serviceSupportsAssetType(
            service,
            assetType
          )
      ) || services[0];

    const measurement = 1;

    const assetCategory =
      findCategoryForAssetMeasurement(
        services,
        assetType,
        measurement
      );

    if (!assetCategory) {
      setError(
        "No asset category is available for this asset type."
      );
      return;
    }

    setError("");

    setAssets(
      (previous) => [
        ...previous,
        {
          tempId:
            `asset-${Date.now()}-${Math.random()}`,

          assetType,

          assetCategory,

          floorsServed:
            measurement,

          quantity: 1,

          services: [
            {
              tempId:
                `service-${Date.now()}-${Math.random()}`,

              serviceId:
                firstService.id,

              notes: "",
            },
          ],
        },
      ]
    );
  }

  // ==========================================================
  // REMOVE ASSET
  // ==========================================================

  function removeAsset(
    tempId: string
  ) {
    setAssets(
      (previous) =>
        previous.filter(
          (asset) =>
            asset.tempId !==
            tempId
        )
    );
  }

  // ==========================================================
  // UPDATE ASSET
  // ==========================================================

  function updateAsset(
    tempId: string,
    updates: Partial<AssetSelectionDraft>
  ) {
    setAssets(
      (previous) =>
        previous.map(
          (asset) =>
            asset.tempId ===
            tempId
              ? {
                  ...asset,
                  ...updates,
                }
              : asset
        )
    );
  }

  // ==========================================================
  // ASSET TYPE CHANGE
  // ==========================================================

  function handleAssetTypeChange(
    tempId: string,
    assetType: AssetType
  ) {
    const asset =
      assets.find(
        (item) =>
          item.tempId ===
          tempId
      );

    if (!asset) {
      return;
    }

    const compatibleServices =
      services.filter(
        (service) =>
          serviceSupportsAssetType(
            service,
            assetType
          )
      );

    const category =
      findCategoryForAssetMeasurement(
        services,
        assetType,
        asset.floorsServed
      );

    const compatibleExisting =
      asset.services.filter(
        (selected) => {
          const service =
            services.find(
              (item) =>
                item.id ===
                selected.serviceId
            );

          return (
            !!service &&
            serviceSupportsAssetCategory(
              service,
              assetType,
              category
            )
          );
        }
      );

    const nextServices =
      compatibleExisting.length > 0
        ? compatibleExisting
        : compatibleServices.length > 0
          ? [
              {
                tempId:
                  `service-${Date.now()}-${Math.random()}`,
                serviceId:
                  (
                    compatibleServices.find(
                      (service) =>
                        serviceSupportsAssetCategory(
                          service,
                          assetType,
                          category
                        )
                    ) ||
                    compatibleServices[0]
                  ).id,
                notes: "",
              },
            ]
          : [];

    setError("");

    updateAsset(
      tempId,
      {
        assetType,
        assetCategory: category,
        services: nextServices,
      }
    );
  }

  // ==========================================================
  // MEASUREMENT CHANGE
  // ==========================================================

  function handleMeasurementChange(
    tempId: string,
    value: string
  ) {
    const asset =
      assets.find(
        (item) =>
          item.tempId ===
          tempId
      );

    if (!asset) {
      return;
    }

    const measurement =
      Math.max(
        safeNumber(value),
        0
      );

    // IMPORTANT:
    // Category is selected from ALL configured pricing rules,
    // not only from the currently selected service.
    //
    // Example:
    // 4.0 m  -> Commercial Escalator (Up to 4.5 m Rise)
    // 7.0 m  -> Heavy Duty
    const category =
      findCategoryForAssetMeasurement(
        services,
        asset.assetType,
        measurement
      );

    // Keep only services that actually have pricing for the
    // newly selected category. If the current service does not,
    // automatically select the first compatible service.
    const compatibleServices =
      services.filter(
        (service) =>
          serviceSupportsAssetCategory(
            service,
            asset.assetType,
            category
          )
      );

    const existingCompatible =
      asset.services.filter(
        (selected) => {
          const service =
            services.find(
              (item) =>
                item.id ===
                selected.serviceId
            );

          return (
            !!service &&
            serviceSupportsAssetCategory(
              service,
              asset.assetType,
              category
            )
          );
        }
      );

    let nextServices =
      existingCompatible;

    if (
      nextServices.length === 0 &&
      compatibleServices.length > 0
    ) {
      nextServices = [
        {
          tempId:
            `service-${Date.now()}-${Math.random()}`,
          serviceId:
            compatibleServices[0].id,
          notes: "",
        },
      ];
    }

    updateAsset(
      tempId,
      {
        floorsServed:
          measurement,

        assetCategory:
          category,

        services:
          nextServices,
      }
    );
  }

  // ==========================================================
  // QUANTITY
  // ==========================================================

  function handleQuantityChange(
    tempId: string,
    value: string
  ) {
    const quantity =
      Math.max(
        Math.floor(
          safeNumber(value)
        ),
        0
      );

    updateAsset(
      tempId,
      {
        quantity,
      }
    );
  }

  // ==========================================================
  // SERVICE TOGGLE
  // ==========================================================

  function toggleService(
    assetId: string,
    serviceId: string
  ) {
    const asset =
      assets.find(
        (item) =>
          item.tempId ===
          assetId
      );

    if (!asset) {
      return;
    }

    const service =
      services.find(
        (item) =>
          item.id ===
          serviceId
      );

    if (
      !service ||
      !serviceSupportsAssetType(
        service,
        asset.assetType
      )
    ) {
      setError(
        `${
          service?.name ||
          "This service"
        } is not available for ${getAssetTypeLabel(
          asset.assetType
        )}.`
      );

      return;
    }

    const alreadySelected =
      asset.services.some(
        (item) =>
          item.serviceId ===
          serviceId
      );

    if (alreadySelected) {
      if (
        asset.services.length ===
        1
      ) {
        setError(
          "At least one service must be selected for each asset."
        );

        return;
      }

      setError("");

      updateAsset(
        assetId,
        {
          services:
            asset.services.filter(
              (item) =>
                item.serviceId !==
                serviceId
            ),
        }
      );

      return;
    }

    setError("");

    updateAsset(
      assetId,
      {
        services: [
          ...asset.services,
          {
            tempId:
              `service-${Date.now()}-${Math.random()}`,

            serviceId,

            notes: "",
          },
        ],
      }
    );
  }

  // ==========================================================
  // SERVICE NOTES
  // ==========================================================

  function updateServiceNotes(
    assetId: string,
    serviceId: string,
    notes: string
  ) {
    setAssets(
      (previous) =>
        previous.map(
          (asset) => {
            if (
              asset.tempId !==
              assetId
            ) {
              return asset;
            }

            return {
              ...asset,

              services:
                asset.services.map(
                  (service) =>
                    service.serviceId ===
                    serviceId
                      ? {
                          ...service,
                          notes,
                        }
                      : service
                ),
            };
          }
        )
    );
  }

  // ==========================================================
  // NORMALIZE ASSET
  // ==========================================================

  function normalizeAsset(
    asset: AssetSelectionDraft
  ) {
    // IMPORTANT:
    // Existing BDE selections already contain the exact
    // assetCategory that was saved with the service selection.
    // Do NOT recalculate that category from floors/rise here.
    //
    // This was causing "Heavy Duty" escalators to become the
    // first normal escalator category when Admin opened Edit,
    // because Heavy Duty has no numeric rise range and the old
    // loader defaulted its measurement to 1.
    //
    // Only calculate a category when one is actually missing.
    if (String(asset.assetCategory || "").trim()) {
      return asset;
    }

    const category =
      findCategoryForAssetMeasurement(
        services,
        asset.assetType,
        asset.floorsServed
      );

    return {
      ...asset,
      assetCategory:
        category ||
        asset.assetCategory,
    };
  }

  // ==========================================================
  // SERVICE AMOUNT
  // ==========================================================

  function getServiceAmount(
    asset: AssetSelectionDraft,
    serviceId: string
  ) {
    const service =
      services.find(
        (item) =>
          item.id ===
          serviceId
      );

    const rule =
      findPricingRuleForSelection(
        service,
        asset.assetCategory,
        asset.quantity
      );

    return getRuleAmount(
      rule,
      asset.quantity
    );
  }

  // ==========================================================
  // TOTALS
  // ==========================================================

  const totals = useMemo(() => {
    return assets.reduce(
      (
        summary,
        asset
      ) => {
        const assetTotal =
          asset.services.reduce(
            (
              serviceSummary,
              selectedService
            ) => {
              const amount =
                getServiceAmount(
                  asset,
                  selectedService.serviceId
                );

              return {
                baseAmount:
                  serviceSummary.baseAmount +
                  amount.baseAmount,

                gstAmount:
                  serviceSummary.gstAmount +
                  amount.gstAmount,

                totalAmount:
                  serviceSummary.totalAmount +
                  amount.totalAmount,
              };
            },
            {
              baseAmount: 0,
              gstAmount: 0,
              totalAmount: 0,
            }
          );

        return {
          baseAmount:
            summary.baseAmount +
            assetTotal.baseAmount,

          gstAmount:
            summary.gstAmount +
            assetTotal.gstAmount,

          totalAmount:
            summary.totalAmount +
            assetTotal.totalAmount,
        };
      },
      {
        baseAmount: 0,
        gstAmount: 0,
        totalAmount: 0,
      }
    );
  }, [
    assets,
    services,
  ]);

  const totalAssetUnits =
    useMemo(
      () =>
        assets.reduce(
          (
            total,
            asset
          ) =>
            total +
            safeNumber(
              asset.quantity
            ),
          0
        ),
      [assets]
    );

  // ==========================================================
  // VALIDATION
  // ==========================================================

  function validateForm() {
    if (
      !companyName.trim()
    ) {
      return "Company / Organization Name is required.";
    }

    if (!clientType) {
      return "Please select an industry / facility classification.";
    }

    if (
      !contactPerson.trim()
    ) {
      return "Contact person is required.";
    }

    if (
      !contactPhone.trim()
    ) {
      return "Contact phone is required.";
    }

    if (
      contactEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        contactEmail.trim()
      )
    ) {
      return "Please enter a valid email address.";
    }

    if (!contractStatus) {
      return "Please select an agreement status.";
    }

    if (
      assets.length ===
      0
    ) {
      return "Please add at least one asset.";
    }

    for (
      const rawAsset of assets
    ) {
      const asset =
        normalizeAsset(
          rawAsset
        );

      if (
        asset.floorsServed <=
        0
      ) {
        return asset.assetType ===
          "ESCALATOR"
          ? "Escalator rise must be greater than 0 meters."
          : "No. of floors served must be greater than 0.";
      }

      if (
        !asset.assetCategory
      ) {
        return asset.assetType ===
          "ESCALATOR"
          ? `No asset category found for ${asset.floorsServed} m rise.`
          : `No asset category found for ${asset.floorsServed} floors.`;
      }

      if (
        asset.quantity <=
        0
      ) {
        return "Quantity / Units must be greater than 0.";
      }

      if (
        asset.services.length ===
        0
      ) {
        return "Please select at least one service for every asset.";
      }

      for (
        const selected of
          asset.services
      ) {
        const service =
          services.find(
            (item) =>
              item.id ===
              selected.serviceId
          );

        if (!service) {
          return "Selected service was not found.";
        }

        const rule =
          findPricingRuleForSelection(
            service,
            asset.assetCategory,
            asset.quantity
          );

        if (!rule) {
          return `No pricing rule is available for ${service.name}.`;
        }

        if (
          getPricingBasis(rule) ===
          "LIFT_COUNT"
        ) {
          const min =
            rule.minQuantity == null
              ? 0
              : safeNumber(
                  rule.minQuantity
                );

          if (
            asset.quantity <
            min
          ) {
            return `Quantity must be at least ${min} for ${rule.pricingLabel}.`;
          }

          // maxQuantity is intentionally NOT enforced here.
          // The CRM allows quantities such as 1, 2, 5, 10, 50,
          // 100 even when an old pricing rule contains maxQuantity.
          // The backend pricing controller follows the same rule.
        }
      }
    }

    return "";
  }

  // ==========================================================
  // SAVE
  // ==========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccessToast("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError
      );
      return;
    }

    try {
      setLoading(true);

      const clientPayload:
        CreateClientInput & {
          pincode?: string;
        } = {
        companyName:
          companyName.trim(),

        clientType:
          clientType as ClientType,

        contactPerson:
          contactPerson.trim(),

        contactEmail:
          contactEmail.trim(),

        contactPhone:
          contactPhone.trim(),

        address:
          address.trim(),

        city:
          city.trim(),

        state:
          state.trim(),

        pincode:
          pincode.trim(),

        totalAssetsCount:
          totalAssetUnits,

        contractStatus:
          contractStatus as ClientContractStatus,

        contractValue:
          formatCurrency(
            totals.totalAmount
          ),

        numericContractValue:
          totals.totalAmount,

        accountManager:
          initialClient?.accountManager ||
          "",

        assignedBdeId:
          initialClient?.assignedBdeId,

        assignedBdeName:
          initialClient?.assignedBdeName,

        joinedDate:
          initialClient?.joinedDate,

        notes:
          notes.trim(),
      };

      // ======================================================
      // EXISTING SELECTIONS
      // ======================================================

      let existingSelections:
        ClientServiceSelection[] =
        [];

      const usedExistingIds =
        new Set<string>();

      if (
        isEdit &&
        initialClient?.id
      ) {
        const response =
          await clientServiceSelectionService.getSelections(
            initialClient.id
          );

        existingSelections =
          response.selections;
      }

      // ======================================================
      // DESIRED SERVICE ROWS
      // ======================================================

      const desiredRows: Array<{
        existingId?: string;
        serviceId: string;
        pricingRuleId: string;
        quantity: number;
        notes?: string;
      }> = [];

      for (
        const rawAsset of assets
      ) {
        const asset =
          normalizeAsset(
            rawAsset
          );

        for (
          const selected of
            asset.services
        ) {
          const service =
            services.find(
              (item) =>
                item.id ===
                selected.serviceId
            );

          if (!service) {
            throw new Error(
              "Selected service was not found."
            );
          }

          const rule =
            findPricingRuleForSelection(
              service,
              asset.assetCategory,
              asset.quantity
            );

          if (!rule) {
            throw new Error(
              `No pricing rule found for ${service.name} / ${asset.assetCategory}.`
            );
          }

          let existingId =
            selected.existingSelectionId;

          if (
            existingId &&
            existingSelections.some(
              (item) =>
                item.id ===
                existingId
            )
          ) {
            usedExistingIds.add(
              existingId
            );
          } else {
            const fallback =
              existingSelections.find(
                (existing) =>
                  !usedExistingIds.has(
                    existing.id
                  ) &&
                  existing.serviceId ===
                    selected.serviceId
              );

            if (fallback) {
              existingId =
                fallback.id;

              usedExistingIds.add(
                fallback.id
              );
            }
          }

          desiredRows.push({
            existingId,

            serviceId:
              selected.serviceId,

            pricingRuleId:
              rule.id,

            quantity:
              Number(
                asset.quantity
              ),

            notes:
              selected.notes.trim() ||
              undefined,
          });
        }
      }

      // ======================================================
      // CREATE
      // ======================================================

      if (!isEdit) {
        const client =
          await clientService.createCompleteClient(
            {
              ...clientPayload,

              selections:
                desiredRows.map(
                  (row) => ({
                    serviceId:
                      row.serviceId,

                    pricingRuleId:
                      row.pricingRuleId,

                    quantity:
                      row.quantity,

                    notes:
                      row.notes,
                  })
                ),
            }
          );

        if (!client?.id) {
          throw new Error(
            "Client was not created."
          );
        }

        setSuccessToast(
          `Client registered successfully with ID: ${client.id}`
        );

        setTimeout(() => {
          router.push(
            "/clients"
          );

          router.refresh();
        }, 800);

        return;
      }

      // ======================================================
      // EDIT
      // ======================================================

      if (!initialClient?.id) {
        throw new Error(
          "Client ID is missing."
        );
      }

      const updatedClient =
        await clientService.updateClient(
          initialClient.id,
          {
            companyName:
              clientPayload.companyName,

            clientType:
              clientPayload.clientType,

            contactPerson:
              clientPayload.contactPerson,

            contactEmail:
              clientPayload.contactEmail,

            contactPhone:
              clientPayload.contactPhone,

            address:
              clientPayload.address,

            city:
              clientPayload.city,

            state:
              clientPayload.state,

            pincode:
              clientPayload.pincode,

            totalAssetsCount:
              clientPayload.totalAssetsCount,

            contractStatus:
              clientPayload.contractStatus,

            contractValue:
              clientPayload.contractValue,

            numericContractValue:
              clientPayload.numericContractValue,

            accountManager:
              clientPayload.accountManager,

            notes:
              clientPayload.notes,
          }
        );

      if (!updatedClient?.id) {
        throw new Error(
          "Updated client data was not returned."
        );
      }

      // ======================================================
      // DELETE REMOVED SERVICE SELECTIONS
      // ======================================================

      for (
        const existing of
          existingSelections
      ) {
        if (
          !usedExistingIds.has(
            existing.id
          )
        ) {
          await clientServiceSelectionService.deleteSelection(
            initialClient.id,
            existing.id
          );
        }
      }

      // ======================================================
      // UPDATE / CREATE SERVICE SELECTIONS
      // ======================================================

      for (
        const row of desiredRows
      ) {
        if (
          row.existingId
        ) {
          await clientServiceSelectionService.updateSelection(
            initialClient.id,
            row.existingId,
            {
              pricingRuleId:
                row.pricingRuleId,

              quantity:
                row.quantity,

              notes:
                row.notes,
            }
          );
        } else {
          await clientServiceSelectionService.createSelection(
            initialClient.id,
            {
              serviceId:
                row.serviceId,

              pricingRuleId:
                row.pricingRuleId,

              quantity:
                row.quantity,

              notes:
                row.notes,
            }
          );
        }
      }

      setSuccessToast(
        `Client ${initialClient.id} updated successfully!`
      );

      setTimeout(() => {
        router.push(
          "/clients"
        );

        router.refresh();
      }, 800);
    } catch (err: unknown) {
      console.error(
        "SAVE CLIENT ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save client."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="relative space-y-6">
      {successToast && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-theme-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

          <span className="font-medium">
            {successToast}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>

          <div>
            <h4 className="font-semibold">
              Error
            </h4>

            <p className="mt-0.5">
              {error}
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {/* ==================================================
            MAIN
        ================================================== */}

        <div className="space-y-6 lg:col-span-2">
          {/* ==================================================
              ORGANIZATION
          ================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
            <SectionHeader
              title="Client Organization & Contact"
              description="Enter the client's organization and primary contact information."
              icon={
                <svg
                  className="h-4 w-4 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm4 0h2v2h-2V5zm-4 4h2v2H7V9zm4 0h2v2h-2V9zm-4 4h2v2H7v-2zm4 0h2v2h-2v-2z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Association / Organization Name"
                required
                value={companyName}
                onChange={setCompanyName}
                placeholder="Enter association or organization name"
                className="sm:col-span-2"
              />

              <div>
                <Label required>
                  Industry / Facility Classification
                </Label>

                <select
                  value={clientType}
                  onChange={(event) =>
                    setClientType(
                      event.target.value as
                        | ClientType
                        | ""
                    )
                  }
                  className={selectClass}
                >
                  <option value="">
                    Select classification
                  </option>

                  {clientTypes.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>
              </div>

              <Field
                label="Contact Person"
                required
                value={contactPerson}
                onChange={setContactPerson}
                placeholder="Enter contact person"
              />

              <Field
                label="Email"
                type="email"
                value={contactEmail}
                onChange={setContactEmail}
                placeholder="Enter official email"
              />

              <Field
                label="Contact Number"
                required
                type="tel"
                value={contactPhone}
                onChange={setContactPhone}
                placeholder="Enter contact phone number"
              />

              <Field
                label="City"
                value={city}
                onChange={setCity}
                placeholder="Enter city"
              />

              <Field
                label="State / Region"
                value={state}
                onChange={setState}
                placeholder="Enter state or region"
              />

              <Field
                label="Pincode"
                value={pincode}
                onChange={setPincode}
                placeholder="Enter pincode"
              />

              <div className="sm:col-span-2">
                <Label>
                  Address
                </Label>

                <textarea
                  value={address}
                  onChange={(event) =>
                    setAddress(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Enter complete address"
                  className={textareaClass}
                />
              </div>

              <div className="sm:col-span-2">
                <Label>
                  Notes
                </Label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Additional client notes..."
                  className={textareaClass}
                />
              </div>
            </div>
          </div>

          {/* ==================================================
              ASSETS / SERVICES / PRICING
          ================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Assets, Services & Pricing
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Add assets, select services and calculate pricing from the configured service rates.
                </p>
              </div>

              <button
                type="button"
                onClick={addAsset}
                disabled={
                  loadingServices ||
                  loadingSelections ||
                  services.length === 0
                }
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                + Add Asset
              </button>
            </div>

            {loadingServices ||
            loadingSelections ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                {loadingServices
                  ? "Loading services and pricing..."
                  : "Loading client services..."}
              </div>
            ) : assets.length ===
              0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No assets added yet.
                </p>

                <button
                  type="button"
                  onClick={addAsset}
                  className="mt-3 text-sm font-medium text-gray-900 underline dark:text-white"
                >
                  Add first asset
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {assets.map(
                  (
                    rawAsset,
                    index
                  ) => {
                    const asset =
                      normalizeAsset(
                        rawAsset
                      );

                    const assetTypes =
                      getAvailableAssetTypes(
                        services
                      );

                    const compatibleServices =
                      services.filter(
                        (service) =>
                          serviceSupportsAssetType(
                            service,
                            asset.assetType
                          )
                      );

                    const assetTotals =
                      asset.services.reduce(
                        (
                          summary,
                          selected
                        ) => {
                          const amount =
                            getServiceAmount(
                              asset,
                              selected.serviceId
                            );

                          return {
                            baseAmount:
                              summary.baseAmount +
                              amount.baseAmount,

                            gstAmount:
                              summary.gstAmount +
                              amount.gstAmount,

                            totalAmount:
                              summary.totalAmount +
                              amount.totalAmount,
                          };
                        },
                        {
                          baseAmount: 0,
                          gstAmount: 0,
                          totalAmount: 0,
                        }
                      );

                    return (
                      <div
                        key={
                          asset.tempId
                        }
                        className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/40"
                      >
                        <div className="mb-5 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              Asset{" "}
                              {index + 1}
                            </h3>

                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {getAssetTypeLabel(
                                asset.assetType
                              )}{" "}
                              •{" "}
                              {asset.assetCategory ||
                                "Category not selected"}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeAsset(
                                asset.tempId
                              )
                            }
                            className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div>
                            <Label>
                              Asset Type
                            </Label>

                            <select
                              value={
                                asset.assetType
                              }
                              onChange={(
                                event
                              ) =>
                                handleAssetTypeChange(
                                  asset.tempId,
                                  event.target
                                    .value as AssetType
                                )
                              }
                              className={selectClass}
                            >
                              {assetTypes.map(
                                (
                                  type
                                ) => (
                                  <option
                                    key={
                                      type
                                    }
                                    value={
                                      type
                                    }
                                  >
                                    {getAssetTypeLabel(
                                      type
                                    )}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div>
                            <Label>
                              {asset.assetType ===
                              "ESCALATOR"
                                ? "Rise (Meters)"
                                : "Floors Served"}
                            </Label>

                            <input
                              type="number"
                              min="0"
                              step={
                                asset.assetType ===
                                "ESCALATOR"
                                  ? "0.1"
                                  : "1"
                              }
                              value={
                                asset.floorsServed
                              }
                              onChange={(
                                event
                              ) =>
                                handleMeasurementChange(
                                  asset.tempId,
                                  event.target
                                    .value
                                )
                              }
                              className={
                                inputClass
                              }
                            />
                          </div>

                          <div>
                            <Label>
                              Quantity / Units
                            </Label>

                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={
                                asset.quantity
                              }
                              onChange={(
                                event
                              ) =>
                                handleQuantityChange(
                                  asset.tempId,
                                  event.target
                                    .value
                                )
                              }
                              className={
                                inputClass
                              }
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <Label>
                            Pricing Category
                          </Label>

                          <input
                            type="text"
                            value={
                              asset.assetCategory
                            }
                            readOnly
                            className={`${inputClass} cursor-not-allowed bg-gray-100 dark:bg-gray-800`}
                          />
                        </div>

                        <div className="mt-5 border-t border-gray-200 pt-5 dark:border-gray-700">
                          <div className="mb-3">
                            <h4 className="text-sm font-semibold text-gray-800 dark:text-white">
                              Services
                            </h4>

                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Select one or more services for this asset.
                            </p>
                          </div>

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

                                const amount =
                                  getServiceAmount(
                                    asset,
                                    service.id
                                  );

                                const rule =
                                  findPricingRuleForSelection(
                                    service,
                                    asset.assetCategory,
                                    asset.quantity
                                  );

                                return (
                                  <div
                                    key={
                                      service.id
                                    }
                                    className={`rounded-xl border p-4 transition ${
                                      selected
                                        ? "border-brand-500 bg-brand-50/50 dark:border-brand-400 dark:bg-brand-500/10"
                                        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/50"
                                    }`}
                                  >
                                    <label className="flex cursor-pointer items-start gap-3">
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
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                      />

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-white">
                                              {
                                                service.name
                                              }
                                            </p>

                                            {rule?.pricingLabel && (
                                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                                {
                                                  rule.pricingLabel
                                                }
                                              </p>
                                            )}
                                          </div>

                                          <span className="whitespace-nowrap text-sm font-bold text-gray-800 dark:text-white">
                                            {formatCurrency(
                                              amount.totalAmount
                                            )}
                                          </span>
                                        </div>

                                        {rule && (
                                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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
                                        <textarea
                                          rows={2}
                                          value={
                                            asset.services.find(
                                              (
                                                item
                                              ) =>
                                                item.serviceId ===
                                                service.id
                                            )?.notes ||
                                            ""
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            updateServiceNotes(
                                              asset.tempId,
                                              service.id,
                                              event
                                                .target
                                                .value
                                            )
                                          }
                                          placeholder="Service notes..."
                                          className={textareaSmallClass}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            )}
                          </div>

                          {compatibleServices.length ===
                            0 && (
                            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                              No services are available for this asset type.
                            </div>
                          )}
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                          <AmountBox
                            label="Base"
                            value={
                              assetTotals.baseAmount
                            }
                          />

                          <AmountBox
                            label="GST"
                            value={
                              assetTotals.gstAmount
                            }
                          />

                          <AmountBox
                            label="Total"
                            value={
                              assetTotals.totalAmount
                            }
                            strong
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {assets.length > 0 && (
              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <SummaryMetric
                    label="Assets"
                    value={String(
                      assets.length
                    )}
                  />

                  <SummaryMetric
                    label="Total Units"
                    value={String(
                      totalAssetUnits
                    )}
                  />

                  <SummaryMetric
                    label="Base Amount"
                    value={formatCurrency(
                      totals.baseAmount
                    )}
                  />

                  <SummaryMetric
                    label="GST"
                    value={formatCurrency(
                      totals.gstAmount
                    )}
                  />
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Grand Total
                  </span>

                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(
                      totals.totalAmount
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================
            SIDEBAR
        ==================================================== */}

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
            <h3 className="mb-4 border-b border-gray-100 pb-3 text-base font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">
              Contract Lifecycle
            </h3>

            <div className="space-y-4">
              <div>
                <Label required>
                  Agreement Status
                </Label>

                <select
                  value={
                    contractStatus
                  }
                  onChange={(event) =>
                    setContractStatus(
                      event.target
                        .value as
                        | ClientContractStatus
                        | ""
                    )
                  }
                  className={
                    selectClass
                  }
                >
                  <option value="">
                    Select agreement status
                  </option>

                  {contractStatuses.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    )
                  )}
                </select>
              </div>

              {isEdit &&
                initialClient && (
                  <div className="space-y-1 rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                    <div className="flex justify-between gap-3">
                      <span>
                        Client Code:
                      </span>

                      <span className="font-mono font-bold text-gray-800 dark:text-white">
                        {
                          initialClient.id
                        }
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>
                        Client Since:
                      </span>

                      <span className="font-semibold text-gray-800 dark:text-white">
                        {initialClient.joinedDate ||
                          "—"}
                      </span>
                    </div>
                  </div>
                )}

              <div className="mt-6 space-y-2.5 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={loading}
                  loadingText={
                    isEdit
                      ? "Updating Client..."
                      : "Registering Client..."
                  }
                >
                  {isEdit
                    ? "Update Client Record"
                    : "Register Client Account"}
                </Button>

                <Link
                  href="/clients"
                  className="block"
                >
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                  >
                    Cancel / Return
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* ==================================================
              SUMMARY
          ================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 p-5 shadow-theme-xs dark:border-gray-800 dark:from-gray-900/80 dark:to-gray-900/40">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Client Summary
              </span>

              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                {isEdit &&
                initialClient
                  ? initialClient.id
                  : "NEW"}
              </span>
            </div>

            <h4 className="truncate text-base font-bold text-gray-900 dark:text-white">
              {companyName ||
                "Organization Name"}
            </h4>

            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {clientType ||
                "Classification not selected"}{" "}
              •{" "}
              {city ||
                "City not entered"}
            </p>

            <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
              <SummaryRow
                label="Total Units"
                value={String(
                  totalAssetUnits
                )}
              />

              <SummaryRow
                label="Base Amount"
                value={formatCurrency(
                  totals.baseAmount
                )}
              />

              <SummaryRow
                label="GST"
                value={formatCurrency(
                  totals.gstAmount
                )}
              />

              <SummaryRow
                label="Total Value"
                value={formatCurrency(
                  totals.totalAmount
                )}
                valueClass="font-bold text-emerald-600 dark:text-emerald-400"
              />

              <SummaryRow
                label="Agreement"
                value={
                  contractStatus ||
                  "—"
                }
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// SECTION HEADER
// ============================================================

function SectionHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center gap-2.5 border-b border-gray-100 pb-4 dark:border-gray-800">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        {icon}
      </span>

      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h3>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// LABEL
// ============================================================

function Label({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
      {children}

      {required && (
        <span className="ml-1 text-error-500">
          *
        </span>
      )}
    </label>
  );
}

// ============================================================
// FIELD
// ============================================================

function Field({
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
      <Label required={required}>
        {label}
      </Label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        className={inputClass}
        required={required}
      />
    </div>
  );
}

// ============================================================
// AMOUNT BOX
// ============================================================

function AmountBox({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white p-3 dark:bg-gray-900">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1 text-sm ${
          strong
            ? "font-bold text-emerald-600 dark:text-emerald-400"
            : "font-semibold text-gray-800 dark:text-white"
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

// ============================================================
// SUMMARY METRIC
// ============================================================

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-gray-800 dark:text-white">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// SUMMARY ROW
// ============================================================

function SummaryRow({
  label,
  value,
  valueClass = "font-semibold text-gray-800 dark:text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between gap-4 text-gray-600 dark:text-gray-400">
      <span>
        {label}:
      </span>

      <span
        className={`max-w-[160px] truncate text-right ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================
// CLASSES
// ============================================================

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white";

const selectClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300";

const textareaClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/80 dark:text-white";

const textareaSmallClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";