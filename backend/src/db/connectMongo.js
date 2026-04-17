import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export async function connectMongo() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("MongoDB connected", { database: mongoose.connection.name });
  } catch (error) {
    logger.error("MongoDB connection failed", { error: error.message });
    throw error;
  }
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.connection.close();
  logger.info("MongoDB disconnected");
}

