/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const source = path.resolve(
  __dirname,
  "../../studybond-backend/artifacts/openapi/openapi-types.d.ts",
);
const target = path.resolve(
  __dirname,
  "../src/lib/api/generated/openapi-types.d.ts",
);

if (!fs.existsSync(source)) {
  console.error(`[openapi:sync] Missing backend OpenAPI types at ${source}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
console.log(`[openapi:sync] Copied backend OpenAPI types to ${target}`);
