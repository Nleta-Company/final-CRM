export interface ClientServiceSelection {
  id: string;
  clientId: string;

  serviceId: string;
  serviceCode: string;
  serviceName: string;

  pricingBasis: string;
  pricingLabel: string;
  assetCategory?: string | null;

  quantity: number;

  unitRate: number | string;
  baseAmount: number | string;

  gstPercent: number | string;
  gstAmount: number | string;

  totalAmount: number | string;

  notes?: string | null;

  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ClientServiceSummary {
  serviceCount: number;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
}

export interface ClientServiceSelectionsResponse {
  clientId: string;
  selections: ClientServiceSelection[];
  summary: ClientServiceSummary;
}

export interface CreateClientServiceSelectionInput {
  serviceId: string;
  pricingRuleId: string;
  quantity: number;
  notes?: string;
}

export interface UpdateClientServiceSelectionInput {
  pricingRuleId: string;
  quantity: number;
  notes?: string;
}