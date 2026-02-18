import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import authRoute from "./modules/auth/auth.routes.js";
import requestRoute from "./modules/requests/request.routes.js";
import notificationRoute from "./modules/notifications/notification.routes.js";
import teamRoute from "./modules/teams/team.routes.js";
import missionRoute from "./modules/missions/mission.routes.js";
import timelineRoute from "./modules/timelines/timeline.routes.js";
import "./modules/notifications/notify.listener.js"; // Initialize event listeners
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Swagger YAML documentation
const swaggerDocument = YAML.load(
  path.join(__dirname, "../docs/swagger/swagger.yaml"),
);

// Load Custom CSS
const customCss = fs.readFileSync(
  path.join(__dirname, "../docs/swagger/swagger-custom.css"),
  "utf8",
);

const app = express();

// Swagger UI - served at /api-docs
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    swaggerOptions: {
      url: "/api-docs.json",
      displayOperationId: true,
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
    },
    customCss: customCss,
  }),
);

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(null, false);
    }
  },
  credentials: true, // Allow cookies and credentials
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// Routes
app.use("/api/auth", authRoute);
app.use("/api/requests", requestRoute);
app.use("/api/missions", missionRoute);
app.use("/api/timelines", timelineRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/teams", teamRoute);

// Error handling middlewares (must be after all routes)
app.use(notFound);
app.use(errorHandler);

export default app;
