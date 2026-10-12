import express from "express";
import {
  createGrade,
  getGrades,
  getGradeById,
  updateGrade,
  deleteGrade,
} from "../controllers/gradeController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { cacheMiddleware, delCache } from "../config/redis.js";

const router = express.Router();

const invalidateGradesCache = (req, res, next) => {
  delCache("cache:/api/grades*").catch(() => {});
  next();
};

// Public with Redis caching
router.get("/", cacheMiddleware(3600), getGrades); 
router.get("/:id", cacheMiddleware(3600), getGradeById);

// Protected with cache invalidation
router.post("/", requireAuth, invalidateGradesCache, createGrade);
router.put("/:id", requireAuth, invalidateGradesCache, updateGrade);
router.delete("/:id", requireAuth, invalidateGradesCache, deleteGrade);

export default router;
