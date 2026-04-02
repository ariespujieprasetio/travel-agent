import { Request, Response } from "express";
import { generateItineraryPDF } from "../services/pdfService";

export async function exportItineraryPDF(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;

    const pdfBuffer = await generateItineraryPDF(sessionId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=itinerary-${sessionId}.pdf`
    );

    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation failed:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
}
