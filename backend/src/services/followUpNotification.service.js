import prisma from "../config/prisma.js";

/**
 * Follow-up Notification Service
 *
 * Notification lifecycle:
 *
 * 1. 24 hours before follow-up
 *    FOLLOW_UP_REMINDER
 *
 * 2. At scheduled time
 *    FOLLOW_UP_DUE
 *
 * 3. After due window
 *    FOLLOW_UP_OVERDUE
 *
 * Overdue notification:
 * - One notification per day
 * - Continues until activity is completed/cancelled
 *
 * Recipients:
 * - Responsible BDE
 * - All active Admin users
 *
 * Duplicate protection:
 * - notificationKey is unique per recipient
 */

const DUE_WINDOW_MINUTES = 15;

function formatIST(date) {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getActivityReference(activity) {
  if (activity.lead) {
    return {
      referenceType: "LEAD",
      referenceId: activity.lead.id,
      customerName:
        activity.lead.associationName ||
        activity.lead.contactName ||
        "Lead",
    };
  }

  if (activity.client) {
    return {
      referenceType: "CLIENT",
      referenceId: activity.client.id,
      customerName:
        activity.client.associationName ||
        activity.client.contactName ||
        "Client",
    };
  }

  return {
    referenceType: "ACTIVITY",
    referenceId: activity.id,
    customerName: "Customer",
  };
}

async function createUniqueNotification({
  recipientId,
  type,
  title,
  message,
  referenceId,
  referenceType,
  notificationKey,
}) {
  if (!recipientId) return null;

  try {
    return await prisma.notification.create({
      data: {
        recipientId,
        type,
        title,
        message,
        referenceId,
        referenceType,
        notificationKey,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return null;
    }

    throw error;
  }
}

async function getAdminRecipients() {
  return prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: {
        name: "Admin",
      },
    },
    select: {
      id: true,
    },
  });
}

/**
 * Get the BDE responsible for the follow-up.
 *
 * Priority:
 * 1. Lead assigned BDE
 * 2. Activity creator if creator is BDE
 */
function getBdeRecipient(activity) {
  if (
    activity.lead?.assignedTo &&
    activity.lead.assignedTo.status === "ACTIVE" &&
    activity.lead.assignedTo.role?.name === "BDE/Sales"
  ) {
    return activity.lead.assignedTo;
  }

  if (
    activity.createdBy &&
    activity.createdBy.status === "ACTIVE" &&
    activity.createdBy.role?.name === "BDE/Sales"
  ) {
    return activity.createdBy;
  }

  return null;
}

function getISTDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

async function processFollowUpActivity(activity, now) {
  if (!activity.followUpAt) {
    return {
      activityId: activity.id,
      processed: false,
      reason: "NO_FOLLOW_UP_DATE",
    };
  }

  if (activity.status !== "PENDING") {
    return {
      activityId: activity.id,
      processed: false,
      reason: "ACTIVITY_NOT_PENDING",
    };
  }

  const followUpAt = new Date(activity.followUpAt);

  if (Number.isNaN(followUpAt.getTime())) {
    return {
      activityId: activity.id,
      processed: false,
      reason: "INVALID_FOLLOW_UP_DATE",
    };
  }

  const reference = getActivityReference(activity);

  const recipients = [];

  // Responsible BDE
  const bde = getBdeRecipient(activity);

  if (bde) {
    recipients.push(bde.id);
  }

  // All active Admin users
  const admins = await getAdminRecipients();

  for (const admin of admins) {
    if (!recipients.includes(admin.id)) {
      recipients.push(admin.id);
    }
  }

  if (!recipients.length) {
    return {
      activityId: activity.id,
      processed: false,
      reason: "NO_RECIPIENTS",
    };
  }

  /*
   * ---------------------------------------------------------
   * 1. 24-HOUR REMINDER
   * ---------------------------------------------------------
   */

  const reminderStart = new Date(
    followUpAt.getTime() - 24 * 60 * 60 * 1000
  );

  if (now >= reminderStart && now < followUpAt) {
    for (const recipientId of recipients) {
      await createUniqueNotification({
        recipientId,
        type: "FOLLOW_UP_REMINDER",
        title: "Follow-up Reminder",
        message: `Follow-up scheduled for ${reference.customerName} is due on ${formatIST(
          followUpAt
        )}. Please review the customer record and prepare for the follow-up.`,
        referenceId: activity.id,
        referenceType: "ACTIVITY",
        notificationKey: `FOLLOW_UP_REMINDER:${activity.id}`,
      });
    }
  }

  /*
   * ---------------------------------------------------------
   * 2 + 3. DUE / OVERDUE
   * ---------------------------------------------------------
   *
   * BEFORE followUpAt:
   *   No due/overdue notification.
   *
   * followUpAt → +15 minutes:
   *   FOLLOW_UP_DUE
   *
   * After +15 minutes:
   *   FOLLOW_UP_OVERDUE
   *
   * Only one branch can execute.
   */

  const dueWindowEnd = new Date(
    followUpAt.getTime() + DUE_WINDOW_MINUTES * 60 * 1000
  );

  if (now >= followUpAt) {
    if (now < dueWindowEnd) {
      /*
       * FOLLOW-UP DUE
       */
      for (const recipientId of recipients) {
        await createUniqueNotification({
          recipientId,
          type: "FOLLOW_UP_DUE",
          title: "Follow-up Due",
          message: `Follow-up with ${reference.customerName} is due now. Please complete the scheduled follow-up and update the activity status.`,
          referenceId: activity.id,
          referenceType: "ACTIVITY",
          notificationKey: `FOLLOW_UP_DUE:${activity.id}`,
        });
      }
    } else {
      /*
       * FOLLOW-UP OVERDUE
       *
       * One notification per IST calendar day.
       */
      const overdueDateKey = getISTDateKey(now);

      for (const recipientId of recipients) {
        await createUniqueNotification({
          recipientId,
          type: "FOLLOW_UP_OVERDUE",
          title: "Follow-up Overdue",
          message: `Follow-up with ${reference.customerName} was scheduled for ${formatIST(
            followUpAt
          )} and is now overdue. Please complete it and update the activity status.`,
          referenceId: activity.id,
          referenceType: "ACTIVITY",
          notificationKey: `FOLLOW_UP_OVERDUE:${activity.id}:${overdueDateKey}`,
        });
      }
    }
  }

  return {
    activityId: activity.id,
    processed: true,
    recipients: recipients.length,
  };
}

export async function processFollowUpNotifications() {
  const now = new Date();

  const activities = await prisma.activity.findMany({
    where: {
      status: "PENDING",
      followUpAt: {
        not: null,
      },
    },

    include: {
      createdBy: {
        select: {
          id: true,
          status: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      },

      lead: {
        select: {
          id: true,
          associationName: true,
          contactName: true,

          assignedTo: {
            select: {
              id: true,
              status: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },

      client: {
        select: {
          id: true,
          associationName: true,
          contactName: true,
        },
      },
    },

    orderBy: {
      followUpAt: "asc",
    },
  });

  const results = [];

  for (const activity of activities) {
    try {
      results.push(
        await processFollowUpActivity(activity, now)
      );
    } catch (error) {
      console.error(
        `Follow-up notification failed for activity ${activity.id}:`,
        error
      );

      results.push({
        activityId: activity.id,
        processed: false,
        reason: "PROCESSING_ERROR",
      });
    }
  }

  return {
    processedAt: now,
    totalActivities: activities.length,
    results,
  };
}