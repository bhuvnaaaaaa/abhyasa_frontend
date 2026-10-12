import express from "express";
import {
  createBoard,
  getBoards,
  updateBoard,
  deleteBoard,
} from "../controllers/boardController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { cacheMiddleware, delCache } from "../config/redis.js";

const router = express.Router();

const invalidateBoardsCache = (req, res, next) => {
  delCache("cache:/api/boards*").catch(() => {});
  next();
};

// Public with Redis caching
router.get("/", cacheMiddleware(3600), getBoards);

// Protected with cache invalidation
router.post("/", requireAuth, invalidateBoardsCache, createBoard);
router.put("/:id", requireAuth, invalidateBoardsCache, updateBoard);
router.delete("/:id", requireAuth, invalidateBoardsCache, deleteBoard);

export default router;
