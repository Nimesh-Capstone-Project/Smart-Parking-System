const Notification = require("../models/Notification");

const createNotification = async (req, res) => {
  try {
    const { recipientUserId, bookingId, type, channel = "console", message, metadata = {} } = req.body;
    if (!recipientUserId || !type || !message) {
      return res.status(400).json({ message: "recipientUserId, type, and message are required" });
    }

    const notification = await Notification.create({
      recipientUserId,
      bookingId,
      type,
      channel,
      message,
      metadata,
    });

    console.log(`[Notification:${channel}] user=${recipientUserId} type=${type} message=${message}`);
    return res.status(201).json({ message: "Notification queued", notification });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create notification", error: error.message });
  }
};

const getNotifications = async (req, res) => {
  const query = req.user.role === "admin" ? {} : { recipientUserId: req.user.id };
  const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(100);
  return res.json(notifications);
};

module.exports = { createNotification, getNotifications };

