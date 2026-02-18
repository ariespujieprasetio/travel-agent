import express from "express";
import { downloadItineraryPDF } from "../controllers/itineraryController";

console.log("✅ Itinerary routes loaded"); // ⬅️ TARUH DI SINI

const router = express.Router();

router.get("/:sessionId/pdf", downloadItineraryPDF);

export default router;
