import cron from "node-cron";

import {
  processFollowUpNotifications,
} from "../services/followUpNotification.service.js";


/**
 * Follow-up Notification Scheduler
 *
 * Runs every 15 minutes.
 *
 * Responsibilities:
 * - 24-hour reminders
 * - Due notifications
 * - Overdue notifications
 *
 * Duplicate notifications are prevented by the
 * notificationKey unique constraint.
 */

export function startFollowUpNotificationJob() {
  /**
   * Every 15 minutes.
   *
   * Cron:
   * ┌──────── minute
   * │ ┌────── hour
   * │ │ ┌──── day
   * │ │ │ ┌── month
   * │ │ │ │ ┌ day of week
   * │ │ │ │ │
   * * * * * *
   */
  cron.schedule(
    "*/15 * * * *",
    async () => {
      try {
        console.log(
          "[Follow-up Scheduler] Checking follow-ups..."
        );

        const result =
          await processFollowUpNotifications();

        console.log(
          "[Follow-up Scheduler] Completed:",
          {
            processedAt: result.processedAt,
            totalActivities:
              result.totalActivities,
          }
        );
      } catch (error) {
        console.error(
          "[Follow-up Scheduler] ERROR:",
          error
        );
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log(
    "[Follow-up Scheduler] Started. " +
    "Runs every 15 minutes (IST)."
  );
}