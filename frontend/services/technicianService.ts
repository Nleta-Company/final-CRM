import {
  TechnicianItem,
  CreateTechnicianInput,
  UpdateTechnicianInput,
  TechnicianStats,
  TechnicianStatus,
} from "@/types/technician";

const STORAGE_KEY = "nleta_crm_technicians_v1";
const TECHNICIANS_CHANGE_EVENT = "nleta_technicians_updated";

import { initialMockTechnicians } from "@/data/techniciansData";
export { initialMockTechnicians };

class TechnicianService {
  private getStoredTechnicians(): TechnicianItem[] {
    if (typeof window === "undefined") {
      return initialMockTechnicians;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMockTechnicians));
        return initialMockTechnicians;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to read technicians from localStorage:", e);
      return initialMockTechnicians;
    }
  }

  private saveTechnicians(technicians: TechnicianItem[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(technicians));
      window.dispatchEvent(new Event(TECHNICIANS_CHANGE_EVENT));
    } catch (e) {
      console.error("Failed to save technicians to localStorage:", e);
    }
  }

  public async getAllTechnicians(): Promise<TechnicianItem[]> {
    return this.getStoredTechnicians();
  }

  public async getTechnicianById(id: string): Promise<TechnicianItem | null> {
    const list = this.getStoredTechnicians();
    const found = list.find((t) => t.id.toLowerCase() === id.toLowerCase());
    return found || null;
  }

  public async createTechnician(input: CreateTechnicianInput): Promise<TechnicianItem> {
    const list = this.getStoredTechnicians();

    let maxIdNum = 500;
    list.forEach((t) => {
      const match = t.id.match(/TECH-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxIdNum) maxIdNum = num;
      }
    });
    const newId = `TECH-${maxIdNum + 1}`;

    const newTechnician: TechnicianItem = {
      ...input,
      id: newId,
      joinedDate: input.joinedDate || new Date().toISOString().split("T")[0],
      assignedAuditsCount: input.assignedAuditsCount ?? 0,
      completedAuditsCount: input.completedAuditsCount ?? 0,
      safetyRating: input.safetyRating ?? 4.8,
    };

    const updated = [newTechnician, ...list];
    this.saveTechnicians(updated);
    return newTechnician;
  }

  public async updateTechnician(
    id: string,
    input: UpdateTechnicianInput
  ): Promise<TechnicianItem> {
    const list = this.getStoredTechnicians();
    const index = list.findIndex((t) => t.id.toLowerCase() === id.toLowerCase());
    if (index === -1) {
      throw new Error(`Technician with ID "${id}" was not found.`);
    }

    const current = list[index];
    const updated: TechnicianItem = {
      ...current,
      ...input,
    };

    list[index] = updated;
    this.saveTechnicians(list);
    return updated;
  }

  public async deleteTechnician(id: string): Promise<boolean> {
    const list = this.getStoredTechnicians();
    const filtered = list.filter((t) => t.id.toLowerCase() !== id.toLowerCase());
    if (filtered.length === list.length) return false;
    this.saveTechnicians(filtered);
    return true;
  }

  public async getTechnicianStats(): Promise<TechnicianStats> {
    const list = this.getStoredTechnicians();

    let totalRating = 0;
    let totalCompleted = 0;

    const statusBreakdown: Record<TechnicianStatus, number> = {
      "Available on Field": 0,
      "On-Site Inspection": 0,
      "In Transit": 0,
      "On Leave": 0,
      "Training / Off-Duty": 0,
    };

    list.forEach((t) => {
      totalRating += t.safetyRating || 0;
      totalCompleted += t.completedAuditsCount || 0;
      if (statusBreakdown[t.status] !== undefined) {
        statusBreakdown[t.status]++;
      }
    });

    const averageRating =
      list.length > 0 ? Number((totalRating / list.length).toFixed(2)) : 0;

    return {
      totalTechnicians: list.length,
      availableOnField: statusBreakdown["Available on Field"] || 0,
      onSiteInspection: statusBreakdown["On-Site Inspection"] || 0,
      averageRating,
      totalCompletedAudits: totalCompleted,
      statusBreakdown,
    };
  }

  public subscribe(listener: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(TECHNICIANS_CHANGE_EVENT, listener);
    return () => {
      window.removeEventListener(TECHNICIANS_CHANGE_EVENT, listener);
    };
  }
}

export const technicianService = new TechnicianService();
