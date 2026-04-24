const express = require("express");
const {
  createSlot,
  getSlotInternal,
  listAvailableSlots,
  listSlots,
  occupySlotInternal,
  releaseSlotInternal,
  reserveSlotInternal,
  updateSlotStatus,
} = require("../controllers/slotController");
const { authenticate, authorize, requireInternalKey } = require("../middleware/auth");

const router = express.Router();

router.get("/health", (_req, res) => res.json({ service: "parking-service", status: "ok" }));
router.get("/slots", authenticate, listSlots);
router.get("/slots/available", authenticate, listAvailableSlots);
router.post("/slots", authenticate, authorize("admin"), createSlot);
router.patch("/slots/:slotId/status", authenticate, authorize("admin"), updateSlotStatus);

router.get("/internal/slots/:slotId", requireInternalKey, getSlotInternal);
router.post("/internal/slots/:slotId/reserve", requireInternalKey, reserveSlotInternal);
router.post("/internal/slots/:slotId/release", requireInternalKey, releaseSlotInternal);
router.post("/internal/slots/:slotId/occupy", requireInternalKey, occupySlotInternal);

module.exports = router;

