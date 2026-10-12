import express from "express";
import {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} from "../controllers/subjectController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { cacheMiddleware, delCache } from "../config/redis.js";

const router = express.Router();

const invalidateSubjectsCache = (req, res, next) => {
  delCache("cache:/api/subjects*").catch(() => {});
  next();
};

// Public with Redis caching
router.get("/", cacheMiddleware(3600), getSubjects);
router.get("/:id", cacheMiddleware(3600), getSubjectById);

// Protected with cache invalidation
router.post("/", requireAuth, invalidateSubjectsCache, createSubject);
router.put("/:id", requireAuth, invalidateSubjectsCache, updateSubject);
router.delete("/:id", requireAuth, invalidateSubjectsCache, deleteSubject);

export default router;
