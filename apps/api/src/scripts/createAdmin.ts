import { createInterface } from "node:readline/promises";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { admins } from "../db/schema.js";
import { hashPassword } from "../lib/auth.js";

const MIN_PASSWORD_LENGTH = 12;

// Reads a line from the terminal without echoing it.
function askHidden(prompt: string): Promise<string> {
  const stdin = process.stdin;
  process.stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  stdin.resume();

  return new Promise((resolve) => {
    let value = "";
    const done = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          done();
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          done();
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
        } else if (ch >= " ") {
          value += ch;
        }
      }
    };
    stdin.on("data", onData);
  });
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!process.stdin.isTTY) fail("Run this script in an interactive terminal.");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const emailInput = (await rl.question("Email: ")).trim().toLowerCase();
const nameInput = (await rl.question("Name (optional): ")).trim();
rl.close();

const email = z.email().max(254).safeParse(emailInput);
if (!email.success) fail("Invalid email.");

const password = await askHidden("Password: ");
if (password.length < MIN_PASSWORD_LENGTH) {
  fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
}
if ((await askHidden("Repeat password: ")) !== password) {
  fail("Passwords do not match.");
}

const [existing] = await db
  .select({ id: admins.id })
  .from(admins)
  .where(eq(admins.email, email.data));
if (existing) fail(`Admin ${email.data} already exists.`);

const [admin] = await db
  .insert(admins)
  .values({
    email: email.data,
    name: nameInput || null,
    passwordHash: await hashPassword(password),
  })
  .returning({ id: admins.id });

console.log(`Created admin #${admin!.id} ${email.data}`);
process.exit(0);
