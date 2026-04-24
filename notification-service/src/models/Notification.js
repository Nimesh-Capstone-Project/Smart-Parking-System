const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: {
      type: String,
      required: true,
    },
    bookingId: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: ["console", "email"],
      default: "console",
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);

