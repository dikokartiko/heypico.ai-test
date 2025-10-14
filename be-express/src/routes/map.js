import express from "express";
import { z } from "zod";
import { searchPlace } from "../services/google-map.js";

const router = express.Router();

const querySchema = z.object({
  q: z.string().min(2, "query required"),
});

router.get("/search", async (req, res) => {
  try {
    const { q } = querySchema.parse(req.query);
    const result = await searchPlace(q);
    res.json(result);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;
