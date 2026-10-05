import { clientService } from "./clientService";
import { bdeService } from "./bdeService";
import { ClientItem } from "@/types/client";
import { BdeItem } from "@/types/bde";

const BDE_CLIENT_ASSIGNMENT_EVENT = "nleta_bde_client_assigned";

class BdeClientService {
  /**
   * Assign a BDE executive to a specific client account
   */
  public async assignBdeToClient(
    clientId: string,
    bdeId: string
  ): Promise<{ client: ClientItem; bde: BdeItem }> {
    const [bde, client] = await Promise.all([
      bdeService.getBdeById(bdeId),
      clientService.getClientById(clientId),
    ]);

    if (!bde) {
      throw new Error(`BDE executive with ID "${bdeId}" not found.`);
    }
    if (!client) {
      throw new Error(`Client with ID "${clientId}" not found.`);
    }

    const updatedClient = await clientService.updateClient(clientId, {
      assignedBdeId: bde.id,
      assignedBdeName: bde.fullName,
    });

    this.notifySubscribers();
    return { client: updatedClient, bde };
  }

  /**
   * Assign multiple clients to a single BDE (bulk)
   */
  public async assignClientsToBde(
    bdeId: string,
    clientIds: string[]
  ): Promise<{ bde: BdeItem; assignedCount: number }> {
    const bde = await bdeService.getBdeById(bdeId);
    if (!bde) {
      throw new Error(`BDE executive with ID "${bdeId}" not found.`);
    }

    for (const clientId of clientIds) {
      await clientService.updateClient(clientId, {
        assignedBdeId: bde.id,
        assignedBdeName: bde.fullName,
      });
    }

    this.notifySubscribers();
    return { bde, assignedCount: clientIds.length };
  }

  /**
   * Remove BDE assignment from a client
   */
  public async unassignBdeFromClient(clientId: string): Promise<ClientItem> {
    const client = await clientService.getClientById(clientId);
    if (!client) {
      throw new Error(`Client with ID "${clientId}" not found.`);
    }

    const updatedClient = await clientService.updateClient(clientId, {
      assignedBdeId: undefined,
      assignedBdeName: undefined,
    });

    this.notifySubscribers();
    return updatedClient;
  }

  /**
   * Get all clients assigned to a specific BDE
   */
  public async getClientsForBde(bdeId: string): Promise<ClientItem[]> {
    const allClients = await clientService.getAllClients();
    return allClients.filter(
      (c) => c.assignedBdeId?.toLowerCase() === bdeId.toLowerCase()
    );
  }

  /**
   * Get the assigned BDE for a specific client
   */
  public async getBdeForClient(clientId: string): Promise<BdeItem | null> {
    const client = await clientService.getClientById(clientId);
    if (!client || !client.assignedBdeId) return null;
    return bdeService.getBdeById(client.assignedBdeId);
  }

  private notifySubscribers() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(BDE_CLIENT_ASSIGNMENT_EVENT));
    }
  }

  public subscribe(listener: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(BDE_CLIENT_ASSIGNMENT_EVENT, listener);
    return () => {
      window.removeEventListener(BDE_CLIENT_ASSIGNMENT_EVENT, listener);
    };
  }
}

export const bdeClientService = new BdeClientService();
