require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cron = require("node-cron");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(morgan("dev"));

const bookingClient = axios.create({
  baseURL: process.env.BOOKING_SERVICE_URL,
  timeout: 15000,
  headers: {
    "x-internal-api-key": process.env.INTERNAL_API_KEY,
  },
});

const runExpiryScan = async () => {
  try {
    const response = await bookingClient.post("/internal/bookings/expire-pending");
    console.log("Scheduler expiry scan:", response.data);
  } catch (error) {
    console.error("Scheduler scan failed:", error.response?.data || error.message);
  }
};

app.get("/health", (_req, res) => {
  res.json({ service: "scheduler-service", status: "ok", schedule: process.env.CRON_SCHEDULE });
});

const start = async () => {
  cron.schedule(process.env.CRON_SCHEDULE || "* * * * *", runExpiryScan);
  setTimeout(runExpiryScan, 5000);

  const port = process.env.PORT || 4005;
  app.listen(port, () => {
    console.log(`Scheduler service listening on port ${port}`);
  });
};

start();

