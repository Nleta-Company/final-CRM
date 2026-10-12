import { z } from "zod";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function isAdmin(req) {
    return req.user?.role === "Admin";
}

function isBde(req) {
    return req.user?.role === "BDE/Sales";
}

function normalizeRole(role) {
    if (!role) return "";

    return String(role)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");
}

function isActiveBde(user) {
    if (!user) return false;

    return (
        user.isActive === true &&
        normalizeRole(user.role?.name) === "BDE/SALES"
    );
}

const INCENTIVE_STATUS_FLOW = {
    NOT_ELIGIBLE: 0,
    ELIGIBLE: 1,
    APPROVED: 2,
    PAID: 3,
};

/*
|--------------------------------------------------------------------------
| Includes
|--------------------------------------------------------------------------
*/

function incentiveInclude() {
    return {
        client: {
            select: {
                id: true,
                companyName: true,
                contactPerson: true,
                contactEmail: true,
                contactPhone: true,
                processStage: true,
                processUpdatedAt: true,
                externalClientId: true,
                fsoNumber: true,
                fsoGeneratedAt: true,
                psgaGeneratedAt: true,

                assignedBdeId: true,

                assignedBde: {
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

                sourceLead: {
                    select: {
                        id: true,
                        associationName: true,
                        assignedToId: true,
                        createdById: true,

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
                },
            },
        },

        psg: {
            select: {
                id: true,
                psgNumber: true,
                status: true,
                generatedAt: true,
                clientId: true,
            },
        },

        bde: {
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

        admin: {
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

        approvedBy: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
            },
        },
    };
}

/*
|--------------------------------------------------------------------------
| Find incentive recipient from Client
|--------------------------------------------------------------------------
|
| Lead-origin client:
|     sourceLead.assignedToId -> BDE
|
| Direct Admin-created client:
|     current logged-in Admin
|
*/

function getClientRecipient(client, currentUser) {
    const sourceLead = client?.sourceLead;

    if (sourceLead) {
        const bdeId =
            sourceLead.assignedToId ||
            client.assignedBdeId ||
            null;

        return {
            recipientType: "BDE",
            bdeId,
            adminId: null,
        };
    }

    return {
        recipientType: "ADMIN",
        bdeId: null,
        adminId: currentUser?.id || null,
    };
}

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

const createIncentiveSchema = z.object({
    clientId: z.string().trim().min(1),

    // Optional because CRM does not generate PSGA.
    psgId: z.string().trim().optional(),

    recipientType: z.enum(["BDE", "ADMIN"]),

    bdeId: z.string().trim().optional(),

    adminId: z.string().trim().optional(),

    role: z.enum([
        "PRIMARY",
        "SUPPORTING",
    ]),

    reason: z.string().trim().max(1000).optional(),

    incentivePercent: z
        .coerce
        .number()
        .min(0)
        .max(100),
});

const updateIncentiveSchema = z.object({
    role: z
        .enum([
            "PRIMARY",
            "SUPPORTING",
        ])
        .optional(),

    reason: z
        .string()
        .trim()
        .max(1000)
        .optional(),

    incentivePercent: z
        .coerce
        .number()
        .min(0)
        .max(100)
        .optional(),

    status: z
        .enum([
            "NOT_ELIGIBLE",
            "ELIGIBLE",
            "APPROVED",
            "PAID",
        ])
        .optional(),
});

/*
|--------------------------------------------------------------------------
| GET eligible clients
|--------------------------------------------------------------------------
|
| This is the main endpoint for the Incentive page.
|
| It does NOT require a PSGA database record.
|
*/

async function getEligibleClients(req, res) {
    try {
        const clients = await prisma.client.findMany({
            where: {
                processStage: "PSGA_COMPLETED",
            },

            include: {
                assignedBde: {
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

                sourceLead: {
                    select: {
                        id: true,
                        associationName: true,
                        assignedToId: true,
                        createdById: true,

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
                },

                psgas: {
                    select: {
                        id: true,
                        psgNumber: true,
                        status: true,
                        generatedAt: true,
                        clientId: true,
                    },
                    orderBy: {
                        generatedAt: "desc",
                    },
                },

                incentiveAllocations: {
                    include: {
                        bde: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },

                        admin: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },

                        approvedBy: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },

                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },

            orderBy: {
                processUpdatedAt: "desc",
            },
        });

        const data = clients.map((client) => {
            const sourceLead = client.sourceLead;

            const recipientType = sourceLead
                ? "BDE"
                : "ADMIN";

            const recipientBde =
                sourceLead?.assignedTo ||
                client.assignedBde ||
                null;

            return {
                clientId: client.id,

                companyName: client.companyName,

                contactPerson: client.contactPerson,

                contactEmail: client.contactEmail,

                contactPhone: client.contactPhone,

                processStage: client.processStage,

                processUpdatedAt: client.processUpdatedAt,

                externalClientId: client.externalClientId,

                fsoNumber: client.fsoNumber,

                fsoGeneratedAt: client.fsoGeneratedAt,

                psgaGeneratedAt: client.psgaGeneratedAt,

                source: sourceLead
                    ? "LEAD"
                    : "ADMIN",

                sourceLead: sourceLead
                    ? {
                        id: sourceLead.id,
                        associationName:
                            sourceLead.associationName,
                    }
                    : null,

                recipient: {
                    type: recipientType,

                    bde: recipientBde
                        ? {
                            id: recipientBde.id,
                            firstName:
                                recipientBde.firstName,
                            lastName:
                                recipientBde.lastName,
                            email:
                                recipientBde.email,
                            mobile:
                                recipientBde.mobile,
                        }
                        : null,
                },

                /*
                 * PSGA is optional.
                 * If another system eventually stores it,
                 * it will appear here automatically.
                 */
                psgas: client.psgas,

                incentiveEligible: true,

                allocations:
                    client.incentiveAllocations,
            };
        });

        return res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        console.error(
            "getEligibleClients error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch incentive eligible clients",
        });
    }
}

/*
|--------------------------------------------------------------------------
| GET incentives for a client
|--------------------------------------------------------------------------
*/

async function getClientIncentives(req, res) {
    try {
        const { clientId } = req.params;

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: "Client ID is required",
            });
        }

        const client = await prisma.client.findUnique({
            where: {
                id: clientId,
            },

            include: {
                sourceLead: {
                    select: {
                        id: true,
                        associationName: true,
                        assignedToId: true,
                    },
                },

                assignedBde: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        mobile: true,
                    },
                },

                psgas: {
                    select: {
                        id: true,
                        psgNumber: true,
                        status: true,
                        generatedAt: true,
                    },
                    orderBy: {
                        generatedAt: "desc",
                    },
                },

                incentiveAllocations: {
                    include: {
                        bde: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                mobile: true,
                            },
                        },

                        admin: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                mobile: true,
                            },
                        },

                        approvedBy: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },

                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found",
            });
        }

        const recipient =
            getClientRecipient(
                client,
                req.user
            );

        return res.status(200).json({
            success: true,

            data: {
                client: {
                    id: client.id,
                    companyName:
                        client.companyName,
                    processStage:
                        client.processStage,
                },

                eligible:
                    client.processStage ===
                    "PSGA_COMPLETED",

                recipient,

                psgas: client.psgas,

                allocations:
                    client.incentiveAllocations,
            },
        });
    } catch (error) {
        console.error(
            "getClientIncentives error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch client incentives",
        });
    }
}

/*
|--------------------------------------------------------------------------
| POST create incentive allocation
|--------------------------------------------------------------------------
*/

async function createIncentive(req, res) {
    try {
        const parsed =
            createIncentiveSchema.safeParse(
                req.body
            );

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid incentive data",
                errors: parsed.error.flatten(),
            });
        }

        const data = parsed.data;

        const client =
            await prisma.client.findUnique({
                where: {
                    id: data.clientId,
                },

                include: {
                    sourceLead: {
                        select: {
                            id: true,
                            assignedToId: true,
                        },
                    },

                    assignedBde: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            mobile: true,
                            isActive: true,
                            role: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },

                    incentiveAllocations: {
                        select: {
                            id: true,
                            recipientType: true,
                            bdeId: true,
                            adminId: true,
                            role: true,
                            incentivePercent: true,
                            status: true,
                        },
                    },
                },
            });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found",
            });
        }

        /*
         * Incentive is allowed only after PSGA is completed.
         */
        if (
            client.processStage !==
            "PSGA_COMPLETED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Incentive is available only after PSGA is completed.",
            });
        }

        /*
         * Optional PSGA validation.
         * CRM does not require one.
         */
        let psg = null;

        if (data.psgId) {
            psg =
                await prisma.pSGA.findUnique({
                    where: {
                        id: data.psgId,
                    },
                    select: {
                        id: true,
                        clientId: true,
                    },
                });

            if (!psg) {
                return res.status(404).json({
                    success: false,
                    message: "PSGA not found",
                });
            }

            if (
                psg.clientId !==
                client.id
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "PSGA does not belong to this client.",
                });
            }
        }

        /*
         * Determine actual recipient.
         */
        const expectedRecipient =
            getClientRecipient(
                client,
                req.user
            );

        /*
         * Lead-origin client must go to BDE.
         */
        if (
            expectedRecipient.recipientType ===
            "BDE"
        ) {
            if (!expectedRecipient.bdeId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Lead-origin client does not have an assigned BDE.",
                });
            }

            if (
                data.recipientType !==
                "BDE"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Lead-origin incentive must be assigned to a BDE.",
                });
            }

            const requestedBdeId =
                data.bdeId ||
                expectedRecipient.bdeId;

            if (
                requestedBdeId !==
                expectedRecipient.bdeId
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You cannot assign this lead-origin incentive to another BDE.",
                });
            }

            const bde =
                await prisma.user.findUnique({
                    where: {
                        id: requestedBdeId,
                    },
                    include: {
                        role: true,
                    },
                });

            if (!bde) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Assigned BDE not found.",
                });
            }

            if (!isActiveBde(bde)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Assigned BDE is not active.",
                });
            }
        }

        /*
         * Direct Admin-created client must go to Admin.
         */
        if (
            expectedRecipient.recipientType ===
            "ADMIN"
        ) {
            if (
                data.recipientType !==
                "ADMIN"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Direct Admin-created client incentive must be assigned to Admin.",
                });
            }

            if (
                data.adminId &&
                data.adminId !== req.user.id
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Admin incentive must belong to the current Admin.",
                });
            }
        }

        /*
         * Resolve recipient IDs.
         */
        const finalBdeId =
            expectedRecipient.recipientType ===
            "BDE"
                ? expectedRecipient.bdeId
                : null;

        const finalAdminId =
            expectedRecipient.recipientType ===
            "ADMIN"
                ? req.user.id
                : null;

        /*
         * Prevent duplicate same-recipient allocation.
         */
        const duplicate =
            await prisma.pSGAIncentiveAllocation.findFirst(
                {
                    where: {
                        clientId: client.id,

                        recipientType:
                            expectedRecipient.recipientType,

                        ...(finalBdeId
                            ? {
                                bdeId:
                                    finalBdeId,
                            }
                            : {}),

                        ...(finalAdminId
                            ? {
                                adminId:
                                    finalAdminId,
                            }
                            : {}),
                    },
                }
            );

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message:
                    "An incentive allocation already exists for this recipient.",
            });
        }

        /*
         * Current allocation cap.
         *
         * This only prevents allocations from exceeding
         * 100%. It does not define the business payout rule.
         */
        const existingAllocations =
            await prisma.pSGAIncentiveAllocation.findMany(
                {
                    where: {
                        clientId: client.id,
                    },

                    select: {
                        incentivePercent: true,
                    },
                }
            );

        const existingPercent =
            existingAllocations.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.incentivePercent
                    ),
                0
            );

        const requestedPercent =
            Number(
                data.incentivePercent
            );

        if (
            existingPercent +
                requestedPercent >
            100
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `Total incentive allocation cannot exceed 100%. Existing: ${existingPercent}%, requested: ${requestedPercent}%.`,
            });
        }

        const allocation =
            await prisma.pSGAIncentiveAllocation.create(
                {
                    data: {
                        clientId:
                            client.id,

                        psgId:
                            psg?.id || null,

                        recipientType:
                            expectedRecipient.recipientType,

                        bdeId:
                            finalBdeId,

                        adminId:
                            finalAdminId,

                        role: data.role,

                        reason:
                            data.reason ||
                            null,

                        incentivePercent:
                            requestedPercent,

                        status: "ELIGIBLE",
                    },

                    include:
                        incentiveInclude(),
                }
            );

        return res.status(201).json({
            success: true,
            message:
                "Incentive allocation created successfully.",
            data: allocation,
        });
    } catch (error) {
        console.error(
            "createIncentive error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to create incentive allocation.",
        });
    }
}

/*
|--------------------------------------------------------------------------
| PUT update incentive
|--------------------------------------------------------------------------
*/

async function updateIncentive(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message:
                    "Incentive allocation ID is required.",
            });
        }

        const parsed =
            updateIncentiveSchema.safeParse(
                req.body
            );

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid incentive data",
                errors: parsed.error.flatten(),
            });
        }

        const input = parsed.data;

        const existing =
            await prisma.pSGAIncentiveAllocation.findUnique(
                {
                    where: {
                        id,
                    },

                    include: {
                        client: {
                            select: {
                                id: true,
                                processStage: true,
                            },
                        },

                        bde: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },

                        admin: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                }
            );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message:
                    "Incentive allocation not found.",
            });
        }

        if (
            existing.client.processStage !==
            "PSGA_COMPLETED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Client is not eligible for incentive.",
            });
        }

        /*
         * Paid incentives are locked.
         */
        if (
            existing.status === "PAID"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Paid incentive cannot be modified.",
            });
        }

        /*
         * BDE users can only modify their own
         * supporting allocation.
         */
        if (!isAdmin(req)) {
            if (!isBde(req)) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You do not have permission to update this incentive.",
                });
            }

            if (
                existing.recipientType !==
                "BDE"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You cannot modify an Admin incentive.",
                });
            }

            if (
                existing.bdeId !==
                req.user.id
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You can only modify your own incentive.",
                });
            }

            if (
                input.status ===
                    "APPROVED" ||
                input.status === "PAID"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only Admin can approve or mark an incentive as paid.",
                });
            }
        }

        /*
         * Validate status progression.
         */
        if (input.status) {
            const currentRank =
                INCENTIVE_STATUS_FLOW[
                    existing.status
                ];

            const requestedRank =
                INCENTIVE_STATUS_FLOW[
                    input.status
                ];

            if (
                requestedRank <
                currentRank
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Incentive status cannot move backwards.",
                });
            }

            if (
                requestedRank >
                    currentRank + 1
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Incentive status must follow the defined workflow.",
                });
            }
        }

        /*
         * Check percentage cap if percentage changes.
         */
        if (
            input.incentivePercent !==
            undefined
        ) {
            const otherAllocations =
                await prisma.pSGAIncentiveAllocation.findMany(
                    {
                        where: {
                            clientId:
                                existing.clientId,

                            id: {
                                not: id,
                            },
                        },

                        select: {
                            incentivePercent:
                                true,
                        },
                    }
                );

            const otherPercent =
                otherAllocations.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.incentivePercent
                        ),
                    0
                );

            if (
                otherPercent +
                    Number(
                        input.incentivePercent
                    ) >
                100
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Total incentive allocation cannot exceed 100%. Existing other allocations: ${otherPercent}%.`,
                });
            }
        }

        const updateData = {};

        if (
            input.role !== undefined
        ) {
            updateData.role =
                input.role;
        }

        if (
            input.reason !== undefined
        ) {
            updateData.reason =
                input.reason ||
                null;
        }

        if (
            input.incentivePercent !==
            undefined
        ) {
            updateData.incentivePercent =
                Number(
                    input.incentivePercent
                );
        }

        if (input.status) {
            updateData.status =
                input.status;

            if (
                input.status ===
                "APPROVED"
            ) {
                updateData.approvedById =
                    req.user.id;

                updateData.approvedAt =
                    new Date();
            }

            if (
                input.status ===
                "PAID"
            ) {
                updateData.paidAt =
                    new Date();
            }
        }

        const updated =
            await prisma.pSGAIncentiveAllocation.update(
                {
                    where: {
                        id,
                    },

                    data: updateData,

                    include:
                        incentiveInclude(),
                }
            );

        return res.status(200).json({
            success: true,
            message:
                "Incentive allocation updated successfully.",
            data: updated,
        });
    } catch (error) {
        console.error(
            "updateIncentive error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to update incentive allocation.",
        });
    }
}

/*
|--------------------------------------------------------------------------
| GET client incentive dashboard
|--------------------------------------------------------------------------
*/

async function getIncentiveDashboard(
    req,
    res
) {
    try {
        const { clientId } =
            req.params;

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message:
                    "Client ID is required.",
            });
        }

        const client =
            await prisma.client.findUnique({
                where: {
                    id: clientId,
                },

                include: {
                    sourceLead: {
                        select: {
                            id: true,
                            associationName:
                                true,
                            assignedToId:
                                true,
                        },
                    },

                    assignedBde: {
                        select: {
                            id: true,
                            firstName:
                                true,
                            lastName:
                                true,
                            email: true,
                        },
                    },

                    psgas: {
                        select: {
                            id: true,
                            psgNumber:
                                true,
                            status: true,
                            generatedAt:
                                true,
                        },

                        orderBy: {
                            generatedAt:
                                "desc",
                        },
                    },

                    incentiveAllocations:
                        {
                            include: {
                                bde: {
                                    select: {
                                        id: true,
                                        firstName:
                                            true,
                                        lastName:
                                            true,
                                        email: true,
                                    },
                                },

                                admin: {
                                    select: {
                                        id: true,
                                        firstName:
                                            true,
                                        lastName:
                                            true,
                                        email: true,
                                    },
                                },

                                approvedBy:
                                    {
                                        select: {
                                            id: true,
                                            firstName:
                                                true,
                                            lastName:
                                                true,
                                            email: true,
                                        },
                                    },
                            },

                            orderBy: {
                                createdAt:
                                    "asc",
                            },
                        },
                },
            });

        if (!client) {
            return res.status(404).json({
                success: false,
                message:
                    "Client not found.",
            });
        }

        const allocations =
            client.incentiveAllocations;

        const totalPercent =
            allocations.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.incentivePercent
                    ),
                0
            );

        const eligiblePercent =
            allocations
                .filter(
                    (item) =>
                        item.status ===
                        "ELIGIBLE"
                )
                .reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.incentivePercent
                        ),
                    0
                );

        const approvedPercent =
            allocations
                .filter(
                    (item) =>
                        item.status ===
                        "APPROVED"
                )
                .reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.incentivePercent
                        ),
                    0
                );

        const paidPercent =
            allocations
                .filter(
                    (item) =>
                        item.status ===
                        "PAID"
                )
                .reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.incentivePercent
                        ),
                    0
                );

        return res.status(200).json({
            success: true,

            data: {
                client: {
                    id: client.id,
                    companyName:
                        client.companyName,
                    processStage:
                        client.processStage,
                },

                eligible:
                    client.processStage ===
                    "PSGA_COMPLETED",

                source:
                    client.sourceLead
                        ? "LEAD"
                        : "ADMIN",

                recipient:
                    getClientRecipient(
                        client,
                        req.user
                    ),

                psgas:
                    client.psgas,

                allocations,

                summary: {
                    totalPercent,
                    eligiblePercent,
                    approvedPercent,
                    paidPercent,
                    remainingPercent:
                        Math.max(
                            0,
                            100 -
                                totalPercent
                        ),
                },
            },
        });
    } catch (error) {
        console.error(
            "getIncentiveDashboard error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to load incentive dashboard.",
        });
    }
}

/*
|--------------------------------------------------------------------------
| Existing PSGA compatibility endpoint
|--------------------------------------------------------------------------
|
| If old frontend/backend code calls:
| GET /incentives/psga/:psgId
|
| it still works when an actual PSGA exists.
|
*/

async function getPSGAIncentives(
    req,
    res
) {
    try {
        const { psgId } =
            req.params;

        if (!psgId) {
            return res.status(400).json({
                success: false,
                message:
                    "PSGA ID is required.",
            });
        }

        const psg =
            await prisma.pSGA.findUnique({
                where: {
                    id: psgId,
                },

                include: {
                    client: {
                        select: {
                            id: true,
                            companyName:
                                true,
                            processStage:
                                true,
                        },
                    },

                    incentiveAllocations:
                        {
                            include: {
                                bde: {
                                    select: {
                                        id: true,
                                        firstName:
                                            true,
                                        lastName:
                                            true,
                                        email: true,
                                    },
                                },

                                admin: {
                                    select: {
                                        id: true,
                                        firstName:
                                            true,
                                        lastName:
                                            true,
                                        email: true,
                                    },
                                },

                                approvedBy:
                                    {
                                        select: {
                                            id: true,
                                            firstName:
                                                true,
                                            lastName:
                                                true,
                                            email: true,
                                        },
                                    },
                            },

                            orderBy: {
                                createdAt:
                                    "asc",
                            },
                        },
                },
            });

        if (!psg) {
            return res.status(404).json({
                success: false,
                message:
                    "PSGA not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                psg,
                client: psg.client,
                eligible:
                    psg.client
                        ?.processStage ===
                    "PSGA_COMPLETED",
                allocations:
                    psg.incentiveAllocations,
            },
        });
    } catch (error) {
        console.error(
            "getPSGAIncentives error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to load PSGA incentives.",
        });
    }
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

export {
    getEligibleClients,
    getClientIncentives,
    getIncentiveDashboard,
    getPSGAIncentives,
    createIncentive,
    updateIncentive,
};