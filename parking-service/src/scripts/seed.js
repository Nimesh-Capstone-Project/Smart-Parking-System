const Slot = require("../models/Slot");

const ensureSeedSlots = async () => {
  const count = await Slot.countDocuments();
  if (count > 0) {
    return;
  }

  const slots = [
    { slotId: "A-101", location: "North Deck - L1", price: 80, vehiclePricing: { twoWheeler: 40, fourWheeler: 80 }, status: "available" },
    { slotId: "A-102", location: "North Deck - L1", price: 80, vehiclePricing: { twoWheeler: 40, fourWheeler: 80 }, status: "available" },
    { slotId: "A-103", location: "North Deck - L1", price: 85, vehiclePricing: { twoWheeler: 42.5, fourWheeler: 85 }, status: "available" },
    { slotId: "B-201", location: "East Wing - L2", price: 100, vehiclePricing: { twoWheeler: 50, fourWheeler: 100 }, status: "available" },
    { slotId: "B-202", location: "East Wing - L2", price: 100, vehiclePricing: { twoWheeler: 50, fourWheeler: 100 }, status: "blocked" },
    { slotId: "C-301", location: "Executive Zone - L3", price: 150, vehiclePricing: { twoWheeler: 75, fourWheeler: 150 }, status: "available" },
    { slotId: "C-302", location: "Executive Zone - L3", price: 150, vehiclePricing: { twoWheeler: 75, fourWheeler: 150 }, status: "occupied" },
    { slotId: "D-401", location: "Basement - L1", price: 60, vehiclePricing: { twoWheeler: 30, fourWheeler: 60 }, status: "available" }
  ];

  await Slot.insertMany(slots);
  console.log("Parking seed slots created");
};

module.exports = { ensureSeedSlots };

