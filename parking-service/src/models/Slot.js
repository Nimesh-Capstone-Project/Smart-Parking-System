const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    slotId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["available", "reserved", "occupied", "blocked"],
      default: "available",
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    vehiclePricing: {
      twoWheeler: {
        type: Number,
        min: 0,
        default: null,
      },
      fourWheeler: {
        type: Number,
        min: 0,
        default: null,
      },
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    bookingId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Slot", slotSchema);

