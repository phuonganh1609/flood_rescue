import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./config/swagger.js";

import authRoute from "./modules/auth/auth.routes.js";

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
