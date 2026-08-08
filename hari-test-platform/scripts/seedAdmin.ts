import bcrypt from "bcryptjs";
import { connectDB } from "../lib/mongodb";
import Admin from "../models/Admin";

async function main() {
  const [, , name, email, password] = process.argv;

  if (!name || !email || !password) {
    console.error("Usage: npx tsx scripts/seedAdmin.ts \"Full Name\" \"email@example.com\" \"password123\"");
    process.exit(1);
  }

  await connectDB();

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await Admin.findOne({ email: normalizedEmail });
  if (existing) {
    console.error(`❌ An admin with email ${normalizedEmail} already exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await Admin.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: "admin",
  });

  console.log("✅ Admin created:");
  console.log({ id: admin._id.toString(), name: admin.name, email: admin.email });
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});