import { leadService } from "./leadService";
import { LeadItem } from "@/types/lead";

const BDE_LEAD_ASSIGNMENT_EVENT =
  "nleta_bde_lead_assigned";

class BdeLeadService {
  /**
   * Assign a specific BDE to a single lead.
   *
   * Backend endpoint:
   * PATCH /api/leads/:id/assign-bde
   *
   * Backend expects:
   * {
   *   bdeId: string
   * }
   */
  public async assignBdeToLead(
    leadId: string,
    bdeId: string
  ): Promise<LeadItem> {
    const updatedLead =
      await leadService.assignBdeToLead(
        leadId,
        bdeId
      );

    this.notifySubscribers();

    return updatedLead;
  }

  /**
   * Assign multiple leads to a single BDE.
   *
   * The backend currently provides a single-lead
   * assignment endpoint, so bulk assignment is
   * performed sequentially through that API.
   */
  public async assignLeadsToBde(
    bdeId: string,
    leadIds: string[]
  ): Promise<{
    assignedCount: number;
    leads: LeadItem[];
  }> {
    const updatedLeads: LeadItem[] = [];

    for (const leadId of leadIds) {
      const updatedLead =
        await leadService.assignBdeToLead(
          leadId,
          bdeId
        );

      updatedLeads.push(updatedLead);
    }

    this.notifySubscribers();

    return {
      assignedCount: updatedLeads.length,
      leads: updatedLeads,
    };
  }

  /**
   * Remove BDE assignment from a lead.
   *
   * The current CRM backend does not expose an
   * unassign endpoint. Do not modify the lead
   * locally because backend is the source of truth.
   */
  public async unassignBdeFromLead(
    _leadId: string
  ): Promise<LeadItem> {
    throw new Error(
      "Lead unassignment is not supported by the current CRM API."
    );
  }

  /**
   * Get all leads visible to a BDE.
   *
   * Backend automatically applies BDE access
   * restrictions based on the authenticated user.
   */
  public async getLeadsForBde(
    _bdeId?: string
  ): Promise<LeadItem[]> {
    return leadService.getAllLeads();
  }

  /**
   * Get the assigned BDE information for a lead.
   *
   * Backend returns the assigned BDE as:
   * lead.assignedTo
   */
  public async getBdeForLead(
    leadId: string
  ): Promise<LeadItem["assignedTo"]> {
    const lead =
      await leadService.getLeadById(leadId);

    if (!lead) {
      return null;
    }

    return lead.assignedTo ?? null;
  }

  /**
   * Notify existing frontend components that
   * lead assignment has changed.
   */
  private notifySubscribers(): void {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new Event(BDE_LEAD_ASSIGNMENT_EVENT)
    );

    // Also notify generic lead listeners.
    leadService.notifyChange();
  }

  /**
   * Subscribe to BDE lead assignment changes.
   */
  public subscribe(
    listener: () => void
  ): () => void {
    if (typeof window === "undefined") {
      return () => {};
    }

    window.addEventListener(
      BDE_LEAD_ASSIGNMENT_EVENT,
      listener
    );

    return () => {
      window.removeEventListener(
        BDE_LEAD_ASSIGNMENT_EVENT,
        listener
      );
    };
  }
}

export const bdeLeadService =
  new BdeLeadService();

export default bdeLeadService;