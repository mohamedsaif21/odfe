import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import { config } from "./config";
import routes from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import { globalRateLimiter } from "./middleware/rate-limit.middleware";
import { csrfProtection, setCsrfCookie } from "./middleware/csrf.middleware";
import { sanitizeInput } from "./middleware/sanitize.middleware";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", config.corsOrigin],
      },
    },
  })
);

app.use(
  cors({
    origin: config.corsOrigin.split(",").map((o) => o.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    exposedHeaders: ["X-CSRF-Token"],
  })
);

app.use(globalRateLimiter);
app.use(compression());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use(setCsrfCookie);
app.use("/api", csrfProtection);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/csrf-token", (_req, res) => {
  res.json({ success: true, data: { csrfToken: _req.cookies?.["csrf-token"] || null } });
});

app.use("/api", routes);

app.use(errorHandler);

export default app;
