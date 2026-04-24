const Slot = require("../models/Slot");

const buildVehiclePricing = ({ price, vehiclePricing }) => {
  if (
    vehiclePricing &&
    typeof vehiclePricing.twoWheeler === "number" &&
    typeof vehiclePricing.fourWheeler === "number"
  ) {
    return vehiclePricing;
  }

  if (typeof price === "number") {
    return {
      twoWheeler: Number((price / 2).toFixed(2)),
      fourWheeler: price,
    };
  }

  return null;
};

const ensureSlotPricing = async (slot) => {
  const pricing = buildVehiclePricing({ price: slot.price, vehiclePricing: slot.vehiclePricing });
  if (
    pricing &&
    (!slot.vehiclePricing ||
      slot.vehiclePricing.twoWheeler !== pricing.twoWheeler ||
      slot.vehiclePricing.fourWheeler !== pricing.fourWheeler)
  ) {
    slot.vehiclePricing = pricing;
    await slot.save();
  }

  return {
    ...slot.toObject(),
    pricing,
  };
};

const listSlots = async (_req, res) => {
  const slots = await Slot.find().sort({ location: 1, slotId: 1 });
  return res.json(await Promise.all(slots.map(ensureSlotPricing)));
};

const listAvailableSlots = async (_req, res) => {
  const slots = await Slot.find({ status: "available" }).sort({ location: 1, slotId: 1 });
  return res.json(await Promise.all(slots.map(ensureSlotPricing)));
};

const createSlot = async (req, res) => {
  try {
    const { slotId, location, price, pricing, vehiclePricing } = req.body;
    const resolvedPricing = buildVehiclePricing({ price, vehiclePricing: pricing || vehiclePricing });
    if (!slotId || !location || !resolvedPricing) {
      return res.status(400).json({ message: "slotId, location, and pricing are required" });
    }

    const existing = await Slot.findOne({ slotId });
    if (existing) {
      return res.status(409).json({ message: "Slot already exists" });
    }

    const slot = await Slot.create({
      slotId,
      location,
      vehiclePricing: resolvedPricing,
      price: resolvedPricing.fourWheeler,
      status: "available",
    });

    return res.status(201).json({ message: "Slot created", slot: await ensureSlotPricing(slot) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create slot", error: error.message });
  }
};

const updateSlotStatus = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { status } = req.body;
    const allowedStatuses = ["available", "reserved", "occupied", "blocked"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid slot status" });
    }

    const slot = await Slot.findOne({ slotId });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    slot.status = status;
    if (status === "available" || status === "blocked") {
      slot.bookingId = null;
    }

    await slot.save();
    return res.json({ message: "Slot status updated", slot: await ensureSlotPricing(slot) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update slot", error: error.message });
  }
};

const getSlotInternal = async (req, res) => {
  const slot = await Slot.findOne({ slotId: req.params.slotId });
  if (!slot) {
    return res.status(404).json({ message: "Slot not found" });
  }
  return res.json(await ensureSlotPricing(slot));
};

const reserveSlotInternal = async (req, res) => {
  const { slotId } = req.params;
  const { bookingId } = req.body;
  const slot = await Slot.findOne({ slotId });

  if (!slot) {
    return res.status(404).json({ message: "Slot not found" });
  }
  if (slot.status !== "available") {
    return res.status(409).json({ message: "Slot is not available" });
  }

  slot.status = "reserved";
  slot.bookingId = bookingId || null;
  await slot.save();
  return res.json({ message: "Slot reserved", slot: await ensureSlotPricing(slot) });
};

const releaseSlotInternal = async (req, res) => {
  const slot = await Slot.findOne({ slotId: req.params.slotId });
  if (!slot) {
    return res.status(404).json({ message: "Slot not found" });
  }

  if (slot.status !== "blocked") {
    slot.status = "available";
    slot.bookingId = null;
    await slot.save();
  }

  return res.json({ message: "Slot released", slot: await ensureSlotPricing(slot) });
};

const occupySlotInternal = async (req, res) => {
  const slot = await Slot.findOne({ slotId: req.params.slotId });
  if (!slot) {
    return res.status(404).json({ message: "Slot not found" });
  }

  slot.status = "occupied";
  if (req.body.bookingId) {
    slot.bookingId = req.body.bookingId;
  }
  await slot.save();
  return res.json({ message: "Slot marked occupied", slot: await ensureSlotPricing(slot) });
};

module.exports = {
  createSlot,
  getSlotInternal,
  listAvailableSlots,
  listSlots,
  occupySlotInternal,
  releaseSlotInternal,
  reserveSlotInternal,
  updateSlotStatus,
};

