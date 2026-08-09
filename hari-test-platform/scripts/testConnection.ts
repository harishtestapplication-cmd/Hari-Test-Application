import { connectDB } from "../lib/mongodb";
import Test from "../models/Test";
import Admin from "../models/Admin";
import Attempt from "../models/Attempt";

async function main() {
  await connectDB();
  console.log("✅ Connected to MongoDB");

  const testCount = await Test.countDocuments();
  const adminCount = await Admin.countDocuments();
  const attemptCount = await Attempt.countDocuments();

  console.log({ testCount, adminCount, attemptCount });
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Connection failed:", err);
  process.exit(1);
});