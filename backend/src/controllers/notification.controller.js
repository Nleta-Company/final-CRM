import prisma from "../config/prisma.js";

export async function getNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: req.user.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
}

export async function getUnreadNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: req.user.userId,
        isRead: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Get unread notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch unread notifications",
    });
  }
}

export async function markNotificationAsRead(req, res) {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        recipientId: req.user.userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const updatedNotification = await prisma.notification.update({
      where: {
        id,
      },
      data: {
        isRead: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: updatedNotification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
}

export async function markAllNotificationsAsRead(req, res) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        recipientId: req.user.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notifications",
    });
  }
}

export async function deleteNotification(req, res) {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        recipientId: req.user.userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await prisma.notification.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
}