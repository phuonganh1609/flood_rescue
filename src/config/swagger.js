import swaggerJsdoc from "swagger-jsdoc";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load OpenAPI YAML file
const openAPIPath = path.join(__dirname, "../../docs/swagger/openapi.yaml");
const swaggerSpec = YAML.load(openAPIPath);

// Fallback: If YAML loading fails, use swagger-jsdoc
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Flood Rescue API",
      version: "1.0.0",
      description: "API documentation for Flood Rescue System",
    },
    servers: [
      {
        url: "https://flood-rescue.onrender.com",
        description: "Production server",
      },
      {
        url: "http://localhost:8080",
        description: "Local server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/modules/**/*.js", "./src/routes/*.js"],
};

const fallbackSwaggerSpec = swaggerJsdoc(options);

export default swaggerSpec || fallbackSwaggerSpec;
