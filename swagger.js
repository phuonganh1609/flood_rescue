import yaml from "yamljs";

const swaggerDocument = yaml.load("./docs/swagger/openapi.yaml");
console.log(swaggerDocument);

export default swaggerDocument;
