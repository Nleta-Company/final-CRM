"use client";

import React, {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  ClientItem,
  CreateClientInput,
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

// ============================================================
// TYPES
// ============================================================

interface BdeClientFormProps {
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

  // Existing backend selection id.
  // Important for edit mode.
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
// HELPERS
// ============================================================

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
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

function getAssetType(
  assetCategory?: string | null
): AssetType {
  const category = String(
    assetCategory || ""
  ).toLowerCase();

  if (category.includes("lift")) {
    return "LIFT";
  }

  if (
    category.includes("escalator")
  ) {
    return "ESCALATOR";
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
// FLOOR RANGE
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

// ============================================================
// RISE RANGE
// ============================================================

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

  match = text.match(
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:m|meter|meters)\s*rise/
  );

  if (match) {
    return {
      min: Number(match[1]),
      max: Number(match[2]),
    };
  }

  match = text.match(
    /(?:up to|upto|maximum)\s*(\d+(?:\.\d+)?)\s*(?:m|meter|meters)\s*rise/
  );

  if (match) {
    return {
      min: 0,
      max: Number(match[1]),
    };
  }

  match = text.match(
    /(\d+(?:\.\d+)?)\s*\+\s*(?:m|meter|meters)\s*rise/
  );

  if (match) {
    return {
      min: Number(match[1]),
      max: Infinity,
    };
  }

  match = text.match(
    /rise\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:m|meter|meters)?/
  );

  if (match) {
    return {
      min: Number(match[1]),
      max: Number(match[2]),
    };
  }

  return null;
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

// ============================================================
// CATEGORY / SERVICE HELPERS
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

function findCategoryForAssetMeasurement(
  service: ServiceItem | undefined,
  assetType: AssetType,
  measurement: number
) {
  const categories =
    getCategoriesForAssetType(
      service,
      assetType
    );

  if (
    categories.length === 0
  ) {
    return "";
  }

  const normalizedMeasurement =
    Math.max(
      safeNumber(measurement),
      0
    );

  const matcher =
    assetType === "ESCALATOR"
      ? categoryMatchesRise
      : categoryMatchesFloors;

  const matching =
    categories.find((rule) =>
      matcher(
        String(
          rule.assetCategory || ""
        ),
        normalizedMeasurement
      )
    );

  if (matching) {
    return String(
      matching.assetCategory || ""
    );
  }

  const fallback =
    categories.find((rule) =>
      assetType === "ESCALATOR"
        ? !getRiseRange(
            String(
              rule.assetCategory || ""
            )
          )
        : !getFloorRange(
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
  rule: ServicePricingRule | undefined,
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

export default function BdeClientForm({
  initialClient,
  isEdit = false,
}: BdeClientFormProps) {
  const router = useRouter();

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

  const [services, setServices] =
    useState<ServiceItem[]>([]);

  const [assets, setAssets] =
    useState<
      AssetSelectionDraft[]
    >([]);

  const initialPincode =
    (
      initialClient as
        | (ClientItem & {
            pincode?: string | null;
          })
        | undefined
    )?.pincode;

  const [form, setForm] =
    useState({
      companyName:
        initialClient?.companyName ||
        "",

      contactPerson:
        initialClient?.contactPerson ||
        "",

      contactEmail:
        initialClient?.contactEmail ||
        "",

      contactPhone:
        initialClient?.contactPhone ||
        "",

      address:
        initialClient?.address ||
        "",

      city:
        initialClient?.city ||
        "",

      state:
        initialClient?.state ||
        "",

      pincode:
        initialPincode || "",

      notes:
        initialClient?.notes ||
        "",
    });

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
  // LOAD EXISTING SELECTIONS
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

        const response =
          await clientServiceSelectionService.getSelections(
            initialClient!.id
          );

        if (!mounted) {
          return;
        }

        const groups = new Map<
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

          const quantity =
            Math.max(
              safeNumber(
                item.quantity
              ),
              1
            );

          const assetCategory =
            String(
              item.assetCategory ||
                ""
            );

          const assetType =
            getAssetType(
              assetCategory
            );

          const key = [
            assetType,
            assetCategory,
            quantity,
          ].join("|");

          let group =
            groups.get(key);

          if (!group) {
            const range =
              assetType ===
              "ESCALATOR"
                ? getRiseRange(
                    assetCategory
                  )
                : getFloorRange(
                    assetCategory
                  );

            group = {
              tempId:
                `existing-${item.id}`,

              assetType,

              assetCategory,

              floorsServed:
                range?.min || 1,

              quantity,

              services: [],
            };

            groups.set(
              key,
              group
            );
          }

          /**
           * IMPORTANT:
           * Keep the actual existing selection ID.
           * This prevents updating the wrong service when
           * multiple services are present.
           */
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
  // KEEP FORM IN SYNC WITH INITIAL CLIENT
  // ==========================================================

  useEffect(() => {
    if (!initialClient) {
      return;
    }

    const pincode =
      (
        initialClient as ClientItem & {
          pincode?: string | null;
        }
      ).pincode;

    setForm({
      companyName:
        initialClient.companyName ||
        "",

      contactPerson:
        initialClient.contactPerson ||
        "",

      contactEmail:
        initialClient.contactEmail ||
        "",

      contactPhone:
        initialClient.contactPhone ||
        "",

      address:
        initialClient.address ||
        "",

      city:
        initialClient.city ||
        "",

      state:
        initialClient.state ||
        "",

      pincode:
        pincode || "",

      notes:
        initialClient.notes ||
        "",
    });
  }, [initialClient]);

  // ==========================================================
  // FORM FIELD
  // ==========================================================

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  }

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
        firstService,
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

    const compatibleExisting =
      asset.services.filter(
        (selected) =>
          compatibleServices.some(
            (service) =>
              service.id ===
              selected.serviceId
          )
      );

    const nextServices =
      compatibleExisting.length > 0
        ? compatibleExisting
        : compatibleServices.length >
            0
          ? [
              {
                tempId:
                  `service-${Date.now()}-${Math.random()}`,

                serviceId:
                  compatibleServices[0]
                    .id,

                notes: "",
              },
            ]
          : [];

    const selectedService =
      compatibleServices.find(
        (service) =>
          nextServices.some(
            (selected) =>
              selected.serviceId ===
              service.id
          )
      ) ||
      compatibleServices[0];

    const category =
      findCategoryForAssetMeasurement(
        selectedService,
        assetType,
        asset.floorsServed
      );

    setError("");

    updateAsset(
      tempId,
      {
        assetType,
        assetCategory:
          category,
        services:
          nextServices,
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

    const selectedService =
      asset.services
        .map(
          (selected) =>
            services.find(
              (service) =>
                service.id ===
                selected.serviceId
            )
        )
        .find(
          (service) =>
            service &&
            serviceSupportsAssetType(
              service,
              asset.assetType
            )
        ) ||
      services.find(
        (service) =>
          serviceSupportsAssetType(
            service,
            asset.assetType
          )
      );

    const category =
      findCategoryForAssetMeasurement(
        selectedService,
        asset.assetType,
        measurement
      );

    updateAsset(
      tempId,
      {
        floorsServed:
          measurement,
        assetCategory:
          category,
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
    const service =
      services.find(
        (item) =>
          item.id ===
          asset.services[0]
            ?.serviceId
      );

    if (!service) {
      return asset;
    }

    const category =
      findCategoryForAssetMeasurement(
        service,
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
  // PRICING
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
      !form.companyName.trim()
    ) {
      return "Association / Company name is required.";
    }

    if (
      !form.contactPerson.trim()
    ) {
      return "Contact person is required.";
    }

    if (
      !form.contactPhone.trim()
    ) {
      return "Contact phone is required.";
    }

    if (
      form.contactEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.contactEmail.trim()
      )
    ) {
      return "Please enter a valid email address.";
    }

    if (
      assets.length === 0
    ) {
      return "Please add at least one asset.";
    }

    for (
      const asset of assets
    ) {
      if (
        asset.floorsServed <= 0
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
        asset.quantity <= 0
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

        /**
         * Only LIFT_COUNT uses quantity slabs.
         *
         * Normal ASSET_CATEGORY pricing:
         * unitRate × quantity
         */
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

          const max =
            rule.maxQuantity == null
              ? Infinity
              : safeNumber(
                  rule.maxQuantity
                );

          if (
            asset.quantity <
            min
          ) {
            return `Quantity must be at least ${min} for ${rule.pricingLabel}.`;
          }

          if (
            max !== Infinity &&
            asset.quantity >
              max
          ) {
            const alternative =
              service.pricingRules.find(
                (candidate) => {
                  if (
                    String(
                      candidate.assetCategory ||
                        ""
                    ) !==
                    String(
                      asset.assetCategory ||
                        ""
                    )
                  ) {
                    return false;
                  }

                  const candidateMin =
                    candidate.minQuantity ==
                    null
                      ? 0
                      : safeNumber(
                          candidate.minQuantity
                        );

                  const candidateMax =
                    candidate.maxQuantity ==
                    null
                      ? Infinity
                      : safeNumber(
                          candidate.maxQuantity
                        );

                  return (
                    asset.quantity >=
                      candidateMin &&
                    asset.quantity <=
                      candidateMax
                  );
                }
              );

            if (!alternative) {
              return `No pricing slab is available for quantity ${asset.quantity}.`;
            }
          }
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
          form.companyName.trim(),

        clientType:
          initialClient?.clientType ||
          "Residential RWA",

        contactPerson:
          form.contactPerson.trim(),

        contactEmail:
          form.contactEmail.trim(),

        contactPhone:
          form.contactPhone.trim(),

        address:
          form.address.trim(),

        city:
          form.city.trim(),

        state:
          form.state.trim(),

        pincode:
          form.pincode.trim(),

        totalAssetsCount:
          totalAssetUnits,

        contractStatus:
          initialClient?.contractStatus ||
          "Onboarding",

        contractValue:
          initialClient?.contractValue ||
          "₹ 0",

        numericContractValue:
          totals.totalAmount,

        accountManager:
          initialClient?.accountManager ||
          "Current BDE",

        assignedBdeId:
          initialClient?.assignedBdeId,

        assignedBdeName:
          initialClient?.assignedBdeName,

        joinedDate:
          initialClient?.joinedDate,

        notes:
          form.notes.trim(),
      };

      // ======================================================
      // CREATE / EDIT SERVICE DATA
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

          /**
           * EDIT MODE:
           *
           * Prefer the exact existing selection ID that was
           * loaded into the draft.
           *
           * This is much safer than matching only serviceId.
           */
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
            /**
             * Fallback for newly created service rows.
             *
             * Do not match an already-used selection.
             */
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
      // CREATE MODE
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

        router.push(
          "/bde/clients"
        );

        router.refresh();

        return;
      }

      // ======================================================
      // EDIT MODE
      // ======================================================

      if (!initialClient?.id) {
        throw new Error(
          "Client ID is missing."
        );
      }

      /**
       * Update complete client information.
       *
       * pincode and notes are included.
       */
      const updatedClient =
        await clientService.updateClient(
          initialClient.id,
          {
            companyName:
              clientPayload.companyName,

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
      // DELETE REMOVED SERVICES
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
      // UPDATE / CREATE SERVICES
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

      router.push(
        "/bde/clients"
      );

      router.refresh();
    } catch (err: unknown) {
      console.error(
        "SAVE BDE CLIENT ERROR:",
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
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* ERROR */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ======================================================
          CLIENT INFORMATION
      ====================================================== */}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Organization Details
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Enter and update the complete client information.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input
            label="Association / Company Name"
            required
            value={
              form.companyName
            }
            onChange={(value) =>
              updateField(
                "companyName",
                value
              )
            }
          />

          <Input
            label="Contact Person"
            required
            value={
              form.contactPerson
            }
            onChange={(value) =>
              updateField(
                "contactPerson",
                value
              )
            }
          />

          <Input
            label="Email"
            type="email"
            value={
              form.contactEmail
            }
            onChange={(value) =>
              updateField(
                "contactEmail",
                value
              )
            }
          />

          <Input
            label="Mobile"
            required
            value={
              form.contactPhone
            }
            onChange={(value) =>
              updateField(
                "contactPhone",
                value
              )
            }
          />

          <Input
            label="City"
            value={form.city}
            onChange={(value) =>
              updateField(
                "city",
                value
              )
            }
          />

          <Input
            label="State"
            value={form.state}
            onChange={(value) =>
              updateField(
                "state",
                value
              )
            }
          />

          <Input
            label="Pincode"
            value={
              form.pincode
            }
            onChange={(value) =>
              updateField(
                "pincode",
                value
              )
            }
          />

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Address
            </label>

            <textarea
              value={
                form.address
              }
              onChange={(event) =>
                updateField(
                  "address",
                  event.target.value
                )
              }
              rows={3}
              placeholder="Enter complete address"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Notes
            </label>

            <textarea
              value={
                form.notes
              }
              onChange={(event) =>
                updateField(
                  "notes",
                  event.target.value
                )
              }
              rows={4}
              placeholder="Additional client notes..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>
        </div>
      </div>

      {/* ======================================================
          ASSETS / SERVICES / PRICING
      ====================================================== */}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Assets, Services & Pricing
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Edit assets, services, quantity and pricing.
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
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add Asset
          </button>
        </div>

        {loadingServices ||
        loadingSelections ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            {loadingServices
              ? "Loading services and pricing..."
              : "Loading client services..."}
          </div>
        ) : assets.length ===
          0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-500">
              No assets added yet.
            </p>

            <button
              type="button"
              onClick={addAsset}
              className="mt-3 text-sm font-medium text-gray-900 underline"
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

                const selectedServices =
                  asset.services
                    .map(
                      (selected) =>
                        services.find(
                          (service) =>
                            service.id ===
                            selected.serviceId
                        )
                    )
                    .filter(
                      (
                        service
                      ): service is ServiceItem =>
                        Boolean(service)
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
                    className="rounded-xl border border-gray-200 bg-gray-50 p-5"
                  >
                    {/* ASSET HEADER */}

                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Asset{" "}
                          {index + 1}
                        </h3>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {
                            getAssetTypeLabel(
                              asset.assetType
                            )
                          }{" "}
                          •{" "}
                          {
                            asset.assetCategory
                          }
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
                        Remove Asset
                      </button>
                    </div>

                    {/* ASSET TYPE */}

                    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <StepNumber
                          number={1}
                        />

                        <label className="text-sm font-semibold text-gray-900">
                          Asset Type
                        </label>
                      </div>

                      <select
                        value={
                          asset.assetType
                        }
                        onChange={(
                          event
                        ) =>
                          handleAssetTypeChange(
                            asset.tempId,
                            event.target.value as AssetType
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
                      >
                        {assetTypes.includes(
                          "LIFT"
                        ) && (
                          <option value="LIFT">
                            Lift
                          </option>
                        )}

                        {assetTypes.includes(
                          "ESCALATOR"
                        ) && (
                          <option value="ESCALATOR">
                            Escalator
                          </option>
                        )}

                        {assetTypes.includes(
                          "OTHER"
                        ) && (
                          <option value="OTHER">
                            Other
                          </option>
                        )}
                      </select>
                    </div>

                    {/* MEASUREMENT */}

                    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <StepNumber
                          number={2}
                        />

                        <label className="text-sm font-semibold text-gray-900">
                          {asset.assetType ===
                          "ESCALATOR"
                            ? "Rise (meters)"
                            : "No. of Floors Served"}
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
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
                              asset.floorsServed
                            }
                            onChange={(
                              event
                            ) =>
                              handleMeasurementChange(
                                asset.tempId,
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
                          />

                          <p className="mt-1.5 text-xs text-gray-500">
                            {asset.assetType ===
                            "ESCALATOR"
                              ? "Enter rise in meters."
                              : "Enter number of floors served."}
                          </p>
                        </div>

                        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                          <p className="text-xs text-blue-700">
                            Auto-selected Asset Category
                          </p>

                          <p className="mt-1 text-sm font-semibold text-blue-900">
                            {asset.assetCategory ||
                              "No matching category"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CATEGORY */}

                    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <StepNumber
                          number={3}
                        />

                        <label className="text-sm font-semibold text-gray-900">
                          Asset Category
                        </label>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {asset.assetCategory ||
                            "No category"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Category is calculated from the selected measurement.
                        </p>
                      </div>
                    </div>

                    {/* QUANTITY */}

                    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <StepNumber
                          number={4}
                        />

                        <label className="text-sm font-semibold text-gray-900">
                          Quantity / Units
                        </label>
                      </div>

                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={
                          asset.quantity
                        }
                        onChange={(
                          event
                        ) =>
                          handleQuantityChange(
                            asset.tempId,
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500 md:w-1/2"
                      />
                    </div>

                    {/* SERVICES */}

                    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <StepNumber
                          number={5}
                        />

                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            Services
                          </h4>

                          <p className="mt-0.5 text-xs text-gray-500">
                            Select or remove multiple services.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {compatibleServices.map(
                          (service) => {
                            const selected =
                              asset.services.some(
                                (item) =>
                                  item.serviceId ===
                                  service.id
                              );

                            const rule =
                              selected
                                ? findPricingRuleForSelection(
                                    service,
                                    asset.assetCategory,
                                    asset.quantity
                                  )
                                : undefined;

                            return (
                              <label
                                key={
                                  service.id
                                }
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                                  selected
                                    ? "border-gray-900 bg-gray-50"
                                    : "border-gray-200 bg-white"
                                }`}
                              >
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

                                    {selected &&
                                      rule && (
                                        <span className="text-xs font-semibold">
                                          {formatCurrency(
                                            safeNumber(
                                              rule.unitRate
                                            )
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

                                  {selected &&
                                    rule && (
                                      <p className="mt-2 text-xs text-gray-600">
                                        {
                                          rule.pricingLabel
                                        }{" "}
                                        • GST{" "}
                                        {safeNumber(
                                          rule.gstPercent
                                        )}
                                        %
                                      </p>
                                    )}
                                </div>
                              </label>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {/* PRICING */}

                    {selectedServices.length >
                      0 && (
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="mb-4 flex items-center gap-2">
                          <StepNumber
                            number={6}
                          />

                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              Pricing & Service Notes
                            </h4>

                            <p className="mt-0.5 text-xs text-gray-500">
                              Pricing updates automatically according to service, category and quantity.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {selectedServices.map(
                            (service) => {
                              const rule =
                                findPricingRuleForSelection(
                                  service,
                                  asset.assetCategory,
                                  asset.quantity
                                );

                              const amount =
                                getRuleAmount(
                                  rule,
                                  asset.quantity
                                );

                              const selected =
                                asset.services.find(
                                  (item) =>
                                    item.serviceId ===
                                    service.id
                                );

                              return (
                                <div
                                  key={
                                    service.id
                                  }
                                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                                >
                                  <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold text-gray-900">
                                        {service.code
                                          ? `${service.code} — `
                                          : ""}
                                        {
                                          service.name
                                        }
                                      </p>

                                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <InfoBox
                                          label="Pricing"
                                          value={
                                            rule?.pricingLabel ||
                                            "—"
                                          }
                                        />

                                        <InfoBox
                                          label="Unit Rate"
                                          value={
                                            rule
                                              ? formatCurrency(
                                                  safeNumber(
                                                    rule.unitRate
                                                  )
                                                )
                                              : "—"
                                          }
                                        />

                                        <InfoBox
                                          label="GST"
                                          value={
                                            rule
                                              ? `${safeNumber(
                                                  rule.gstPercent
                                                )}%`
                                              : "—"
                                          }
                                        />

                                        <InfoBox
                                          label="Units"
                                          value={String(
                                            asset.quantity
                                          )}
                                        />
                                      </div>

                                      {rule &&
                                        getPricingBasis(
                                          rule
                                        ) ===
                                          "LIFT_COUNT" && (
                                          <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                            Quantity-based pricing is active for this service.
                                          </div>
                                        )}

                                      <div className="mt-3">
                                        <label className="mb-1.5 block text-xs font-medium text-gray-700">
                                          Service Notes
                                        </label>

                                        <textarea
                                          value={
                                            selected?.notes ||
                                            ""
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            updateServiceNotes(
                                              asset.tempId,
                                              service.id,
                                              event.target.value
                                            )
                                          }
                                          rows={2}
                                          placeholder="Optional service notes..."
                                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
                                        />
                                      </div>
                                    </div>

                                    <div className="shrink-0 lg:w-[190px]">
                                      <div className="rounded-lg border border-gray-200 bg-white p-3">
                                        <p className="text-xs text-gray-500">
                                          Service Total
                                        </p>

                                        <p className="mt-1 text-lg font-bold text-gray-900">
                                          {formatCurrency(
                                            amount.totalAmount
                                          )}
                                        </p>

                                        <p className="mt-1 text-xs text-gray-500">
                                          Base{" "}
                                          {formatCurrency(
                                            amount.baseAmount
                                          )}
                                          {" + GST "}
                                          {formatCurrency(
                                            amount.gstAmount
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

                        <div className="mt-4 rounded-lg bg-gray-900 p-4 text-white">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-gray-400">
                                Base
                              </p>

                              <p className="mt-1 font-semibold">
                                {formatCurrency(
                                  assetTotals.baseAmount
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-400">
                                GST
                              </p>

                              <p className="mt-1 font-semibold">
                                {formatCurrency(
                                  assetTotals.gstAmount
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-400">
                                Total
                              </p>

                              <p className="mt-1 text-lg font-bold">
                                {formatCurrency(
                                  assetTotals.totalAmount
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* GRAND TOTAL */}

        {assets.length > 0 && (
          <div className="mt-6 rounded-xl bg-gray-900 p-5 text-white">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">
                Client Service Estimate
              </h3>

              <p className="mt-1 text-xs text-gray-400">
                Total calculated from all selected assets and services.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-400">
                  Assets
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {assets.length}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Total Units
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {totalAssetUnits}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Total GST
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {formatCurrency(
                    totals.gstAmount
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Grand Total
                </p>

                <p className="mt-1 text-xl font-bold">
                  {formatCurrency(
                    totals.totalAmount
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">
                  Total Base
                </span>

                <span className="font-semibold">
                  {formatCurrency(
                    totals.baseAmount
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================
          OWNERSHIP
      ====================================================== */}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="font-semibold text-blue-900">
          BDE Ownership
        </h2>

        <p className="mt-1 text-sm text-blue-700">
          This client remains associated with your BDE account.
          Client assignment cannot be changed from the BDE workspace.
        </p>
      </div>

      {/* ======================================================
          ACTIONS
      ====================================================== */}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() =>
            router.push(
              isEdit &&
                initialClient?.id
                ? `/bde/clients/${initialClient.id}`
                : "/bde/clients"
            )
          }
          disabled={loading}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={
            loading ||
            loadingServices ||
            loadingSelections
          }
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? isEdit
              ? "Updating..."
              : "Creating..."
            : isEdit
              ? "Update Client"
              : "Create Client"}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// STEP NUMBER
// ============================================================

function StepNumber({
  number,
}: {
  number: number;
}) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
      {number}
    </span>
  );
}

// ============================================================
// INPUT
// ============================================================

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
      />
    </div>
  );
}

// ============================================================
// INFO BOX
// ============================================================

function InfoBox({
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