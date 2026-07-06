import app from "./app.js";
import env from "./config/env.js";
import { applySchema } from "./db/schema.js";

async function start() {
  await applySchema();

  app.listen(env.port, () => {
    console.log(`Backend listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
