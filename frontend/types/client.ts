export type ClientType =
  | "Commercial Real Estate"
  | "Hospitality"
  | "Healthcare"
  | "Government / Transit"
  | "Residential RWA"
  | "Industrial & Logistics";

export type ClientContractStatus =
  | "Active Agreement"
  | "Pending Renewal"
  | "Under Audit"
  | "Expired"
  | "Onboarding";

export interface ClientItem {
  id: string;

  companyName: string;

  clientType: ClientType;

  contactPerson: string;
  contactEmail: string;
  contactPhone: string;

  address: string;
  city: string;
  state: string;

  // ✅ Added
  pincode?: string;

  totalAssetsCount: number;

  contractStatus: ClientContractStatus;

  contractValue: string;
  numericContractValue: number;

  accountManager: string;

  assignedTechnicianId?: string;
  assignedTechnicianName?: string;

  assignedBdeId?: string;
  assignedBdeName?: string;

  joinedDate: string;

  nextAuditDate?: string;

  notes?: string;
}

export type CreateClientInput =
  Omit<
    ClientItem,
    "id" | "joinedDate"
  > & {
    joinedDate?: string;
  };

export type UpdateClientInput =
  Partial<
    Omit<ClientItem, "id">
  >;

export interface ClientStats {
  totalClients: number;

  activeContracts: number;

  totalContractValue: number;

  formattedTotalValue: string;

  totalAssetsManaged: number;

  pendingRenewals: number;

  statusBreakdown: Record<
    ClientContractStatus,
    number
  >;
}

export interface ClientFilterOptions {
  search?: string;

  clientType?: string;

  contractStatus?: string;
}