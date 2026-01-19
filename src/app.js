const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const authRoute = require("./modules/auth/auth.routes");

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

// Routes
app.use("/api/auth", authRoute);

module.exports = app;
