import { sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

healthRouter.get("/db-check", async (_req, res) => {
  await db.execute(sql`select 1`);
  res.json({ db: "ok" });
});
