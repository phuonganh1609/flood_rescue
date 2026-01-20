import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";

import authRoute from "./modules/auth/auth.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Swagger YAML documentation
const swaggerDocument = YAML.load(
  path.join(__dirname, "../docs/swagger/swagger.yaml"),
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
  }),
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// Routes
app.use("/api/auth", authRoute);

export default app;
