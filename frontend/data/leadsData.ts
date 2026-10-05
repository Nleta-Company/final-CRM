import { LeadItem } from "@/types/lead";

/**
 * Legacy sample records kept only for components/tests that still import
 * this module.
 *
 * The production Leads module uses leadService and the backend API.
 * These records intentionally follow the current LeadItem structure.
 */
export const initialMockLeads: LeadItem[] = [
  {
    id: "LD-501",
    associationName: "Grand Venice Mall",
    contactName: "Vikram Malhotra",
    email: "v.malhotra@grandvenice.in",
    mobile: "+91 98112 45890",
    source: "Annual Renewal",
    notes:
      "Mandatory annual inspection requirement for the association.",
    status: "NEGOTIATION",
    assignedToId: "BDE-201",
    createdById: "BDE-201",
    createdAt: "2026-09-18T10:00:00+05:30",
    updatedAt: "2026-09-18T10:00:00+05:30",
  },
  {
    id: "LD-502",
    associationName: "Apollo MedCity Tower A & B",
    contactName: "Dr. Sunita Kulkarni",
    email: "s.kulkarni@apollomed.org",
    mobile: "+91 98230 77123",
    source: "Inbound Call",
    notes:
      "Emergency inspection enquiry received from the association.",
    status: "QUALIFIED",
    assignedToId: "BDE-202",
    createdById: "BDE-202",
    createdAt: "2026-09-20T11:30:00+05:30",
    updatedAt: "2026-09-20T11:30:00+05:30",
  },
  {
    id: "LD-503",
    associationName: "Lucknow Metro Central Station",
    contactName: "S. K. Srivastava",
    email: "sk.srivastava@upmetrorail.gov.in",
    mobile: "+91 94150 11984",
    source: "Government Portal",
    notes:
      "Safety commissioning enquiry before the planned opening.",
    status: "PROPOSAL_SENT",
    assignedToId: "BDE-201",
    createdById: "BDE-201",
    createdAt: "2026-09-12T09:15:00+05:30",
    updatedAt: "2026-09-12T09:15:00+05:30",
  },
  {
    id: "LD-504",
    associationName: "Apex Heights Highrise Towers",
    contactName: "Rohan Singhania",
    email: "rohan@apexheights-rwa.com",
    mobile: "+91 97188 33451",
    source: "Direct Referral",
    notes:
      "Modernization-related enquiry postponed by the client.",
    status: "LOST",
    assignedToId: "BDE-203",
    createdById: "BDE-203",
    createdAt: "2026-09-22T14:00:00+05:30",
    updatedAt: "2026-09-22T14:00:00+05:30",
  },
  {
    id: "LD-505",
    associationName: "CyberCity IT Park Block 4",
    contactName: "Priya Nair",
    email: "priya.nair@cybercity-tech.com",
    mobile: "+91 99401 22899",
    source: "Annual Renewal",
    notes:
      "Contract agreement completed and service requirement confirmed.",
    status: "WON",
    assignedToId: "BDE-201",
    createdById: "BDE-201",
    createdAt: "2026-09-10T10:45:00+05:30",
    updatedAt: "2026-09-10T10:45:00+05:30",
  },
  {
    id: "LD-506",
    associationName: "Radisson Blu Convention Center",
    contactName: "Manish Chawla",
    email: "m.chawla@radissonblu-events.in",
    mobile: "+91 98104 67012",
    source: "Inbound Call",
    notes:
      "Annual certification scope is currently being finalized.",
    status: "CONTACTED",
    assignedToId: "BDE-202",
    createdById: "BDE-202",
    createdAt: "2026-09-21T13:20:00+05:30",
    updatedAt: "2026-09-21T13:20:00+05:30",
  },
  {
    id: "LD-507",
    associationName: "Max Super Specialty Hospital",
    contactName: "Col. Sanjeev Roy (Retd.)",
    email: "ops@maxhealthcare-west.org",
    mobile: "+91 98119 55432",
    source: "Government Portal",
    notes:
      "Emergency inspection enquiry converted into a confirmed opportunity.",
    status: "WON",
    createdById: "BDE-202",
    createdAt: "2026-09-08T09:40:00+05:30",
    updatedAt: "2026-09-08T09:40:00+05:30",
  },
  {
    id: "LD-508",
    associationName: "Vajra Industrial Logistics Hub",
    contactName: "Gurpreet Singh",
    email: "gurpreet@vajralogistics.com",
    mobile: "+91 98722 43210",
    source: "Direct Referral",
    notes:
      "Quotation expired without client agreement.",
    status: "LOST",
    createdById: "BDE-203",
    createdAt: "2026-09-19T15:10:00+05:30",
    updatedAt: "2026-09-19T15:10:00+05:30",
  },
];
