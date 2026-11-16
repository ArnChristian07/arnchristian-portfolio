// Prints an ADMIN_PASSWORD_HASH line for .env.local.
// Usage: npm run hash-password   (you'll be prompted; the password isn't echoed or saved)

import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline";

const N = 16384, r = 8, p = 1, KEYLEN = 64;

function ask(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Hide typed characters.
    rl._writeToOutput = (s) => {
      if (s.startsWith(prompt)) rl.output.write(prompt);
    };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const pw = await ask("New admin password: ");
const again = await ask("Repeat password:    ");

if (!pw) {
  console.error("Password can't be empty.");
  process.exit(1);
}
if (pw !== again) {
  console.error("Passwords don't match.");
  process.exit(1);
}
if (pw.length < 12) {
  console.warn("Warning: under 12 characters. A longer passphrase is much harder to guess.");
}

const salt = randomBytes(16);
const hash = scryptSync(pw, salt, KEYLEN, { N, r, p });
const b64 = (b) => b.toString("base64url");

// Colon-separated (no "$") so Next's .env variable expansion leaves it alone.
console.log("\nPut this in .env.local and delete the ADMIN_PASSWORD line:\n");
console.log(`ADMIN_PASSWORD_HASH=scrypt:${N}:${r}:${p}:${b64(salt)}:${b64(hash)}`);
