import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { env } from "../env.js";
import { GoogleMapsServiceError, searchPlace } from "../services/google-map.js";

const router = express.Router();

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(3),
  origin: z.string().trim().min(2).max(160).optional(),
  q: z.string().trim().min(2, "q must contain at least 2 characters").max(120),
  travel_mode: z.enum(["driving", "walking", "bicycling", "transit"]).default("driving"),
});

const mapsLimiter = rateLimit({
  windowMs: env.MAPS_RATE_LIMIT_WINDOW_MS,
  limit: env.MAPS_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json({
      error: "Maps search rate limit exceeded. Please try again later.",
    });
  },
});

router.use(mapsLimiter);

/**
 * @openapi
 * /api/maps/search:
 *   get:
 *     operationId: mapsSearch
 *     summary: Search for places using Google Maps
 *     description: Find places and return map, directions, and optional embed URLs.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Place to search, e.g. 'coffee shop in Jakarta'.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 3
 *         description: Maximum number of places to return.
 *       - in: query
 *         name: origin
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional origin for direct route generation.
 *       - in: query
 *         name: travel_mode
 *         required: false
 *         schema:
 *           type: string
 *           enum: [driving, walking, bicycling, transit]
 *           default: driving
 *         description: Preferred transportation mode for direction links.
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 total:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       address:
 *                         type: string
 *                       place_id:
 *                         type: string
 *                       location:
 *                         type: object
 *                         properties:
 *                           lat:
 *                             type: number
 *                           lng:
 *                             type: number
 *                       maps_url:
 *                         type: string
 *                       directions_url:
 *                         type: string
 *                         nullable: true
 *                       embed_url:
 *                         type: string
 *                         nullable: true
 *       400:
 *         description: Invalid query parameters
 *       429:
 *         description: Rate limit exceeded
 *       502:
 *         description: Google Maps upstream error
 */
router.get("/search", async (req, res) => {
  try {
    const {
      limit,
      origin,
      q,
      travel_mode: travelMode,
    } = querySchema.parse(req.query);

    const result = await searchPlace(q, {
      limit,
      origin,
      travelMode,
    });

    res.json(result);
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      const firstMessage = error.issues[0]?.message ?? "Invalid query parameters";
      res.status(400).json({ error: firstMessage });
      return;
    }

    if (
      error instanceof GoogleMapsServiceError
      || (typeof error === "object" && error != null && "statusCode" in error)
    ) {
      const statusCode = typeof error.statusCode === "number" ? error.statusCode : 502;
      const message = typeof error.message === "string"
        ? error.message
        : "Google Maps service error";
      res.status(statusCode).json({ error: message });
      return;
    }

    res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
