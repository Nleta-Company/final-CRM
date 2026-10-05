import "dotenv/config";

import prisma from "../config/prisma.js";

const services = [
  {
    code: "PAT",
    name: "Partial Acceptance Test",
    description:
      "Independent Safety Inspection for existing lifts. Recommended as the first engineering inspection.",
  },
  {
    code: "SAT",
    name: "Satisfactory Acceptance Test",
    description:
      "Independent Quality & Performance Inspection. Applicable when selected by the Client or recommended through the applicable decision matrix.",
  },
  {
    code: "SCI",
    name: "Standards Compliance Inspection",
    description:
      "Independent Standards Compliance Verification.",
  },
  {
    code: "DLA",
    name: "Design Life Assessment",
    description:
      "Engineering evaluation of remaining useful life, modernization priority and lifecycle planning.",
  },
  {
    code: "DGS",
    name: "Digital Governance System",
    description:
      "Digital governance platform service for participating assets and association/society management.",
  },
];

async function main() {
  console.log("Seeding NLETA Service Master...");

  for (const service of services) {
    const result = await prisma.serviceCatalog.upsert({
      where: {
        code: service.code,
      },
      update: {
        name: service.name,
        description: service.description,
        isActive: true,
      },
      create: {
        code: service.code,
        name: service.name,
        description: service.description,
        isActive: true,
      },
    });

    console.log(
      `✓ ${result.code} — ${result.name}`
    );
  }

  console.log("Service Master seeded successfully.");
}

main()
  .catch((error) => {
    console.error("SERVICE SEED ERROR:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });