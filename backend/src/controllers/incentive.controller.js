import { z } from "zod";
import prisma from "../config/prisma.js";


// ============================================================
// VALIDATION
// ============================================================

const createIncentiveSchema = z.object({
  psgId: z.string().trim().min(1),
  bdeId: z.string().trim().min(1),

  // Admin can currently create SUPPORTING allocation.
  role: z.literal("SUPPORTING"),

  reason: z.string().trim().min(2),

  // Admin decides supporting percentage.
  incentivePercent: z.coerce
    .number()
    .gt(0)
    .lte(100),
});

const updateIncentiveSchema = z.object({
  reason: z.string().trim().min(2).optional(),

  incentivePercent: z.coerce
    .number()
    .gt(0)
    .lte(100)
    .optional(),

  status: z
    .enum([
      "ELIGIBLE",
      "APPROVED",
      "PAID",
      "NOT_ELIGIBLE",
    ])
    .optional(),
});


// ============================================================
// HELPER
// ============================================================

function formatValidationError(error) {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  }

  return [];
}


// ============================================================
// ACCESS CONTROL HELPERS
// ============================================================

function isAdmin(req) {
  return req.user?.role === "Admin";
}

function isBde(req) {
  return req.user?.role === "BDE/Sales";
}

function buildBdeLeadWhere(userId) {
  return {
    OR: [
      {
        createdById: userId,
      },
      {
        assignedToId: userId,
      },
    ],
  };
}

function buildBdeClientWhere(userId) {
  return {
    OR: [
      {
        createdById: userId,
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

function buildBdePSGAWhere(userId) {
  return {
    OR: [
      {
        bdeId: userId,
      },
      {
        lead: {
          is: buildBdeLeadWhere(userId),
        },
      },
      {
        client: {
          is: buildBdeClientWhere(userId),
        },
      },
    ],
  };
}

async function getAccessiblePSGA(psgId, req) {
  if (isAdmin(req)) {
    return prisma.pSGA.findUnique({
      where: {
        id: psgId,
      },
    });
  }

  if (isBde(req)) {
    return prisma.pSGA.findFirst({
      where: {
        id: psgId,
        ...buildBdePSGAWhere(req.user.userId),
      },
    });
  }

  return null;
}


/// ============================================================
// GET INCENTIVE ALLOCATIONS FOR PSGA
// ============================================================

export async function getPSGAIncentives(req, res) {
  try {
    const { psgId } = req.params;

    // ----------------------------------------------------------
    // DATA-LEVEL ACCESS CHECK
    // ----------------------------------------------------------

    const accessiblePSGA = await getAccessiblePSGA(
      psgId,
      req
    );

    if (!accessiblePSGA) {
      return res.status(404).json({
        success: false,
        message: "PSGA not found",
      });
    }

    const psg = await prisma.pSGA.findUnique({
      where: {
        id: psgId,
      },
    });

    if (!psg) {
      return res.status(404).json({
        success: false,
        message: "PSGA not found",
      });
    }

    const allocations =
      await prisma.pSGAIncentiveAllocation.findMany({
        where: {
          psgId,
        },

        orderBy: [
          {
            role: "asc",
          },
          {
            createdAt: "asc",
          },
        ],

        include: {
          bde: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobile: true,
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
      });

    const supportingTotal = allocations
      .filter((item) => item.role === "SUPPORTING")
      .reduce(
        (total, item) =>
          total + Number(item.incentivePercent),
        0
      );

    const primaryPercent = Math.max(
      0,
      100 - supportingTotal
    );

    return res.status(200).json({
      success: true,

      data: {
        psgId,
        psgNumber: psg.psgNumber,

        totalPoolPercent: 100,

        supportingTotalPercent: supportingTotal,

        primaryRemainingPercent: primaryPercent,

        allocations,
      },
    });
  } catch (error) {
    console.error("getPSGAIncentives error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch incentive allocations",
    });
  }
}


// ============================================================
// CREATE SUPPORTING BDE INCENTIVE
// ============================================================

export async function createIncentive(req, res) {
  try {
    const parsed = createIncentiveSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid incentive data",
        errors: formatValidationError(parsed.error),
      });
    }

    const data = parsed.data;

    // ----------------------------------------------------------
    // Check PSGA
    // ----------------------------------------------------------

    const psg = await prisma.pSGA.findUnique({
      where: {
        id: data.psgId,
      },
    });

    if (!psg) {
      return res.status(404).json({
        success: false,
        message: "PSGA not found",
      });
    }

    // ----------------------------------------------------------
    // Incentive allowed only after PSGA acceptance
    // ----------------------------------------------------------

    if (psg.status !== "ACCEPTED") {
      return res.status(400).json({
        success: false,
        message:
          "Incentive can be allocated only after PSGA is accepted",
      });
    }

    // ----------------------------------------------------------
    // Check BDE
    // ----------------------------------------------------------

    const bde = await prisma.user.findUnique({
      where: {
        id: data.bdeId,
      },

      include: {
        role: true,
      },
    });

    if (!bde) {
      return res.status(404).json({
        success: false,
        message: "BDE user not found",
      });
    }

    if (bde.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Selected BDE is not active",
      });
    }

    if (bde.role.name !== "BDE/Sales") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not a BDE/Sales user",
      });
    }

    // ----------------------------------------------------------
    // Supporting BDE cannot be the primary BDE
    // ----------------------------------------------------------

    if (psg.bdeId && psg.bdeId === data.bdeId) {
      return res.status(400).json({
        success: false,
        message:
          "Primary BDE cannot be added as a supporting BDE",
      });
    }

    // ----------------------------------------------------------
    // Check duplicate supporting allocation
    // ----------------------------------------------------------

    const existingAllocation =
      await prisma.pSGAIncentiveAllocation.findFirst({
        where: {
          psgId: data.psgId,
          bdeId: data.bdeId,
          role: "SUPPORTING",
        },
      });

    if (existingAllocation) {
      return res.status(409).json({
        success: false,
        message:
          "This BDE already has a supporting incentive allocation for this PSGA",
      });
    }

    // ----------------------------------------------------------
    // Calculate current supporting percentage
    // ----------------------------------------------------------

    const existingSupporting =
      await prisma.pSGAIncentiveAllocation.findMany({
        where: {
          psgId: data.psgId,
          role: "SUPPORTING",
        },

        select: {
          incentivePercent: true,
        },
      });

    const currentSupportingTotal =
      existingSupporting.reduce(
        (total, item) =>
          total + Number(item.incentivePercent),
        0
      );

    const newSupportingTotal =
      currentSupportingTotal +
      Number(data.incentivePercent);

    // ----------------------------------------------------------
    // NEVER allow supporting allocation above 100%
    // ----------------------------------------------------------

    if (newSupportingTotal > 100) {
      const remaining =
        100 - currentSupportingTotal;

      return res.status(400).json({
        success: false,
        message:
          "Supporting incentive percentage exceeds the available incentive pool",

        details: {
          currentSupportingPercent:
            currentSupportingTotal,

          requestedPercent:
            Number(data.incentivePercent),

          remainingPercent:
            Math.max(0, remaining),
        },
      });
    }

    // ----------------------------------------------------------
    // Calculate primary BDE remaining percentage
    // ----------------------------------------------------------

    const primaryPercent =
      100 - newSupportingTotal;

    // ----------------------------------------------------------
    // Create supporting allocation
    // ----------------------------------------------------------

    const allocation =
      await prisma.pSGAIncentiveAllocation.create({
        data: {
          psgId: data.psgId,

          bdeId: data.bdeId,

          role: "SUPPORTING",

          reason: data.reason,

          incentivePercent:
            data.incentivePercent,

          // Since PSGA is accepted,
          // allocation is eligible.
          status: "ELIGIBLE",
        },

        include: {
          bde: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

    // ----------------------------------------------------------
    // Update overall PSGA incentive status
    // ----------------------------------------------------------

    await prisma.pSGA.update({
      where: {
        id: data.psgId,
      },

      data: {
        incentiveStatus: "ELIGIBLE",
      },
    });

    return res.status(201).json({
      success: true,

      message:
        "Supporting BDE incentive allocation created successfully",

      data: {
        allocation,

        incentivePool: {
          totalPercent: 100,

          supportingPercent:
            newSupportingTotal,

          primaryPercent:
            primaryPercent,
        },
      },
    });
  } catch (error) {
    console.error("createIncentive error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to create incentive allocation",
    });
  }
}

// ============================================================
// UPDATE SUPPORTING INCENTIVE
// ============================================================

export async function updateIncentive(req, res) {
  try {
    const { id } = req.params;

    const parsed = updateIncentiveSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid incentive update data",
        errors: formatValidationError(parsed.error),
      });
    }

    const data = parsed.data;

    // ----------------------------------------------------------
    // Find allocation
    // ----------------------------------------------------------

    const allocation =
      await prisma.pSGAIncentiveAllocation.findUnique({
        where: {
          id,
        },
      });

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: "Incentive allocation not found",
      });
    }

    // ----------------------------------------------------------
    // PRIMARY allocation cannot be manually changed
    // ----------------------------------------------------------

    if (allocation.role === "PRIMARY") {
      return res.status(400).json({
        success: false,
        message:
          "Primary BDE percentage is automatically calculated and cannot be manually changed",
      });
    }

    // ----------------------------------------------------------
    // PAID allocation is permanently locked
    // ----------------------------------------------------------

    if (allocation.status === "PAID") {
      return res.status(400).json({
        success: false,
        message:
          "Paid incentive allocation cannot be modified",
      });
    }

    // ----------------------------------------------------------
    // APPROVED allocation is locked except for marking PAID
    // ----------------------------------------------------------

    if (allocation.status === "APPROVED") {
      const onlyMarkingPaid =
        data.status === "PAID" &&
        data.reason === undefined &&
        data.incentivePercent === undefined;

      if (!onlyMarkingPaid) {
        return res.status(400).json({
          success: false,
          message:
            "Approved incentive allocation cannot be modified. It can only be marked as PAID.",
        });
      }
    }

    // ----------------------------------------------------------
    // Prevent invalid status movement
    // ----------------------------------------------------------

    if (data.status !== undefined) {
      const currentStatus = allocation.status;
      const newStatus = data.status;

      const allowedTransitions = {
        NOT_ELIGIBLE: ["ELIGIBLE", "APPROVED"],
        ELIGIBLE: ["APPROVED"],
        APPROVED: ["PAID"],
        PAID: [],
      };

      const allowed =
        allowedTransitions[currentStatus] || [];

      if (!allowed.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid incentive status transition: ${currentStatus} → ${newStatus}`,
        });
      }
    }

    // ----------------------------------------------------------
    // Validate percentage change
    // ----------------------------------------------------------

    if (data.incentivePercent !== undefined) {
      const otherSupporting =
        await prisma.pSGAIncentiveAllocation.findMany({
          where: {
            psgId: allocation.psgId,
            role: "SUPPORTING",
            NOT: {
              id,
            },
          },
          select: {
            incentivePercent: true,
          },
        });

      const otherSupportingTotal =
        otherSupporting.reduce(
          (total, item) =>
            total + Number(item.incentivePercent),
          0
        );

      const newSupportingTotal =
        otherSupportingTotal +
        Number(data.incentivePercent);

      if (newSupportingTotal > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Supporting incentive percentage exceeds the available incentive pool",
          details: {
            currentOtherSupportingPercent:
              otherSupportingTotal,
            requestedPercent:
              Number(data.incentivePercent),
            remainingPercent: Math.max(
              0,
              100 - otherSupportingTotal
            ),
          },
        });
      }
    }

    // ----------------------------------------------------------
    // Build update
    // ----------------------------------------------------------

    const updateData = {};

    if (data.reason !== undefined) {
      updateData.reason = data.reason;
    }

    if (data.incentivePercent !== undefined) {
      updateData.incentivePercent =
        data.incentivePercent;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    // ----------------------------------------------------------
    // Admin approval
    // ----------------------------------------------------------

    if (data.status === "APPROVED") {
      updateData.approvedById =
        req.user.userId;

      updateData.approvedAt =
        new Date();
    }

    // ----------------------------------------------------------
    // Paid
    // ----------------------------------------------------------

    if (data.status === "PAID") {
      updateData.paidAt =
        new Date();
    }

    // ----------------------------------------------------------
    // Update allocation
    // ----------------------------------------------------------

    const updatedAllocation =
      await prisma.pSGAIncentiveAllocation.update({
        where: {
          id,
        },

        data: updateData,

        include: {
          bde: {
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
      });

    return res.status(200).json({
      success: true,
      message:
        "Incentive allocation updated successfully",
      data: updatedAllocation,
    });
  } catch (error) {
    console.error("updateIncentive error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to update incentive allocation",
    });
  }
}

// ============================================================
// INCENTIVE DASHBOARD
// ============================================================

export async function getIncentiveDashboard(req, res) {
  try {
    const { psgId } = req.params;

    // ----------------------------------------------------------
    // DATA-LEVEL ACCESS CHECK
    // ----------------------------------------------------------

    const accessiblePSGA = await getAccessiblePSGA(
      psgId,
      req
    );

    if (!accessiblePSGA) {
      return res.status(404).json({
        success: false,
        message: "PSGA not found",
      });
    }

    // ----------------------------------------------------------
    // Fetch PSGA details
    // ----------------------------------------------------------

    const psg = await prisma.pSGA.findUnique({
      where: {
        id: psgId,
      },

      include: {
        client: {
          select: {
            id: true,
            associationName: true,
          },
        },

        bde: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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

            approvedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
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
        message: "PSGA not found",
      });
    }

    // ----------------------------------------------------------
    // Calculate supporting incentive
    // ----------------------------------------------------------

    const supportingAllocations =
      psg.incentiveAllocations.filter(
        (allocation) =>
          allocation.role === "SUPPORTING"
      );

    const supportingTotalPercent =
      supportingAllocations.reduce(
        (sum, allocation) =>
          sum + Number(allocation.incentivePercent),
        0
      );

    // ----------------------------------------------------------
    // Calculate primary incentive
    // ----------------------------------------------------------

    const primaryPercent =
      psg.bdeId && psg.bde
        ? Math.max(
            0,
            100 - supportingTotalPercent
          )
        : 0;

    // ----------------------------------------------------------
    // Response
    // ----------------------------------------------------------

    return res.json({
      success: true,

      data: {
        psg: {
          id: psg.id,
          psgNumber: psg.psgNumber,
          status: psg.status,
          incentiveStatus: psg.incentiveStatus,
          client: psg.client,
          primaryBde: psg.bde,
        },

        summary: {
          totalPoolPercent: 100,
          supportingTotalPercent,
          primaryPercent,
          allocatedPercent:
            supportingTotalPercent +
            primaryPercent,
        },

        allocations:
          supportingAllocations,

        primaryIncentive: {
          bde: psg.bde,
          incentivePercent: primaryPercent,
          role: "PRIMARY",
        },
      },
    });
  } catch (error) {
    console.error(
      "Get incentive dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch incentive dashboard",
    });
  }
}