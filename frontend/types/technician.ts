export type TechnicianStatus =
  | "Available on Field"
  | "On-Site Inspection"
  | "In Transit"
  | "On Leave"
  | "Training / Off-Duty";

export type TechnicianSpecialization =
  | "Traction & High-Rise Lifts"
  | "Heavy Duty Transit Escalators"
  | "Moving Walkways & Travelators"
  | "Hydraulic & Freight Systems"
  | "Electronics & Speed Governors"
  | "Full-Scope Certified Inspector";

export type CertificationLevel =
  | "Senior Certified Inspector (Level 3)"
  | "Certified Field Engineer (Level 2)"
  | "Junior Field Technician (Level 1)"
  | "Master Auditor (Lead Inspector)";

export type TechnicianZone =
  | "North Zone (Delhi/NCR)"
  | "West Zone (Mumbai/Pune)"
  | "South Zone (Bengaluru)"
  | "South Central (Hyderabad)"
  | "East Zone (Kolkata)"
  | "Chennai & Coastal Hub";

export interface TechnicianItem {
  id: string;
  badgeNumber: string;
  fullName: string;
  email: string;
  phone: string;
  skillSpecialization: TechnicianSpecialization;
  certificationLevel: CertificationLevel;
  operatingZone: TechnicianZone;
  status: TechnicianStatus;
  assignedAuditsCount: number;
  completedAuditsCount: number;
  safetyRating: number; // e.g. 4.9 out of 5.0
  licenseExpiryDate: string;
  emergencyAvailable: boolean;
  joinedDate: string;
  notes?: string;
}

export type CreateTechnicianInput = Omit<TechnicianItem, "id">;

export type UpdateTechnicianInput = Partial<Omit<TechnicianItem, "id">>;

export interface TechnicianStats {
  totalTechnicians: number;
  availableOnField: number;
  onSiteInspection: number;
  averageRating: number;
  totalCompletedAudits: number;
  statusBreakdown: Record<TechnicianStatus, number>;
}

export interface TechnicianFilterOptions {
  search?: string;
  operatingZone?: string;
  status?: string;
  skillSpecialization?: string;
  emergencyAvailable?: boolean;
}
