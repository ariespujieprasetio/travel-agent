// src/routes/ipWhitelistRoutes.ts

import express from "express";
import multer from "multer";
import * as ipWhitelistController from "../controllers/ipWhitelistController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// All whitelist management routes require authentication
router.use(authenticate);

// Get all whitelisted IPs
router.get("/", ipWhitelistController.getWhitelistedIps);

// Add an IP to the whitelist
router.post("/", ipWhitelistController.addIpToWhitelist);

// Remove an IP from the whitelist
router.delete("/:id", ipWhitelistController.removeIpFromWhitelist);

// Update an IP whitelist entry
router.patch("/:id", ipWhitelistController.updateIpWhitelistStatus);

// Get whitelist status (enabled/disabled)
router.get("/status", ipWhitelistController.getWhitelistStatus);

// Bulk operations
router.post("/bulk-add", ipWhitelistController.bulkAddIpsToWhitelist);
router.post("/bulk-remove", ipWhitelistController.bulkRemoveIpsFromWhitelist);
router.post("/bulk-update", ipWhitelistController.bulkUpdateIpWhitelistStatus);

// File operations
router.post("/import", upload.single("file"), ipWhitelistController.importIpsFromFile);
router.get("/export", ipWhitelistController.exportIpsToFile);

export default router;