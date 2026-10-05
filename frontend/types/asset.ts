export type AssetEquipmentType =
  | "Traction Passenger Lift"
  | "Heavy Transit Escalator"
  | "Moving Walkway / Travelator"
  | "Hydraulic Bed Elevator"
  | "Service / Freight Elevator"
  | "Panoramic Observation Lift";

export type AssetOperationalStatus =
  | "Certified & Operational"
  | "Due for Audit"
  | "Audit In-Progress"
  | "Defect Rectification"
  | "Decommissioned";

export interface AssetRecord {
  id: string;
  clientId: string;
  clientName: string;
  assetName: string;
  equipmentType: AssetEquipmentType;
  facilityName: string;
  locationInFacility: string;
  manufacturer: string;
  installationYear: number;
  capacity: string;
  speed: string;
  status: AssetOperationalStatus;
  lastAuditDate: string;
  nextAuditDueDate: string;
  assignedInspector: string;
  safetyComplianceScore: number;
  notes?: string;
}

export type CreateAssetInput = Omit<AssetRecord, "id">;

export type UpdateAssetInput = Partial<Omit<AssetRecord, "id">>;

export interface AssetStats {
  totalAssets: number;
  certifiedOperational: number;
  dueForAudit: number;
  auditInProgress: number;
  averageSafetyScore: number;
  statusBreakdown: Record<AssetOperationalStatus, number>;
}

export interface AssetFilterOptions {
  search?: string;
  equipmentType?: string;
  status?: string;
  clientId?: string;
}
