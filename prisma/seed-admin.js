import "dotenv/config";

import bcrypt from "bcrypt";

import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const ADMIN_EMAIL = "admin@nleta.com";
const ADMIN_PASSWORD = "12345@Nleta";

async function main() {
  console.log("=================================");
  console.log("Creating NLETA CRM Admin...");
  console.log("=================================");

  // Find Admin role
  const adminRole = await prisma.role.findUnique({
    where: {
      name: "Admin",
    },
  });

  if (!adminRole) {
    throw new Error(
      "Admin role not found. Run node prisma/seed.js first."
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // Create or update Admin
  const admin = await prisma.user.upsert({
    where: {
      email: ADMIN_EMAIL,
    },
    update: {
      firstName: "NLETA",
      lastName: "Admin",
      roleId: adminRole.id,
      status: "ACTIVE",
    },
    create: {
      firstName: "NLETA",
      lastName: "Admin",
      email: ADMIN_EMAIL,
      passwordHash,
      status: "ACTIVE",
      roleId: adminRole.id,
    },
  });

  console.log("Admin user ready.");
  console.log("Email:", admin.email);
  console.log("Role:", adminRole.name);
  console.log("Status:", admin.status);

  console.log("=================================");
  console.log("Admin creation completed.");
  console.log("=================================");
}

main()
  .catch((error) => {
    console.error("=================================");
    console.error("ADMIN SEED FAILED");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Meta:", error.meta);
    console.error("=================================");

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });