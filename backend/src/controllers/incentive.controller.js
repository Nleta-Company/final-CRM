import { z } from "zod";
import prisma from "../config/prisma.js";

/*
 * Schema compatibility:
 * Client: associationName, contactName, email, mobile
 * User: status (ACTIVE / INACTIVE / SUSPENDED)
 * PSGAIncentiveAllocation: clientId and optional psgId
 */

const INCENTIVE_STATUS_FLOW = {
  NOT_ELIGIBLE: 0,
  ELIGIBLE: 1,
  APPROVED: 2,
  PAID: 3,
};

const createIncentiveSchema = z.object({
  clientId: z.string().trim().min(1),
  psgId: z.string().trim().optional(),
  recipientType: z.enum(["BDE", "ADMIN"]),
  bdeId: z.string().trim().optional(),
  adminId: z.string().trim().optional(),
  role: z.enum(["PRIMARY", "SUPPORTING"]),
  reason: z.string().trim().max(1000).optional(),
  incentivePercent: z.coerce.number().min(0).max(100),
});

const updateIncentiveSchema = z.object({
  role: z.enum(["PRIMARY", "SUPPORTING"]).optional(),
  reason: z.string().trim().max(1000).optional(),
  incentivePercent: z.coerce.number().min(0).max(100).optional(),
  status: z
    .enum(["NOT_ELIGIBLE", "ELIGIBLE", "APPROVED", "PAID"])
    .optional(),
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isAdmin(req) {
  return req.user?.role === "Admin";
}

function isBde(req) {
  return req.user?.role === "BDE/Sales";
}

function normalizeRole(role) {
  return String(role ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function isActiveBde(user) {
  return Boolean(
    user &&
      user.status === "ACTIVE" &&
      normalizeRole(user.role?.name) === "BDE/SALES"
  );
}

function userSelect(includeMobile = true) {
  return {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    ...(includeMobile ? { mobile: true } : {}),
    role: {
      select: {
        name: true,
      },
    },
  };
}

function allocationInclude() {
  return {
    client: {
      select: {
        id: true,
        associationName: true,
        contactName: true,
        email: true,
        mobile: true,
        processStage: true,
        processUpdatedAt: true,
        externalClientId: true,
        fsoNumber: true,
        fsoGeneratedAt: true,
        psgaNumber: true,
        psgaGeneratedAt: true,
        assignedBdeId: true,

        assignedBde: {
          select: userSelect(),
        },

        sourceLead: {
          select: {
            id: true,
            associationName: true,
            assignedToId: true,
            createdById: true,

            assignedTo: {
              select: userSelect(),
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
      },
    },

    psg: {
      select: {
        id: true,
        psgNumber: true,
        status: true,
        generatedAt: true,
        clientId: true,
      },
    },

    bde: {
      select: userSelect(),
    },

    admin: {
      select: userSelect(),
    },

    approvedBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
  };
}

function getClientRecipient(client, currentUser) {
  if (client?.sourceLead) {
    return {
      recipientType: "BDE",
      bdeId:
        client.sourceLead.assignedToId ||
        client.assignedBdeId ||
        null,
      adminId: null,
    };
  }

  return {
    recipientType: "ADMIN",
    bdeId: null,
    adminId: currentUser?.id || null,
  };
}

function clientSummary(client) {
  return {
    id: client.id,
    associationName: client.associationName,
    contactName: client.contactName,
    email: client.email,
    mobile: client.mobile,
    processStage: client.processStage,
    processUpdatedAt: client.processUpdatedAt,
    externalClientId: client.externalClientId,
    fsoNumber: client.fsoNumber,
    fsoGeneratedAt: client.fsoGeneratedAt,
    psgaNumber: client.psgaNumber,
    psgaGeneratedAt: client.psgaGeneratedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* GET eligible clients                                                       */
/* -------------------------------------------------------------------------- */

async function getEligibleClients(req, res) {
  try {
    const clients = await prisma.client.findMany({
      where: {
        processStage: "PSGA_COMPLETED",
      },

      include: {
        assignedBde: {
          select: userSelect(),
        },

        sourceLead: {
          select: {
            id: true,
            associationName: true,
            assignedToId: true,
            createdById: true,

            assignedTo: {
              select: userSelect(),
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

        psgas: {
          select: {
            id: true,
            psgNumber: true,
            status: true,
            generatedAt: true,
            clientId: true,
          },

          orderBy: {
            generatedAt: "desc",
          },
        },

        incentiveAllocations: {
          include: {
            bde: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },

            admin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },

            approvedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },

      orderBy: {
        processUpdatedAt: "desc",
      },
    });

    const data = clients.map((client) => {
      const sourceLead = client.sourceLead;

      const recipientBde =
        sourceLead?.assignedTo ||
        client.assignedBde ||
        null;

      return {
        ...clientSummary(client),

        source: sourceLead ? "LEAD" : "ADMIN",

        sourceLead: sourceLead
          ? {
              id: sourceLead.id,
              associationName: sourceLead.associationName,
            }
          : null,

        recipient: {
          type: sourceLead ? "BDE" : "ADMIN",

          bde: recipientBde
            ? {
                id: recipientBde.id,
                firstName: recipientBde.firstName,
                lastName: recipientBde.lastName,
                email: recipientBde.email,
                mobile: recipientBde.mobile,
              }
            : null,
        },

        psgas: client.psgas,
        incentiveEligible: true,
        allocations: client.incentiveAllocations,
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("getEligibleClients error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch incentive eligible clients.",
    });
  }
}

/* -------------------------------------------------------------------------- */
/* GET incentives for a client                                                */
/* -------------------------------------------------------------------------- */

async function getClientIncentives(req, res) {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "Client ID is required.",
      });
    }

    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
      },

      include: {
        sourceLead: {
          select: {
            id: true,
            associationName: true,
            assignedToId: true,
          },
        },

        assignedBde: {
          select: userSelect(false),
        },

        psgas: {
          select: {
            id: true,
            psgNumber: true,
            status: true,
            generatedAt: true,
          },

          orderBy: {
            generatedAt: "desc",
          },
        },

        incentiveAllocations: {
          include: {
            bde: {
              select: userSelect(false),
            },

            admin: {
              select: userSelect(false),
            },

            approvedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },

            psg: {
              select: {
                id: true,
                psgNumber: true,
                status: true,
                generatedAt: true,
              },
            },
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        client: clientSummary(client),

        eligible:
          client.processStage === "PSGA_COMPLETED",

        recipient: getClientRecipient(client, req.user),

        psgas: client.psgas,

        allocations: client.incentiveAllocations,
      },
    });
  } catch (error) {
    console.error("getClientIncentives error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch client incentives.",
    });
  }
}

/* -------------------------------------------------------------------------- */
/* POST create incentive allocation                                           */
/* -------------------------------------------------------------------------- */

async function createIncentive(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin can create incentive allocations.",
      });
    }

    const parsed = createIncentiveSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid incentive data.",
        errors: parsed.error.flatten(),
      });
    }

    const data = parsed.data;

    const client = await prisma.client.findUnique({
      where: {
        id: data.clientId,
      },

      include: {
        sourceLead: {
          select: {
            id: true,
            assignedToId: true,
          },
        },

        assignedBde: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    if (client.processStage !== "PSGA_COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Incentive is available only after PSGA is completed.",
      });
    }

    let psg = null;

    if (data.psgId) {
      psg = await prisma.pSGA.findUnique({
        where: {
          id: data.psgId,
        },

        select: {
          id: true,
          clientId: true,
        },
      });

      if (!psg) {
        return res.status(404).json({
          success: false,
          message: "PSGA not found.",
        });
      }

      if (psg.clientId !== client.id) {
        return res.status(400).json({
          success: false,
          message: "PSGA does not belong to this client.",
        });
      }
    }

    const expected = getClientRecipient(client, req.user);

    if (expected.recipientType === "BDE") {
      if (!expected.bdeId) {
        return res.status(400).json({
          success: false,
          message: "Lead-origin client does not have an assigned BDE.",
        });
      }

      if (data.recipientType !== "BDE") {
        return res.status(400).json({
          success: false,
          message: "Lead-origin incentive must be assigned to a BDE.",
        });
      }

      const requestedBdeId = data.bdeId || expected.bdeId;

      if (requestedBdeId !== expected.bdeId) {
        return res.status(403).json({
          success: false,
          message:
            "You cannot assign this lead-origin incentive to another BDE.",
        });
      }

      const bde = await prisma.user.findUnique({
        where: {
          id: requestedBdeId,
        },

        include: {
          role: true,
        },
      });

      if (!bde) {
        return res.status(404).json({
          success: false,
          message: "Assigned BDE not found.",
        });
      }

      if (!isActiveBde(bde)) {
        return res.status(400).json({
          success: false,
          message: "Assigned BDE is not active.",
        });
      }
    } else {
      if (data.recipientType !== "ADMIN") {
        return res.status(400).json({
          success: false,
          message:
            "Direct Admin-created client incentive must be assigned to Admin.",
        });
      }

      if (data.adminId && data.adminId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Admin incentive must belong to the current Admin.",
        });
      }
    }

    const finalBdeId =
      expected.recipientType === "BDE"
        ? expected.bdeId
        : null;

    const finalAdminId =
      expected.recipientType === "ADMIN"
        ? req.user.id
        : null;

    const duplicate =
      await prisma.pSGAIncentiveAllocation.findFirst({
        where: {
          clientId: client.id,
          recipientType: expected.recipientType,

          ...(finalBdeId
            ? {
                bdeId: finalBdeId,
              }
            : {}),

          ...(finalAdminId
            ? {
                adminId: finalAdminId,
              }
            : {}),
        },
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "An incentive allocation already exists for this recipient.",
      });
    }

    const existingAllocations =
      await prisma.pSGAIncentiveAllocation.findMany({
        where: {
          clientId: client.id,
        },

        select: {
          incentivePercent: true,
        },
      });

    const existingPercent = existingAllocations.reduce(
      (sum, item) => sum + Number(item.incentivePercent),
      0
    );

    const requestedPercent = Number(data.incentivePercent);

    if (existingPercent + requestedPercent > 100) {
      return res.status(400).json({
        success: false,
        message: `Total incentive allocation cannot exceed 100%. Existing: ${existingPercent}%, requested: ${requestedPercent}%.`,
      });
    }

    const allocation =
      await prisma.pSGAIncentiveAllocation.create({
        data: {
          clientId: client.id,
          psgId: psg?.id ?? null,
          recipientType: expected.recipientType,
          bdeId: finalBdeId,
          adminId: finalAdminId,
          role: data.role,
          reason: data.reason || null,
          incentivePercent: requestedPercent,
          status: "ELIGIBLE",
        },

        include: allocationInclude(),
      });

    return res.status(201).json({
      success: true,
      message: "Incentive allocation created successfully.",
      data: allocation,
    });
  } catch (error) {
    console.error("createIncentive error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create incentive allocation.",
    });
  }
}

/* -------------------------------------------------------------------------- */
/* PUT update incentive                                                       */
/* -------------------------------------------------------------------------- */

async function updateIncentive(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Incentive allocation ID is required.",
      });
    }

    const parsed = updateIncentiveSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid incentive data.",
        errors: parsed.error.flatten(),
      });
    }

    const input = parsed.data;

    const existing =
      await prisma.pSGAIncentiveAllocation.findUnique({
        where: {
          id,
        },

        include: {
          client: {
            select: {
              id: true,
              processStage: true,
            },
          },

          bde: {
            select: {
              id: true,
            },
          },
        },
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Incentive allocation not found.",
      });
    }

    if (existing.client.processStage !== "PSGA_COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Client is not eligible for incentive.",
      });
    }

    if (existing.status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Paid incentive cannot be modified.",
      });
    }

    if (!isAdmin(req)) {
      if (!isBde(req)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to update this incentive.",
        });
      }

      if (
        existing.recipientType !== "BDE" ||
        existing.bdeId !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only modify your own BDE incentive.",
        });
      }

      if (
        input.status === "APPROVED" ||
        input.status === "PAID"
      ) {
        return res.status(403).json({
          success: false,
          message: "Only Admin can approve or mark an incentive as paid.",
        });
      }
    }

    if (input.status) {
      const currentRank =
        INCENTIVE_STATUS_FLOW[existing.status];

      const requestedRank =
        INCENTIVE_STATUS_FLOW[input.status];

      if (requestedRank < currentRank) {
        return res.status(400).json({
          success: false,
          message: "Incentive status cannot move backwards.",
        });
      }

      if (requestedRank > currentRank + 1) {
        return res.status(400).json({
          success: false,
          message:
            "Incentive status must follow the defined workflow.",
        });
      }
    }

    if (input.incentivePercent !== undefined) {
      const otherAllocations =
        await prisma.pSGAIncentiveAllocation.findMany({
          where: {
            clientId: existing.clientId,
            id: {
              not: id,
            },
          },

          select: {
            incentivePercent: true,
          },
        });

      const otherPercent = otherAllocations.reduce(
        (sum, item) => sum + Number(item.incentivePercent),
        0
      );

      if (
        otherPercent + Number(input.incentivePercent) >
        100
      ) {
        return res.status(400).json({
          success: false,
          message: `Total incentive allocation cannot exceed 100%. Other allocations: ${otherPercent}%.`,
        });
      }
    }

    const updateData = {};

    if (input.role !== undefined) {
      updateData.role = input.role;
    }

    if (input.reason !== undefined) {
      updateData.reason = input.reason || null;
    }

    if (input.incentivePercent !== undefined) {
      updateData.incentivePercent =
        Number(input.incentivePercent);
    }

    if (input.status) {
      updateData.status = input.status;

      if (input.status === "APPROVED") {
        updateData.approvedById = req.user.id;
        updateData.approvedAt = new Date();
      }

      if (input.status === "PAID") {
        updateData.paidAt = new Date();
      }
    }

    const updated =
      await prisma.pSGAIncentiveAllocation.update({
        where: {
          id,
        },

        data: updateData,

        include: allocationInclude(),
      });

    return res.status(200).json({
      success: true,
      message: "Incentive allocation updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("updateIncentive error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update incentive allocation.",
    });
  }
}

/* -------------------------------------------------------------------------- */
/* GET client incentive dashboard                                             */
/* -------------------------------------------------------------------------- */

async function getIncentiveDashboard(req, res) {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "Client ID is required.",
      });
    }

    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
      },

      include: {
        sourceLead: {
          select: {
            id: true,
            associationName: true,
            assignedToId: true,
          },
        },

        assignedBde: {
          select: userSelect(false),
        },

        psgas: {
          select: {
            id: true,
            psgNumber: true,
            status: true,
            generatedAt: true,
          },

          orderBy: {
            generatedAt: "desc",
          },
        },

        incentiveAllocations: {
          include: {
            bde: {
              select: userSelect(false),
            },

            admin: {
              select: userSelect(false),
            },

            approvedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },

            psg: {
              select: {
                id: true,
                psgNumber: true,
                status: true,
                generatedAt: true,
              },
            },
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    const allocations = client.incentiveAllocations;

    const sumFor = (status) =>
      allocations
        .filter((item) => item.status === status)
        .reduce(
          (sum, item) => sum + Number(item.incentivePercent),
          0
        );

    const totalPercent = allocations.reduce(
      (sum, item) => sum + Number(item.incentivePercent),
      0
    );

    return res.status(200).json({
      success: true,

      data: {
        client: clientSummary(client),

        eligible:
          client.processStage === "PSGA_COMPLETED",

        source: client.sourceLead ? "LEAD" : "ADMIN",

        recipient: getClientRecipient(client, req.user),

        psgas: client.psgas,

        allocations,

        summary: {
          totalPercent,
          eligiblePercent: sumFor("ELIGIBLE"),
          approvedPercent: sumFor("APPROVED"),
          paidPercent: sumFor("PAID"),
          remainingPercent: Math.max(0, 100 - totalPercent),
        },
      },
    });
  } catch (error) {
    console.error("getIncentiveDashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load incentive dashboard.",
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Legacy GET /incentives/psga/:psgId                                         */
/* -------------------------------------------------------------------------- */

async function getPSGAIncentives(req, res) {
  try {
    const { psgId } = req.params;

    if (!psgId) {
      return res.status(400).json({
        success: false,
        message: "PSGA ID is required.",
      });
    }

    const psg = await prisma.pSGA.findUnique({
      where: {
        id: psgId,
      },

      include: {
        client: {
          select: {
            id: true,
            associationName: true,
            contactName: true,
            email: true,
            mobile: true,
            processStage: true,
          },
        },

        incentiveAllocations: {
          include: {
            bde: {
              select: userSelect(false),
            },

            admin: {
              select: userSelect(false),
            },

            approvedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!psg) {
      return res.status(404).json({
        success: false,
        message: "PSGA not found.",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        psg,
        client: psg.client,

        eligible:
          psg.client.processStage === "PSGA_COMPLETED",

        allocations: psg.incentiveAllocations,
      },
    });
  } catch (error) {
    console.error("getPSGAIncentives error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load PSGA incentives.",
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Exports                                                                    */
/* -------------------------------------------------------------------------- */

export {
  getEligibleClients,
  getClientIncentives,
  getIncentiveDashboard,
  getPSGAIncentives,
  createIncentive,
  updateIncentive,
};