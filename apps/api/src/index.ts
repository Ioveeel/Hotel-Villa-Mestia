import { sql } from "drizzle-orm";
import express from "express";
import { db } from "./db/index.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/db-check", async (_req, res) => {
  await db.execute(sql`select 1`);
  res.json({ db: "ok" });
});

app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`API listening on http://localhost:${PORT}`);
});
