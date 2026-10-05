import "dotenv/config";

import prisma from "../config/prisma.js";

const pricingRules = [
  {
    pricingBasis: "CUSTOM",
    pricingLabel: "Annexure-B Rev.1 — Association/Society Platform Fee",
    assetCategory: "Association/Society Platform",
    minQuantity: 1,
    maxQuantity: 1,
    unitRate: 7500,
  },

  {
    pricingBasis: "LIFT_COUNT",
    pricingLabel: "Annexure-B Rev.1 — 1–5 Participating Assets",
    assetCategory: "Participating Assets",
    minQuantity: 1,
    maxQuantity: 5,
    unitRate: 2500,
  },

  {
    pricingBasis: "LIFT_COUNT",
    pricingLabel: "Annexure-B Rev.1 — 6–10 Participating Assets",
    assetCategory: "Participating Assets",
    minQuantity: 6,
    maxQuantity: 10,
    unitRate: 2350,
  },

  {
    pricingBasis: "LIFT_COUNT",
    pricingLabel: "Annexure-B Rev.1 — 11–20 Participating Assets",
    assetCategory: "Participating Assets",
    minQuantity: 11,
    maxQuantity: 20,
    unitRate: 2200,
  },

  {
    pricingBasis: "LIFT_COUNT",
    pricingLabel: "Annexure-B Rev.1 — 21–30 Participating Assets",
    assetCategory: "Participating Assets",
    minQuantity: 21,
    maxQuantity: 30,
    unitRate: 2050,
  },

  {
    pricingBasis: "LIFT_COUNT",
    pricingLabel: "Annexure-B Rev.1 — 31–40 Participating Assets",
    assetCategory: "Participating Assets",
    minQuantity: 31,
    maxQuantity: 40,
    unitRate: 1950,
  },

  {
    pricingBasis: "LIFT_COUNT",
    pricingLabel: "Annexure-B Rev.1 — 41–50 Participating Assets",
    assetCategory: "Participating Assets",
    minQuantity: 41,
    maxQuantity: 50,
    unitRate: 1900,
  },
];

async function main() {
  console.log("Seeding Annexure-B Rev.1 DGS pricing...");

  const service = await prisma.serviceCatalog.findUnique({
    where: {
      code: "DGS",
    },
  });

  if (!service) {
    throw new Error("DGS service not found.");
  }

  for (const rule of pricingRules) {
    const existingRule =
      await prisma.servicePricingRule.findFirst({
        where: {
          serviceId: service.id,
          pricingBasis: rule.pricingBasis,
          pricingLabel: rule.pricingLabel,
        },
      });

    if (existingRule) {
      await prisma.servicePricingRule.update({
        where: {
          id: existingRule.id,
        },
        data: {
          assetCategory: rule.assetCategory,
          minQuantity: rule.minQuantity,
          maxQuantity: rule.maxQuantity,
          unitRate: rule.unitRate,
          gstPercent: 18,
          isActive: true,
        },
      });

      console.log(
        `✓ Updated ${rule.pricingLabel} — ₹${rule.unitRate}`
      );
    } else {
      await prisma.servicePricingRule.create({
        data: {
          serviceId: service.id,
          pricingBasis: rule.pricingBasis,
          pricingLabel: rule.pricingLabel,
          assetCategory: rule.assetCategory,
          minQuantity: rule.minQuantity,
          maxQuantity: rule.maxQuantity,
          unitRate: rule.unitRate,
          gstPercent: 18,
          isActive: true,
        },
      });

      console.log(
        `✓ Created ${rule.pricingLabel} — ₹${rule.unitRate}`
      );
    }
  }

  console.log("");
  console.log(
    "Annexure-B Rev.1 DGS pricing seeded successfully."
  );
}

main()
  .catch((error) => {
    console.error(
      "ANNEXURE-B PRICING SEED ERROR:",
      error
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });