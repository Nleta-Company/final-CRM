import prisma from "../config/prisma.js";
import { z } from "zod";

// ============================================================
// HELPERS
// ============================================================

const isAdmin = (req) => {
    return req.user?.role === "Admin";
};

const isBde = (req) => {
    return req.user?.role === "BDE/Sales";
};

// ============================================================
// GET ACTIVE BDE
// ============================================================

const getBdeUser = async (bdeId) => {
    return prisma.user.findFirst({
        where: {
            id: bdeId,
            status: "ACTIVE",
            role: {
                name: "BDE/Sales",
            },
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
        },
    });
};

// ============================================================
// GET ACTIVE ADMIN
// ============================================================

const getAdminUser = async (adminId) => {
    return prisma.user.findFirst({
        where: {
            id: adminId,
            status: "ACTIVE",
            role: {
                name: "Admin",
            },
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
        },
    });
};

// ============================================================
// MONTH RANGE
// ============================================================

const getMonthRange = (salaryMonth) => {
    const date = new Date(salaryMonth);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const start = new Date(
        Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            1
        )
    );

    const end = new Date(
        Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth() + 1,
            1
        )
    );

    return {
        start,
        end,
    };
};

// ============================================================
// EXPLICIT INCENTIVE CALCULATION
// ============================================================
//
// IMPORTANT:
//
// We do NOT calculate:
//
// PRIMARY = 100 - SUPPORTING
//
// Only an explicitly created incentive allocation is counted.
//
// This prevents the CRM from inventing an incentive percentage
// before the actual business incentive rule is finalized.
// ============================================================

const calculateRecipientPercentage = (
    psg,
    recipientType,
    recipientId
) => {
    const allocations =
        psg.incentiveAllocations || [];

    const matchingAllocations =
        allocations.filter((allocation) => {
            if (
                allocation.status ===
                "NOT_ELIGIBLE"
            ) {
                return false;
            }

            if (
                allocation.recipientType !==
                recipientType
            ) {
                return false;
            }

            if (
                recipientType ===
                "BDE"
            ) {
                return (
                    allocation.bdeId ===
                    recipientId
                );
            }

            if (
                recipientType ===
                "ADMIN"
            ) {
                return (
                    allocation.adminId ===
                    recipientId
                );
            }

            return false;
        });

    return matchingAllocations.reduce(
        (total, allocation) => {
            return (
                total +
                Number(
                    allocation.incentivePercent ||
                        0
                )
            );
        },
        0
    );
};

// ============================================================
// GET RECIPIENT NAME
// ============================================================

const getRecipientInclude = () => {
    return {
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
    };
};

// ============================================================
// CREATE MONTHLY INCENTIVE PAYOUT
// ============================================================

export const createIncentivePayout = async (
    req,
    res
) => {
    try {
        const schema = z
            .object({
                recipientType: z
                    .enum([
                        "BDE",
                        "ADMIN",
                    ])
                    .default("BDE"),

                bdeId: z
                    .string()
                    .min(1)
                    .optional(),

                adminId: z
                    .string()
                    .min(1)
                    .optional(),

                salaryMonth: z
                    .string()
                    .min(1),
            })
            .superRefine(
                (data, ctx) => {
                    if (
                        data.recipientType ===
                        "BDE" &&
                        !data.bdeId
                    ) {
                        ctx.addIssue({
                            code: z.ZodIssueCode
                                .custom,
                            path: ["bdeId"],
                            message:
                                "bdeId is required for BDE payout",
                        });
                    }

                    if (
                        data.recipientType ===
                        "ADMIN" &&
                        !data.adminId
                    ) {
                        ctx.addIssue({
                            code: z.ZodIssueCode
                                .custom,
                            path: ["adminId"],
                            message:
                                "adminId is required for Admin payout",
                        });
                    }

                    if (
                        data.recipientType ===
                            "BDE" &&
                        data.adminId
                    ) {
                        ctx.addIssue({
                            code: z.ZodIssueCode
                                .custom,
                            path: ["adminId"],
                            message:
                                "adminId is not allowed for BDE payout",
                        });
                    }

                    if (
                        data.recipientType ===
                            "ADMIN" &&
                        data.bdeId
                    ) {
                        ctx.addIssue({
                            code: z.ZodIssueCode
                                .custom,
                            path: ["bdeId"],
                            message:
                                "bdeId is not allowed for Admin payout",
                        });
                    }
                }
            );

        const parsed = schema.safeParse(
            req.body
        );

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid payout data",
                errors:
                    parsed.error.flatten(),
            });
        }

        const {
            recipientType,
            bdeId,
            adminId,
            salaryMonth,
        } = parsed.data;

        // ----------------------------------------------------
        // Only Admin can create monthly payouts
        // ----------------------------------------------------

        if (!isAdmin(req)) {
            return res.status(403).json({
                success: false,
                message:
                    "Only Admin can create incentive payouts",
            });
        }

        // ----------------------------------------------------
        // Validate recipient
        // ----------------------------------------------------

        let recipient = null;

        if (
            recipientType ===
            "BDE"
        ) {
            recipient =
                await getBdeUser(
                    bdeId
                );

            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Active BDE/Sales user not found",
                });
            }
        }

        if (
            recipientType ===
            "ADMIN"
        ) {
            recipient =
                await getAdminUser(
                    adminId
                );

            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Active Admin user not found",
                });
            }
        }

        // ----------------------------------------------------
        // Validate month
        // ----------------------------------------------------

        const monthRange =
            getMonthRange(
                salaryMonth
            );

        if (!monthRange) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid salaryMonth",
            });
        }

        const {
            start,
            end,
        } = monthRange;

        // ----------------------------------------------------
        // Check duplicate payout
        // ----------------------------------------------------
        //
        // We intentionally use findFirst instead of the old
        // bdeId_salaryMonth compound key because payouts can
        // now belong to either BDE or ADMIN.
        //
        // ----------------------------------------------------

        const existingPayout =
            await prisma.incentivePayout.findFirst(
                {
                    where: {
                        recipientType,

                        bdeId:
                            recipientType ===
                            "BDE"
                                ? bdeId
                                : null,

                        adminId:
                            recipientType ===
                            "ADMIN"
                                ? adminId
                                : null,

                        salaryMonth:
                            start,
                    },
                }
            );

        if (existingPayout) {
            return res.status(409).json({
                success: false,
                message:
                    "Monthly incentive payout already exists for this recipient",
                data:
                    existingPayout,
            });
        }

        // ----------------------------------------------------
        // Find eligible PSGAs
        // ----------------------------------------------------
        //
        // Eligibility is based on:
        //
        // Client.processStage = PSGA_COMPLETED
        //
        // NOT:
        //
        // PSGA.status = ACCEPTED
        //
        // ----------------------------------------------------

        const recipientFilter =
            recipientType ===
            "BDE"
                ? {
                      OR: [
                          {
                              bdeId,
                          },
                          {
                              incentiveAllocations:
                                  {
                                      some: {
                                          recipientType:
                                              "BDE",
                                          bdeId,
                                      },
                                  },
                          },
                      ],
                  }
                : {
                      incentiveAllocations:
                          {
                              some: {
                                  recipientType:
                                      "ADMIN",
                                  adminId,
                              },
                          },
                  };

        const psgas =
            await prisma.pSGA.findMany({
                where: {
                    client: {
                        processStage:
                            "PSGA_COMPLETED",

                        processUpdatedAt: {
                            gte: start,
                            lt: end,
                        },
                    },

                    incentiveStatus: {
                        in: [
                            "ELIGIBLE",
                            "APPROVED",
                            "PAID",
                        ],
                    },

                    ...recipientFilter,
                },

                include: {
                    client: {
                        select: {
                            id: true,
                            associationName:
                                true,
                            processStage:
                                true,
                            processUpdatedAt:
                                true,
                            createdById:
                                true,

                            sourceLead: {
                                select: {
                                    id: true,
                                    assignedToId:
                                        true,
                                    createdById:
                                        true,
                                },
                            },
                        },
                    },

                    incentiveAllocations: {
                        select: {
                            id: true,
                            recipientType:
                                true,
                            bdeId: true,
                            adminId: true,
                            role: true,
                            reason: true,
                            incentivePercent:
                                true,
                            status: true,
                        },

                        orderBy: {
                            createdAt:
                                "asc",
                        },
                    },
                },

                orderBy: {
                    client: {
                        processUpdatedAt:
                            "asc",
                    },
                },
            });

        // ----------------------------------------------------
        // Calculate explicit percentage
        // ----------------------------------------------------

        let totalIncentivePercent =
            0;

        const psgaBreakdown = [];

        for (
            const psg of psgas
        ) {
            const percentage =
                calculateRecipientPercentage(
                    psg,
                    recipientType,
                    recipientType ===
                        "BDE"
                        ? bdeId
                        : adminId
                );

            if (
                percentage <= 0
            ) {
                continue;
            }

            totalIncentivePercent +=
                percentage;

            const allocations =
                psg.incentiveAllocations.filter(
                    (allocation) => {
                        if (
                            allocation.status ===
                            "NOT_ELIGIBLE"
                        ) {
                            return false;
                        }

                        if (
                            allocation.recipientType !==
                            recipientType
                        ) {
                            return false;
                        }

                        if (
                            recipientType ===
                            "BDE"
                        ) {
                            return (
                                allocation.bdeId ===
                                bdeId
                            );
                        }

                        return (
                            allocation.adminId ===
                            adminId
                        );
                    }
                );

            psgaBreakdown.push({
                psgId:
                    psg.id,

                psgNumber:
                    psg.psgNumber,

                client:
                    psg.client,

                processCompletedAt:
                    psg.client
                        ?.processUpdatedAt,

                recipientType,

                recipientId:
                    recipientType ===
                    "BDE"
                        ? bdeId
                        : adminId,

                incentivePercent:
                    percentage,

                allocations,
            });
        }

        // ----------------------------------------------------
        // Create payout
        // ----------------------------------------------------

        const payout =
            await prisma.incentivePayout.create(
                {
                    data: {
                        recipientType,

                        bdeId:
                            recipientType ===
                            "BDE"
                                ? bdeId
                                : null,

                        adminId:
                            recipientType ===
                            "ADMIN"
                                ? adminId
                                : null,

                        salaryMonth:
                            start,

                        totalIncentivePercent,

                        status:
                            "PENDING",
                    },

                    include:
                        getRecipientInclude(),
                }
            );

        return res.status(201).json({
            success: true,

            message:
                "Monthly incentive payout created successfully",

            data: {
                payout,

                recipientType,

                recipient,

                eligiblePSGAs:
                    psgaBreakdown.length,

                totalEligiblePSGAs:
                    psgas.length,

                totalIncentivePercent,

                psgaBreakdown,
            },
        });
    } catch (error) {
        console.error(
            "createIncentivePayout error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Failed to create monthly incentive payout",

            error:
                error instanceof Error
                    ? error.message
                    : String(error),
        });
    }
};

// ============================================================
// GET MONTHLY PAYOUTS
// ============================================================

export const getIncentivePayouts =
    async (req, res) => {
        try {
            const {
                recipientType,
                bdeId,
                adminId,
                salaryMonth,
                status,
            } = req.query;

            // ------------------------------------------------
            // Validate recipient type
            // ------------------------------------------------

            if (
                recipientType &&
                ![
                    "BDE",
                    "ADMIN",
                ].includes(
                    recipientType
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid recipientType",
                });
            }

            // ------------------------------------------------
            // BDE access
            // ------------------------------------------------

            if (isBde(req)) {
                if (
                    recipientType &&
                    recipientType !==
                        "BDE"
                ) {
                    return res.status(404).json({
                        success: false,
                        message:
                            "Payout not found",
                    });
                }

                if (
                    bdeId &&
                    bdeId !==
                        req.user.userId
                ) {
                    return res.status(404).json({
                        success: false,
                        message:
                            "BDE payout not found",
                    });
                }

                if (adminId) {
                    return res.status(404).json({
                        success: false,
                        message:
                            "Payout not found",
                    });
                }
            }

            const where = {};

            // ------------------------------------------------
            // Recipient filter
            // ------------------------------------------------

            if (isBde(req)) {
                where.recipientType =
                    "BDE";

                where.bdeId =
                    req.user.userId;
            } else {
                if (recipientType) {
                    where.recipientType =
                        recipientType;
                }

                if (bdeId) {
                    where.bdeId =
                        bdeId;
                }

                if (adminId) {
                    where.adminId =
                        adminId;
                }
            }

            // ------------------------------------------------
            // Status
            // ------------------------------------------------

            if (status) {
                if (
                    ![
                        "PENDING",
                        "APPROVED",
                        "PAID",
                    ].includes(status)
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid payout status",
                    });
                }

                where.status =
                    status;
            }

            // ------------------------------------------------
            // Month
            // ------------------------------------------------

            if (salaryMonth) {
                const monthRange =
                    getMonthRange(
                        salaryMonth
                    );

                if (!monthRange) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid salaryMonth",
                    });
                }

                where.salaryMonth =
                    monthRange.start;
            }

            const payouts =
                await prisma.incentivePayout.findMany(
                    {
                        where,

                        include:
                            getRecipientInclude(),

                        orderBy: [
                            {
                                salaryMonth:
                                    "desc",
                            },
                            {
                                createdAt:
                                    "desc",
                            },
                        ],
                    }
                );

            return res.status(200).json({
                success: true,

                message:
                    "Monthly incentive payouts fetched successfully",

                data: payouts,
            });
        } catch (error) {
            console.error(
                "getIncentivePayouts error:",
                error
            );

            return res.status(500).json({
                success: false,

                message:
                    "Failed to fetch monthly incentive payouts",

                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });
        }
    };

// ============================================================
// GET SINGLE MONTHLY PAYOUT
// ============================================================

export const getIncentivePayoutById =
    async (req, res) => {
        try {
            const { id } =
                req.params;

            const payout =
                await prisma.incentivePayout.findUnique(
                    {
                        where: {
                            id,
                        },

                        include:
                            getRecipientInclude(),
                    }
                );

            if (!payout) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Monthly incentive payout not found",
                });
            }

            // ------------------------------------------------
            // BDE can only see own payout
            // ------------------------------------------------

            if (isBde(req)) {
                if (
                    payout.recipientType !==
                        "BDE" ||
                    payout.bdeId !==
                        req.user.userId
                ) {
                    return res.status(404).json({
                        success: false,
                        message:
                            "Monthly incentive payout not found",
                    });
                }
            }

            return res.status(200).json({
                success: true,

                message:
                    "Monthly incentive payout fetched successfully",

                data: payout,
            });
        } catch (error) {
            console.error(
                "getIncentivePayoutById error:",
                error
            );

            return res.status(500).json({
                success: false,

                message:
                    "Failed to fetch monthly incentive payout",

                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });
        }
    };

// ============================================================
// APPROVE MONTHLY PAYOUT
// ============================================================

export const approveIncentivePayout =
    async (req, res) => {
        try {
            if (!isAdmin(req)) {
                return res.status(403).json({
                    success: false,

                    message:
                        "Only Admin can approve incentive payouts",
                });
            }

            const { id } =
                req.params;

            const payout =
                await prisma.incentivePayout.findUnique(
                    {
                        where: {
                            id,
                        },
                    }
                );

            if (!payout) {
                return res.status(404).json({
                    success: false,

                    message:
                        "Monthly incentive payout not found",
                });
            }

            if (
                payout.status ===
                "PAID"
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Paid incentive payout cannot be approved again",
                });
            }

            if (
                payout.status ===
                "APPROVED"
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Incentive payout is already approved",
                });
            }

            const updatedPayout =
                await prisma.incentivePayout.update(
                    {
                        where: {
                            id,
                        },

                        data: {
                            status:
                                "APPROVED",

                            approvedById:
                                req.user.userId,

                            approvedAt:
                                new Date(),
                        },

                        include:
                            getRecipientInclude(),
                    }
                );

            return res.status(200).json({
                success: true,

                message:
                    "Monthly incentive payout approved successfully",

                data:
                    updatedPayout,
            });
        } catch (error) {
            console.error(
                "approveIncentivePayout error:",
                error
            );

            return res.status(500).json({
                success: false,

                message:
                    "Failed to approve monthly incentive payout",

                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });
        }
    };

// ============================================================
// MARK PAYOUT AS PAID
// ============================================================

export const markIncentivePayoutPaid =
    async (req, res) => {
        try {
            if (!isAdmin(req)) {
                return res.status(403).json({
                    success: false,

                    message:
                        "Only Admin can mark incentive payout as paid",
                });
            }

            const schema = z.object({
                paymentReference:
                    z.string()
                        .trim()
                        .min(1)
                        .max(200),
            });

            const parsed =
                schema.safeParse(
                    req.body
                );

            if (!parsed.success) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Payment reference is required",

                    errors:
                        parsed.error.flatten(),
                });
            }

            const {
                paymentReference,
            } = parsed.data;

            const { id } =
                req.params;

            const payout =
                await prisma.incentivePayout.findUnique(
                    {
                        where: {
                            id,
                        },
                    }
                );

            if (!payout) {
                return res.status(404).json({
                    success: false,

                    message:
                        "Monthly incentive payout not found",
                });
            }

            if (
                payout.status ===
                "PENDING"
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Incentive payout must be approved before marking it as paid",
                });
            }

            if (
                payout.status ===
                "PAID"
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Incentive payout is already marked as paid",
                });
            }

            const updatedPayout =
                await prisma.incentivePayout.update(
                    {
                        where: {
                            id,
                        },

                        data: {
                            status:
                                "PAID",

                            paidAt:
                                new Date(),

                            paymentReference,
                        },

                        include:
                            getRecipientInclude(),
                    }
                );

            return res.status(200).json({
                success: true,

                message:
                    "Incentive payout marked as paid successfully",

                data:
                    updatedPayout,
            });
        } catch (error) {
            console.error(
                "markIncentivePayoutPaid error:",
                error
            );

            return res.status(500).json({
                success: false,

                message:
                    "Failed to mark incentive payout as paid",

                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });
        }
    };

// ============================================================
// MONTHLY BDE INCENTIVE DASHBOARD
// ============================================================

export const getMonthlyIncentiveDashboard =
    async (req, res) => {
        try {
            const {
                bdeId,
            } = req.params;

            const {
                salaryMonth,
            } = req.query;

            if (!bdeId) {
                return res.status(400).json({
                    success: false,

                    message:
                        "BDE ID is required",
                });
            }

            if (!salaryMonth) {
                return res.status(400).json({
                    success: false,

                    message:
                        "salaryMonth is required in YYYY-MM-DD format",
                });
            }

            const monthRange =
                getMonthRange(
                    salaryMonth
                );

            if (!monthRange) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Invalid salaryMonth",
                });
            }

            const {
                start,
                end,
            } = monthRange;

            // ------------------------------------------------
            // Check BDE
            // ------------------------------------------------

            const bde =
                await prisma.user.findUnique(
                    {
                        where: {
                            id: bdeId,
                        },

                        include: {
                            role: true,
                        },
                    }
                );

            if (!bde) {
                return res.status(404).json({
                    success: false,

                    message:
                        "BDE not found",
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

            // ------------------------------------------------
            // BDE access
            // ------------------------------------------------

            if (
                isBde(req) &&
                bdeId !==
                    req.user.userId
            ) {
                return res.status(404).json({
                    success: false,

                    message:
                        "BDE not found",
                });
            }

            // ------------------------------------------------
            // Existing payout
            // ------------------------------------------------

            const payout =
                await prisma.incentivePayout.findFirst(
                    {
                        where: {
                            recipientType:
                                "BDE",

                            bdeId,

                            salaryMonth:
                                start,
                        },

                        include: {
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
                    }
                );

            // ------------------------------------------------
            // Completed clients / PSGAs
            // ------------------------------------------------

            const psgas =
                await prisma.pSGA.findMany({
                    where: {
                        client: {
                            processStage:
                                "PSGA_COMPLETED",

                            processUpdatedAt: {
                                gte: start,
                                lt: end,
                            },
                        },

                        incentiveStatus: {
                            in: [
                                "ELIGIBLE",
                                "APPROVED",
                                "PAID",
                            ],
                        },

                        OR: [
                            {
                                bdeId,
                            },

                            {
                                incentiveAllocations:
                                    {
                                        some: {
                                            recipientType:
                                                "BDE",

                                            bdeId,
                                        },
                                    },
                            },
                        ],
                    },

                    include: {
                        client: {
                            select: {
                                id: true,
                                associationName:
                                    true,
                                processStage:
                                    true,
                                processUpdatedAt:
                                    true,
                            },
                        },

                        incentiveAllocations: {
                            where: {
                                recipientType:
                                    "BDE",

                                bdeId,
                            },

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
                            },
                        },
                    },

                    orderBy: {
                        client: {
                            processUpdatedAt:
                                "asc",
                        },
                    },
                });

            // ------------------------------------------------
            // Explicit incentive breakdown
            // ------------------------------------------------

            const psgaBreakdown =
                psgas
                    .map(
                        (psg) => {
                            const incentivePercent =
                                calculateRecipientPercentage(
                                    psg,
                                    "BDE",
                                    bdeId
                                );

                            let role =
                                null;

                            if (
                                psg.incentiveAllocations.some(
                                    (
                                        allocation
                                    ) =>
                                        allocation.role ===
                                        "SUPPORTING"
                                )
                            ) {
                                role =
                                    "SUPPORTING";
                            }

                            if (
                                !role &&
                                psg.bdeId ===
                                    bdeId
                            ) {
                                role =
                                    "PRIMARY";
                            }

                            return {
                                psgId:
                                    psg.id,

                                psgNumber:
                                    psg.psgNumber,

                                client:
                                    psg.client,

                                processCompletedAt:
                                    psg.client
                                        ?.processUpdatedAt,

                                role,

                                recipientType:
                                    "BDE",

                                recipientId:
                                    bdeId,

                                incentivePercent,

                                allocations:
                                    psg.incentiveAllocations,
                            };
                        }
                    )
                    .filter(
                        (item) =>
                            item.role !==
                                null &&
                            item.incentivePercent >
                                0
                    );

            const totalIncentivePercent =
                psgaBreakdown.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        item.incentivePercent,
                    0
                );

            return res.status(200).json({
                success: true,

                data: {
                    bde: {
                        id:
                            bde.id,

                        firstName:
                            bde.firstName,

                        lastName:
                            bde.lastName,

                        email:
                            bde.email,
                    },

                    recipientType:
                        "BDE",

                    salaryMonth:
                        start,

                    summary: {
                        totalIncentivePercent,

                        eligiblePSGAs:
                            psgaBreakdown.length,

                        payoutStatus:
                            payout?.status ||
                            "NOT_CREATED",

                        paymentReference:
                            payout?.paymentReference ||
                            null,

                        paidAt:
                            payout?.paidAt ||
                            null,
                    },

                    payout:
                        payout ||
                        null,

                    psgaBreakdown,
                },
            });
        } catch (error) {
            console.error(
                "getMonthlyIncentiveDashboard error:",
                error
            );

            return res.status(500).json({
                success: false,

                message:
                    "Failed to fetch monthly incentive dashboard",

                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });
        }
    };

// ============================================================
// ADMIN INCENTIVE MANAGEMENT DASHBOARD
// ============================================================

export const getAdminIncentiveDashboard =
    async (req, res) => {
        try {
            // ------------------------------------------------
            // ADMIN ONLY
            // ------------------------------------------------

            if (!isAdmin(req)) {
                return res.status(403).json({
                    success: false,

                    message:
                        "Admin access required",
                });
            }

            const {
                salaryMonth,
                status,
            } = req.query;

            if (!salaryMonth) {
                return res.status(400).json({
                    success: false,

                    message:
                        "salaryMonth is required in YYYY-MM-DD format",
                });
            }

            const monthRange =
                getMonthRange(
                    salaryMonth
                );

            if (!monthRange) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Invalid salaryMonth",
                });
            }

            const {
                start,
                end,
            } = monthRange;

            // ------------------------------------------------
            // BDE ROLE
            // ------------------------------------------------

            const bdeRole =
                await prisma.role.findUnique(
                    {
                        where: {
                            name:
                                "BDE/Sales",
                        },
                    }
                );

            if (!bdeRole) {
                return res.status(404).json({
                    success: false,

                    message:
                        "BDE/Sales role not found",
                });
            }

            // ------------------------------------------------
            // ACTIVE BDEs
            // ------------------------------------------------

            const bdes =
                await prisma.user.findMany(
                    {
                        where: {
                            roleId:
                                bdeRole.id,

                            status:
                                "ACTIVE",
                        },

                        select: {
                            id: true,
                            firstName:
                                true,
                            lastName:
                                true,
                            email:
                                true,
                        },

                        orderBy: {
                            firstName:
                                "asc",
                        },
                    }
                );

            // ------------------------------------------------
            // ADMIN ROLE
            // ------------------------------------------------

            const adminRole =
                await prisma.role.findUnique(
                    {
                        where: {
                            name:
                                "Admin",
                        },
                    }
                );

            // ------------------------------------------------
            // ACTIVE ADMINS
            // ------------------------------------------------

            const admins =
                adminRole
                    ? await prisma.user.findMany(
                          {
                              where: {
                                  roleId:
                                      adminRole.id,

                                  status:
                                      "ACTIVE",
                              },

                              select: {
                                  id: true,
                                  firstName:
                                      true,
                                  lastName:
                                      true,
                                  email:
                                      true,
                              },

                              orderBy: {
                                  firstName:
                                      "asc",
                              },
                          }
                      )
                    : [];

            // ------------------------------------------------
            // MONTHLY PAYOUTS
            // ------------------------------------------------

            const payoutWhere = {
                salaryMonth:
                    start,

                ...(status
                    ? {
                          status,
                      }
                    : {}),
            };

            const payouts =
                await prisma.incentivePayout.findMany(
                    {
                        where:
                            payoutWhere,

                        include:
                            getRecipientInclude(),

                        orderBy: {
                            createdAt:
                                "asc",
                        },
                    }
                );

            // ------------------------------------------------
            // COMPLETED CLIENTS / PSGAs
            // ------------------------------------------------

            const psgas =
                await prisma.pSGA.findMany({
                    where: {
                        client: {
                            processStage:
                                "PSGA_COMPLETED",

                            processUpdatedAt: {
                                gte: start,
                                lt: end,
                            },
                        },

                        incentiveStatus: {
                            in: [
                                "ELIGIBLE",
                                "APPROVED",
                                "PAID",
                            ],
                        },
                    },

                    include: {
                        client: {
                            select: {
                                id: true,
                                associationName:
                                    true,
                                processStage:
                                    true,
                                processUpdatedAt:
                                    true,
                                createdById:
                                    true,

                                assignedBdeId:
                                    true,

                                sourceLead: {
                                    select: {
                                        id: true,
                                        assignedToId:
                                            true,
                                        createdById:
                                            true,
                                    },
                                },
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

                            orderBy: {
                                createdAt:
                                    "asc",
                            },
                        },
                    },

                    orderBy: {
                        client: {
                            processUpdatedAt:
                                "asc",
                        },
                    },
                });

            // =================================================
            // BDE SUMMARY
            // =================================================

            const bdeSummary =
                bdes.map(
                    (bde) => {
                        let totalIncentivePercent =
                            0;

                        let eligiblePSGAs =
                            0;

                        const breakdown =
                            [];

                        for (
                            const psg of psgas
                        ) {
                            const incentivePercent =
                                calculateRecipientPercentage(
                                    psg,
                                    "BDE",
                                    bde.id
                                );

                            if (
                                incentivePercent <=
                                0
                            ) {
                                continue;
                            }

                            let role =
                                null;

                            if (
                                psg.incentiveAllocations.some(
                                    (
                                        allocation
                                    ) =>
                                        allocation.recipientType ===
                                            "BDE" &&
                                        allocation.bdeId ===
                                            bde.id &&
                                        allocation.role ===
                                            "SUPPORTING"
                                )
                            ) {
                                role =
                                    "SUPPORTING";
                            }

                            if (
                                !role &&
                                psg.bdeId ===
                                    bde.id
                            ) {
                                role =
                                    "PRIMARY";
                            }

                            if (!role) {
                                continue;
                            }

                            eligiblePSGAs +=
                                1;

                            totalIncentivePercent +=
                                incentivePercent;

                            breakdown.push({
                                psgId:
                                    psg.id,

                                psgNumber:
                                    psg.psgNumber,

                                client:
                                    psg.client,

                                role,

                                recipientType:
                                    "BDE",

                                recipientId:
                                    bde.id,

                                incentivePercent,

                                processCompletedAt:
                                    psg.client
                                        ?.processUpdatedAt,
                            });
                        }

                        const payout =
                            payouts.find(
                                (
                                    item
                                ) =>
                                    item.recipientType ===
                                        "BDE" &&
                                    item.bdeId ===
                                        bde.id
                            );

                        return {
                            bde: {
                                id:
                                    bde.id,

                                firstName:
                                    bde.firstName,

                                lastName:
                                    bde.lastName,

                                email:
                                    bde.email,
                            },

                            recipientType:
                                "BDE",

                            totalIncentivePercent,

                            eligiblePSGAs,

                            payoutStatus:
                                payout?.status ||
                                "NOT_CREATED",

                            paymentReference:
                                payout?.paymentReference ||
                                null,

                            approvedAt:
                                payout?.approvedAt ||
                                null,

                            paidAt:
                                payout?.paidAt ||
                                null,

                            payoutId:
                                payout?.id ||
                                null,

                            breakdown,
                        };
                    }
                );

            // =================================================
            // ADMIN SUMMARY
            // =================================================

            const adminSummary =
                admins.map(
                    (admin) => {
                        let totalIncentivePercent =
                            0;

                        let eligiblePSGAs =
                            0;

                        const breakdown =
                            [];

                        for (
                            const psg of psgas
                        ) {
                            const incentivePercent =
                                calculateRecipientPercentage(
                                    psg,
                                    "ADMIN",
                                    admin.id
                                );

                            if (
                                incentivePercent <=
                                0
                            ) {
                                continue;
                            }

                            eligiblePSGAs +=
                                1;

                            totalIncentivePercent +=
                                incentivePercent;

                            breakdown.push({
                                psgId:
                                    psg.id,

                                psgNumber:
                                    psg.psgNumber,

                                client:
                                    psg.client,

                                role:
                                    "ADMIN",

                                recipientType:
                                    "ADMIN",

                                recipientId:
                                    admin.id,

                                incentivePercent,

                                processCompletedAt:
                                    psg.client
                                        ?.processUpdatedAt,
                            });
                        }

                        const payout =
                            payouts.find(
                                (
                                    item
                                ) =>
                                    item.recipientType ===
                                        "ADMIN" &&
                                    item.adminId ===
                                        admin.id
                            );

                        return {
                            admin: {
                                id:
                                    admin.id,

                                firstName:
                                    admin.firstName,

                                lastName:
                                    admin.lastName,

                                email:
                                    admin.email,
                            },

                            recipientType:
                                "ADMIN",

                            totalIncentivePercent,

                            eligiblePSGAs,

                            payoutStatus:
                                payout?.status ||
                                "NOT_CREATED",

                            paymentReference:
                                payout?.paymentReference ||
                                null,

                            approvedAt:
                                payout?.approvedAt ||
                                null,

                            paidAt:
                                payout?.paidAt ||
                                null,

                            payoutId:
                                payout?.id ||
                                null,

                            breakdown,
                        };
                    }
                );

            // =================================================
            // DIRECT ADMIN CLIENTS
            // =================================================
            //
            // These are clients without sourceLead.
            //
            // Their incentive recipient is the Admin who
            // directly created the client.
            //
            // We only expose them as eligible candidates here
            // unless an explicit ADMIN incentive allocation
            // exists.
            //
            // No percentage is invented.
            // =================================================

            const adminEligibleClients =
                psgas
                    .filter(
                        (psg) =>
                            !psg.client
                                ?.sourceLead
                    )
                    .map(
                        (psg) => {
                            const adminRecipientId =
                                psg.client
                                    ?.createdById ||
                                null;

                            const adminAllocation =
                                psg.incentiveAllocations.filter(
                                    (
                                        allocation
                                    ) =>
                                        allocation.recipientType ===
                                            "ADMIN" &&
                                        allocation.adminId ===
                                            adminRecipientId
                                );

                            const explicitPercent =
                                adminAllocation.reduce(
                                    (
                                        total,
                                        allocation
                                    ) =>
                                        total +
                                        Number(
                                            allocation.incentivePercent ||
                                                0
                                        ),
                                    0
                                );

                            return {
                                psgId:
                                    psg.id,

                                psgNumber:
                                    psg.psgNumber,

                                client:
                                    psg.client,

                                recipientType:
                                    "ADMIN",

                                recipientId:
                                    adminRecipientId,

                                incentiveStatus:
                                    psg.incentiveStatus,

                                explicitIncentivePercent:
                                    explicitPercent,

                                allocations:
                                    adminAllocation,
                            };
                        }
                    );

            // =================================================
            // OVERALL SUMMARY
            // =================================================

            const totalBdeIncentivePercent =
                bdeSummary.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        item.totalIncentivePercent,
                    0
                );

            const totalAdminIncentivePercent =
                adminSummary.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        item.totalIncentivePercent,
                    0
                );

            const totalEligibleBdePSGAs =
                bdeSummary.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        item.eligiblePSGAs,
                    0
                );

            const totalEligibleAdminPSGAs =
                adminSummary.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        item.eligiblePSGAs,
                    0
                );

            const pendingPayouts =
                payouts.filter(
                    (item) =>
                        item.status ===
                        "PENDING"
                ).length;

            const approvedPayouts =
                payouts.filter(
                    (item) =>
                        item.status ===
                        "APPROVED"
                ).length;

            const paidPayouts =
                payouts.filter(
                    (item) =>
                        item.status ===
                        "PAID"
                ).length;

            return res.status(200).json({
                success: true,

                data: {
                    salaryMonth:
                        start,

                    summary: {
                        totalBDEs:
                            bdes.length,

                        totalAdmins:
                            admins.length,

                        totalEligibleBdePSGAs,

                        totalEligibleAdminPSGAs,

                        totalIncentivePercent:
                            totalBdeIncentivePercent +
                            totalAdminIncentivePercent,

                        totalBdeIncentivePercent,

                        totalAdminIncentivePercent,

                        pendingPayouts,

                        approvedPayouts,

                        paidPayouts,

                        adminEligibleClients:
                            adminEligibleClients.length,
                    },

                    bdeSummary,

                    adminSummary,

                    payouts,

                    adminEligibleClients,
                },
            });
        } catch (error) {
            console.error(
                "getAdminIncentiveDashboard error:",
                error
            );

            return res.status(500).json({
                success: false,

                message:
                    "Failed to fetch admin incentive dashboard",

                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });
        }
    };