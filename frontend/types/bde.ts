export type BdeStatus = "Active" | "On Leave" | "Probation" | "Inactive";

export type BdeDesignation =
  | "Senior BD Manager"
  | "Key Account Manager"
  | "Regional Sales Lead"
  | "Enterprise Account Director"
  | "Business Development Associate";

export type BdeRegion =
  | "Delhi NCR"
  | "Mumbai Metro"
  | "Bengaluru Tech Corridor"
  | "Hyderabad Metro"
  | "Chennai & South"
  | "Kolkata & East"
  | "Pune & West";

export interface BdeItem {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  region: string;
  status: BdeStatus;
  quarterlyTarget: string;
  numericTarget: number;
  achievedRevenue: string;
  numericAchieved: number;
  conversionRate: number; // e.g. 78%
  activeLeadsCount: number;
  closedDealsCount: number;
  joinedDate: string;
  notes?: string;
}

export type CreateBdeInput = Omit<BdeItem, "id">;

export type UpdateBdeInput = Partial<Omit<BdeItem, "id">>;

export interface BdeStats {
  totalExecutives: number;
  activeExecutives: number;
  totalTarget: number;
  totalAchieved: number;
  formattedTotalRevenue: string;
  formattedTotalTarget: string;
  averageConversionRate: number;
  statusBreakdown: Record<BdeStatus, number>;
}

export interface BdeFilterOptions {
  search?: string;
  region?: string;
  status?: string;
  designation?: string;
}
