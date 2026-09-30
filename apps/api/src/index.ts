import express from "express";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`API listening on http://localhost:${PORT}`);
});
