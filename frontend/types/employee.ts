export type EmployeeDepartment =
  | "Safety & Compliance"
  | "Field Engineering"
  | "Business Development"
  | "Quality Assurance"
  | "Operations & Logistics"
  | "Executive Management";

export type EmployeeStatus =
  | "Active"
  | "On Field Duty"
  | "On Leave"
  | "Probation"
  | "Inactive";

export type EmploymentType =
  | "Full-Time Permanent"
  | "Contract Inspector"
  | "Probationary"
  | "Consultant";

export type WorkLocation =
  | "Headquarters (New Delhi)"
  | "Mumbai Regional Office"
  | "Bengaluru Tech Hub"
  | "Hyderabad Operations"
  | "Kolkata Hub"
  | "Chennai Branch";

export interface EmployeeItem {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: EmployeeDepartment;
  designation: string;
  employmentType: EmploymentType;
  workLocation: WorkLocation;
  status: EmployeeStatus;
  joiningDate: string;
  salaryBand?: string;
  safetyCertifications: string[];
  emergencyContact: string;
  assignedProjectsCount: number;
  notes?: string;
}

export type CreateEmployeeInput = Omit<EmployeeItem, "id">;

export type UpdateEmployeeInput = Partial<Omit<EmployeeItem, "id">>;

export interface EmployeeStats {
  totalEmployees: number;
  activeStaff: number;
  onFieldDuty: number;
  onLeave: number;
  departmentsCount: number;
  statusBreakdown: Record<EmployeeStatus, number>;
  departmentBreakdown: Record<EmployeeDepartment, number>;
}

export interface EmployeeFilterOptions {
  search?: string;
  department?: string;
  status?: string;
  workLocation?: string;
  employmentType?: string;
}
