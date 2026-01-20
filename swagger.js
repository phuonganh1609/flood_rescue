import yaml from "yamljs";

const swaggerDocument = yaml.load("./swagger/swagger.yaml");
console.log(swaggerDocument);

export default swaggerDocument;
