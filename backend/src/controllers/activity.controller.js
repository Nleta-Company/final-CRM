import { z } from "zod";
import prisma from "../config/prisma.js";

const createActivitySchema = z.object({
  type: z.enum(["CALL", "MEETING", "FOLLOW_UP", "EMAIL", "NOTE"]),
  subject: z.string().trim().min(2),
  description: z.string().trim().optional(),
  followUpAt: z.string().datetime().optional(),
  status: z
    .enum(["PENDING", "COMPLETED", "CANCELLED"])
    .optional(),

  leadId: z.string().trim().optional(),
  clientId: z.string().trim().optional(),
});

const updateActivitySchema = z.object({
  type: z
    .enum(["CALL", "MEETING", "FOLLOW_UP", "EMAIL", "NOTE"])
    .optional(),

  subject: z.string().trim().min(2).optional(),

  description: z.string().trim().optional(),

  followUpAt: z.string().datetime().optional().nullable(),

  status: z
    .enum(["PENDING", "COMPLETED", "CANCELLED"])
    .optional(),

  leadId: z.string().trim().optional().nullable(),

  clientId: z.string().trim().optional().nullable(),
});

/* =========================================================
   ROLE HELPERS
========================================================= */

function isAdmin(req) {
  return req.user?.role === "Admin";
}

function isBde(req) {
  return req.user?.role === "BDE/Sales";
}

/* =========================================================
   LEAD ACCESS
========================================================= */

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

async function canAccessLead(leadId, req) {
  if (!leadId) {
    return true;
  }

  if (isAdmin(req)) {
    const lead = await prisma.lead.findUnique({
      where: {
        id: leadId,
      },
      select: {
        id: true,
      },
    });

    return !!lead;
  }

  if (isBde(req)) {
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        ...buildBdeLeadWhere(req.user.userId),
      },
      select: {
        id: true,
      },
    });

    return !!lead;
  }

  return false;
}

/* =========================================================
   CLIENT ACCESS
========================================================= */

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

async function canAccessClient(clientId, req) {
  if (!clientId) {
    return true;
  }

  if (isAdmin(req)) {
    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
      },
      select: {
        id: true,
      },
    });

    return !!client;
  }

  if (isBde(req)) {
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        ...buildBdeClientWhere(req.user.userId),
      },
      select: {
        id: true,
      },
    });

    return !!client;
  }

  return false;
}

/* =========================================================
   ACTIVITY ACCESS
========================================================= */

function buildBdeActivityWhere(userId) {
  return {
    OR: [
      {
        createdById: userId,
      },

      {
        lead: {
          is: {
            OR: [
              {
                createdById: userId,
              },
              {
                assignedToId: userId,
              },
            ],
          },
        },
      },

      {
        client: {
          is: {
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
          },
        },
      },
    ],
  };
}

async function getAccessibleActivity(id, req) {
  if (isAdmin(req)) {
    return prisma.activity.findUnique({
      where: {
        id,
      },
      include: {
        lead: true,
        client: true,

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
  }

  if (isBde(req)) {
    return prisma.activity.findFirst({
      where: {
        id,
        ...buildBdeActivityWhere(req.user.userId),
      },

      include: {
        lead: true,
        client: true,

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
  }

  return null;
}

/* =========================================================
   VALIDATE LEAD + CLIENT
========================================================= */

async function validateLeadAndClient(leadId, clientId, req) {
  if (leadId && clientId) {
    throw new Error(
      "Activity can be linked to either a Lead or a Client, not both"
    );
  }

  if (leadId) {
    const leadExists = await canAccessLead(leadId, req);

    if (!leadExists) {
      throw new Error(
        "You are not allowed to access this lead"
      );
    }
  }

  if (clientId) {
    const clientExists = await canAccessClient(clientId, req);

    if (!clientExists) {
      throw new Error(
        "You are not allowed to access this client"
      );
    }
  }
}

/* =========================================================
   CREATE ACTIVITY
========================================================= */

export async function createActivity(req, res) {
  try {
    const validation = createActivitySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity data",
        errors: validation.error.flatten(),
      });
    }

    const data = validation.data;

    await validateLeadAndClient(
      data.leadId,
      data.clientId,
      req
    );

    const activity = await prisma.activity.create({
      data: {
        type: data.type,
        subject: data.subject,
        description: data.description || null,

        followUpAt: data.followUpAt
          ? new Date(data.followUpAt)
          : null,

        status: data.status || "PENDING",

        leadId: data.leadId || null,
        clientId: data.clientId || null,

        createdById: req.user.userId,
      },

      include: {
        lead: true,
        client: true,

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

    return res.status(201).json({
      success: true,
      message: "Activity created successfully",
      data: activity,
    });
  } catch (error) {
    console.error("Create activity error:", error);

    const accessError =
      error.message ===
        "You are not allowed to access this lead" ||
      error.message ===
        "You are not allowed to access this client";

    if (accessError) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message ===
      "Activity can be linked to either a Lead or a Client, not both"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to create activity",
    });
  }
}

/* =========================================================
   GET ACTIVITIES
========================================================= */

export async function getActivities(req, res) {
  try {
    const where = isAdmin(req)
      ? {}
      : isBde(req)
        ? buildBdeActivityWhere(req.user.userId)
        : {
            createdById: req.user.userId,
          };

    const activities = await prisma.activity.findMany({
      where,

      orderBy: {
        createdAt: "desc",
      },

      include: {
        lead: {
          select: {
            id: true,
            associationName: true,
            contactName: true,
            email: true,
            mobile: true,
            status: true,
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

    return res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error("Get activities error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
    });
  }
}

/* =========================================================
   GET ACTIVITY BY ID
========================================================= */

export async function getActivityById(req, res) {
  try {
    const { id } = req.params;

    const activity = await getAccessibleActivity(id, req);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error("Get activity error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch activity",
    });
  }
}

/* =========================================================
   UPDATE ACTIVITY
========================================================= */

export async function updateActivity(req, res) {
  try {
    const { id } = req.params;

    const validation = updateActivitySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity data",
        errors: validation.error.flatten(),
      });
    }

    const existingActivity =
      await getAccessibleActivity(id, req);

    if (!existingActivity) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this activity",
      });
    }

    const data = validation.data;

    const finalLeadId =
      data.leadId !== undefined
        ? data.leadId
        : existingActivity.leadId;

    const finalClientId =
      data.clientId !== undefined
        ? data.clientId
        : existingActivity.clientId;

    await validateLeadAndClient(
      finalLeadId,
      finalClientId,
      req
    );

    const activity = await prisma.activity.update({
      where: {
        id,
      },

      data: {
        ...(data.type !== undefined && {
          type: data.type,
        }),

        ...(data.subject !== undefined && {
          subject: data.subject,
        }),

        ...(data.description !== undefined && {
          description: data.description || null,
        }),

        ...(data.followUpAt !== undefined && {
          followUpAt: data.followUpAt
            ? new Date(data.followUpAt)
            : null,
        }),

        ...(data.status !== undefined && {
          status: data.status,
        }),

        ...(data.leadId !== undefined && {
          leadId: data.leadId || null,
        }),

        ...(data.clientId !== undefined && {
          clientId: data.clientId || null,
        }),
      },

      include: {
        lead: true,
        client: true,

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

    return res.status(200).json({
      success: true,
      message: "Activity updated successfully",
      data: activity,
    });
  } catch (error) {
    console.error("Update activity error:", error);

    if (
      error.message ===
        "You are not allowed to access this lead" ||
      error.message ===
        "You are not allowed to access this client"
    ) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message ===
      "Activity can be linked to either a Lead or a Client, not both"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to update activity",
    });
  }
}

/* =========================================================
   DELETE ACTIVITY
========================================================= */

export async function deleteActivity(req, res) {
  try {
    const { id } = req.params;

    const activity = await getAccessibleActivity(id, req);

    if (!activity) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this activity",
      });
    }

    await prisma.activity.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Activity deleted successfully",
    });
  } catch (error) {
    console.error("Delete activity error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete activity",
    });
  }
}