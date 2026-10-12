import express from "express";
import {
  addChapter,
  getChaptersBySubject,
  updateChapter,
  deleteChapter,
  findChapter,
  getChapterById,
  addQuestion,
  updateQuestion,
  deleteQuestion,
} from "../controllers/chapterController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { adminProtect } from "../middleware/adminMiddleware.js";
import { cacheMiddleware, delCache } from "../config/redis.js";

const router = express.Router();

const invalidateChaptersCache = (req, res, next) => {
  delCache("cache:*chapter*").catch(() => {});
  delCache("cache:/api/subjects*").catch(() => {});
  next();
};

// Public with Redis caching
// find resolver: /api/chapters/find?board=...&grade=...&subject=...&chapter=...
router.get("/chapters/find", cacheMiddleware(1800), findChapter);

// get chapter by id
router.get("/chapters/:id", cacheMiddleware(1800), getChapterById);

// Get chapters for a subject (mounted as /api/subjects/:subjectId/chapters)
router.get("/subjects/:subjectId/chapters", cacheMiddleware(1800), getChaptersBySubject);

// Legacy root (keeps backward compatibility)
router.get("/", cacheMiddleware(1800), getChaptersBySubject);

// Protected with cache invalidation
// Create a chapter under a subject
router.post("/subjects/:subjectId/chapters", requireAuth, adminProtect, invalidateChaptersCache, addChapter);
router.put("/:id", requireAuth, adminProtect, invalidateChaptersCache, updateChapter);
router.delete("/:id", requireAuth, adminProtect, invalidateChaptersCache, deleteChapter);

// Admin: manage questions (MCQs)
router.post("/:id/questions", requireAuth, adminProtect, invalidateChaptersCache, addQuestion);
router.put("/:id/questions/:qId", requireAuth, adminProtect, invalidateChaptersCache, updateQuestion);
router.delete("/:id/questions/:qId", requireAuth, adminProtect, invalidateChaptersCache, deleteQuestion);

export default router;
