import { z } from "zod";

import prisma from "../config/prisma.js";

// ============================================================
// HELPERS
// ============================================================

function isAdmin(req) {
    return req.user?.role === "Admin";
}

function isBde(req) {
    return req.user?.role === "BDE/Sales";
}

/*
 * A BDE can access a lead when:
 * 1. The BDE created the lead, OR
 * 2. The lead is assigned to that BDE.
 *
 * Admin can access every lead.
 */
function canAccessLead(req, lead) {
    if (isAdmin(req)) {
        return true;
    }

    if (isBde(req)) {
        return (
            lead.createdById === req.user.userId ||
            lead.assignedToId === req.user.userId
        );
    }

    return false;
}

// ============================================================
// CREATE LEAD
// ============================================================

const createLeadSchema = z.object({
    associationName: z.string().trim().min(2),
    contactName: z.string().trim().min(2),
    email: z.string().trim().email().optional(),
    mobile: z.string().trim().optional(),
    source: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    assignedToId: z.string().trim().optional(),
});

export async function createLead(req, res) {
    try {
        const validation = createLeadSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead data",
                errors: validation.error.flatten(),
            });
        }

        const data = validation.data;

        let assignedToId = data.assignedToId || null;

        // --------------------------------------------------------
        // BDE:
        // If no assignee is provided, automatically assign
        // the lead to the logged-in BDE.
        //
        // A BDE cannot assign a lead to another BDE.
        // --------------------------------------------------------

        if (isBde(req)) {
            if (
                assignedToId &&
                assignedToId !== req.user.userId
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "BDE/Sales users can only assign a lead to themselves",
                });
            }

            assignedToId = req.user.userId;
        }

        // --------------------------------------------------------
        // Validate assigned user
        // --------------------------------------------------------

        if (assignedToId) {
            const assignedUser = await prisma.user.findUnique({
                where: {
                    id: assignedToId,
                },
                include: {
                    role: true,
                },
            });

            if (!assignedUser) {
                return res.status(400).json({
                    success: false,
                    message: "Assigned user not found",
                });
            }

            if (
                assignedUser.role.name !== "BDE/Sales" &&
                assignedUser.role.name !== "Admin"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Lead can only be assigned to Admin or BDE/Sales",
                });
            }

            if (assignedUser.status !== "ACTIVE") {
                return res.status(400).json({
                    success: false,
                    message: "Assigned user is not active",
                });
            }
        }

        // --------------------------------------------------------
        // Create lead
        // --------------------------------------------------------

        const lead = await prisma.lead.create({
            data: {
                associationName: data.associationName,
                contactName: data.contactName,
                email: data.email
                    ? data.email.toLowerCase()
                    : null,
                mobile: data.mobile || null,
                source: data.source || null,
                notes: data.notes || null,
                status: "NEW",
                assignedToId,
                createdById: req.user.userId,
            },

            include: {
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },

                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        return res.status(201).json({
            success: true,
            message: "Lead created successfully",
            data: {
                lead,
            },
        });
    } catch (error) {
        console.error("CREATE LEAD ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create lead",
        });
    }
}

// ============================================================
// GET LEAD STATS
// ============================================================

export async function getLeadStats(req, res) {
    try {
        let where = {};

        // Admin → all leads
        // BDE → only created/assigned leads
        if (isBde(req)) {
            where = {
                OR: [
                    {
                        createdById: req.user.userId,
                    },
                    {
                        assignedToId: req.user.userId,
                    },
                ],
            };
        }

        const [
            total,
            newLeads,
            contacted,
            qualified,
            proposalSent,
            negotiation,
            won,
            lost,
        ] = await Promise.all([
            prisma.lead.count({
                where,
            }),

            prisma.lead.count({
                where: {
                    ...where,
                    status: "NEW",
                },
            }),

            prisma.lead.count({
                where: {
                    ...where,
                    status: "CONTACTED",
                },
            }),

            prisma.lead.count({
                where: {
                    ...where,
                    status: "QUALIFIED",
                },
            }),

            prisma.lead.count({
                where: {
                    ...where,
                    status: "PROPOSAL_SENT",
                },
            }),

            prisma.lead.count({
                where: {
                    ...where,
                    status: "NEGOTIATION",
                },
            }),

            prisma.lead.count({
                where: {
                    ...where,
                    status: "WON",
                },
            }),

            prisma.lead.count({
                where: {
                    ...where,
                    status: "LOST",
                },
            }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                total,
                new: newLeads,
                contacted,
                qualified,
                proposalSent,
                negotiation,
                won,
                lost,
            },
        });
    } catch (error) {
        console.error("GET LEAD STATS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch lead statistics",
        });
    }
}

// ============================================================
// GET ALL LEADS
// ============================================================

export async function getLeads(req, res) {
    try {
        let where = {};

        // --------------------------------------------------------
        // Admin → all leads
        // BDE → only created/assigned leads
        // --------------------------------------------------------

        if (isBde(req)) {
            where = {
                OR: [
                    {
                        createdById: req.user.userId,
                    },
                    {
                        assignedToId: req.user.userId,
                    },
                ],
            };
        }

        const leads = await prisma.lead.findMany({
            where,

            orderBy: {
                createdAt: "desc",
            },

            include: {
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },

                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        return res.status(200).json({
            success: true,
            message: "Leads fetched successfully",
            data: {
                leads,
                total: leads.length,
            },
        });
    } catch (error) {
        console.error("GET LEADS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch leads",
        });
    }
}

// ============================================================
// GET LEAD BY ID
// ============================================================

export async function getLeadById(req, res) {
    try {
        const { id } = req.params;

        const lead = await prisma.lead.findUnique({
            where: {
                id,
            },

            include: {
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },

                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        // --------------------------------------------------------
        // Data-level access check
        // --------------------------------------------------------

        if (!canAccessLead(req, lead)) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have access to this lead",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Lead fetched successfully",
            data: {
                lead,
            },
        });
    } catch (error) {
        console.error("GET LEAD BY ID ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch lead",
        });
    }
}

// ============================================================
// UPDATE LEAD STAGE
// ============================================================

const updateLeadStageSchema = z.object({
    status: z.enum([
        "NEW",
        "CONTACTED",
        "QUALIFIED",
        "PROPOSAL_SENT",
        "NEGOTIATION",
        "WON",
        "LOST",
    ]),
});

export async function updateLeadStage(req, res) {
    try {
        const { id } = req.params;

        const validation = updateLeadStageSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead stage",
                errors: validation.error.flatten(),
            });
        }

        const existingLead = await prisma.lead.findUnique({
            where: {
                id,
            },
        });

        if (!existingLead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        // Data-level access check
        if (!canAccessLead(req, existingLead)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to update this lead",
            });
        }

        const lead = await prisma.lead.update({
            where: {
                id,
            },

            data: {
                status: validation.data.status,
            },

            include: {
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },

                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        return res.status(200).json({
            success: true,
            message: "Lead stage updated successfully",
            data: {
                lead,
            },
        });
    } catch (error) {
        console.error("UPDATE LEAD STAGE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update lead stage",
        });
    }
}

// ============================================================
// UPDATE LEAD
// ============================================================

const updateLeadSchema = z.object({
    associationName: z.string().trim().min(2).optional(),
    contactName: z.string().trim().min(2).optional(),
    email: z.string().trim().email().optional(),
    mobile: z.string().trim().optional(),
    source: z.string().trim().optional(),
    notes: z.string().trim().optional(),

    status: z
        .enum([
            "NEW",
            "CONTACTED",
            "QUALIFIED",
            "PROPOSAL_SENT",
            "NEGOTIATION",
            "WON",
            "LOST",
        ])
        .optional(),

    assignedToId: z.string().trim().optional(),
});

export async function updateLead(req, res) {
    try {
        const { id } = req.params;

        const validation = updateLeadSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead update data",
                errors: validation.error.flatten(),
            });
        }

        const existingLead = await prisma.lead.findUnique({
            where: {
                id,
            },
        });

        if (!existingLead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        // --------------------------------------------------------
        // Data-level access
        // --------------------------------------------------------

        if (!canAccessLead(req, existingLead)) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to update this lead",
            });
        }

        const data = validation.data;

        // --------------------------------------------------------
        // BDE restrictions
        // --------------------------------------------------------

        if (isBde(req)) {
            /*
             * BDE cannot reassign a lead to another user.
             */
            if (
                data.assignedToId !== undefined &&
                data.assignedToId !== req.user.userId
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "BDE/Sales users cannot assign a lead to another user",
                });
            }
        }

        // --------------------------------------------------------
        // Validate assigned user
        // --------------------------------------------------------

        if (data.assignedToId) {
            const assignedUser = await prisma.user.findUnique({
                where: {
                    id: data.assignedToId,
                },

                include: {
                    role: true,
                },
            });

            if (!assignedUser) {
                return res.status(400).json({
                    success: false,
                    message: "Assigned user not found",
                });
            }

            if (
                assignedUser.role.name !== "BDE/Sales" &&
                assignedUser.role.name !== "Admin"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Lead can only be assigned to Admin or BDE/Sales",
                });
            }

            if (assignedUser.status !== "ACTIVE") {
                return res.status(400).json({
                    success: false,
                    message: "Assigned user is not active",
                });
            }
        }

        // --------------------------------------------------------
        // Update
        // --------------------------------------------------------

        const lead = await prisma.lead.update({
            where: {
                id,
            },

            data: {
                ...(data.associationName !== undefined && {
                    associationName: data.associationName,
                }),

                ...(data.contactName !== undefined && {
                    contactName: data.contactName,
                }),

                ...(data.email !== undefined && {
                    email: data.email.toLowerCase(),
                }),

                ...(data.mobile !== undefined && {
                    mobile: data.mobile,
                }),

                ...(data.source !== undefined && {
                    source: data.source,
                }),

                ...(data.notes !== undefined && {
                    notes: data.notes,
                }),

                ...(data.status !== undefined && {
                    status: data.status,
                }),

                ...(data.assignedToId !== undefined && {
                    assignedToId: data.assignedToId,
                }),
            },

            include: {
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },

                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        return res.status(200).json({
            success: true,
            message: "Lead updated successfully",
            data: {
                lead,
            },
        });
    } catch (error) {
        console.error("UPDATE LEAD ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update lead",
        });
    }
}

// ============================================================
// DELETE LEAD
// ============================================================

export async function deleteLead(req, res) {
    try {
        const { id } = req.params;

        const existingLead = await prisma.lead.findUnique({
            where: {
                id,
            },
        });

        if (!existingLead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        // --------------------------------------------------------
        // Data-level access
        // --------------------------------------------------------

        if (!canAccessLead(req, existingLead)) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to delete this lead",
            });
        }

        await prisma.lead.delete({
            where: {
                id,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Lead deleted successfully",
        });
    } catch (error) {
        console.error("DELETE LEAD ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete lead",
        });
    }
}

// ============================================================
// CONVERT LEAD → CLIENT
// ============================================================

const convertLeadSchema = z.object({
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().trim().optional(),
    gstNumber: z.string().trim().optional(),
});

export async function convertLeadToClient(req, res) {
    try {
        const { id } = req.params;

        const validation = convertLeadSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid conversion data",
                errors: validation.error.flatten(),
            });
        }

        const lead = await prisma.lead.findUnique({
            where: {
                id,
            },

            include: {
                client: true,

                serviceSelections: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        // --------------------------------------------------------
        // DATA-LEVEL ACCESS
        // --------------------------------------------------------

        if (!canAccessLead(req, lead)) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to convert this lead",
            });
        }

        // --------------------------------------------------------
        // PREVENT DUPLICATE CONVERSION
        // --------------------------------------------------------

        if (lead.clientId || lead.client) {
            return res.status(409).json({
                success: false,
                message:
                    "This lead has already been converted to a client",
                client: lead.client,
            });
        }

        // --------------------------------------------------------
        // LOST LEAD CANNOT BE CONVERTED
        // --------------------------------------------------------

        if (lead.status === "LOST") {
            return res.status(400).json({
                success: false,
                message:
                    "A lost lead cannot be converted to a client",
            });
        }

        const clientData = validation.data;

        // --------------------------------------------------------
        // TRANSACTION
        // --------------------------------------------------------

        const result = await prisma.$transaction(async (tx) => {

            // ----------------------------------------------------
            // CREATE CLIENT
            // ----------------------------------------------------

            const client = await tx.client.create({
                data: {
                    associationName: lead.associationName,
                    contactName: lead.contactName,
                    email: lead.email,
                    mobile: lead.mobile,

                    address: clientData.address || null,
                    city: clientData.city || null,
                    state: clientData.state || null,
                    pincode: clientData.pincode || null,
                    gstNumber: clientData.gstNumber || null,

                    status: "ACTIVE",

                    createdById: req.user.userId,

                    // Carry Lead BDE assignment into Client
                    assignedBdeId: lead.assignedToId || null,
                },
            });

            // ----------------------------------------------------
            // COPY LEAD SERVICE SELECTIONS → CLIENT
            // ----------------------------------------------------

            if (lead.serviceSelections.length > 0) {
                await tx.clientServiceSelection.createMany({
                    data: lead.serviceSelections.map((selection) => ({
                        clientId: client.id,

                        serviceId: selection.serviceId,

                        serviceCode: selection.serviceCode,
                        serviceName: selection.serviceName,

                        pricingBasis: selection.pricingBasis,
                        pricingLabel: selection.pricingLabel,
                        assetCategory: selection.assetCategory,

                        quantity: selection.quantity,
                        unitRate: selection.unitRate,

                        baseAmount: selection.baseAmount,

                        gstPercent: selection.gstPercent,
                        gstAmount: selection.gstAmount,

                        totalAmount: selection.totalAmount,

                        notes: selection.notes,

                        createdById: selection.createdById,
                    })),
                });
            }

            // ----------------------------------------------------
            // UPDATE LEAD
            // ----------------------------------------------------

            const updatedLead = await tx.lead.update({
                where: {
                    id: lead.id,
                },

                data: {
                    status: "WON",
                    clientId: client.id,
                },

                include: {
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },

                    createdBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },

                    client: true,
                },
            });

            // ----------------------------------------------------
            // FETCH CLIENT WITH COPIED SERVICES
            // ----------------------------------------------------

            const finalClient =
                await tx.client.findUnique({
                    where: {
                        id: client.id,
                    },

                    include: {
                        serviceSelections: {
                            orderBy: {
                                createdAt: "asc",
                            },
                        },

                        assignedBde: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },

                        createdBy: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                });

            return {
                client: finalClient,
                lead: updatedLead,
            };
        });

        // --------------------------------------------------------
        // CALCULATE SERVICE SUMMARY
        // --------------------------------------------------------

        const serviceSelections =
            result.client?.serviceSelections || [];

        const serviceSummary = {
            serviceCount: serviceSelections.length,

            baseAmount: serviceSelections.reduce(
                (sum, item) =>
                    sum + Number(item.baseAmount || 0),
                0
            ),

            gstAmount: serviceSelections.reduce(
                (sum, item) =>
                    sum + Number(item.gstAmount || 0),
                0
            ),

            totalAmount: serviceSelections.reduce(
                (sum, item) =>
                    sum + Number(item.totalAmount || 0),
                0
            ),
        };

        return res.status(201).json({
            success: true,
            message: "Lead converted to client successfully",

            data: {
                client: result.client,

                serviceSummary,

                lead: result.lead,
            },
        });
    } catch (error) {
        console.error(
            "CONVERT LEAD TO CLIENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to convert lead to client",
        });
    }
}

// ============================================================
// ASSIGN / REASSIGN LEAD TO BDE
// ============================================================

const assignLeadBdeSchema = z.object({
    bdeId: z.string().trim().min(1),
});

export async function assignLeadBde(req, res) {
    try {
        const { id } = req.params;

        // --------------------------------------------------------
        // Only Admin can assign/reassign a lead to a BDE
        // --------------------------------------------------------

        if (!isAdmin(req)) {
            return res.status(403).json({
                success: false,
                message: "Only Admin can assign or reassign a lead to a BDE",
            });
        }

        // --------------------------------------------------------
        // Validate request body
        // --------------------------------------------------------

        const validation = assignLeadBdeSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Valid bdeId is required",
                errors: validation.error.flatten(),
            });
        }

        const { bdeId } = validation.data;

        // --------------------------------------------------------
        // Check lead
        // --------------------------------------------------------

        const existingLead = await prisma.lead.findUnique({
            where: {
                id,
            },
        });

        if (!existingLead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        // --------------------------------------------------------
        // Check selected BDE
        // --------------------------------------------------------

        const bde = await prisma.user.findUnique({
            where: {
                id: bdeId,
            },

            include: {
                role: true,
            },
        });

        if (!bde) {
            return res.status(404).json({
                success: false,
                message: "BDE user not found",
            });
        }

        if (bde.role.name !== "BDE/Sales") {
            return res.status(400).json({
                success: false,
                message: "Selected user is not a BDE/Sales user",
            });
        }

        if (bde.status !== "ACTIVE") {
            return res.status(400).json({
                success: false,
                message: "Selected BDE is not active",
            });
        }

        // --------------------------------------------------------
        // Assign / Reassign lead
        // --------------------------------------------------------

        const lead = await prisma.lead.update({
            where: {
                id,
            },

            data: {
                assignedToId: bde.id,
            },

            include: {
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        mobile: true,
                        role: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },

                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        return res.status(200).json({
            success: true,
            message: "Lead assigned to BDE successfully",
            data: {
                lead,
            },
        });
    } catch (error) {
        console.error("ASSIGN LEAD BDE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to assign lead to BDE",
        });
    }
}