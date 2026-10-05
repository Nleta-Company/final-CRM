import {
  AssetRecord,
  CreateAssetInput,
  UpdateAssetInput,
  AssetStats,
  AssetFilterOptions,
  AssetOperationalStatus,
} from "@/types/asset";

const STORAGE_KEY = "nleta_crm_assets_v1";
const ASSETS_CHANGE_EVENT = "nleta_assets_updated";

import { initialMockAssets } from "@/data/assetsData";
export { initialMockAssets };

function getStoredAssets(): AssetRecord[] {
  if (typeof window === "undefined") {
    return initialMockAssets;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMockAssets));
      return initialMockAssets;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMockAssets));
      return initialMockAssets;
    }
    return parsed;
  } catch (err) {
    console.error("Error reading assets from storage:", err);
    return initialMockAssets;
  }
}

function saveAssetsToStorage(assets: AssetRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    window.dispatchEvent(new Event(ASSETS_CHANGE_EVENT));
  } catch (err) {
    console.error("Error writing assets to storage:", err);
  }
}

function generateNextAssetId(assets: AssetRecord[]): string {
  const ids = assets
    .map((a) => {
      const match = a.id.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  const maxId = ids.length > 0 ? Math.max(...ids) : 300;
  return `AST-${maxId + 1}`;
}

export const assetService = {
  async getAllAssets(filters?: AssetFilterOptions): Promise<AssetRecord[]> {
    const assets = getStoredAssets();
    if (!filters) return [...assets];

    return assets.filter((item) => {
      if (filters.search && filters.search.trim() !== "") {
        const query = filters.search.toLowerCase();
        const matches =
          item.assetName.toLowerCase().includes(query) ||
          item.clientName.toLowerCase().includes(query) ||
          item.facilityName.toLowerCase().includes(query) ||
          item.manufacturer.toLowerCase().includes(query) ||
          item.locationInFacility.toLowerCase().includes(query) ||
          item.assignedInspector.toLowerCase().includes(query);

        if (!matches) return false;
      }

      if (filters.equipmentType && filters.equipmentType !== "ALL") {
        if (item.equipmentType !== filters.equipmentType) return false;
      }

      if (filters.status && filters.status !== "ALL") {
        if (item.status !== filters.status) return false;
      }

      if (filters.clientId && filters.clientId !== "ALL") {
        if (item.clientId !== filters.clientId) return false;
      }

      return true;
    });
  },

  async getAssetById(id: string): Promise<AssetRecord | null> {
    const assets = getStoredAssets();
    const found = assets.find((a) => a.id.toLowerCase() === id.toLowerCase());
    return found ? { ...found } : null;
  },

  async createAsset(input: CreateAssetInput): Promise<AssetRecord> {
    const assets = getStoredAssets();
    const newId = generateNextAssetId(assets);

    const newAsset: AssetRecord = {
      ...input,
      id: newId,
      safetyComplianceScore: input.safetyComplianceScore ?? 95,
      status: input.status || "Certified & Operational",
    };

    const updated = [newAsset, ...assets];
    saveAssetsToStorage(updated);
    return newAsset;
  },

  async updateAsset(id: string, updates: UpdateAssetInput): Promise<AssetRecord> {
    const assets = getStoredAssets();
    const index = assets.findIndex((a) => a.id.toLowerCase() === id.toLowerCase());

    if (index === -1) {
      throw new Error(`Asset with ID ${id} not found`);
    }

    const current = assets[index];
    const updatedAsset: AssetRecord = {
      ...current,
      ...updates,
      id: current.id,
    };

    assets[index] = updatedAsset;
    saveAssetsToStorage(assets);
    return updatedAsset;
  },

  async deleteAsset(id: string): Promise<boolean> {
    const assets = getStoredAssets();
    const filtered = assets.filter((a) => a.id.toLowerCase() !== id.toLowerCase());

    if (filtered.length === assets.length) {
      return false;
    }

    saveAssetsToStorage(filtered);
    return true;
  },

  async getAssetStats(): Promise<AssetStats> {
    const assets = getStoredAssets();
    const totalAssets = assets.length;

    const certifiedOperational = assets.filter(
      (a) => a.status === "Certified & Operational"
    ).length;

    const dueForAudit = assets.filter((a) => a.status === "Due for Audit").length;

    const auditInProgress = assets.filter(
      (a) => a.status === "Audit In-Progress"
    ).length;

    const averageSafetyScore =
      totalAssets > 0
        ? Math.round(
            (assets.reduce((sum, a) => sum + (a.safetyComplianceScore || 90), 0) /
              totalAssets) *
              10
          ) / 10
        : 100;

    const statusBreakdown: Record<AssetOperationalStatus, number> = {
      "Certified & Operational": 0,
      "Due for Audit": 0,
      "Audit In-Progress": 0,
      "Defect Rectification": 0,
      "Decommissioned": 0,
    };

    assets.forEach((a) => {
      if (statusBreakdown[a.status] !== undefined) {
        statusBreakdown[a.status]++;
      }
    });

    return {
      totalAssets,
      certifiedOperational,
      dueForAudit,
      auditInProgress,
      averageSafetyScore,
      statusBreakdown,
    };
  },

  async resetToDefault(): Promise<AssetRecord[]> {
    saveAssetsToStorage(initialMockAssets);
    return [...initialMockAssets];
  },

  subscribe(callback: () => void): () => void {
    if (typeof window === "undefined") return () => {};

    const handler = () => callback();
    window.addEventListener(ASSETS_CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);

    return () => {
      window.removeEventListener(ASSETS_CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  },
};

export default assetService;
