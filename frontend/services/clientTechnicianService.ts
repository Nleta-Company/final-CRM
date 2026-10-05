import { clientService } from "./clientService";
import { technicianService } from "./technicianService";
import { ClientItem } from "@/types/client";
import { TechnicianItem } from "@/types/technician";

const CLIENT_TECHNICIAN_ASSIGNMENT_EVENT = "nleta_client_technician_assigned";

class ClientTechnicianService {
  /**
   * Assign a certified safety technician to a specific client account
   */
  public async assignTechnicianToClient(
    clientId: string,
    technicianId: string
  ): Promise<{ client: ClientItem; technician: TechnicianItem }> {
    const [technician, client] = await Promise.all([
      technicianService.getTechnicianById(technicianId),
      clientService.getClientById(clientId),
    ]);

    if (!technician) {
      throw new Error(`Technician with ID "${technicianId}" not found.`);
    }
    if (!client) {
      throw new Error(`Client with ID "${clientId}" not found.`);
    }

    // Update client record with technician details
    const updatedClient = await clientService.updateClient(clientId, {
      assignedTechnicianId: technician.id,
      assignedTechnicianName: technician.fullName,
    });

    // Re-sync Technician workload
    await this.syncTechnicianMetrics(technician.id);

    this.notifySubscribers();
    return { client: updatedClient, technician };
  }

  /**
   * Assign multiple client accounts to a technician (bulk assignment)
   */
  public async assignClientsToTechnician(
    technicianId: string,
    clientIds: string[]
  ): Promise<{ technician: TechnicianItem; assignedCount: number }> {
    const technician = await technicianService.getTechnicianById(technicianId);
    if (!technician) {
      throw new Error(`Technician with ID "${technicianId}" not found.`);
    }

    for (const clientId of clientIds) {
      await clientService.updateClient(clientId, {
        assignedTechnicianId: technician.id,
        assignedTechnicianName: technician.fullName,
      });
    }

    await this.syncTechnicianMetrics(technician.id);
    this.notifySubscribers();
    return { technician, assignedCount: clientIds.length };
  }

  /**
   * Unassign technician from a client
   */
  public async unassignTechnicianFromClient(clientId: string): Promise<ClientItem> {
    const client = await clientService.getClientById(clientId);
    if (!client) {
      throw new Error(`Client with ID "${clientId}" not found.`);
    }

    const prevTechId = client.assignedTechnicianId;

    const updatedClient = await clientService.updateClient(clientId, {
      assignedTechnicianId: undefined,
      assignedTechnicianName: undefined,
    });

    if (prevTechId) {
      await this.syncTechnicianMetrics(prevTechId);
    }

    this.notifySubscribers();
    return updatedClient;
  }

  /**
   * Get all client accounts assigned to a specific technician
   */
  public async getClientsForTechnician(technicianId: string): Promise<ClientItem[]> {
    const allClients = await clientService.getAllClients();
    return allClients.filter(
      (c) => c.assignedTechnicianId?.toLowerCase() === technicianId.toLowerCase()
    );
  }

  /**
   * Get the assigned technician for a specific client
   */
  public async getTechnicianForClient(clientId: string): Promise<TechnicianItem | null> {
    const client = await clientService.getClientById(clientId);
    if (!client || !client.assignedTechnicianId) return null;
    return technicianService.getTechnicianById(client.assignedTechnicianId);
  }

  /**
   * Recalculate technician's assigned audit load based on active assigned clients
   */
  private async syncTechnicianMetrics(technicianId: string): Promise<void> {
    try {
      const tech = await technicianService.getTechnicianById(technicianId);
      if (!tech) return;

      const clients = await this.getClientsForTechnician(technicianId);
      // Sum the assets of active clients or count active audit clients
      const activeClientsCount = clients.filter(
        (c) => c.contractStatus === "Active Agreement" || c.contractStatus === "Under Audit"
      ).length;

      await technicianService.updateTechnician(technicianId, {
        assignedAuditsCount: Math.max(tech.assignedAuditsCount, activeClientsCount),
      });
    } catch (e) {
      console.error("Failed to sync technician client metrics:", e);
    }
  }

  private notifySubscribers() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(CLIENT_TECHNICIAN_ASSIGNMENT_EVENT));
    }
  }

  public subscribe(listener: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(CLIENT_TECHNICIAN_ASSIGNMENT_EVENT, listener);
    return () => {
      window.removeEventListener(CLIENT_TECHNICIAN_ASSIGNMENT_EVENT, listener);
    };
  }
}

export const clientTechnicianService = new ClientTechnicianService();
