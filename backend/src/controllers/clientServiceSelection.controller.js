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

async function getAccessibleClient(clientId, req) {
    if (isAdmin(req)) {
        return prisma.client.findUnique({
            where: {
                id: clientId,
            },
        });
    }

    if (isBde(req)) {
        return prisma.client.findFirst({
            where: {
                id: clientId,

                OR: [
                    {
                        createdById: req.user.userId,
                    },
                    {
                        assignedBdeId: req.user.userId,
                    },
                    {
                        sourceLead: {
                            is: {
                                createdById:
                                    req.user.userId,
                            },
                        },
                    },
                    {
                        sourceLead: {
                            is: {
                                assignedToId:
                                    req.user.userId,
                            },
                        },
                    },
                ],
            },
        });
    }

    return null;
}

// ============================================================
// QUANTITY VALIDATION
// ============================================================
//
// BUSINESS RULE:
//
// ASSET_CATEGORY
// ----------------
// minQuantity / maxQuantity are NOT quantity limits.
//
// Example:
//
// Escalator
// pricingBasis = ASSET_CATEGORY
// unitRate = 5000
// maxQuantity = 1
//
// Quantity 5 is allowed:
//
// 5000 x 5
//
// ------------------------------------------------------------
//
// LIFT_COUNT
// ----------------
// minQuantity / maxQuantity ARE quantity limits.
//
// ============================================================

function validateQuantityByPricingBasis(
    pricingRule,
    quantity
) {
    const pricingBasis = String(
        pricingRule?.pricingBasis || ""
    )
        .trim()
        .toUpperCase();

    // ========================================================
    // ASSET CATEGORY
    // ========================================================
    //
    // No min/max quantity restriction.
    //
    if (pricingBasis === "ASSET_CATEGORY") {
        return null;
    }

    // ========================================================
    // LIFT COUNT
    // ========================================================

    if (pricingBasis === "LIFT_COUNT") {
        if (
            pricingRule.minQuantity !== null &&
            quantity <
                Number(pricingRule.minQuantity)
        ) {
            return `Minimum quantity is ${Number(
                pricingRule.minQuantity
            )}`;
        }

        if (
            pricingRule.maxQuantity !== null &&
            quantity >
                Number(pricingRule.maxQuantity)
        ) {
            return `Maximum quantity is ${Number(
                pricingRule.maxQuantity
            )}`;
        }

        return null;
    }

    // ========================================================
    // SERVICE_RATE / CUSTOM / OTHER
    // ========================================================
    //
    // No min/max quantity restriction here.
    //
    return null;
}

// ============================================================
// CREATE SCHEMA
// ============================================================

const createClientServiceSchema = z.object({
    serviceId:
        z.string().trim().min(1),

    pricingRuleId:
        z.string().trim().min(1),

    quantity:
        z.coerce.number().positive(),

    notes:
        z.string().trim().optional(),
});

// ============================================================
// UPDATE SCHEMA
// ============================================================

const updateClientServiceSchema = z.object({
    pricingRuleId:
        z.string().trim().min(1),

    quantity:
        z.coerce.number().positive(),

    notes:
        z.string().trim().optional(),
});

// ============================================================
// GET CLIENT SERVICE SELECTIONS
// ============================================================

export async function getClientServiceSelections(
    req,
    res
) {
    try {
        const { clientId } = req.params;

        const client =
            await getAccessibleClient(
                clientId,
                req
            );

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found",
            });
        }

        const selections =
            await prisma.clientServiceSelection.findMany(
                {
                    where: {
                        clientId,
                    },

                    orderBy: {
                        createdAt: "asc",
                    },
                }
            );

        const summary = {
            serviceCount:
                selections.length,

            baseAmount:
                selections.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.baseAmount || 0
                        ),
                    0
                ),

            gstAmount:
                selections.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.gstAmount || 0
                        ),
                    0
                ),

            totalAmount:
                selections.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.totalAmount || 0
                        ),
                    0
                ),
        };

        return res.status(200).json({
            success: true,

            message:
                "Client service selections fetched successfully",

            data: {
                clientId,
                selections,
                summary,
            },
        });
    } catch (error) {
        console.error(
            "GET CLIENT SERVICE SELECTIONS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch client service selections",
        });
    }
}

// ============================================================
// CREATE CLIENT SERVICE SELECTION
// ============================================================

export async function createClientServiceSelection(
    req,
    res
) {
    try {
        const { clientId } = req.params;

        // ----------------------------------------------------
        // VALIDATE REQUEST
        // ----------------------------------------------------

        const validation =
            createClientServiceSchema.safeParse(
                req.body
            );

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid client service selection data",
                errors:
                    validation.error.flatten(),
            });
        }

        // ----------------------------------------------------
        // CHECK CLIENT ACCESS
        // ----------------------------------------------------

        const client =
            await getAccessibleClient(
                clientId,
                req
            );

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found",
            });
        }

        const {
            serviceId,
            pricingRuleId,
            quantity,
            notes,
        } = validation.data;

        // ----------------------------------------------------
        // GET SERVICE
        // ----------------------------------------------------

        const service =
            await prisma.serviceCatalog.findUnique(
                {
                    where: {
                        id: serviceId,
                    },
                }
            );

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }

        if (!service.isActive) {
            return res.status(400).json({
                success: false,
                message:
                    "Selected service is inactive",
            });
        }

        // ----------------------------------------------------
        // GET PRICING RULE
        // ----------------------------------------------------

        const pricingRule =
            await prisma.servicePricingRule.findUnique(
                {
                    where: {
                        id: pricingRuleId,
                    },
                }
            );

        if (!pricingRule) {
            return res.status(404).json({
                success: false,
                message:
                    "Pricing rule not found",
            });
        }

        if (!pricingRule.isActive) {
            return res.status(400).json({
                success: false,
                message:
                    "Selected pricing rule is inactive",
            });
        }

        // ----------------------------------------------------
        // VERIFY PRICING RULE -> SERVICE
        // ----------------------------------------------------

        if (
            pricingRule.serviceId !==
            serviceId
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Pricing rule does not belong to selected service",
            });
        }

        // ----------------------------------------------------
        // QUANTITY VALIDATION
        // ----------------------------------------------------

        const quantityError =
            validateQuantityByPricingBasis(
                pricingRule,
                quantity
            );

        if (quantityError) {
            return res.status(400).json({
                success: false,
                message: quantityError,
            });
        }

        // ====================================================
        // IMPORTANT:
        //
        // THERE IS NO DUPLICATE SERVICE CHECK HERE.
        //
        // Same service can be selected for:
        //
        // Asset 1 -> PAT
        // Asset 2 -> PAT
        // Asset 3 -> PAT
        //
        // All are valid.
        //
        // ====================================================

        // ----------------------------------------------------
        // CALCULATE PRICING
        // ----------------------------------------------------

        const unitRate =
            Number(pricingRule.unitRate);

        const gstPercent =
            Number(pricingRule.gstPercent);

        const baseAmount =
            quantity * unitRate;

        const gstAmount =
            (baseAmount * gstPercent) /
            100;

        const totalAmount =
            baseAmount + gstAmount;

        // ----------------------------------------------------
        // CREATE SELECTION
        // ----------------------------------------------------

        const selection =
            await prisma.clientServiceSelection.create(
                {
                    data: {
                        clientId,

                        serviceId,

                        serviceCode:
                            service.code,

                        serviceName:
                            service.name,

                        pricingBasis:
                            pricingRule.pricingBasis,

                        pricingLabel:
                            pricingRule.pricingLabel,

                        assetCategory:
                            pricingRule.assetCategory,

                        quantity,

                        unitRate,

                        baseAmount,

                        gstPercent,

                        gstAmount,

                        totalAmount,

                        notes:
                            notes || null,

                        createdById:
                            req.user.userId,
                    },
                }
            );

        return res.status(201).json({
            success: true,

            message:
                "Client service selection created successfully",

            data: {
                selection,
            },
        });
    } catch (error) {
        console.error(
            "CREATE CLIENT SERVICE SELECTION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create client service selection",
        });
    }
}

// ============================================================
// UPDATE CLIENT SERVICE SELECTION
// ============================================================

export async function updateClientServiceSelection(
    req,
    res
) {
    try {
        const {
            clientId,
            selectionId,
        } = req.params;

        // ----------------------------------------------------
        // VALIDATE REQUEST
        // ----------------------------------------------------

        const validation =
            updateClientServiceSchema.safeParse(
                req.body
            );

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid client service selection data",
                errors:
                    validation.error.flatten(),
            });
        }

        // ----------------------------------------------------
        // CHECK CLIENT ACCESS
        // ----------------------------------------------------

        const client =
            await getAccessibleClient(
                clientId,
                req
            );

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found",
            });
        }

        // ----------------------------------------------------
        // GET EXISTING SELECTION
        // ----------------------------------------------------

        const existing =
            await prisma.clientServiceSelection.findFirst(
                {
                    where: {
                        id: selectionId,
                        clientId,
                    },
                }
            );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message:
                    "Client service selection not found",
            });
        }

        const {
            pricingRuleId,
            quantity,
            notes,
        } = validation.data;

        // ----------------------------------------------------
        // GET PRICING RULE
        // ----------------------------------------------------

        const pricingRule =
            await prisma.servicePricingRule.findUnique(
                {
                    where: {
                        id: pricingRuleId,
                    },

                    include: {
                        service: true,
                    },
                }
            );

        if (!pricingRule) {
            return res.status(404).json({
                success: false,
                message:
                    "Pricing rule not found",
            });
        }

        if (!pricingRule.isActive) {
            return res.status(400).json({
                success: false,
                message:
                    "Selected pricing rule is inactive",
            });
        }

        // ----------------------------------------------------
        // QUANTITY VALIDATION
        // ----------------------------------------------------

        const quantityError =
            validateQuantityByPricingBasis(
                pricingRule,
                quantity
            );

        if (quantityError) {
            return res.status(400).json({
                success: false,
                message: quantityError,
            });
        }

        // ====================================================
        // IMPORTANT:
        //
        // NO DUPLICATE SERVICE CHECK.
        //
        // Example:
        //
        // Lift       -> PAT
        // Escalator  -> PAT
        //
        // Both are allowed.
        //
        // ====================================================

        // ----------------------------------------------------
        // RECALCULATE PRICING
        // ----------------------------------------------------

        const unitRate =
            Number(pricingRule.unitRate);

        const gstPercent =
            Number(pricingRule.gstPercent);

        const baseAmount =
            quantity * unitRate;

        const gstAmount =
            (baseAmount * gstPercent) /
            100;

        const totalAmount =
            baseAmount + gstAmount;

        // ----------------------------------------------------
        // UPDATE
        // ----------------------------------------------------

        const selection =
            await prisma.clientServiceSelection.update(
                {
                    where: {
                        id: selectionId,
                    },

                    data: {
                        serviceId:
                            pricingRule.serviceId,

                        serviceCode:
                            pricingRule.service.code,

                        serviceName:
                            pricingRule.service.name,

                        pricingBasis:
                            pricingRule.pricingBasis,

                        pricingLabel:
                            pricingRule.pricingLabel,

                        assetCategory:
                            pricingRule.assetCategory,

                        quantity,

                        unitRate,

                        baseAmount,

                        gstPercent,

                        gstAmount,

                        totalAmount,

                        notes:
                            notes || null,
                    },
                }
            );

        return res.status(200).json({
            success: true,

            message:
                "Client service selection updated successfully",

            data: {
                selection,
            },
        });
    } catch (error) {
        console.error(
            "UPDATE CLIENT SERVICE SELECTION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update client service selection",
        });
    }
}

// ============================================================
// DELETE CLIENT SERVICE SELECTION
// ============================================================

export async function deleteClientServiceSelection(
    req,
    res
) {
    try {
        const {
            clientId,
            selectionId,
        } = req.params;

        // ----------------------------------------------------
        // CHECK CLIENT ACCESS
        // ----------------------------------------------------

        const client =
            await getAccessibleClient(
                clientId,
                req
            );

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found",
            });
        }

        // ----------------------------------------------------
        // GET EXISTING SELECTION
        // ----------------------------------------------------

        const existing =
            await prisma.clientServiceSelection.findFirst(
                {
                    where: {
                        id: selectionId,
                        clientId,
                    },
                }
            );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message:
                    "Client service selection not found",
            });
        }

        // ----------------------------------------------------
        // DELETE
        // ----------------------------------------------------

        await prisma.clientServiceSelection.delete(
            {
                where: {
                    id: selectionId,
                },
            }
        );

        return res.status(200).json({
            success: true,

            message:
                "Client service selection deleted successfully",
        });
    } catch (error) {
        console.error(
            "DELETE CLIENT SERVICE SELECTION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete client service selection",
        });
    }
}