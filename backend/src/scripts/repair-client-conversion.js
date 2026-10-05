import "dotenv/config";

import prisma from "../config/prisma.js";

const LEAD_ID = "cmui6oo9d0008ggumtmwcnj74";
const CLIENT_ID = "cmuksay7t000fbkumrvxh8fxk";

async function repairClientConversion() {
    console.log("==========================================");
    console.log("NLETA CRM - CLIENT CONVERSION REPAIR");
    console.log("==========================================");

    const result = await prisma.$transaction(async (tx) => {

        // --------------------------------------------------
        // 1. Fetch Lead + original service selections
        // --------------------------------------------------

        const lead = await tx.lead.findUnique({
            where: {
                id: LEAD_ID,
            },
            include: {
                serviceSelections: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        if (!lead) {
            throw new Error(`Lead not found: ${LEAD_ID}`);
        }

        console.log("\nLead found:");
        console.log(lead.id);
        console.log("Status:", lead.status);
        console.log(
            "Assigned BDE:",
            lead.assignedToId || "None"
        );

        console.log(
            "Lead service selections:",
            lead.serviceSelections.length
        );

        // --------------------------------------------------
        // 2. Fetch existing Client
        // --------------------------------------------------

        const client = await tx.client.findUnique({
            where: {
                id: CLIENT_ID,
            },
            include: {
                serviceSelections: true,
            },
        });

        if (!client) {
            throw new Error(`Client not found: ${CLIENT_ID}`);
        }

        console.log("\nClient found:");
        console.log(client.id);

        console.log(
            "Existing client service selections:",
            client.serviceSelections.length
        );

        // --------------------------------------------------
        // 3. Verify Lead → Client relation
        // --------------------------------------------------

        if (lead.clientId !== CLIENT_ID) {
            throw new Error(
                `Lead ${LEAD_ID} is not linked to Client ${CLIENT_ID}`
            );
        }

        // --------------------------------------------------
        // 4. Sync BDE assignment
        // --------------------------------------------------

        if (
            lead.assignedToId &&
            client.assignedBdeId !== lead.assignedToId
        ) {
            await tx.client.update({
                where: {
                    id: CLIENT_ID,
                },
                data: {
                    assignedBdeId: lead.assignedToId,
                },
            });

            console.log(
                "\nBDE assignment synced:",
                lead.assignedToId
            );
        } else {
            console.log(
                "\nBDE assignment already correct."
            );
        }

        // --------------------------------------------------
        // 5. Copy service selections only if Client
        //    currently has none
        // --------------------------------------------------

        if (client.serviceSelections.length === 0) {

            if (lead.serviceSelections.length === 0) {
                console.log(
                    "\nNo Lead service selections to copy."
                );
            } else {

                await tx.clientServiceSelection.createMany({
                    data: lead.serviceSelections.map(
                        (selection) => ({
                            clientId: CLIENT_ID,

                            serviceId: selection.serviceId,

                            serviceCode:
                                selection.serviceCode,

                            serviceName:
                                selection.serviceName,

                            pricingBasis:
                                selection.pricingBasis,

                            pricingLabel:
                                selection.pricingLabel,

                            assetCategory:
                                selection.assetCategory,

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
                                selection.createdById,
                        })
                    ),
                });

                console.log(
                    `\nCopied ${lead.serviceSelections.length} service selections.`
                );
            }

        } else {
            console.log(
                "\nClient already has service selections."
            );

            console.log(
                "No duplicate selections created."
            );
        }

        // --------------------------------------------------
        // 6. Fetch repaired Client
        // --------------------------------------------------

        const repairedClient =
            await tx.client.findUnique({
                where: {
                    id: CLIENT_ID,
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
                },
            });

        return {
            lead,
            client: repairedClient,
        };
    });

    // ------------------------------------------------------
    // 7. Calculate totals
    // ------------------------------------------------------

    const selections =
        result.client.serviceSelections || [];

    const summary = {
        serviceCount: selections.length,

        baseAmount: selections.reduce(
            (sum, item) =>
                sum + Number(item.baseAmount || 0),
            0
        ),

        gstAmount: selections.reduce(
            (sum, item) =>
                sum + Number(item.gstAmount || 0),
            0
        ),

        totalAmount: selections.reduce(
            (sum, item) =>
                sum + Number(item.totalAmount || 0),
            0
        ),
    };

    console.log("\n==========================================");
    console.log("REPAIR COMPLETED");
    console.log("==========================================");

    console.log("\nClient ID:", result.client.id);

    console.log(
        "Assigned BDE:",
        result.client.assignedBde
            ? `${result.client.assignedBde.firstName} ${result.client.assignedBde.lastName}`
            : "None"
    );

    console.log(
        "\nService count:",
        summary.serviceCount
    );

    console.log(
        "Base amount:",
        summary.baseAmount
    );

    console.log(
        "GST amount:",
        summary.gstAmount
    );

    console.log(
        "Total amount:",
        summary.totalAmount
    );

    console.log("\nServices:");

    for (const item of selections) {
        console.log(
            `- ${item.serviceCode}: ₹${Number(
                item.totalAmount
            )}`
        );
    }

    console.log("\n==========================================");
}

repairClientConversion()
    .catch((error) => {
        console.error("\nREPAIR FAILED:");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });