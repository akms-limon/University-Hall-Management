import "express-async-errors";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { corsOptions } from "./config/corsOptions.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { ensureUploadDir, uploadDir, uploadPublicPath } from "./config/storage.js";
import { API_PREFIX } from "./constants/app.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import { apiRateLimit } from "./middlewares/rateLimitMiddleware.js";
import apiRoutes from "./routes/index.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);
app.use(helmet());
app.use(cors(corsOptions));
app.use(apiRateLimit);
app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(
  morgan(env.NODE_ENV === "production" ? "combined" : "dev", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

ensureUploadDir();
app.use(uploadPublicPath, express.static(uploadDir));

app.use(API_PREFIX, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
