const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      unique: true,
      required: true,
    },
    bookingId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    vehicleType: {
      type: String,
      default: null,
    },
    durationHours: {
      type: Number,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    method: {
      type: String,
      enum: ["card", "upi", "wallet", "razorpay"],
      default: "card",
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      required: true,
    },
    orderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    transactionRef: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);

