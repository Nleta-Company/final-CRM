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

// ============================================================
// CLIENT PROCESS TRACKING
// ============================================================

export type ClientProcessStage =
  | "CLIENT_CREATED"
  | "FSO_GENERATED"
  | "PSGA_GENERATED"
  | "PSGA_COMPLETED";

// ============================================================
// CLIENT
// ============================================================

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

  // Pincode
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

  // ==========================================================
  // CLIENT PROCESS TRACKING
  // ==========================================================

  processStage?: ClientProcessStage;

  // External client reference
  externalClientId?: string;

  // FSO tracking
  fsoNumber?: string;
  fsoGeneratedAt?: string;

  // PSGA tracking
  psgaNumber?: string;
  psgaGeneratedAt?: string;

  // Last process update
  processUpdatedAt?: string;
}

// ============================================================
// CREATE CLIENT
// ============================================================

export type CreateClientInput =
  Omit<
    ClientItem,
    "id" | "joinedDate"
  > & {
    joinedDate?: string;
  };

// ============================================================
// UPDATE CLIENT
// ============================================================

export type UpdateClientInput =
  Partial<
    Omit<ClientItem, "id">
  >;

// ============================================================
// CLIENT STATS
// ============================================================

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

  // ==========================================================
  // CLIENT PROCESS TRACKING STATS
  // ==========================================================

  process?: {
    clientCreated: number;
    fsoGenerated: number;
    psgaGenerated: number;
    psgaCompleted: number;
  };
}

// ============================================================
// CLIENT FILTER OPTIONS
// ============================================================

export interface ClientFilterOptions {
  search?: string;

  clientType?: string;

  contractStatus?: string;
}