import mongoose from "mongoose";
import { afterAll, afterEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.PORT = "5001";
process.env.TRUST_PROXY = "false";
process.env.JWT_SECRET = "test-jwt-secret-with-minimum-length-12345";
process.env.JWT_EXPIRES_IN = "15m";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.COOKIE_SECRET = "test-cookie-secret-with-minimum-length-12345";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_SAME_SITE = "lax";
process.env.RATE_LIMIT_WINDOW_MS = "900000";
process.env.RATE_LIMIT_MAX = "10000";
process.env.AUTH_LOGIN_WINDOW_MS = "900000";
process.env.AUTH_LOGIN_MAX_ATTEMPTS = "5";
process.env.AUTH_LOGIN_LOCKOUT_MS = "1800000";

const mongoServer = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongoServer.getUri("uhas_test");

let disconnectMongo;

const db = await import("../src/db/connectMongo.js");
await db.connectMongo();
disconnectMongo = db.disconnectMongo;

afterEach(async () => {
  if (mongoose.connection.name !== "uhas_test") {
    throw new Error(`Unsafe test cleanup blocked for database: ${mongoose.connection.name}`);
  }

  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  if (disconnectMongo) {
    await disconnectMongo();
  }

  await mongoServer.stop();
});
