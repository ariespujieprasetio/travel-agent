import express from "express";
import * as userController from "../controllers/userController";
import { authenticate } from "../middleware/auth";
import { adminAuth } from "../middleware/adminAuth";

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticate);
router.use(adminAuth);

// User management routes
router.get("/users", userController.getAllUsers);
router.get("/users/:id", userController.getUserById);
router.put("/users/:id", userController.updateUser);
router.delete("/users/:id", userController.deleteUser);
router.post("/users/:id/change-password", userController.changePassword);

export default router;