import { z } from "zod";
import prisma from "../config/prisma.js";

/* ============================================================
   VALIDATION
============================================================ */

const createPSGASchema = z.object({
    psgNumber: z.string().trim().min(1),

    clientId: z.string().trim().min(1),

    leadId: z.string().trim().optional(),

    bdeId: z.string().trim().optional(),

    status: z
        .enum([
            "GENERATED",
            "SENT",
            "ACCEPTED",
            "REJECTED",
            "CANCELLED",
        ])
        .optional(),

    generatedAt:
        z.string().datetime().optional(),

    sentAt:
        z.string().datetime().optional(),

    acceptedAt:
        z.string().datetime().optional(),

    rejectedAt:
        z.string().datetime().optional(),
});

const updatePSGASchema = z.object({
    status: z
        .enum([
            "GENERATED",
            "SENT",
            "ACCEPTED",
            "REJECTED",
            "CANCELLED",
        ])
        .optional(),

    sentAt:
        z.string().datetime().nullable().optional(),

    acceptedAt:
        z.string().datetime().nullable().optional(),

    rejectedAt:
        z.string().datetime().nullable().optional(),

    bdeId:
        z.string().trim().nullable().optional(),

    leadId:
        z.string().trim().nullable().optional(),
});

/* ============================================================
   GENERAL HELPERS
============================================================ */

function formatValidationError(error) {
    if (error instanceof z.ZodError) {
        return error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
    }

    return [];
}

function isAdmin(req) {
    return req.user?.role === "Admin";
}

function isBde(req) {
    return req.user?.role === "BDE/Sales";
}

/* ============================================================
   BDE ACCESS HELPERS
============================================================ */

function buildBdeLeadWhere(userId) {
    return {
        OR: [
            {
                createdById: userId,
            },

            {
                assignedToId: userId,
            },
        ],
    };
}

function buildBdeClientWhere(userId) {
    return {
        OR: [
            {
                createdById: userId,
            },

            {
                assignedBdeId: userId,
            },

            {
                sourceLead: {
                    is: {
                        createdById: userId,
                    },
                },
            },

            {
                sourceLead: {
                    is: {
                        assignedToId: userId,
                    },
                },
            },
        ],
    };
}

function buildBdePSGAWhere(userId) {
    return {
        OR: [
            {
                bdeId: userId,
            },

            {
                lead: {
                    is: buildBdeLeadWhere(userId),
                },
            },

            {
                client: {
                    is: buildBdeClientWhere(userId),
                },
            },
        ],
    };
}

/* ============================================================
   CHECK BDE ACCESS TO LEAD
============================================================ */

async function canAccessLead(
    leadId,
    req
) {
    if (!leadId) {
        return true;
    }

    if (isAdmin(req)) {
        const lead =
            await prisma.lead.findUnique({
                where: {
                    id: leadId,
                },

                select: {
                    id: true,
                },
            });

        return !!lead;
    }

    if (isBde(req)) {
        const lead =
            await prisma.lead.findFirst({
                where: {
                    id: leadId,

                    ...buildBdeLeadWhere(
                        req.user.userId
                    ),
                },

                select: {
                    id: true,
                },
            });

        return !!lead;
    }

    return false;
}

/* ============================================================
   CHECK BDE ACCESS TO CLIENT
============================================================ */

async function canAccessClient(
    clientId,
    req
) {
    if (!clientId) {
        return true;
    }

    const client =
        await prisma.client.findUnique({
            where: {
                id: clientId,
            },

            select: {
                id: true,

                createdById: true,

                assignedBdeId: true,

                sourceLead: {
                    select: {
                        createdById: true,
                        assignedToId: true,
                    },
                },
            },
        });

    if (!client) {
        return false;
    }

    /*
    |--------------------------------------------------------------------------
    | Admin can access every client
    |--------------------------------------------------------------------------
    */

    if (isAdmin(req)) {
        return true;
    }

    /*
    |--------------------------------------------------------------------------
    | BDE/Sales ownership rules
    |--------------------------------------------------------------------------
    */

    if (isBde(req)) {
        const userId =
            req.user.userId;

        return (
            client.createdById === userId ||
            client.assignedBdeId === userId ||
            client.sourceLead?.createdById ===
                userId ||
            client.sourceLead?.assignedToId ===
                userId
        );
    }

    return false;
}

/* ============================================================
   CHECK BDE ACCESS TO PSGA
============================================================ */

async function getAccessiblePSGA(
    id,
    req
) {
    if (isAdmin(req)) {
        return prisma.pSGA.findUnique({
            where: {
                id,
            },
        });
    }

    if (isBde(req)) {
        return prisma.pSGA.findFirst({
            where: {
                id,

                ...buildBdePSGAWhere(
                    req.user.userId
                ),
            },
        });
    }

    return null;
}

/* ============================================================
   CREATE PSGA
============================================================ */

export async function createPSGA(
    req,
    res
) {
    try {
        const parsed =
            createPSGASchema.safeParse(
                req.body
            );

        if (!parsed.success) {
            return res.status(400).json({
                success: false,

                message:
                    "Invalid PSGA data",

                errors:
                    formatValidationError(
                        parsed.error
                    ),
            });
        }

        const data = parsed.data;

        /*
        |--------------------------------------------------------------------------
        | Check duplicate PSGA number
        |--------------------------------------------------------------------------
        */

        const existingPSGA =
            await prisma.pSGA.findUnique({
                where: {
                    psgNumber:
                        data.psgNumber,
                },
            });

        if (existingPSGA) {
            return res.status(409).json({
                success: false,

                message:
                    "PSGA number already exists",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Check client
        |--------------------------------------------------------------------------
        */

        const client =
            await prisma.client.findUnique({
                where: {
                    id: data.clientId,
                },

                select: {
                    id: true,
                    processStage: true,
                    assignedBdeId: true,
                    createdById: true,
                },
            });

        if (!client) {
            return res.status(404).json({
                success: false,

                message:
                    "Client not found",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | BDE cannot use inaccessible client
        |--------------------------------------------------------------------------
        */

        if (isBde(req)) {
            const clientAccessible =
                await canAccessClient(
                    data.clientId,
                    req
                );

            if (!clientAccessible) {
                return res.status(403).json({
                    success: false,

                    message:
                        "You are not allowed to access this client",
                });
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Check lead if provided
        |--------------------------------------------------------------------------
        */

        if (data.leadId) {
            const lead =
                await prisma.lead.findUnique({
                    where: {
                        id: data.leadId,
                    },

                    select: {
                        id: true,
                        clientId: true,
                    },
                });

            if (!lead) {
                return res.status(404).json({
                    success: false,

                    message:
                        "Lead not found",
                });
            }

            /*
            |--------------------------------------------------------------------------
            | If lead is linked to another client,
            | prevent invalid PSGA relation.
            |--------------------------------------------------------------------------
            */

            if (
                lead.clientId &&
                lead.clientId !==
                    data.clientId
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Selected lead is linked to another client",
                });
            }

            /*
            |--------------------------------------------------------------------------
            | BDE cannot use inaccessible lead
            |--------------------------------------------------------------------------
            */

            if (isBde(req)) {
                const leadAccessible =
                    await canAccessLead(
                        data.leadId,
                        req
                    );

                if (!leadAccessible) {
                    return res.status(403).json({
                        success: false,

                        message:
                            "You are not allowed to access this lead",
                    });
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Check BDE if provided
        |--------------------------------------------------------------------------
        */

        if (data.bdeId) {
            const bde =
                await prisma.user.findUnique({
                    where: {
                        id: data.bdeId,
                    },

                    include: {
                        role: true,
                    },
                });

            if (!bde) {
                return res.status(404).json({
                    success: false,

                    message:
                        "BDE user not found",
                });
            }

            if (
                bde.status !==
                "ACTIVE"
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Selected BDE is not active",
                });
            }

            if (
                bde.role.name !==
                "BDE/Sales"
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Selected user is not a BDE/Sales user",
                });
            }

            /*
            |--------------------------------------------------------------------------
            | BDE cannot assign PSGA to another BDE
            |--------------------------------------------------------------------------
            */

            if (
                isBde(req) &&
                data.bdeId !==
                    req.user.userId
            ) {
                return res.status(403).json({
                    success: false,

                    message:
                        "You can only create PSGA for yourself",
                });
            }
        }

        /*
        |--------------------------------------------------------------------------
        | If BDE does not provide bdeId,
        | assign current BDE.
        |--------------------------------------------------------------------------
        */

        let finalBdeId =
            data.bdeId || null;

        if (isBde(req)) {
            finalBdeId =
                req.user.userId;
        }

        /*
        |--------------------------------------------------------------------------
        | IMPORTANT BUSINESS RULE
        |--------------------------------------------------------------------------
        |
        | PSGA status does NOT decide incentive eligibility.
        |
        | Incentive eligibility is controlled by:
        |
        | Client.processStage === PSGA_COMPLETED
        |
        | Therefore a newly created PSGA is always:
        |
        | NOT_ELIGIBLE
        |
        | It becomes ELIGIBLE only when client process
        | reaches PSGA_COMPLETED.
        |--------------------------------------------------------------------------
        */

        const psgStatus =
            data.status ||
            "GENERATED";

        /*
        |--------------------------------------------------------------------------
        | Create PSGA
        |--------------------------------------------------------------------------
        */

        const pSGA =
            await prisma.pSGA.create({
                data: {
                    psgNumber:
                        data.psgNumber,

                    status:
                        psgStatus,

                    clientId:
                        data.clientId,

                    leadId:
                        data.leadId ||
                        null,

                    bdeId:
                        finalBdeId,

                    generatedAt:
                        data.generatedAt
                            ? new Date(
                                  data.generatedAt
                              )
                            : new Date(),

                    sentAt:
                        data.sentAt
                            ? new Date(
                                  data.sentAt
                              )
                            : null,

                    acceptedAt:
                        data.acceptedAt
                            ? new Date(
                                  data.acceptedAt
                              )
                            : null,

                    rejectedAt:
                        data.rejectedAt
                            ? new Date(
                                  data.rejectedAt
                              )
                            : null,

                    /*
                    |--------------------------------------------------------------------------
                    | DO NOT make incentive eligible based on ACCEPTED.
                    |--------------------------------------------------------------------------
                    */

                    incentiveStatus:
                        client.processStage ===
                        "PSGA_COMPLETED"
                            ? "ELIGIBLE"
                            : "NOT_ELIGIBLE",
                },

                include: {
                    client: true,

                    lead: true,

                    bde: {
                        select: {
                            id: true,
                            firstName:
                                true,
                            lastName:
                                true,
                            email:
                                true,
                        },
                    },
                },
            });

        return res.status(201).json({
            success: true,

            message:
                "PSGA tracking record created successfully",

            data: pSGA,
        });
    } catch (error) {
        console.error(
            "createPSGA error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Failed to create PSGA record",

            error:
                error instanceof Error
                    ? error.message
                    : String(error),
        });
    }
}

/* ============================================================
   GET ALL PSGA
============================================================ */

export async function getPSGAs(
    req,
    res
) {
    try {
        const where =
            isAdmin(req)
                ? {}
                : isBde(req)
                ? buildBdePSGAWhere(
                      req.user.userId
                  )
                : {
                      bdeId:
                          req.user.userId,
                  };

        const pSGAs =
            await prisma.pSGA.findMany({
                where,

                orderBy: {
                    createdAt:
                        "desc",
                },

                include: {
                    client: {
                        select: {
                            id: true,
                            associationName:
                                true,
                            contactName:
                                true,
                            email:
                                true,
                            mobile:
                                true,
                            processStage:
                                true,
                            externalClientId:
                                true,
                            fsoNumber:
                                true,
                            fsoGeneratedAt:
                                true,
                            psgaGeneratedAt:
                                true,
                            processUpdatedAt:
                                true,
                        },
                    },

                    lead: {
                        select: {
                            id: true,
                            associationName:
                                true,
                            contactName:
                                true,
                            status:
                                true,
                        },
                    },

                    bde: {
                        select: {
                            id: true,
                            firstName:
                                true,
                            lastName:
                                true,
                            email:
                                true,
                        },
                    },

                    incentiveAllocations: {
                        include: {
                            bde: {
                                select: {
                                    id: true,
                                    firstName:
                                        true,
                                    lastName:
                                        true,
                                    email:
                                        true,
                                },
                            },

                            admin: {
                                select: {
                                    id: true,
                                    firstName:
                                        true,
                                    lastName:
                                        true,
                                    email:
                                        true,
                                },
                            },
                        },
                    },
                },
            });

        return res.status(200).json({
            success: true,

            count:
                pSGAs.length,

            data:
                pSGAs,
        });
    } catch (error) {
        console.error(
            "getPSGAs error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Failed to fetch PSGA records",

            error:
                error instanceof Error
                    ? error.message
                    : String(error),
        });
    }
}

/* ============================================================
   GET PSGA BY ID
============================================================ */

export async function getPSGAById(
    req,
    res
) {
    try {
        const { id } =
            req.params;

        const accessiblePSGA =
            await getAccessiblePSGA(
                id,
                req
            );

        if (!accessiblePSGA) {
            return res.status(404).json({
                success: false,

                message:
                    "PSGA not found",
            });
        }

        const pSGA =
            await prisma.pSGA.findUnique({
                where: {
                    id,
                },

                include: {
                    client: true,

                    lead: true,

                    bde: {
                        select: {
                            id: true,
                            firstName:
                                true,
                            lastName:
                                true,
                            email:
                                true,
                            mobile:
                                true,
                        },
                    },

                    incentiveAllocations: {
                        include: {
                            bde: {
                                select: {
                                    id: true,
                                    firstName:
                                        true,
                                    lastName:
                                        true,
                                    email:
                                        true,
                                },
                            },

                            admin: {
                                select: {
                                    id: true,
                                    firstName:
                                        true,
                                    lastName:
                                        true,
                                    email:
                                        true,
                                },
                            },

                            approvedBy: {
                                select: {
                                    id: true,
                                    firstName:
                                        true,
                                    lastName:
                                        true,
                                    email:
                                        true,
                                },
                            },
                        },
                    },
                },
            });

        return res.status(200).json({
            success: true,

            data:
                pSGA,
        });
    } catch (error) {
        console.error(
            "getPSGAById error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Failed to fetch PSGA",

            error:
                error instanceof Error
                    ? error.message
                    : String(error),
        });
    }
}

/* ============================================================
   UPDATE PSGA
============================================================ */

export async function updatePSGA(
    req,
    res
) {
    try {
        const { id } =
            req.params;

        const parsed =
            updatePSGASchema.safeParse(
                req.body
            );

        if (!parsed.success) {
            return res.status(400).json({
                success: false,

                message:
                    "Invalid PSGA update data",

                errors:
                    formatValidationError(
                        parsed.error
                    ),
            });
        }

        const data =
            parsed.data;

        /*
        |--------------------------------------------------------------------------
        | Check PSGA access
        |--------------------------------------------------------------------------
        */

        const existingPSGA =
            await getAccessiblePSGA(
                id,
                req
            );

        if (!existingPSGA) {
            return res.status(403).json({
                success: false,

                message:
                    "You are not allowed to access this PSGA",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Fetch current PSGA + client process stage
        |--------------------------------------------------------------------------
        */

        const currentPSGA =
            await prisma.pSGA.findUnique({
                where: {
                    id,
                },

                select: {
                    id: true,

                    clientId:
                        true,

                    status:
                        true,

                    incentiveStatus:
                        true,
                },
            });

        if (!currentPSGA) {
            return res.status(404).json({
                success: false,

                message:
                    "PSGA not found",
            });
        }

        const client =
            await prisma.client.findUnique({
                where: {
                    id:
                        currentPSGA.clientId,
                },

                select: {
                    id: true,

                    processStage:
                        true,
                },
            });

        if (!client) {
            return res.status(404).json({
                success: false,

                message:
                    "Client linked with PSGA not found",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | BDE cannot change PSGA ownership to another BDE
        |--------------------------------------------------------------------------
        */

        if (
            isBde(req) &&
            data.bdeId !==
                undefined &&
            data.bdeId !== null &&
            data.bdeId !==
                req.user.userId
        ) {
            return res.status(403).json({
                success: false,

                message:
                    "You can only assign PSGA to yourself",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Check BDE if changing
        |--------------------------------------------------------------------------
        */

        if (data.bdeId) {
            const bde =
                await prisma.user.findUnique({
                    where: {
                        id:
                            data.bdeId,
                    },

                    include: {
                        role: true,
                    },
                });

            if (!bde) {
                return res.status(404).json({
                    success: false,

                    message:
                        "BDE user not found",
                });
            }

            if (
                bde.status !==
                "ACTIVE"
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Selected BDE is not active",
                });
            }

            if (
                bde.role.name !==
                "BDE/Sales"
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Selected user is not a BDE/Sales user",
                });
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Check new lead if changing
        |--------------------------------------------------------------------------
        */

        if (
            data.leadId !==
                undefined &&
            data.leadId !== null
        ) {
            const leadExists =
                await prisma.lead.findUnique({
                    where: {
                        id:
                            data.leadId,
                    },

                    select: {
                        id: true,
                        clientId:
                            true,
                    },
                });

            if (!leadExists) {
                return res.status(404).json({
                    success: false,

                    message:
                        "Lead not found",
                });
            }

            /*
            |--------------------------------------------------------------------------
            | Lead must belong to same client if already linked.
            |--------------------------------------------------------------------------
            */

            if (
                leadExists.clientId &&
                leadExists.clientId !==
                    currentPSGA.clientId
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Selected lead is linked to another client",
                });
            }

            if (isBde(req)) {
                const leadAccessible =
                    await canAccessLead(
                        data.leadId,
                        req
                    );

                if (!leadAccessible) {
                    return res.status(403).json({
                        success: false,

                        message:
                            "You are not allowed to access this lead",
                    });
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Build update data
        |--------------------------------------------------------------------------
        */

        const updateData = {};

        if (
            data.status !==
            undefined
        ) {
            updateData.status =
                data.status;
        }

        if (
            data.bdeId !==
            undefined
        ) {
            updateData.bdeId =
                data.bdeId;
        }

        if (
            data.leadId !==
            undefined
        ) {
            updateData.leadId =
                data.leadId;
        }

        if (
            data.sentAt !==
            undefined
        ) {
            updateData.sentAt =
                data.sentAt
                    ? new Date(
                          data.sentAt
                      )
                    : null;
        }

        if (
            data.acceptedAt !==
            undefined
        ) {
            updateData.acceptedAt =
                data.acceptedAt
                    ? new Date(
                          data.acceptedAt
                      )
                    : null;
        }

        if (
            data.rejectedAt !==
            undefined
        ) {
            updateData.rejectedAt =
                data.rejectedAt
                    ? new Date(
                          data.rejectedAt
                      )
                    : null;
        }

        /*
        |--------------------------------------------------------------------------
        | ACCEPTED timestamp
        |--------------------------------------------------------------------------
        |
        | ACCEPTED is only a PSGA status.
        |
        | It does NOT make incentive eligible.
        |--------------------------------------------------------------------------
        */

        if (
            data.status ===
                "ACCEPTED" &&
            data.acceptedAt ===
                undefined
        ) {
            updateData.acceptedAt =
                new Date();
        }

        /*
        |--------------------------------------------------------------------------
        | Incentive eligibility
        |--------------------------------------------------------------------------
        |
        | ONLY client.processStage === PSGA_COMPLETED
        | controls incentive eligibility.
        |
        | No percentage or amount is calculated here.
        |--------------------------------------------------------------------------
        */

        if (
            client.processStage ===
            "PSGA_COMPLETED"
        ) {
            updateData.incentiveStatus =
                "ELIGIBLE";
        } else {
            updateData.incentiveStatus =
                "NOT_ELIGIBLE";
        }

        /*
        |--------------------------------------------------------------------------
        | Update PSGA
        |--------------------------------------------------------------------------
        */

        const updatedPSGA =
            await prisma.pSGA.update({
                where: {
                    id,
                },

                data:
                    updateData,

                include: {
                    client: true,

                    lead: true,

                    bde: {
                        select: {
                            id: true,
                            firstName:
                                true,
                            lastName:
                                true,
                            email:
                                true,
                        },
                    },

                    incentiveAllocations: {
                        include: {
                            bde: {
                                select: {
                                    id: true,
                                    firstName:
                                        true,
                                    lastName:
                                        true,
                                    email:
                                        true,
                                },
                            },

                            admin: {
                                select: {
                                    id: true,
                                    firstName:
                                        true,
                                    lastName:
                                        true,
                                    email:
                                        true,
                                },
                            },
                        },
                    },
                },
            });

        return res.status(200).json({
            success: true,

            message:
                "PSGA updated successfully",

            data:
                updatedPSGA,
        });
    } catch (error) {
        console.error(
            "updatePSGA error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Failed to update PSGA",

            error:
                error instanceof Error
                    ? error.message
                    : String(error),
        });
    }
}