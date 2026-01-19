const swaggerJsdoc = require("swagger-jsdoc");

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

  // nơi swagger sẽ scan comment
  apis: ["./src/modules/**/*.js", "./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
