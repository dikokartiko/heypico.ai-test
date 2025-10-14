import express from "express";
import mapRoutes from "./map.js";

const router = express.Router();

router.use("/maps", mapRoutes);

export default router;
