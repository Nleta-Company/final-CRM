import {
  EmployeeItem,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeStats,
  EmployeeStatus,
  EmployeeDepartment,
} from "@/types/employee";

const STORAGE_KEY = "nleta_employees_data";

import { initialEmployees } from "@/data/employeesData";
export { initialEmployees };

type Listener = () => void;

class EmployeeService {
  private listeners: Listener[] = [];

  private getStoredEmployees(): EmployeeItem[] {
    if (typeof window === "undefined") {
      return initialEmployees;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialEmployees));
        return initialEmployees;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse stored employees:", e);
      return initialEmployees;
    }
  }

  private saveStoredEmployees(employees: EmployeeItem[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
      this.notify();
    } catch (e) {
      console.error("Failed to save employees to localStorage:", e);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error("EmployeeService notification error:", e);
      }
    });
  }

  public async getAllEmployees(): Promise<EmployeeItem[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.getStoredEmployees());
      }, 50);
    });
  }

  public async getEmployeeById(id: string): Promise<EmployeeItem | null> {
    const employees = this.getStoredEmployees();
    const found = employees.find((emp) => emp.id === id);
    return found || null;
  }

  public async createEmployee(input: CreateEmployeeInput): Promise<EmployeeItem> {
    const employees = this.getStoredEmployees();
    const nextNum = employees.length + 1;
    const newId = `EMP-${String(nextNum).padStart(3, "0")}`;
    const newCode = input.employeeCode?.trim() || `NLETA-EMP-${100 + nextNum}`;

    const newEmployee: EmployeeItem = {
      ...input,
      id: newId,
      employeeCode: newCode,
      assignedProjectsCount: input.assignedProjectsCount || 0,
      safetyCertifications: input.safetyCertifications || [],
    };

    const updated = [newEmployee, ...employees];
    this.saveStoredEmployees(updated);
    return newEmployee;
  }

  public async updateEmployee(
    id: string,
    input: UpdateEmployeeInput
  ): Promise<EmployeeItem | null> {
    const employees = this.getStoredEmployees();
    const index = employees.findIndex((emp) => emp.id === id);
    if (index === -1) return null;

    const updatedEmployee: EmployeeItem = {
      ...employees[index],
      ...input,
    };

    employees[index] = updatedEmployee;
    this.saveStoredEmployees([...employees]);
    return updatedEmployee;
  }

  public async deleteEmployee(id: string): Promise<boolean> {
    const employees = this.getStoredEmployees();
    const filtered = employees.filter((emp) => emp.id !== id);
    if (filtered.length === employees.length) return false;

    this.saveStoredEmployees(filtered);
    return true;
  }

  public async getEmployeeStats(): Promise<EmployeeStats> {
    const employees = this.getStoredEmployees();
    const totalEmployees = employees.length;
    const activeStaff = employees.filter((e) => e.status === "Active").length;
    const onFieldDuty = employees.filter((e) => e.status === "On Field Duty").length;
    const onLeave = employees.filter((e) => e.status === "On Leave").length;

    const statusBreakdown: Record<EmployeeStatus, number> = {
      Active: 0,
      "On Field Duty": 0,
      "On Leave": 0,
      Probation: 0,
      Inactive: 0,
    };

    const departmentBreakdown: Record<EmployeeDepartment, number> = {
      "Safety & Compliance": 0,
      "Field Engineering": 0,
      "Business Development": 0,
      "Quality Assurance": 0,
      "Operations & Logistics": 0,
      "Executive Management": 0,
    };

    employees.forEach((emp) => {
      if (statusBreakdown[emp.status] !== undefined) {
        statusBreakdown[emp.status]++;
      }
      if (departmentBreakdown[emp.department] !== undefined) {
        departmentBreakdown[emp.department]++;
      }
    });

    const uniqueDepts = new Set(employees.map((e) => e.department)).size;

    return {
      totalEmployees,
      activeStaff,
      onFieldDuty,
      onLeave,
      departmentsCount: uniqueDepts,
      statusBreakdown,
      departmentBreakdown,
    };
  }
}

export const employeeService = new EmployeeService();
