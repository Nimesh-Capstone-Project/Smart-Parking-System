require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const { ensureSeedUsers } = require("./scripts/seed");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(morgan("dev"));
app.use("/", authRoutes);

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    await ensureSeedUsers();
    const port = process.env.PORT || 4001;
    app.listen(port, () => {
      console.log(`Auth service listening on port ${port}`);
    });
  } catch (error) {
    console.error("Auth service failed to start", error);
    process.exit(1);
  }
};

start();

