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

async function getAccessibleLead(leadId, req) {
    if (isAdmin(req)) {
        return prisma.lead.findUnique({
            where: {
                id: leadId,
            },
        });
    }

    if (isBde(req)) {
        return prisma.lead.findFirst({
            where: {
                id: leadId,
                OR: [
                    {
                        createdById: req.user.userId,
                    },
                    {
                        assignedToId: req.user.userId,
                    },
                ],
            },
        });
    }

    return null;
}

// ============================================================
// VALIDATION
// ============================================================

const createSelectionSchema = z.object({
    serviceId: z.string().trim().min(1),

    pricingRuleId: z.string().trim().min(1),

    quantity: z.coerce
        .number()
        .positive(),

    notes: z
        .string()
        .trim()
        .optional()
        .nullable(),
});

const updateSelectionSchema = z.object({
    pricingRuleId: z.string().trim().min(1),

    quantity: z.coerce
        .number()
        .positive(),

    notes: z
        .string()
        .trim()
        .optional()
        .nullable(),
});

// ============================================================
// CALCULATE PRICING
// ============================================================

function calculateAmounts({
    quantity,
    unitRate,
    gstPercent,
}) {
    const baseAmount =
        Number(quantity) * Number(unitRate);

    const gstAmount =
        baseAmount *
        (Number(gstPercent) / 100);

    const totalAmount =
        baseAmount + gstAmount;

    return {
        baseAmount,
        gstAmount,
        totalAmount,
    };
}

// ============================================================
// VALIDATE QUANTITY AGAINST PRICING RULE
// ============================================================

function validateQuantityAgainstRule(
    quantity,
    pricingRule
) {
    const numericQuantity = Number(quantity);

    // Quantity must always be a valid positive number.
    if (
        !Number.isFinite(numericQuantity) ||
        numericQuantity <= 0
    ) {
        return false;
    }

    // Minimum quantity is respected.
    if (
        pricingRule.minQuantity !== null &&
        numericQuantity <
            Number(pricingRule.minQuantity)
    ) {
        return false;
    }

    // IMPORTANT:
    // maxQuantity is intentionally NOT checked.
    //
    // This allows requirement-driven quantities such as:
    // 1, 2, 5, 10, 50, 100, etc.
    //
    // Example:
    // pricingRule.maxQuantity = 1
    // quantity = 10
    // => VALID

    return true;
}

// ============================================================
// GET LEAD SERVICE SELECTIONS
// ============================================================

export async function getLeadServiceSelections(
    req,
    res
) {
    try {
        const { leadId } = req.params;

        const lead =
            await getAccessibleLead(
                leadId,
                req
            );

        if (!lead) {
            return res.status(404).json({
                success: false,
                message:
                    "Lead not found or you do not have access to this lead",
            });
        }

        const selections =
            await prisma.leadServiceSelection.findMany({
                where: {
                    leadId,
                },

                orderBy: {
                    createdAt: "asc",
                },
            });

        return res.status(200).json({
            success: true,
            message:
                "Lead service selections fetched successfully",

            data: {
                leadId,
                selections,
                total: selections.length,
            },
        });
    } catch (error) {
        console.error(
            "GET LEAD SERVICE SELECTIONS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch lead service selections",
        });
    }
}

// ============================================================
// ADD SERVICE TO LEAD
// ============================================================

export async function addLeadServiceSelection(
    req,
    res
) {
    try {
        const { leadId } = req.params;

        const validation =
            createSelectionSchema.safeParse(
                req.body
            );

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid service selection data",
                errors:
                    validation.error.flatten(),
            });
        }

        const data = validation.data;

        const lead =
            await getAccessibleLead(
                leadId,
                req
            );

        if (!lead) {
            return res.status(404).json({
                success: false,
                message:
                    "Lead not found or you do not have access to this lead",
            });
        }

        // --------------------------------------------------------
        // SERVICE
        // --------------------------------------------------------

        const service =
            await prisma.serviceCatalog.findUnique({
                where: {
                    id: data.serviceId,
                },
            });

        if (!service) {
            return res.status(404).json({
                success: false,
                message:
                    "Service not found",
            });
        }

        if (!service.isActive) {
            return res.status(400).json({
                success: false,
                message:
                    "This service is inactive",
            });
        }

        // --------------------------------------------------------
        // PRICING RULE
        // --------------------------------------------------------

        const pricingRule =
            await prisma.servicePricingRule.findFirst({
                where: {
                    id: data.pricingRuleId,
                    serviceId: data.serviceId,
                    isActive: true,
                },
            });

        if (!pricingRule) {
            return res.status(404).json({
                success: false,
                message:
                    "Active pricing rule not found for this service",
            });
        }

        // --------------------------------------------------------
        // QUANTITY VALIDATION
        // --------------------------------------------------------

        if (
            !validateQuantityAgainstRule(
                data.quantity,
                pricingRule
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `Quantity must be at least ${
                        pricingRule.minQuantity ?? 1
                    } for the selected pricing rule`,
            });
        }

        // --------------------------------------------------------
        // DUPLICATE SERVICE CHECK
        // --------------------------------------------------------
        //
        // Intentionally removed.
        //
        // Same service can be selected multiple times
        // for the same lead.
        //
        // --------------------------------------------------------

        // --------------------------------------------------------
        // CALCULATE AMOUNTS
        // --------------------------------------------------------

        const amounts =
            calculateAmounts({
                quantity:
                    data.quantity,

                unitRate:
                    pricingRule.unitRate,

                gstPercent:
                    pricingRule.gstPercent,
            });

        // --------------------------------------------------------
        // CREATE SELECTION SNAPSHOT
        // --------------------------------------------------------

        const selection =
            await prisma.leadServiceSelection.create({
                data: {
                    leadId,

                    serviceId:
                        service.id,

                    serviceCode:
                        service.code,

                    serviceName:
                        service.name,

                    pricingBasis:
                        pricingRule.pricingBasis,

                    pricingLabel:
                        pricingRule.pricingLabel ||
                        null,

                    assetCategory:
                        pricingRule.assetCategory ||
                        null,

                    quantity:
                        data.quantity,

                    unitRate:
                        pricingRule.unitRate,

                    baseAmount:
                        amounts.baseAmount,

                    gstPercent:
                        pricingRule.gstPercent,

                    gstAmount:
                        amounts.gstAmount,

                    totalAmount:
                        amounts.totalAmount,

                    notes:
                        data.notes ||
                        null,

                    createdById:
                        req.user.userId,
                },
            });

        return res.status(201).json({
            success: true,
            message:
                "Service added to lead successfully",

            data: {
                selection,
            },
        });
    } catch (error) {
        console.error(
            "ADD LEAD SERVICE SELECTION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to add service to lead",
        });
    }
}

// ============================================================
// UPDATE LEAD SERVICE SELECTION
// ============================================================

export async function updateLeadServiceSelection(
    req,
    res
) {
    try {
        const {
            leadId,
            selectionId,
        } = req.params;

        const validation =
            updateSelectionSchema.safeParse(
                req.body
            );

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid service selection data",
                errors:
                    validation.error.flatten(),
            });
        }

        const data = validation.data;

        const lead =
            await getAccessibleLead(
                leadId,
                req
            );

        if (!lead) {
            return res.status(404).json({
                success: false,
                message:
                    "Lead not found or you do not have access to this lead",
            });
        }

        // --------------------------------------------------------
        // EXISTING SELECTION
        // --------------------------------------------------------

        const existingSelection =
            await prisma.leadServiceSelection.findFirst({
                where: {
                    id: selectionId,
                    leadId,
                },
            });

        if (!existingSelection) {
            return res.status(404).json({
                success: false,
                message:
                    "Lead service selection not found",
            });
        }

        // --------------------------------------------------------
        // PRICING RULE
        // --------------------------------------------------------

        const pricingRule =
            await prisma.servicePricingRule.findFirst({
                where: {
                    id: data.pricingRuleId,

                    serviceId:
                        existingSelection.serviceId,

                    isActive: true,
                },
            });

        if (!pricingRule) {
            return res.status(404).json({
                success: false,
                message:
                    "Active pricing rule not found for this service",
            });
        }

        // --------------------------------------------------------
        // QUANTITY VALIDATION
        // --------------------------------------------------------

        if (
            !validateQuantityAgainstRule(
                data.quantity,
                pricingRule
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `Quantity must be at least ${
                        pricingRule.minQuantity ?? 1
                    } for the selected pricing rule`,
            });
        }

        // --------------------------------------------------------
        // CALCULATE
        // --------------------------------------------------------

        const amounts =
            calculateAmounts({
                quantity:
                    data.quantity,

                unitRate:
                    pricingRule.unitRate,

                gstPercent:
                    pricingRule.gstPercent,
            });

        // --------------------------------------------------------
        // UPDATE SELECTION
        // --------------------------------------------------------

        const selection =
            await prisma.leadServiceSelection.update({
                where: {
                    id: selectionId,
                },

                data: {
                    pricingBasis:
                        pricingRule.pricingBasis,

                    pricingLabel:
                        pricingRule.pricingLabel ||
                        null,

                    assetCategory:
                        pricingRule.assetCategory ||
                        null,

                    quantity:
                        data.quantity,

                    unitRate:
                        pricingRule.unitRate,

                    baseAmount:
                        amounts.baseAmount,

                    gstPercent:
                        pricingRule.gstPercent,

                    gstAmount:
                        amounts.gstAmount,

                    totalAmount:
                        amounts.totalAmount,

                    notes:
                        data.notes ||
                        null,
                },
            });

        return res.status(200).json({
            success: true,
            message:
                "Lead service selection updated successfully",

            data: {
                selection,
            },
        });
    } catch (error) {
        console.error(
            "UPDATE LEAD SERVICE SELECTION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update lead service selection",
        });
    }
}

// ============================================================
// DELETE LEAD SERVICE SELECTION
// ============================================================

export async function deleteLeadServiceSelection(
    req,
    res
) {
    try {
        const {
            leadId,
            selectionId,
        } = req.params;

        const lead =
            await getAccessibleLead(
                leadId,
                req
            );

        if (!lead) {
            return res.status(404).json({
                success: false,
                message:
                    "Lead not found or you do not have access to this lead",
            });
        }

        const selection =
            await prisma.leadServiceSelection.findFirst({
                where: {
                    id: selectionId,
                    leadId,
                },
            });

        if (!selection) {
            return res.status(404).json({
                success: false,
                message:
                    "Lead service selection not found",
            });
        }

        await prisma.leadServiceSelection.delete({
            where: {
                id: selectionId,
            },
        });

        return res.status(200).json({
            success: true,
            message:
                "Service removed from lead successfully",
        });
    } catch (error) {
        console.error(
            "DELETE LEAD SERVICE SELECTION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to remove lead service selection",
        });
    }
}