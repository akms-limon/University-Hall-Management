 import { connectMongo } from "../db/connectMongo.js";
import { User } from "../models/User.js";
import { USER_ROLES } from "../constants/roles.js";
import { logger } from "../config/logger.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  args.forEach((arg) => {
    const [key, value] = arg.split("=");
    if (key?.startsWith("--") && value) {
      parsed[key.replace("--", "")] = value;
    }
  });

  return parsed;
}

async function run() {
  const args = parseArgs();

  const name = args.name || process.env.PROVOST_NAME;
  const email = args.email || process.env.PROVOST_EMAIL;
  const phone = args.phone || process.env.PROVOST_PHONE;
  const password = args.password || process.env.PROVOST_PASSWORD;

  if (!name || !email || !phone || !password) {
    throw new Error(
      "Missing provost seed data. Provide --name --email --phone --password or set PROVOST_* env vars."
    );
  }

  await connectMongo();

  const existing = await User.findOne({ email });
  if (existing) {
    logger.warn("Provost seed skipped: user already exists", { email });
    process.exit(0);
  }

  await User.create({
    name,
    email,
    phone,
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  logger.info("Provost account seeded successfully", { email });
  process.exit(0);
}

run().catch((error) => {
  logger.error("Provost seed failed", { error: error.message });
  process.exit(1);
});

