import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({
    where: {
      email: "admin@nleta.com",
    },
  });

  if (!user) {
    throw new Error("Admin user not found");
  }

  const notification = await prisma.notification.create({
    data: {
      type: "GENERAL",
      title: "Test Notification",
      message: "This is a test CRM notification.",
      recipientId: user.id,
    },
  });

  console.log("Notification created:");
  console.log(notification);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });