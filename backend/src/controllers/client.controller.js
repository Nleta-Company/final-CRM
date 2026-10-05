import { z } from "zod";

import prisma from "../config/prisma.js";

/*
|--------------------------------------------------------------------------
| CREATE CLIENT SCHEMA
|--------------------------------------------------------------------------
*/

const createClientSchema = z.object({
    associationName: z.string().trim().min(2),
    contactName: z.string().trim().min(2),

    email: z.string().trim().email().optional(),

    mobile: z.string().trim().optional(),

    address: z.string().trim().optional(),

    city: z.string().trim().optional(),

    state: z.string().trim().optional(),

    pincode: z.string().trim().optional(),
});

/*
|--------------------------------------------------------------------------
| COMPLETE CLIENT CREATION SCHEMA
|--------------------------------------------------------------------------
|
| Client + service selections are submitted together.
|
*/

const completeClientSelectionSchema = z.object({
    serviceId: z.string().trim().min(1),

    pricingRuleId: z.string().trim().min(1),

    quantity: z.coerce
        .number()
        .positive(),

    notes: z.string().trim().optional(),
});

const createCompleteClientSchema =
    createClientSchema.extend({
        selections: z
            .array(completeClientSelectionSchema)
            .min(
                1,
                "At least one service selection is required"
            ),
    });

/*
|--------------------------------------------------------------------------
| UPDATE CLIENT SCHEMA
|--------------------------------------------------------------------------
*/

const updateClientSchema = z.object({
    associationName:
        z.string().trim().min(2).optional(),

    contactName:
        z.string().trim().min(2).optional(),

    email:
        z.string().trim().email().optional(),

    mobile:
        z.string().trim().optional(),

    address:
        z.string().trim().optional(),

    city:
        z.string().trim().optional(),

    state:
        z.string().trim().optional(),

    pincode:
        z.string().trim().optional(),

    status:
        z.string().trim().optional(),
});

/*
|--------------------------------------------------------------------------
| CLIENT INCLUDE
|--------------------------------------------------------------------------
*/

function clientInclude() {
    return {
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

        createdBy: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
            },
        },

        sourceLead: {
            select: {
                id: true,
                associationName: true,
                status: true,
                assignedToId: true,
                createdById: true,

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
            },
        },

        serviceSelections: {
            orderBy: {
                createdAt: "asc",
            },
        },
    };
}

/*
|--------------------------------------------------------------------------
| CLIENT ACCESS CONTROL
|--------------------------------------------------------------------------
*/

function isAdmin(req) {
    return req.user?.role === "Admin";
}

function isBde(req) {
    return req.user?.role === "BDE/Sales";
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

/*
|--------------------------------------------------------------------------
| GET ACCESSIBLE CLIENT
|--------------------------------------------------------------------------
*/

async function getAccessibleClient(
    id,
    req
) {
    if (isAdmin(req)) {
        return prisma.client.findUnique({
            where: {
                id,
            },

            include: clientInclude(),
        });
    }

    if (isBde(req)) {
        return prisma.client.findFirst({
            where: {
                id,

                ...buildBdeClientWhere(
                    req.user.userId
                ),
            },

            include: clientInclude(),
        });
    }

    return null;
}

/*
|--------------------------------------------------------------------------
| CREATE CLIENT
|--------------------------------------------------------------------------
|
| Existing/simple client creation.
|
| IMPORTANT:
| BDE Client Form CREATE mode should use
| createCompleteClient() instead.
|
*/

export async function createClient(
    req,
    res
) {
    try {
        const validation =
            createClientSchema.safeParse(
                req.body
            );

        if (!validation.success) {
            return res.status(400).json({
                success: false,

                message:
                    "Invalid client data",

                errors:
                    validation.error.flatten(),
            });
        }

        const data =
            validation.data;

        const client =
            await prisma.client.create({
                data: {
                    associationName:
                        data.associationName,

                    contactName:
                        data.contactName,

                    email: data.email
                        ? data.email.toLowerCase()
                        : null,

                    mobile:
                        data.mobile || null,

                    address:
                        data.address || null,

                    city:
                        data.city || null,

                    state:
                        data.state || null,

                    pincode:
                        data.pincode || null,

                    status: "ACTIVE",

                    createdById:
                        req.user.userId,

                    /*
                     * If BDE creates the client,
                     * automatically make that BDE
                     * the assigned BDE.
                     */
                    ...(isBde(req)
                        ? {
                              assignedBdeId:
                                  req.user.userId,
                          }
                        : {}),
                },

                include:
                    clientInclude(),
            });

        return res.status(201).json({
            success: true,

            message:
                "Client created successfully",

            data: {
                client,
            },
        });
    } catch (error) {
        console.error(
            "CREATE CLIENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Unable to create client",
        });
    }
}

/*
|--------------------------------------------------------------------------
| CREATE COMPLETE CLIENT
|--------------------------------------------------------------------------
|
| THIS IS THE IMPORTANT NEW ENDPOINT.
|
| Client + ALL service selections are created
| inside ONE Prisma transaction.
|
| If ANY validation/database operation fails:
|
|     Client creation -> ROLLBACK
|     Service creation -> ROLLBACK
|
| Therefore incomplete clients cannot remain
| in the database.
|
*/

export async function createCompleteClient(
    req,
    res
) {
    try {
        /*
         * ----------------------------------------------------------
         * REQUEST VALIDATION
         * ----------------------------------------------------------
         */

        const validation =
            createCompleteClientSchema.safeParse(
                req.body
            );

        if (!validation.success) {
            return res.status(400).json({
                success: false,

                message:
                    "Invalid complete client data",

                errors:
                    validation.error.flatten(),
            });
        }

        const {
            associationName,
            contactName,
            email,
            mobile,
            address,
            city,
            state,
            pincode,
            selections,
        } = validation.data;

        /*
         * ----------------------------------------------------------
         * TRANSACTION
         * ----------------------------------------------------------
         */

        const client =
            await prisma.$transaction(
                async (tx) => {
                    /*
                     * ==================================================
                     * STEP 1: VALIDATE ALL SERVICES + PRICING RULES
                     * BEFORE CREATING CLIENT
                     * ==================================================
                     *
                     * This is important.
                     *
                     * If service #3 is invalid, we don't even create
                     * the client.
                     */

                    const validatedSelections =
                        [];

                    for (
                        const selection of selections
                    ) {
                        /*
                         * ------------------------------------------------
                         * SERVICE
                         * ------------------------------------------------
                         */

                        const service =
                            await tx.serviceCatalog.findUnique(
                                {
                                    where: {
                                        id:
                                            selection.serviceId,
                                    },
                                }
                            );

                        if (!service) {
                            throw new Error(
                                `Service not found: ${selection.serviceId}`
                            );
                        }

                        if (!service.isActive) {
                            throw new Error(
                                `Selected service "${service.name}" is inactive`
                            );
                        }

                        /*
                         * ------------------------------------------------
                         * PRICING RULE
                         * ------------------------------------------------
                         */

                        const pricingRule =
                            await tx.servicePricingRule.findUnique(
                                {
                                    where: {
                                        id:
                                            selection.pricingRuleId,
                                    },
                                }
                            );

                        if (!pricingRule) {
                            throw new Error(
                                `Pricing rule not found for service "${service.name}"`
                            );
                        }

                        if (
                            !pricingRule.isActive
                        ) {
                            throw new Error(
                                `Selected pricing rule is inactive for service "${service.name}"`
                            );
                        }

                        /*
                         * Pricing rule must belong
                         * to selected service.
                         */

                        if (
                            pricingRule.serviceId !==
                            selection.serviceId
                        ) {
                            throw new Error(
                                `Pricing rule does not belong to selected service "${service.name}"`
                            );
                        }

                        /*
                         * ------------------------------------------------
                         * QUANTITY VALIDATION
                         * ------------------------------------------------
                         *
                         * IMPORTANT BUSINESS RULE:
                         *
                         * ASSET_CATEGORY:
                         *   quantity can be any positive number.
                         *
                         * LIFT_COUNT:
                         *   quantity must fall inside its slab.
                         *
                         * This prevents the old:
                         *
                         * "Maximum quantity is 1"
                         *
                         * problem for normal asset-category pricing.
                         */

                        const pricingBasis =
                            String(
                                pricingRule.pricingBasis ||
                                    ""
                            ).toUpperCase();

                        if (
                            pricingBasis ===
                            "LIFT_COUNT"
                        ) {
                            if (
                                pricingRule.minQuantity !==
                                    null &&
                                selection.quantity <
                                    pricingRule.minQuantity
                            ) {
                                throw new Error(
                                    `Minimum quantity is ${pricingRule.minQuantity} for "${pricingRule.pricingLabel || service.name}"`
                                );
                            }

                            if (
                                pricingRule.maxQuantity !==
                                    null &&
                                selection.quantity >
                                    pricingRule.maxQuantity
                            ) {
                                throw new Error(
                                    `Maximum quantity is ${pricingRule.maxQuantity} for "${pricingRule.pricingLabel || service.name}"`
                                );
                            }
                        }

                        /*
                         * For ASSET_CATEGORY / SERVICE_RATE /
                         * CUSTOM, only positive quantity is required.
                         */

                        /*
                         * ------------------------------------------------
                         * CALCULATE PRICE
                         * ------------------------------------------------
                         */

                        const unitRate =
                            Number(
                                pricingRule.unitRate
                            );

                        const gstPercent =
                            Number(
                                pricingRule.gstPercent
                            );

                        const quantity =
                            Number(
                                selection.quantity
                            );

                        const baseAmount =
                            quantity *
                            unitRate;

                        const gstAmount =
                            (baseAmount *
                                gstPercent) /
                            100;

                        const totalAmount =
                            baseAmount +
                            gstAmount;

                        /*
                         * Save everything required to create
                         * the selection later.
                         */

                        validatedSelections.push(
                            {
                                service,
                                pricingRule,
                                quantity,
                                unitRate,
                                gstPercent,
                                baseAmount,
                                gstAmount,
                                totalAmount,
                                notes:
                                    selection.notes ||
                                    null,
                            }
                        );
                    }

                    /*
                     * ==================================================
                     * STEP 2: CREATE CLIENT
                     * ==================================================
                     *
                     * At this point ALL services and pricing rules
                     * are already validated.
                     */

                    const createdClient =
                        await tx.client.create({
                            data: {
                                associationName,
                                contactName,

                                email: email
                                    ? email.toLowerCase()
                                    : null,

                                mobile:
                                    mobile ||
                                    null,

                                address:
                                    address ||
                                    null,

                                city:
                                    city ||
                                    null,

                                state:
                                    state ||
                                    null,

                                pincode:
                                    pincode ||
                                    null,

                                status:
                                    "ACTIVE",

                                createdById:
                                    req.user.userId,

                                /*
                                 * BDE automatically owns
                                 * the client.
                                 *
                                 * Admin can later assign
                                 * it to a BDE.
                                 */
                                ...(isBde(req)
                                    ? {
                                          assignedBdeId:
                                              req.user
                                                  .userId,
                                      }
                                    : {}),
                            },
                        });

                    /*
                     * ==================================================
                     * STEP 3: CREATE ALL SERVICE SELECTIONS
                     * ==================================================
                     */

                    for (
                        const selection of
                            validatedSelections
                    ) {
                        await tx.clientServiceSelection.create(
                            {
                                data: {
                                    clientId:
                                        createdClient.id,

                                    serviceId:
                                        selection
                                            .service
                                            .id,

                                    /*
                                     * Snapshot fields
                                     */
                                    serviceCode:
                                        selection
                                            .service
                                            .code,

                                    serviceName:
                                        selection
                                            .service
                                            .name,

                                    pricingBasis:
                                        selection
                                            .pricingRule
                                            .pricingBasis,

                                    pricingLabel:
                                        selection
                                            .pricingRule
                                            .pricingLabel ||
                                        null,

                                    assetCategory:
                                        selection
                                            .pricingRule
                                            .assetCategory ||
                                        null,

                                    quantity:
                                        selection.quantity,

                                    unitRate:
                                        selection.unitRate,

                                    baseAmount:
                                        selection.baseAmount,

                                    gstPercent:
                                        selection.gstPercent,

                                    gstAmount:
                                        selection.gstAmount,

                                    totalAmount:
                                        selection.totalAmount,

                                    notes:
                                        selection.notes,

                                    createdById:
                                        req.user.userId,
                                },
                            }
                        );
                    }

                    /*
                     * ==================================================
                     * STEP 4: FETCH COMPLETE CLIENT
                     * ==================================================
                     */

                    const completeClient =
                        await tx.client.findUnique(
                            {
                                where: {
                                    id:
                                        createdClient.id,
                                },

                                include:
                                    clientInclude(),
                            }
                        );

                    return completeClient;
                }
            );

        /*
         * ----------------------------------------------------------
         * SUCCESS
         * ----------------------------------------------------------
         */

        return res.status(201).json({
            success: true,

            message:
                "Client and services created successfully",

            data: {
                client,
            },
        });
    } catch (error) {
        console.error(
            "CREATE COMPLETE CLIENT ERROR:",
            error
        );

        /*
         * Prisma transaction automatically rolls back
         * if an error is thrown inside $transaction().
         */

        return res.status(400).json({
            success: false,

            message:
                error instanceof Error
                    ? error.message
                    : "Unable to create complete client",
        });
    }
}

/*
|--------------------------------------------------------------------------
| GET ALL CLIENTS
|--------------------------------------------------------------------------
*/

export async function getClients(
    req,
    res
) {
    try {
        let where = {};

        if (isBde(req)) {
            where =
                buildBdeClientWhere(
                    req.user.userId
                );
        }

        const clients =
            await prisma.client.findMany({
                where,

                orderBy: {
                    createdAt: "desc",
                },

                include:
                    clientInclude(),
            });

        return res.status(200).json({
            success: true,

            message:
                "Clients fetched successfully",

            data: {
                clients,

                total:
                    clients.length,
            },
        });
    } catch (error) {
        console.error(
            "GET CLIENTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Unable to fetch clients",
        });
    }
}

/*
|--------------------------------------------------------------------------
| GET SINGLE CLIENT
|--------------------------------------------------------------------------
*/

export async function getClientById(
    req,
    res
) {
    try {
        const { id } =
            req.params;

        const client =
            await getAccessibleClient(
                id,
                req
            );

        if (!client) {
            return res.status(404).json({
                success: false,

                message:
                    "Client not found",
            });
        }

        return res.status(200).json({
            success: true,

            message:
                "Client fetched successfully",

            data: {
                client,
            },
        });
    } catch (error) {
        console.error(
            "GET CLIENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Unable to fetch client",
        });
    }
}

/*
|--------------------------------------------------------------------------
| UPDATE CLIENT
|--------------------------------------------------------------------------
*/

export async function updateClient(
    req,
    res
) {
    try {
        const { id } =
            req.params;

        const validation =
            updateClientSchema.safeParse(
                req.body
            );

        if (!validation.success) {
            return res.status(400).json({
                success: false,

                message:
                    "Invalid client data",

                errors:
                    validation.error.flatten(),
            });
        }

        const existingClient =
            await getAccessibleClient(
                id,
                req
            );

        if (!existingClient) {
            return res.status(403).json({
                success: false,

                message:
                    "You are not allowed to access this client",
            });
        }

        const data =
            validation.data;

        const client =
            await prisma.client.update({
                where: {
                    id,
                },

                data: {
                    ...(data.associationName !==
                        undefined && {
                        associationName:
                            data.associationName,
                    }),

                    ...(data.contactName !==
                        undefined && {
                        contactName:
                            data.contactName,
                    }),

                    ...(data.email !==
                        undefined && {
                        email: data.email
                            ? data.email.toLowerCase()
                            : null,
                    }),

                    ...(data.mobile !==
                        undefined && {
                        mobile:
                            data.mobile ||
                            null,
                    }),

                    ...(data.address !==
                        undefined && {
                        address:
                            data.address ||
                            null,
                    }),

                    ...(data.city !==
                        undefined && {
                        city:
                            data.city ||
                            null,
                    }),

                    ...(data.state !==
                        undefined && {
                        state:
                            data.state ||
                            null,
                    }),

                    ...(data.pincode !==
                        undefined && {
                        pincode:
                            data.pincode ||
                            null,
                    }),

                    ...(data.status !==
                        undefined && {
                        status:
                            data.status,
                    }),
                },

                include:
                    clientInclude(),
            });

        return res.status(200).json({
            success: true,

            message:
                "Client updated successfully",

            data: {
                client,
            },
        });
    } catch (error) {
        console.error(
            "UPDATE CLIENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Unable to update client",
        });
    }
}

/*
|--------------------------------------------------------------------------
| DELETE CLIENT
|--------------------------------------------------------------------------
*/

export async function deleteClient(
    req,
    res
) {
    try {
        const { id } = req.params;

        /*
        |--------------------------------------------------------------------------
        | ACCESS CHECK
        |--------------------------------------------------------------------------
        */

        const existingClient =
            await getAccessibleClient(
                id,
                req
            );

        if (!existingClient) {
            return res.status(403).json({
                success: false,

                message:
                    "You are not allowed to access this client",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | PERMANENT DELETE
        |--------------------------------------------------------------------------
        |
        | Everything related to this client is
        | removed inside ONE transaction.
        |
        */

        await prisma.$transaction(
            async (tx) => {
                /*
                |--------------------------------------------------------------------------
                | 1. PRESERVE LEAD HISTORY
                |--------------------------------------------------------------------------
                |
                | If this client came from a Lead,
                | don't delete the Lead.
                |
                | Just remove the client reference.
                |
                */

                await tx.lead.updateMany({
                    where: {
                        clientId: id,
                    },

                    data: {
                        clientId: null,
                    },
                });

                /*
                |--------------------------------------------------------------------------
                | 2. DELETE ACTIVITIES
                |--------------------------------------------------------------------------
                */

                await tx.activity.deleteMany({
                    where: {
                        clientId: id,
                    },
                });

                /*
                |--------------------------------------------------------------------------
                | 3. DELETE CLIENT SERVICE SELECTIONS
                |--------------------------------------------------------------------------
                */

                await tx.clientServiceSelection.deleteMany({
                    where: {
                        clientId: id,
                    },
                });

                /*
                |--------------------------------------------------------------------------
                | 4. FIND PSGA RECORDS
                |--------------------------------------------------------------------------
                */

                const psgas =
                    await tx.pSGA.findMany({
                        where: {
                            clientId: id,
                        },

                        select: {
                            id: true,
                        },
                    });

                const psgIds =
                    psgas.map(
                        (psga) => psga.id
                    );

                /*
                |--------------------------------------------------------------------------
                | 5. DELETE PSGA INCENTIVE ALLOCATIONS
                |--------------------------------------------------------------------------
                */

                if (psgIds.length > 0) {
                    await tx.pSGAIncentiveAllocation.deleteMany({
                        where: {
                            psgId: {
                                in: psgIds,
                            },
                        },
                    });
                }

                /*
                |--------------------------------------------------------------------------
                | 6. DELETE PSGA
                |--------------------------------------------------------------------------
                */

                await tx.pSGA.deleteMany({
                    where: {
                        clientId: id,
                    },
                });

                /*
                |--------------------------------------------------------------------------
                | 7. DELETE CLIENT
                |--------------------------------------------------------------------------
                */

                await tx.client.delete({
                    where: {
                        id,
                    },
                });
            }
        );

        /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        */

        return res.status(200).json({
            success: true,

            message:
                "Client and all related data deleted permanently",
        });
    } catch (error) {
        console.error(
            "DELETE CLIENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Unable to delete client",
        });
    }
}

/*
|--------------------------------------------------------------------------
| ASSIGN / REASSIGN CLIENT TO BDE
|--------------------------------------------------------------------------
*/

const assignClientBdeSchema =
    z.object({
        bdeId:
            z.string().trim().min(1),
    });

export async function assignClientBde(
    req,
    res
) {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({
                success: false,

                message:
                    "Only Admin can assign or reassign a client to a BDE",
            });
        }

        const { id } =
            req.params;

        const validation =
            assignClientBdeSchema.safeParse(
                req.body
            );

        if (!validation.success) {
            return res.status(400).json({
                success: false,

                message:
                    "Valid bdeId is required",

                errors:
                    validation.error.flatten(),
            });
        }

        const { bdeId } =
            validation.data;

        const existingClient =
            await prisma.client.findUnique(
                {
                    where: {
                        id,
                    },
                }
            );

        if (!existingClient) {
            return res.status(404).json({
                success: false,

                message:
                    "Client not found",
            });
        }

        const bde =
            await prisma.user.findUnique({
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

                message:
                    "BDE user not found",
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

        const client =
            await prisma.client.update({
                where: {
                    id,
                },

                data: {
                    assignedBdeId:
                        bde.id,
                },

                include:
                    clientInclude(),
            });

        return res.status(200).json({
            success: true,

            message:
                "Client assigned to BDE successfully",

            data: {
                client,
            },
        });
    } catch (error) {
        console.error(
            "ASSIGN CLIENT BDE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Unable to assign client to BDE",
        });
    }
}

/*
|--------------------------------------------------------------------------
| CLIENT STATS
|--------------------------------------------------------------------------
*/

export async function getClientStats(
    req,
    res
) {
    try {
        let where = {};

        if (isBde(req)) {
            where =
                buildBdeClientWhere(
                    req.user.userId
                );
        }

        const totalClients =
            await prisma.client.count({
                where,
            });

        const activeClients =
            await prisma.client.count({
                where: {
                    ...where,

                    status:
                        "ACTIVE",
                },
            });

        const inactiveClients =
            await prisma.client.count({
                where: {
                    ...where,

                    status:
                        "INACTIVE",
                },
            });

        return res.status(200).json({
            success: true,

            message:
                "Client statistics fetched successfully",

            data: {
                totalClients,

                activeClients,

                inactiveClients,
            },
        });
    } catch (error) {
        console.error(
            "GET CLIENT STATS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Unable to fetch client statistics",
        });
    }
}