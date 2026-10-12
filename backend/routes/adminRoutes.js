import express from "express";
import { adminLogin } from "../controllers/adminController.js";

const router = express.Router();

// Admin login only
router.post("/login", adminLogin);

export default router;