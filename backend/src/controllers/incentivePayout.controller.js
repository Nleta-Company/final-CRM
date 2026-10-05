import prisma from "../config/prisma.js";
import { z } from "zod";

// ============================================================
// HELPERS
// ============================================================

const getBdeUser = async (bdeId) => {
  return prisma.user.findFirst({
    where: {
      id: bdeId,
      status: "ACTIVE",
      role: {
        name: "BDE/Sales",
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
};

const getMonthRange = (salaryMonth) => {
  const date = new Date(salaryMonth);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
  );

  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
  );

  return { start, end };
};

// ============================================================
// CALCULATE BDE INCENTIVE PERCENTAGE FOR PSGA
// ============================================================

const calculateBdePercentage = (psg, bdeId) => {
  const allocations = psg.incentiveAllocations || [];

  // ----------------------------------------------------------
  // Primary BDE
  // ----------------------------------------------------------
  if (psg.bdeId === bdeId) {
    const supportingTotal = allocations
      .filter((allocation) => allocation.role === "SUPPORTING")
      .reduce(
        (total, allocation) => total + Number(allocation.incentivePercent),
        0
      );

    return Math.max(0, 100 - supportingTotal);
  }

  // ----------------------------------------------------------
  // Supporting BDE
  // ----------------------------------------------------------
  const supportingAllocation = allocations.find(
    (allocation) =>
      allocation.bdeId === bdeId &&
      allocation.role === "SUPPORTING"
  );

  if (supportingAllocation) {
    return Number(supportingAllocation.incentivePercent);
  }

  return 0;
};

// ============================================================
// CREATE MONTHLY INCENTIVE PAYOUT
// ============================================================

export const createIncentivePayout = async (req, res) => {
  try {
    const schema = z.object({
      bdeId: z.string().min(1),
      salaryMonth: z.string().min(1),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid payout data",
        errors: parsed.error.flatten(),
      });
    }

    const { bdeId, salaryMonth } = parsed.data;

    // --------------------------------------------------------
    // Validate BDE
    // --------------------------------------------------------

    const bde = await getBdeUser(bdeId);

    if (!bde) {
      return res.status(404).json({
        success: false,
        message: "Active BDE/Sales user not found",
      });
    }

    // --------------------------------------------------------
    // Validate month
    // --------------------------------------------------------

    const monthRange = getMonthRange(salaryMonth);

    if (!monthRange) {
      return res.status(400).json({
        success: false,
        message: "Invalid salaryMonth",
      });
    }

    const { start, end } = monthRange;

    // --------------------------------------------------------
    // Check duplicate monthly payout
    // --------------------------------------------------------

    const existingPayout = await prisma.incentivePayout.findUnique({
      where: {
        bdeId_salaryMonth: {
          bdeId,
          salaryMonth: start,
        },
      },
    });

    if (existingPayout) {
      return res.status(409).json({
        success: false,
        message: "Monthly incentive payout already exists for this BDE",
        data: existingPayout,
      });
    }

    // --------------------------------------------------------
    // Find eligible PSGAs for this month
    //
    // We intentionally DO NOT filter by bdeId here.
    //
    // Reason:
    // A BDE can receive incentive in two ways:
    //
    // 1. Primary BDE
    //    PSGA.bdeId = requested bdeId
    //
    // 2. Supporting BDE
    //    incentiveAllocations.bdeId = requested bdeId
    // --------------------------------------------------------

    const psgas = await prisma.pSGA.findMany({
      where: {
        status: "ACCEPTED",

        incentiveStatus: {
          in: ["ELIGIBLE", "APPROVED"],
        },

        acceptedAt: {
          gte: start,
          lt: end,
        },

        OR: [
          {
            bdeId,
          },
          {
            incentiveAllocations: {
              some: {
                bdeId,
                role: "SUPPORTING",
              },
            },
          },
        ],
      },

      include: {
        incentiveAllocations: {
          select: {
            id: true,
            bdeId: true,
            role: true,
            reason: true,
            incentivePercent: true,
            status: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },

      orderBy: {
        acceptedAt: "asc",
      },
    });

    // --------------------------------------------------------
    // Calculate total incentive percentage
    // --------------------------------------------------------

    let totalIncentivePercent = 0;

    const psgaBreakdown = [];

    for (const psg of psgas) {
      const percentage = calculateBdePercentage(psg, bdeId);

      if (percentage > 0) {
        totalIncentivePercent += percentage;

        psgaBreakdown.push({
          psgId: psg.id,
          psgNumber: psg.psgNumber,
          acceptedAt: psg.acceptedAt,
          role: psg.bdeId === bdeId ? "PRIMARY" : "SUPPORTING",
          incentivePercent: percentage,
        });
      }
    }

    // --------------------------------------------------------
    // Create monthly payout record
    // --------------------------------------------------------

    const payout = await prisma.incentivePayout.create({
      data: {
        bdeId,
        salaryMonth: start,
        totalIncentivePercent,
        status: "PENDING",
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

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Monthly incentive payout created successfully",

      data: {
        payout,

        eligiblePSGAs: psgas.length,

        totalIncentivePercent,

        psgaBreakdown,
      },
    });
  } catch (error) {
    console.error("createIncentivePayout error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create monthly incentive payout",
    });
  }
};
// ============================================================
// GET MONTHLY PAYOUTS
// ============================================================

export const getIncentivePayouts = async (req, res) => {
  try {
    const { bdeId, salaryMonth, status } = req.query;

    // ----------------------------------------------------------
    // DATA-LEVEL ACCESS CHECK
    // ----------------------------------------------------------
    // BDE/Sales can only view their own incentive payouts.
    // Admin can view payouts of any BDE.
    // ----------------------------------------------------------

    if (req.user.role === "BDE/Sales") {
      if (bdeId && bdeId !== req.user.userId) {
        return res.status(404).json({
          success: false,
          message: "BDE not found",
        });
      }
    }

    const where = {};

    // ----------------------------------------------------------
    // BDE FILTER
    // ----------------------------------------------------------

    if (req.user.role === "BDE/Sales") {
      // Force BDE to see only their own payouts
      where.bdeId = req.user.userId;
    } else if (bdeId) {
      // Admin can filter any BDE
      where.bdeId = bdeId;
    }

    // ----------------------------------------------------------
    // STATUS FILTER
    // ----------------------------------------------------------

    if (status) {
      where.status = status;
    }

    // ----------------------------------------------------------
    // SALARY MONTH FILTER
    // ----------------------------------------------------------

    if (salaryMonth) {
      const monthRange = getMonthRange(salaryMonth);

      if (!monthRange) {
        return res.status(400).json({
          success: false,
          message: "Invalid salaryMonth",
        });
      }

      where.salaryMonth = monthRange.start;
    }

    // ----------------------------------------------------------
    // FETCH PAYOUTS
    // ----------------------------------------------------------

    const payouts = await prisma.incentivePayout.findMany({
      where,

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

      orderBy: [
        {
          salaryMonth: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Monthly incentive payouts fetched successfully",
      data: payouts,
    });
  } catch (error) {
    console.error("getIncentivePayouts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch monthly incentive payouts",
    });
  }
};

// ============================================================
// GET SINGLE MONTHLY PAYOUT
// ============================================================

export const getIncentivePayoutById = async (req, res) => {
  try {
    const { id } = req.params;

    const payout = await prisma.incentivePayout.findUnique({
      where: {
        id,
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

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: "Monthly incentive payout not found",
      });
    }

    // ----------------------------------------------------------
    // DATA-LEVEL ACCESS CHECK
    // ----------------------------------------------------------
    // BDE/Sales can only view their own payout.
    // Admin can view any BDE payout.
    // ----------------------------------------------------------

    if (
      req.user.role === "BDE/Sales" &&
      payout.bdeId !== req.user.userId
    ) {
      return res.status(404).json({
        success: false,
        message: "Monthly incentive payout not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Monthly incentive payout fetched successfully",
      data: payout,
    });
  } catch (error) {
    console.error("getIncentivePayoutById error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch monthly incentive payout",
    });
  }
};

// ============================================================
// APPROVE MONTHLY PAYOUT
// ============================================================

export const approveIncentivePayout = async (req, res) => {
  try {
    const { id } = req.params;

    const payout = await prisma.incentivePayout.findUnique({
      where: {
        id,
      },
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: "Monthly incentive payout not found",
      });
    }

    if (payout.status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Paid incentive payout cannot be approved again",
      });
    }

    if (payout.status === "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Incentive payout is already approved",
      });
    }

    const updatedPayout = await prisma.incentivePayout.update({
      where: {
        id,
      },

      data: {
        status: "APPROVED",
        approvedById: req.user.userId,
        approvedAt: new Date(),
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
      message: "Monthly incentive payout approved successfully",
      data: updatedPayout,
    });
  } catch (error) {
    console.error("approveIncentivePayout error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve monthly incentive payout",
    });
  }
};

// ============================================================
// MARK PAYOUT AS PAID WITH SALARY
// ============================================================

export const markIncentivePayoutPaid = async (req, res) => {
  try {
    const schema = z.object({
      paymentReference: z.string().min(1).max(200),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required",
        errors: parsed.error.flatten(),
      });
    }

    const { paymentReference } = parsed.data;
    const { id } = req.params;

    const payout = await prisma.incentivePayout.findUnique({
      where: {
        id,
      },
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: "Monthly incentive payout not found",
      });
    }

    if (payout.status === "PENDING") {
      return res.status(400).json({
        success: false,
        message:
          "Incentive payout must be approved before marking it as paid",
      });
    }

    if (payout.status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Incentive payout is already marked as paid",
      });
    }

    const updatedPayout = await prisma.incentivePayout.update({
      where: {
        id,
      },

      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentReference,
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
      message: "Incentive payout marked as paid with salary",
      data: updatedPayout,
    });
  } catch (error) {
    console.error("markIncentivePayoutPaid error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark incentive payout as paid",
    });
  }
};

// ============================================================
// MONTHLY INCENTIVE DASHBOARD
// ============================================================

export const getMonthlyIncentiveDashboard = async (req, res) => {
  try {
    const { bdeId } = req.params;
    const { salaryMonth } = req.query;

    if (!bdeId) {
      return res.status(400).json({
        success: false,
        message: "BDE ID is required",
      });
    }

    if (!salaryMonth) {
      return res.status(400).json({
        success: false,
        message: "salaryMonth is required in YYYY-MM-DD format",
      });
    }

    const monthDate = new Date(`${salaryMonth}T00:00:00.000Z`);

    if (Number.isNaN(monthDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid salaryMonth",
      });
    }

    const startOfMonth = new Date(
      Date.UTC(
        monthDate.getUTCFullYear(),
        monthDate.getUTCMonth(),
        1
      )
    );

    const startOfNextMonth = new Date(
      Date.UTC(
        monthDate.getUTCFullYear(),
        monthDate.getUTCMonth() + 1,
        1
      )
    );

    // ----------------------------------------------------------
    // Check BDE
    // ----------------------------------------------------------

    const bde = await prisma.user.findUnique({
      where: {
        id: bdeId,
      },
      include: {
        role: true,
      },
    });

    if (!bde) {
      return res.status(404).json({
        success: false,
        message: "BDE not found",
      });
    }

    if (bde.role.name !== "BDE/Sales") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not a BDE/Sales user",
      });
    }

    // ----------------------------------------------------------
    // DATA-LEVEL ACCESS CHECK
    // ----------------------------------------------------------

    if (req.user.role === "BDE/Sales") {
      if (bdeId !== req.user.userId) {
        return res.status(404).json({
          success: false,
          message: "BDE not found",
        });
      }
    }

    // ----------------------------------------------------------
    // Existing monthly payout
    // ----------------------------------------------------------

    const payout = await prisma.incentivePayout.findUnique({
      where: {
        bdeId_salaryMonth: {
          bdeId,
          salaryMonth: startOfMonth,
        },
      },
      include: {
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

    // ----------------------------------------------------------
    // Accepted PSGAs for this BDE/month
    // ----------------------------------------------------------

    const psgas = await prisma.pSGA.findMany({
      where: {
        status: "ACCEPTED",
        acceptedAt: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
        OR: [
          {
            bdeId,
          },
          {
            incentiveAllocations: {
              some: {
                bdeId,
                role: "SUPPORTING",
              },
            },
          },
        ],
      },
      include: {
        client: {
          select: {
            id: true,
            associationName: true,
          },
        },
        incentiveAllocations: {
          where: {
            OR: [
              {
                bdeId,
                role: "SUPPORTING",
              },
              {
                role: "SUPPORTING",
              },
            ],
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
        },
      },
      orderBy: {
        acceptedAt: "asc",
      },
    });

    // ----------------------------------------------------------
    // Calculate BDE percentage for every PSGA
    // ----------------------------------------------------------

    const psgaBreakdown = psgas.map((psg) => {
      const supportingTotal = psg.incentiveAllocations.reduce(
        (sum, allocation) =>
          sum + Number(allocation.incentivePercent),
        0
      );

      let incentivePercent = 0;
      let role = null;

      if (psg.bdeId === bdeId) {
        incentivePercent = Math.max(
          0,
          100 - supportingTotal
        );

        role = "PRIMARY";
      } else {
        const supportingAllocation =
          psg.incentiveAllocations.find(
            (allocation) =>
              allocation.bdeId === bdeId &&
              allocation.role === "SUPPORTING"
          );

        if (supportingAllocation) {
          incentivePercent = Number(
            supportingAllocation.incentivePercent
          );

          role = "SUPPORTING";
        }
      }

      return {
        psgId: psg.id,
        psgNumber: psg.psgNumber,
        client: psg.client,
        acceptedAt: psg.acceptedAt,
        role,
        incentivePercent,
      };
    });

    const totalIncentivePercent = psgaBreakdown.reduce(
      (sum, item) => sum + item.incentivePercent,
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        bde: {
          id: bde.id,
          firstName: bde.firstName,
          lastName: bde.lastName,
          email: bde.email,
        },

        salaryMonth: startOfMonth,

        summary: {
          totalIncentivePercent,
          eligiblePSGAs: psgaBreakdown.length,
          payoutStatus: payout?.status || "NOT_CREATED",
          paymentReference:
            payout?.paymentReference || null,
          paidAt: payout?.paidAt || null,
        },

        payout: payout || null,

        psgaBreakdown,
      },
    });
  } catch (error) {
    console.error(
      "getMonthlyIncentiveDashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch monthly incentive dashboard",
    });
  }
};

// ============================================================
// ADMIN INCENTIVE MANAGEMENT DASHBOARD
// ============================================================

export const getAdminIncentiveDashboard = async (req, res) => {
  try {
    const { salaryMonth, status } = req.query;

    // ----------------------------------------------------------
    // ADMIN-ONLY ACCESS CHECK
    // ----------------------------------------------------------

    if (req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    if (!salaryMonth) {
      return res.status(400).json({
        success: false,
        message: "salaryMonth is required in YYYY-MM-DD format",
      });
    }

    const monthDate = new Date(`${salaryMonth}T00:00:00.000Z`);

    if (Number.isNaN(monthDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid salaryMonth",
      });
    }

    const startOfMonth = new Date(
      Date.UTC(
        monthDate.getUTCFullYear(),
        monthDate.getUTCMonth(),
        1
      )
    );

    const startOfNextMonth = new Date(
      Date.UTC(
        monthDate.getUTCFullYear(),
        monthDate.getUTCMonth() + 1,
        1
      )
    );

    // --------------------------------------------------------
    // Get all active BDEs
    // --------------------------------------------------------

    const bdeRole = await prisma.role.findUnique({
      where: {
        name: "BDE/Sales",
      },
    });

    if (!bdeRole) {
      return res.status(404).json({
        success: false,
        message: "BDE/Sales role not found",
      });
    }

    const bdes = await prisma.user.findMany({
      where: {
        roleId: bdeRole.id,
        status: "ACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: {
        firstName: "asc",
      },
    });

    // --------------------------------------------------------
    // Get monthly payouts
    // --------------------------------------------------------

    const payoutWhere = {
      salaryMonth: startOfMonth,
      ...(status ? { status } : {}),
    };

    const payouts = await prisma.incentivePayout.findMany({
      where: payoutWhere,
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
      orderBy: {
        createdAt: "asc",
      },
    });

    // --------------------------------------------------------
    // Get accepted PSGAs for the month
    // --------------------------------------------------------

    const psgas = await prisma.pSGA.findMany({
      where: {
        status: "ACCEPTED",
        acceptedAt: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
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
          where: {
            role: "SUPPORTING",
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
        },
      },
      orderBy: {
        acceptedAt: "asc",
      },
    });

    // --------------------------------------------------------
    // Build BDE-wise summary
    // --------------------------------------------------------

    const bdeSummary = bdes.map((bde) => {
      let totalIncentivePercent = 0;
      let eligiblePSGAs = 0;

      const breakdown = [];

      for (const psg of psgas) {
        const supportingTotal =
          psg.incentiveAllocations.reduce(
            (sum, allocation) =>
              sum + Number(allocation.incentivePercent),
            0
          );

        let incentivePercent = 0;
        let role = null;

        // Primary BDE
        if (psg.bdeId === bde.id) {
          incentivePercent = Math.max(
            0,
            100 - supportingTotal
          );

          role = "PRIMARY";
        } else {
          // Supporting BDE
          const supportingAllocation =
            psg.incentiveAllocations.find(
              (allocation) =>
                allocation.bdeId === bde.id
            );

          if (supportingAllocation) {
            incentivePercent = Number(
              supportingAllocation.incentivePercent
            );

            role = "SUPPORTING";
          }
        }

        if (role) {
          eligiblePSGAs += 1;
          totalIncentivePercent += incentivePercent;

          breakdown.push({
            psgId: psg.id,
            psgNumber: psg.psgNumber,
            client: psg.client,
            role,
            incentivePercent,
            acceptedAt: psg.acceptedAt,
          });
        }
      }

      const payout = payouts.find(
        (item) => item.bdeId === bde.id
      );

      return {
        bde: {
          id: bde.id,
          firstName: bde.firstName,
          lastName: bde.lastName,
          email: bde.email,
        },

        totalIncentivePercent,

        eligiblePSGAs,

        payoutStatus:
          payout?.status || "NOT_CREATED",

        paymentReference:
          payout?.paymentReference || null,

        approvedAt:
          payout?.approvedAt || null,

        paidAt:
          payout?.paidAt || null,

        payoutId:
          payout?.id || null,

        breakdown,
      };
    });

    // --------------------------------------------------------
    // Overall summary
    // --------------------------------------------------------

    const totalIncentivePercent =
      bdeSummary.reduce(
        (sum, item) =>
          sum + item.totalIncentivePercent,
        0
      );

    const totalEligiblePSGAs =
      bdeSummary.reduce(
        (sum, item) =>
          sum + item.eligiblePSGAs,
        0
      );

    const pendingPayouts = payouts.filter(
      (item) => item.status === "PENDING"
    ).length;

    const approvedPayouts = payouts.filter(
      (item) => item.status === "APPROVED"
    ).length;

    const paidPayouts = payouts.filter(
      (item) => item.status === "PAID"
    ).length;

    return res.status(200).json({
      success: true,

      data: {
        salaryMonth: startOfMonth,

        summary: {
          totalBDEs: bdes.length,
          totalEligiblePSGAs,
          totalIncentivePercent,

          pendingPayouts,
          approvedPayouts,
          paidPayouts,
        },

        bdeSummary,

        payouts,
      },
    });
  } catch (error) {
    console.error(
      "getAdminIncentiveDashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch admin incentive dashboard",
    });
  }
};