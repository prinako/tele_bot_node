import app from "./app.js";
import env from "./config/env.js";
import { applySchema } from "./db/schema.js";

import { validateSecurityConfig } from "./security/auth.js";

async function start() {
  validateSecurityConfig(env);
  await applySchema();

  app.listen(env.port, () => {
    console.log(`Backend listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start backend:", { message: error.message, code: error.code });
  process.exit(1);
});
