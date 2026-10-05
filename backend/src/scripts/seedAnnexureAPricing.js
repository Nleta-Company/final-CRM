import "dotenv/config";

import prisma from "../config/prisma.js";

const pricingMatrix = [
  {
    serviceCode: "PAT",
    assetCategory: "Lift up to 7 Floors",
    unitRate: 4500,
  },
  {
    serviceCode: "PAT",
    assetCategory: "Lift 8–15 Floors",
    unitRate: 5400,
  },
  {
    serviceCode: "PAT",
    assetCategory: "Lift 16–23 Floors",
    unitRate: 6300,
  },
  {
    serviceCode: "PAT",
    assetCategory: "Lift 24–31 Floors",
    unitRate: 7200,
  },
  {
    serviceCode: "PAT",
    assetCategory: "Commercial Escalator (Up to 4.5 m Rise)",
    unitRate: 9000,
  },
  {
    serviceCode: "PAT",
    assetCategory: "Heavy Duty Escalator (Up to 7.0 m Rise)",
    unitRate: 13500,
  },

  {
    serviceCode: "SAT",
    assetCategory: "Lift up to 7 Floors",
    unitRate: 5400,
  },
  {
    serviceCode: "SAT",
    assetCategory: "Lift 8–15 Floors",
    unitRate: 6300,
  },
  {
    serviceCode: "SAT",
    assetCategory: "Lift 16–23 Floors",
    unitRate: 7200,
  },
  {
    serviceCode: "SAT",
    assetCategory: "Lift 24–31 Floors",
    unitRate: 8100,
  },
  {
    serviceCode: "SAT",
    assetCategory: "Commercial Escalator (Up to 4.5 m Rise)",
    unitRate: 9000,
  },
  {
    serviceCode: "SAT",
    assetCategory: "Heavy Duty Escalator (Up to 7.0 m Rise)",
    unitRate: 13500,
  },

  {
    serviceCode: "SCI",
    assetCategory: "Lift up to 7 Floors",
    unitRate: 3100,
  },
  {
    serviceCode: "SCI",
    assetCategory: "Lift 8–15 Floors",
    unitRate: 4000,
  },
  {
    serviceCode: "SCI",
    assetCategory: "Lift 16–23 Floors",
    unitRate: 4900,
  },
  {
    serviceCode: "SCI",
    assetCategory: "Lift 24–31 Floors",
    unitRate: 5800,
  },
  {
    serviceCode: "SCI",
    assetCategory: "Commercial Escalator (Up to 4.5 m Rise)",
    unitRate: 7000,
  },
  {
    serviceCode: "SCI",
    assetCategory: "Heavy Duty Escalator (Up to 7.0 m Rise)",
    unitRate: 12600,
  },

  {
    serviceCode: "DLA",
    assetCategory: "Lift up to 7 Floors",
    unitRate: 4100,
  },
  {
    serviceCode: "DLA",
    assetCategory: "Lift 8–15 Floors",
    unitRate: 5000,
  },
  {
    serviceCode: "DLA",
    assetCategory: "Lift 16–23 Floors",
    unitRate: 5900,
  },
  {
    serviceCode: "DLA",
    assetCategory: "Lift 24–31 Floors",
    unitRate: 6800,
  },
];

async function main() {
  console.log("Seeding Annexure-A Rev.1 pricing...");

  for (const item of pricingMatrix) {
    const service = await prisma.serviceCatalog.findUnique({
      where: {
        code: item.serviceCode,
      },
    });

    if (!service) {
      throw new Error(
        `Service not found: ${item.serviceCode}`
      );
    }

    const existingRule =
      await prisma.servicePricingRule.findFirst({
        where: {
          serviceId: service.id,
          pricingBasis: "ASSET_CATEGORY",
          assetCategory: item.assetCategory,
        },
      });

    if (existingRule) {
      const updatedRule =
        await prisma.servicePricingRule.update({
          where: {
            id: existingRule.id,
          },
          data: {
            pricingLabel: "Annexure-A Rev.1",
            unitRate: item.unitRate,
            gstPercent: 18,
            isActive: true,
          },
        });

      console.log(
        `✓ Updated ${item.serviceCode} — ${item.assetCategory} — ₹${updatedRule.unitRate}`
      );
    } else {
      const createdRule =
        await prisma.servicePricingRule.create({
          data: {
            serviceId: service.id,
            pricingBasis: "ASSET_CATEGORY",
            pricingLabel: "Annexure-A Rev.1",
            assetCategory: item.assetCategory,
            minQuantity: 1,
            maxQuantity: 1,
            unitRate: item.unitRate,
            gstPercent: 18,
            isActive: true,
          },
        });

      console.log(
        `✓ Created ${item.serviceCode} — ${item.assetCategory} — ₹${createdRule.unitRate}`
      );
    }
  }

  console.log("");
  console.log(
    "Annexure-A Rev.1 pricing seeded successfully."
  );
}

main()
  .catch((error) => {
    console.error(
      "ANNEXURE-A PRICING SEED ERROR:",
      error
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });