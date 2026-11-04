// Pipe a password on stdin. Never pass it as a command-line argument.
import { randomBytes, scryptSync } from "node:crypto";
let password = "";
for await (const chunk of process.stdin) {
  password += chunk;
  if (password.length > 1024) throw new Error("Password too long");
}
password = password.replace(/\r?\n$/, "");
if (password.length < 12) throw new Error("Use a password of at least 12 characters");
const salt = randomBytes(16).toString("hex");
console.log(`${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
