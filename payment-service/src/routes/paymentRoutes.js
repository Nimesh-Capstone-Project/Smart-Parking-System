const express = require("express");
const { createOrder, failPayment, getPayments, processPayment, verifyPayment } = require("../controllers/paymentController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/health", (_req, res) => res.json({ service: "payment-service", status: "ok" }));
router.post("/create-order", authenticate, createOrder);
router.post("/verify-payment", authenticate, verifyPayment);
router.post("/payments/fail", authenticate, failPayment);
router.post("/payments/process", authenticate, processPayment);
router.get("/payments", authenticate, getPayments);

module.exports = router;

