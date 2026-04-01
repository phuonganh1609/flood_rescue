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
import teamApplicationRoute from "./modules/teamApplications/teamApplication.routes.js";
import missionRoute from "./modules/missions/mission.routes.js";
import missionRequestRoute from "./modules/missionRequests/missionRequest.routes.js";
import timelineRoute from "./modules/timelines/timeline.routes.js";
import timelineSupplyRoute from "./modules/timelineSupplies/timelineSupply.routes.js";
import missionSupplyRoute from "./modules/missionSupplies/missionSupply.routes.js";
import teamRequestRoute from "./modules/teamRequests/teamRequest.routes.js";
import userRoute from "./modules/users/user.routes.js";
import "./modules/notifications/notify.listener.js"; // Initialize event listeners
import { notFound, errorHandler } from "./middlewares/error.middleware.js";
import supplyRoute from "./modules/supply/supply.routes.js";
import inventoryRoute from "./modules/inventory/inventoryItem.route.js";
import warehouseRoute from "./modules/warehouse/warehouse.route.js";
import vehicleRoute from "./modules/vehicles/vehicle.routes.js";
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
// Dùng để cung cấp tài liệu Swagger dưới dạng JSON cho Insomnia/Postman.
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerDocument);
});

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
app.use("/api/mission-requests", missionRequestRoute);
app.use("/api/team-requests", teamRequestRoute);
app.use("/api/timelines", timelineRoute);
app.use("/api/timeline-supplies", timelineSupplyRoute);
app.use("/api/mission-supplies", missionSupplyRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/teams", teamRoute);
app.use("/api/team-applications", teamApplicationRoute);
app.use("/api/supply", supplyRoute);
app.use("/api/inventory", inventoryRoute);
app.use("/api/warehouse", warehouseRoute);
app.use("/api/vehicles", vehicleRoute);
app.use("/api/users", userRoute);

// Error handling middlewares (must be after all routes)
app.use(notFound);
app.use(errorHandler);

export default app;
