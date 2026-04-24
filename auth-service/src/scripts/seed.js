const bcrypt = require("bcryptjs");
const User = require("../models/User");

const ensureSeedUsers = async () => {
  const count = await User.countDocuments();
  if (count > 0) {
    return;
  }

  const adminPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "Admin@123", 10);
  const userPassword = await bcrypt.hash(process.env.SEED_USER_PASSWORD || "User@123", 10);

  await User.insertMany([
    {
      name: "System Admin",
      email: (process.env.SEED_ADMIN_EMAIL || "admin@parking.com").toLowerCase(),
      password: adminPassword,
      role: "admin",
    },
    {
      name: "Parking User",
      email: (process.env.SEED_USER_EMAIL || "user@parking.com").toLowerCase(),
      password: userPassword,
      role: "user",
    },
  ]);

  console.log("Auth seed users created");
};

module.exports = { ensureSeedUsers };

