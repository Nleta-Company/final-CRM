export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export interface LeadUser {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  role?: {
    name: string;
  } | null;
}

export interface LeadItem {
  id: string;

  associationName: string;
  contactName: string;
  email?: string | null;
  mobile?: string | null;

  source?: string | null;
  notes?: string | null;

  status: LeadStatus;

  assignedToId?: string | null;
  assignedTo?: LeadUser | null;

  createdById: string;
  createdBy?: LeadUser | null;

  clientId?: string | null;
  client?: unknown | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadInput {
  associationName: string;
  contactName: string;
  email?: string;
  mobile?: string;
  source?: string;
  notes?: string;
  assignedToId?: string;
}

export interface UpdateLeadInput {
  associationName?: string;
  contactName?: string;
  email?: string;
  mobile?: string;
  source?: string;
  notes?: string;
  status?: LeadStatus;
  assignedToId?: string;
}

export interface AssignLeadBdeInput {
  bdeId: string;
}

export interface ConvertLeadToClientInput {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
}

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  proposalSent: number;
  negotiation: number;
  won: number;
  lost: number;
}

export interface LeadFilterOptions {
  search?: string;
  status?: LeadStatus | "ALL";
}

export interface LeadListResponse {
  success: boolean;
  message: string;
  data: {
    leads: LeadItem[];
    total: number;
  };
}

export interface LeadResponse {
  success: boolean;
  message: string;
  data: {
    lead: LeadItem;
  };
}

export interface LeadStatsResponse {
  success: boolean;
  data: LeadStats;
}

export interface ConvertLeadResponse {
  success: boolean;
  message: string;
  data: {
    client: unknown;
    lead: LeadItem;
  };
}