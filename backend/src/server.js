import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectMongo, disconnectMongo } from "./db/connectMongo.js";

let httpServer;
let isShuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.warn(`Received ${signal}. Shutting down gracefully...`);

  if (httpServer) {
    await new Promise((resolve, reject) => {
      httpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  await disconnectMongo();
  logger.info("Shutdown complete");
  process.exit(exitCode);
}

function handleShutdownSignal(signal) {
  shutdown(signal, 0).catch((error) => {
    logger.error(`${signal} shutdown failed`, { error: error.message });
    process.exit(1);
  });
}

function handleFatalError(type, error) {
  logger.error(`${type} detected`, {
    error: error?.message || String(error),
    stack: error?.stack,
  });

  shutdown(type, 1).catch(() => {
    process.exit(1);
  });
}

async function bootstrap() {
  await connectMongo();

  httpServer = app.listen(env.PORT, () => {
    logger.info(`API server running on http://localhost:${env.PORT}`);
  });

  process.on("SIGINT", () => handleShutdownSignal("SIGINT"));
  process.on("SIGTERM", () => handleShutdownSignal("SIGTERM"));
  process.on("unhandledRejection", (reason) => handleFatalError("unhandledRejection", reason));
  process.on("uncaughtException", (error) => handleFatalError("uncaughtException", error));
}

bootstrap().catch((error) => {
  logger.error("Failed to bootstrap server", { error: error.message });
  process.exit(1);
});
