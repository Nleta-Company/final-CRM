export interface ServicePricingRule {
  id: string;
  serviceId: string;
  pricingBasis: string;
  pricingLabel: string;
  assetCategory?: string | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  unitRate: number | string;
  gstPercent: number | string;
  isActive: boolean;
}

export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  pricingRules: ServicePricingRule[];
}

export interface ServiceListResponse {
  services: ServiceItem[];
  count: number;
}