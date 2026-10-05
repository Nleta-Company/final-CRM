import prisma from "../config/prisma.js";

export async function getDashboardSummary(req, res) {
  try {
    const [
      totalLeads,
      newLeads,
      contactedLeads,
      qualifiedLeads,
      proposalSentLeads,
      negotiationLeads,
      wonLeads,
      lostLeads,
      totalClients,
      activeClients,
      inactiveClients,
      pendingActivities,
      completedActivities,
      cancelledActivities,
      recentLeads,
      recentActivities,
    ] = await Promise.all([
      // -----------------------------
      // Leads
      // -----------------------------

      prisma.lead.count(),

      prisma.lead.count({
        where: { status: "NEW" },
      }),

      prisma.lead.count({
        where: { status: "CONTACTED" },
      }),

      prisma.lead.count({
        where: { status: "QUALIFIED" },
      }),

      prisma.lead.count({
        where: { status: "PROPOSAL_SENT" },
      }),

      prisma.lead.count({
        where: { status: "NEGOTIATION" },
      }),

      prisma.lead.count({
        where: { status: "WON" },
      }),

      prisma.lead.count({
        where: { status: "LOST" },
      }),

      // -----------------------------
      // Clients
      // -----------------------------

      prisma.client.count(),

      prisma.client.count({
        where: { status: "ACTIVE" },
      }),

      prisma.client.count({
        where: { status: "INACTIVE" },
      }),

      // -----------------------------
      // Activities
      // -----------------------------

      prisma.activity.count({
        where: { status: "PENDING" },
      }),

      prisma.activity.count({
        where: { status: "COMPLETED" },
      }),

      prisma.activity.count({
        where: { status: "CANCELLED" },
      }),

      // -----------------------------
      // Recent Leads
      // -----------------------------

      prisma.lead.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          associationName: true,
          contactName: true,
          email: true,
          mobile: true,
          status: true,
          createdAt: true,

          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),

      // -----------------------------
      // Recent Activities
      // -----------------------------

      prisma.activity.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          type: true,
          subject: true,
          status: true,
          followUpAt: true,
          createdAt: true,

          lead: {
            select: {
              id: true,
              associationName: true,
              contactName: true,
            },
          },

          client: {
            select: {
              id: true,
              associationName: true,
              contactName: true,
            },
          },

          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,

      data: {
        leads: {
          total: totalLeads,
          new: newLeads,
          contacted: contactedLeads,
          qualified: qualifiedLeads,
          proposalSent: proposalSentLeads,
          negotiation: negotiationLeads,
          won: wonLeads,
          lost: lostLeads,
        },

        clients: {
          total: totalClients,
          active: activeClients,
          inactive: inactiveClients,
        },

        activities: {
          pending: pendingActivities,
          completed: completedActivities,
          cancelled: cancelledActivities,
        },

        recentLeads,

        recentActivities,
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary",
    });
  }
}


// ============================================================
// ADMIN DASHBOARD STATS
// ============================================================

export async function getDashboardStats(req, res) {
  try {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const [
      // -----------------------------
      // Leads
      // -----------------------------

      totalLeads,
      newLeads,
      contactedLeads,
      qualifiedLeads,
      proposalSentLeads,
      negotiationLeads,
      wonLeads,
      lostLeads,

      // -----------------------------
      // Clients
      // -----------------------------

      totalClients,
      activeClients,
      inactiveClients,

      // -----------------------------
      // Activities
      // -----------------------------

      pendingActivities,
      completedActivities,
      cancelledActivities,

      todayFollowUps,

      // -----------------------------
      // PSGA
      // -----------------------------

      totalPSGA,
      generatedPSGA,
      sentPSGA,
      acceptedPSGA,
      rejectedPSGA,
      cancelledPSGA,

      // -----------------------------
      // Incentives
      // -----------------------------

      eligibleIncentives,
      approvedIncentives,
      paidIncentives,

      // -----------------------------
      // Monthly Payouts
      // -----------------------------

      pendingPayouts,
      approvedPayouts,
      paidPayouts,

      // -----------------------------
      // Users
      // -----------------------------

      totalUsers,
      activeUsers,
    ] = await Promise.all([
      // =============================
      // LEADS
      // =============================

      prisma.lead.count(),

      prisma.lead.count({
        where: { status: "NEW" },
      }),

      prisma.lead.count({
        where: { status: "CONTACTED" },
      }),

      prisma.lead.count({
        where: { status: "QUALIFIED" },
      }),

      prisma.lead.count({
        where: { status: "PROPOSAL_SENT" },
      }),

      prisma.lead.count({
        where: { status: "NEGOTIATION" },
      }),

      prisma.lead.count({
        where: { status: "WON" },
      }),

      prisma.lead.count({
        where: { status: "LOST" },
      }),

      // =============================
      // CLIENTS
      // =============================

      prisma.client.count(),

      prisma.client.count({
        where: { status: "ACTIVE" },
      }),

      prisma.client.count({
        where: { status: "INACTIVE" },
      }),

      // =============================
      // ACTIVITIES
      // =============================

      prisma.activity.count({
        where: { status: "PENDING" },
      }),

      prisma.activity.count({
        where: { status: "COMPLETED" },
      }),

      prisma.activity.count({
        where: { status: "CANCELLED" },
      }),

      prisma.activity.count({
        where: {
          followUpAt: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
      }),

      // =============================
      // PSGA
      // =============================

      prisma.pSGA.count(),

      prisma.pSGA.count({
        where: { status: "GENERATED" },
      }),

      prisma.pSGA.count({
        where: { status: "SENT" },
      }),

      prisma.pSGA.count({
        where: { status: "ACCEPTED" },
      }),

      prisma.pSGA.count({
        where: { status: "REJECTED" },
      }),

      prisma.pSGA.count({
        where: { status: "CANCELLED" },
      }),

      // =============================
      // INCENTIVES
      // =============================

      prisma.pSGAIncentiveAllocation.count({
        where: { status: "ELIGIBLE" },
      }),

      prisma.pSGAIncentiveAllocation.count({
        where: { status: "APPROVED" },
      }),

      prisma.pSGAIncentiveAllocation.count({
        where: { status: "PAID" },
      }),

      // =============================
      // MONTHLY PAYOUTS
      // =============================

      prisma.incentivePayout.count({
        where: { status: "PENDING" },
      }),

      prisma.incentivePayout.count({
        where: { status: "APPROVED" },
      }),

      prisma.incentivePayout.count({
        where: { status: "PAID" },
      }),

      // =============================
      // USERS
      // =============================

      prisma.user.count(),

      prisma.user.count({
        where: { status: "ACTIVE" },
      }),
    ]);

    return res.status(200).json({
      success: true,

      data: {
        leads: {
          total: totalLeads,
          new: newLeads,
          contacted: contactedLeads,
          qualified: qualifiedLeads,
          proposalSent: proposalSentLeads,
          negotiation: negotiationLeads,
          won: wonLeads,
          lost: lostLeads,
        },

        clients: {
          total: totalClients,
          active: activeClients,
          inactive: inactiveClients,
        },

        activities: {
          pending: pendingActivities,
          completed: completedActivities,
          cancelled: cancelledActivities,
          todayFollowUps,
        },

        psga: {
          total: totalPSGA,
          generated: generatedPSGA,
          sent: sentPSGA,
          accepted: acceptedPSGA,
          rejected: rejectedPSGA,
          cancelled: cancelledPSGA,
        },

        incentives: {
          eligible: eligibleIncentives,
          approved: approvedIncentives,
          paid: paidIncentives,
        },

        monthlyPayouts: {
          pending: pendingPayouts,
          approved: approvedPayouts,
          paid: paidPayouts,
        },

        users: {
          total: totalUsers,
          active: activeUsers,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    });
  }
}

// ============================================================
// ADMIN DASHBOARD ACTION ITEMS
// ============================================================

export async function getDashboardActionItems(req, res) {
  try {
    const now = new Date();

    const [
      // -----------------------------
      // New Leads
      // -----------------------------

      newLeads,

      // -----------------------------
      // Unassigned Leads
      // -----------------------------

      unassignedLeads,

      // -----------------------------
      // Pending Follow-ups
      // -----------------------------

      pendingFollowUps,

      // -----------------------------
      // Overdue Follow-ups
      // -----------------------------

      overdueFollowUps,

      // -----------------------------
      // Pending Incentive Approvals
      // -----------------------------

      pendingIncentiveApprovals,

      // -----------------------------
      // Pending Monthly Payout Approvals
      // -----------------------------

      pendingPayoutApprovals,

      // -----------------------------
      // PSGA Generated - Admin Review
      // -----------------------------

      generatedPSGA,

      // -----------------------------
      // PSGA Rejected
      // -----------------------------

      rejectedPSGA,

    ] = await Promise.all([
      // ========================================================
      // NEW LEADS
      // ========================================================

      prisma.lead.count({
        where: {
          status: "NEW",
        },
      }),

      // ========================================================
      // UNASSIGNED LEADS
      // ========================================================

      prisma.lead.count({
        where: {
          assignedToId: null,
        },
      }),

      // ========================================================
      // PENDING FOLLOW-UPS
      // ========================================================

      prisma.activity.count({
        where: {
          status: "PENDING",
          followUpAt: {
            not: null,
          },
        },
      }),

      // ========================================================
      // OVERDUE FOLLOW-UPS
      // ========================================================

      prisma.activity.count({
        where: {
          status: "PENDING",
          followUpAt: {
            not: null,
            lt: now,
          },
        },
      }),

      // ========================================================
      // INCENTIVE APPROVALS
      // ========================================================

      prisma.pSGAIncentiveAllocation.count({
        where: {
          status: "ELIGIBLE",
        },
      }),

      // ========================================================
      // MONTHLY PAYOUT APPROVALS
      // ========================================================

      prisma.incentivePayout.count({
        where: {
          status: "PENDING",
        },
      }),

      // ========================================================
      // PSGA ADMIN REVIEW
      // ========================================================

      prisma.pSGA.count({
        where: {
          status: "GENERATED",
        },
      }),

      // ========================================================
      // REJECTED PSGA
      // ========================================================

      prisma.pSGA.count({
        where: {
          status: "REJECTED",
        },
      }),
    ]);

    return res.status(200).json({
      success: true,

      data: {
        newLeads,

        unassignedLeads,

        pendingFollowUps,

        overdueFollowUps,

        pendingIncentiveApprovals,

        pendingPayoutApprovals,

        generatedPSGA,

        rejectedPSGA,

        totalActionItems:
          newLeads +
          unassignedLeads +
          pendingFollowUps +
          overdueFollowUps +
          pendingIncentiveApprovals +
          pendingPayoutApprovals +
          generatedPSGA +
          rejectedPSGA,
      },
    });
  } catch (error) {
    console.error("Dashboard action items error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard action items",
    });
  }
}

// ============================================================
// ADMIN DASHBOARD RECENT ACTIVITY
// ============================================================

export async function getDashboardRecentActivity(req, res) {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: 10,

      select: {
        id: true,
        type: true,
        subject: true,
        description: true,
        status: true,
        followUpAt: true,
        createdAt: true,

        lead: {
          select: {
            id: true,
            associationName: true,
            contactName: true,
          },
        },

        client: {
          select: {
            id: true,
            associationName: true,
            contactName: true,
          },
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
    });

    const data = activities.map((activity) => {
      let relatedTo = null;

      if (activity.lead) {
        relatedTo = {
          type: "LEAD",
          id: activity.lead.id,
          associationName: activity.lead.associationName,
          contactName: activity.lead.contactName,
        };
      } else if (activity.client) {
        relatedTo = {
          type: "CLIENT",
          id: activity.client.id,
          associationName: activity.client.associationName,
          contactName: activity.client.contactName,
        };
      }

      return {
        id: activity.id,
        type: activity.type,
        subject: activity.subject,
        description: activity.description,
        status: activity.status,
        followUpAt: activity.followUpAt,
        createdAt: activity.createdAt,

        createdBy: activity.createdBy
          ? {
            id: activity.createdBy.id,
            firstName: activity.createdBy.firstName,
            lastName: activity.createdBy.lastName,
            email: activity.createdBy.email,
          }
          : null,

        relatedTo,
      };
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Dashboard recent activity error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch recent dashboard activity",
    });
  }
}

// ============================================================
// ADMIN DASHBOARD SALES PERFORMANCE
// ============================================================

export async function getDashboardSalesPerformance(req, res) {
  try {
    const bdes = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        role: {
          name: "BDE/Sales",
        },
      },

      orderBy: [
        {
          firstName: "asc",
        },
        {
          lastName: "asc",
        },
      ],

      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,

        role: {
          select: {
            id: true,
            name: true,
          },
        },

        _count: {
          select: {
            assignedLeads: true,
            clientsCreated: true,
            psgasAsBde: true,
          },
        },
      },
    });

    const performance = bdes.map((user) => {
      return {
        userId: user.id,

        name: [user.firstName, user.lastName]
          .filter(Boolean)
          .join(" "),

        email: user.email,

        role: user.role
          ? {
            id: user.role.id,
            name: user.role.name,
          }
          : null,

        leads: user._count.assignedLeads,

        clients: user._count.clientsCreated,

        psga: user._count.psgasAsBde,
      };
    });

    return res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error) {
    console.error("Dashboard sales performance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales performance",
    });
  }
}

// ============================================================
// ADMIN DASHBOARD LEAD PIPELINE
// ============================================================

export async function getDashboardLeadPipeline(req, res) {
  try {
    const [
      newLeads,
      contactedLeads,
      qualifiedLeads,
      proposalSentLeads,
      negotiationLeads,
      wonLeads,
      lostLeads,
    ] = await Promise.all([
      prisma.lead.count({
        where: {
          status: "NEW",
        },
      }),

      prisma.lead.count({
        where: {
          status: "CONTACTED",
        },
      }),

      prisma.lead.count({
        where: {
          status: "QUALIFIED",
        },
      }),

      prisma.lead.count({
        where: {
          status: "PROPOSAL_SENT",
        },
      }),

      prisma.lead.count({
        where: {
          status: "NEGOTIATION",
        },
      }),

      prisma.lead.count({
        where: {
          status: "WON",
        },
      }),

      prisma.lead.count({
        where: {
          status: "LOST",
        },
      }),
    ]);

    const data = [
      {
        status: "NEW",
        label: "New",
        count: newLeads,
      },
      {
        status: "CONTACTED",
        label: "Contacted",
        count: contactedLeads,
      },
      {
        status: "QUALIFIED",
        label: "Qualified",
        count: qualifiedLeads,
      },
      {
        status: "PROPOSAL_SENT",
        label: "Proposal Sent",
        count: proposalSentLeads,
      },
      {
        status: "NEGOTIATION",
        label: "Negotiation",
        count: negotiationLeads,
      },
      {
        status: "WON",
        label: "Won",
        count: wonLeads,
      },
      {
        status: "LOST",
        label: "Lost",
        count: lostLeads,
      },
    ];

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Dashboard lead pipeline error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch lead pipeline",
    });
  }
}

// ============================================================
// ADMIN DASHBOARD MONTHLY PSGA / SALES ACTIVITY
// ============================================================

export async function getDashboardMonthlySales(req, res) {
  try {
    const months = 12;

    const now = new Date();

    // Start from the first day of the month, 11 months ago
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1),
      1
    );

    // Fetch PSGAs created during the required 12-month period
    const psgas = await prisma.pSGA.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },

      select: {
        id: true,
        status: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: "asc",
      },
    });

    // Create all 12 month buckets first
    const monthlyData = [];

    for (let i = 0; i < months; i++) {
      const date = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i,
        1
      );

      const year = date.getFullYear();
      const month = date.getMonth();

      monthlyData.push({
        year,
        month,
        monthKey: `${year}-${String(month + 1).padStart(2, "0")}`,
        monthLabel: date.toLocaleString("en-IN", {
          month: "short",
          year: "numeric",
        }),
        total: 0,
        generated: 0,
        sent: 0,
        accepted: 0,
        rejected: 0,
        cancelled: 0,
      });
    }

    // Add PSGA records into their respective month
    for (const psga of psgas) {
      const createdAt = new Date(psga.createdAt);

      const year = createdAt.getFullYear();
      const month = createdAt.getMonth();

      const bucket = monthlyData.find(
        (item) =>
          item.year === year &&
          item.month === month
      );

      if (!bucket) {
        continue;
      }

      bucket.total += 1;

      switch (psga.status) {
        case "GENERATED":
          bucket.generated += 1;
          break;

        case "SENT":
          bucket.sent += 1;
          break;

        case "ACCEPTED":
          bucket.accepted += 1;
          break;

        case "REJECTED":
          bucket.rejected += 1;
          break;

        case "CANCELLED":
          bucket.cancelled += 1;
          break;

        default:
          break;
      }
    }

    // Remove internal calculation fields from API response
    const data = monthlyData.map((item) => ({
      month: item.monthKey,
      label: item.monthLabel,

      total: item.total,
      generated: item.generated,
      sent: item.sent,
      accepted: item.accepted,
      rejected: item.rejected,
      cancelled: item.cancelled,
    }));

    return res.status(200).json({
      success: true,

      period: {
        months,
        from: data[0]?.month || null,
        to: data[data.length - 1]?.month || null,
      },

      data,
    });
  } catch (error) {
    console.error("Dashboard monthly sales error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch monthly sales data",
    });
  }
}

// ============================================================
// ADMIN DASHBOARD ACTIVITY SUMMARY
// ============================================================

export async function getDashboardActivitySummary(req, res) {
  try {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const [
      pending,
      completed,
      cancelled,
      todayFollowUps,
      overdueFollowUps,
    ] = await Promise.all([
      // ========================================================
      // PENDING
      // ========================================================

      prisma.activity.count({
        where: {
          status: "PENDING",
        },
      }),

      // ========================================================
      // COMPLETED
      // ========================================================

      prisma.activity.count({
        where: {
          status: "COMPLETED",
        },
      }),

      // ========================================================
      // CANCELLED
      // ========================================================

      prisma.activity.count({
        where: {
          status: "CANCELLED",
        },
      }),

      // ========================================================
      // TODAY'S FOLLOW-UPS
      // ========================================================

      prisma.activity.count({
        where: {
          followUpAt: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
      }),

      // ========================================================
      // OVERDUE FOLLOW-UPS
      // ========================================================

      prisma.activity.count({
        where: {
          status: "PENDING",
          followUpAt: {
            not: null,
            lt: now,
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,

      data: {
        pending,
        completed,
        cancelled,
        todayFollowUps,
        overdueFollowUps,

        total:
          pending +
          completed +
          cancelled,
      },
    });
  } catch (error) {
    console.error("Dashboard activity summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch activity summary",
    });
  }
}

// ============================================================
// ADMIN DASHBOARD FOLLOW-UP MANAGEMENT
// ============================================================

export async function getDashboardFollowUps(req, res) {
  try {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    // ----------------------------------------------------------
    // Fetch pending follow-ups
    // ----------------------------------------------------------

    const pendingFollowUps = await prisma.activity.findMany({
      where: {
        status: "PENDING",
        followUpAt: {
          not: null,
        },
      },

      orderBy: {
        followUpAt: "asc",
      },

      take: 100,

      select: {
        id: true,
        type: true,
        subject: true,
        description: true,
        status: true,
        followUpAt: true,
        createdAt: true,

        lead: {
          select: {
            id: true,
            associationName: true,
            contactName: true,
            email: true,
            mobile: true,
            status: true,

            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },

        client: {
          select: {
            id: true,
            associationName: true,
            contactName: true,
            email: true,
            mobile: true,
            status: true,
          },
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
    });

    // ----------------------------------------------------------
    // Categorize follow-ups
    // ----------------------------------------------------------

    const upcoming = [];
    const dueToday = [];
    const overdue = [];

    for (const activity of pendingFollowUps) {
      if (!activity.followUpAt) {
        continue;
      }

      const followUpDate = new Date(activity.followUpAt);

      const baseData = {
        id: activity.id,
        type: activity.type,
        subject: activity.subject,
        description: activity.description,
        status: activity.status,
        followUpAt: activity.followUpAt,
        createdAt: activity.createdAt,

        lead: activity.lead
          ? {
              id: activity.lead.id,
              associationName: activity.lead.associationName,
              contactName: activity.lead.contactName,
              email: activity.lead.email,
              mobile: activity.lead.mobile,
              status: activity.lead.status,
            }
          : null,

        client: activity.client
          ? {
              id: activity.client.id,
              associationName: activity.client.associationName,
              contactName: activity.client.contactName,
              email: activity.client.email,
              mobile: activity.client.mobile,
              status: activity.client.status,
            }
          : null,

        assignedBde: activity.lead?.assignedTo
          ? {
              id: activity.lead.assignedTo.id,
              firstName: activity.lead.assignedTo.firstName,
              lastName: activity.lead.assignedTo.lastName,
              email: activity.lead.assignedTo.email,
            }
          : activity.createdBy
          ? {
              id: activity.createdBy.id,
              firstName: activity.createdBy.firstName,
              lastName: activity.createdBy.lastName,
              email: activity.createdBy.email,
            }
          : null,
      };

      // --------------------------------------------------------
      // Overdue
      // --------------------------------------------------------

      if (followUpDate < now) {
        overdue.push({
          ...baseData,
          category: "OVERDUE",
        });

        continue;
      }

      // --------------------------------------------------------
      // Due Today
      // --------------------------------------------------------

      if (
        followUpDate >= startOfToday &&
        followUpDate < startOfTomorrow
      ) {
        dueToday.push({
          ...baseData,
          category: "DUE_TODAY",
        });

        continue;
      }

      // --------------------------------------------------------
      // Upcoming
      // --------------------------------------------------------

      upcoming.push({
        ...baseData,
        category: "UPCOMING",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        summary: {
          upcoming: upcoming.length,
          dueToday: dueToday.length,
          overdue: overdue.length,
          pending: pendingFollowUps.length,
        },

        upcoming,
        dueToday,
        overdue,
      },
    });
  } catch (error) {
    console.error("Dashboard follow-ups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch follow-up data",
    });
  }
}