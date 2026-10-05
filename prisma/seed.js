import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

// ============================================================
// ROLES
// ============================================================

const roles = [
  {
    name: "Admin",
    description:
      "Full CRM administration and system management access",
  },
  {
    name: "BDE/Sales",
    description:
      "Business development, sales, lead and client management access",
  },
  {
    name: "Client",
    description:
      "Client portal and client-specific CRM access",
  },
];

// ============================================================
// PERMISSIONS
// ============================================================

const permissions = [
  // ----------------------------------------------------------
  // Dashboard
  // ----------------------------------------------------------

  {
    name: "dashboard.view",
    description: "View CRM dashboard",
  },

  // ----------------------------------------------------------
  // Leads
  // ----------------------------------------------------------

  {
    name: "leads.view",
    description: "View leads",
  },

  {
    name: "leads.create",
    description: "Create leads",
  },

  {
    name: "leads.edit",
    description: "Edit leads",
  },

  {
    name: "leads.delete",
    description: "Delete leads",
  },

  // ----------------------------------------------------------
  // Clients
  // ----------------------------------------------------------

  {
    name: "clients.view",
    description: "View clients",
  },

  {
    name: "clients.create",
    description: "Create clients",
  },

  {
    name: "clients.edit",
    description: "Edit clients",
  },

  {
    name: "clients.delete",
    description: "Delete clients",
  },

  // ----------------------------------------------------------
  // Activities
  // ----------------------------------------------------------

  {
    name: "activities.view",
    description:
      "View CRM activities and follow-ups",
  },

  {
    name: "activities.create",
    description:
      "Create CRM activities and follow-ups",
  },

  {
    name: "activities.edit",
    description:
      "Edit CRM activities and follow-ups",
  },

  {
    name: "activities.delete",
    description:
      "Delete CRM activities and follow-ups",
  },

  // ----------------------------------------------------------
  // Proposals
  // ----------------------------------------------------------

  {
    name: "proposals.view",
    description: "View proposals",
  },

  {
    name: "proposals.create",
    description: "Create proposals",
  },

  {
    name: "proposals.edit",
    description: "Edit proposals",
  },

  {
    name: "proposals.send",
    description:
      "Send proposals to clients",
  },

  // ----------------------------------------------------------
  // Users
  // ----------------------------------------------------------

  {
    name: "users.view",
    description: "View CRM users",
  },

  {
    name: "users.create",
    description: "Create CRM users",
  },

  {
    name: "users.edit",
    description: "Edit CRM users",
  },

  {
    name: "users.delete",
    description: "Delete CRM users",
  },

  // ----------------------------------------------------------
  // Settings
  // ----------------------------------------------------------

  {
    name: "settings.view",
    description: "View CRM settings",
  },

  // ----------------------------------------------------------
  // PSGA
  // ----------------------------------------------------------

  {
    name: "psga.view",
    description:
      "View PSGA tracking records",
  },

  {
    name: "psga.create",
    description:
      "Create PSGA tracking records",
  },

  {
    name: "psga.edit",
    description:
      "Edit PSGA tracking records",
  },

  // ----------------------------------------------------------
  // Incentives
  // ----------------------------------------------------------

  {
    name: "incentives.view",
    description:
      "View BDE incentive allocations",
  },

  {
    name: "incentives.create",
    description:
      "Create supporting BDE incentive allocations",
  },

  {
    name: "incentives.edit",
    description:
      "Edit BDE incentive allocations",
  },

  {
    name: "incentives.approve",
    description:
      "Approve BDE incentive allocations",
  },
];

// ============================================================
// ROLE PERMISSIONS
// ============================================================
//
// Admin:
// Full access to ALL permissions.
//
// BDE/Sales:
// Dashboard
// Leads
// Clients
// Activities
// Proposals
// PSGA view
// Incentive view
//
// BDE/Sales CANNOT:
// - Generate PSGA
// - Edit PSGA
// - Decide supporting BDE percentage
// - Approve incentives
//
// Client:
// Dashboard
// View clients
// View proposals
//
// Client does NOT get:
// - Activities
// - PSGA
// - Incentive
// ============================================================

const rolePermissions = {
  "BDE/Sales": [
    // --------------------------------------------------------
    // Dashboard
    // --------------------------------------------------------

    "dashboard.view",

    // --------------------------------------------------------
    // Leads
    // --------------------------------------------------------

    "leads.view",
    "leads.create",
    "leads.edit",

    // --------------------------------------------------------
    // Clients
    // --------------------------------------------------------

    "clients.view",
    "clients.create",
    "clients.edit",
    "clients.delete",

    // --------------------------------------------------------
    // Activities
    // --------------------------------------------------------

    "activities.view",
    "activities.create",
    "activities.edit",
    "activities.delete",

    // --------------------------------------------------------
    // Proposals
    // --------------------------------------------------------

    "proposals.view",
    "proposals.create",
    "proposals.edit",
    "proposals.send",

    // --------------------------------------------------------
    // PSGA
    // --------------------------------------------------------

    // BDE can view PSGA tracking information.
    // PSGA generation/editing remains Admin controlled.

    "psga.view",

    // --------------------------------------------------------
    // Incentives
    // --------------------------------------------------------

    // BDE can view their incentive information.
    // Admin controls creation/editing/approval.

    "incentives.view",
  ],

  Client: [
    // --------------------------------------------------------
    // Dashboard
    // --------------------------------------------------------

    "dashboard.view",

    // --------------------------------------------------------
    // Clients
    // --------------------------------------------------------

    "clients.view",

    // --------------------------------------------------------
    // Proposals
    // --------------------------------------------------------

    "proposals.view",
  ],
};

// ============================================================
// MAIN SEED
// ============================================================

async function main() {
  console.log("=================================");
  console.log("Starting CRM Master Seed...");
  console.log("=================================");

  // ==========================================================
  // 1. ROLES
  // ==========================================================

  const roleMap = {};

  for (const role of roles) {
    const result = await prisma.role.upsert({
      where: {
        name: role.name,
      },

      update: {
        description: role.description,
      },

      create: role,
    });

    roleMap[result.name] = result;

    console.log(`Role ready: ${result.name}`);
  }

  // ==========================================================
  // 2. PERMISSIONS
  // ==========================================================

  const permissionMap = {};

  for (const permission of permissions) {
    const result =
      await prisma.permission.upsert({
        where: {
          name: permission.name,
        },

        update: {
          description:
            permission.description,
        },

        create: permission,
      });

    permissionMap[result.name] = result;

    console.log(
      `Permission ready: ${result.name}`
    );
  }

  // ==========================================================
  // 3. ADMIN GETS ALL PERMISSIONS
  // ==========================================================

  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roleMap["Admin"].id,
          permissionId:
            permissionMap[permission.name].id,
        },
      },

      update: {},

      create: {
        roleId: roleMap["Admin"].id,
        permissionId:
          permissionMap[permission.name].id,
      },
    });
  }

  console.log(
    "Admin permissions assigned."
  );

  // ==========================================================
  // 4. BDE / SALES PERMISSIONS
  // ==========================================================

  for (const permissionName of
    rolePermissions["BDE/Sales"]) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId:
            roleMap["BDE/Sales"].id,

          permissionId:
            permissionMap[permissionName].id,
        },
      },

      update: {},

      create: {
        roleId:
          roleMap["BDE/Sales"].id,

        permissionId:
          permissionMap[permissionName].id,
      },
    });
  }

  console.log(
    "BDE/Sales permissions assigned."
  );

  // ==========================================================
  // 5. CLIENT PERMISSIONS
  // ==========================================================

  for (const permissionName of
    rolePermissions.Client) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roleMap.Client.id,

          permissionId:
            permissionMap[permissionName].id,
        },
      },

      update: {},

      create: {
        roleId: roleMap.Client.id,

        permissionId:
          permissionMap[permissionName].id,
      },
    });
  }

  console.log(
    "Client permissions assigned."
  );

  // ==========================================================
  // 6. SUMMARY
  // ==========================================================

  console.log("---------------------------------");

  console.log(`Roles: ${roles.length}`);

  console.log(
    `Permissions: ${permissions.length}`
  );

  console.log(
    `BDE/Sales Client Permissions: ${
      [
        "clients.view",
        "clients.create",
        "clients.edit",
        "clients.delete",
      ].length
    }`
  );

  console.log(
    `BDE/Sales Activity Permissions: ${
      [
        "activities.view",
        "activities.create",
        "activities.edit",
        "activities.delete",
      ].length
    }`
  );

  console.log(
    `PSGA Permissions: ${
      [
        "psga.view",
        "psga.create",
        "psga.edit",
      ].length
    }`
  );

  console.log(
    `Incentive Permissions: ${
      [
        "incentives.view",
        "incentives.create",
        "incentives.edit",
        "incentives.approve",
      ].length
    }`
  );

  console.log("---------------------------------");

  console.log("=================================");
  console.log("CRM Master Seed Completed");
  console.log("=================================");
}

// ============================================================
// ERROR HANDLING
// ============================================================

main()
  .catch((error) => {
    console.error(
      "================================="
    );

    console.error(
      "CRM MASTER SEED FAILED"
    );

    console.error(
      "Message:",
      error.message
    );

    console.error(
      "Code:",
      error.code
    );

    console.error(
      "Meta:",
      error.meta
    );

    console.error(
      "================================="
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });