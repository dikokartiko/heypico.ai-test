import express from "express";
import { z } from "zod";
import { searchPlace } from "../services/google-map.js";

const router = express.Router();

const querySchema = z.object({
  q: z.string().min(2, "query required"),
});

/**
 * @openapi
 * /api/maps/search:
 *   get:
 *     operationId: mapsSearch
 *     summary: Search for places using Google Maps
 *     description: Find nearby locations or places and return Google Maps data
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Place to search, e.g. 'coffee shop in Jakarta'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 address:
 *                   type: string
 *                 map_link:
 *                   type: string
 *                 embed_html:
 *                   type: string
 */
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
