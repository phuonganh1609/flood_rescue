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

const app = express();

// Swagger
const swaggerDocument = YAML.load(
  path.join(__dirname, "../swagger/swagger.yaml"),
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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
