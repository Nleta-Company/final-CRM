import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

console.log("DATABASE URL LOADED:", Boolean(connectionString));

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Testing Prisma connection...");

  const result = await prisma.$queryRaw`SELECT 1`;

  console.log("PRISMA CONNECTION SUCCESS:", result);
}

main()
  .catch((error) => {
    console.error("=================================");
    console.error("PRISMA CONNECTION FAILED");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Meta:", error.meta);
    console.error("=================================");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });