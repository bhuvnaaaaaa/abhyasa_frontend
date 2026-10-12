import Chapter from "../models/chapterModel.js";
import Subject from "../models/subjectModel.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// @desc Get all chapters for a specific subject
// @route GET /api/subjects/:subjectId/chapters
export const getChaptersBySubject = async (req, res) => {
  try {
    const chapters = await Chapter.find({ subject: req.params.subjectId });
    res.status(200).json(chapters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get chapter by ID
// @route GET /api/chapters/:id
export const getChapterById = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    // Check optional Authorization header for access token. If valid, return full chapter.
    let authorized = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) authorized = true;
      } catch (err) {
        // token invalid or expired - treat as unauthenticated
      }
    }

    if (authorized) {
      return res.status(200).json(chapter);
    }

    // For unauthenticated users return limited chapter info (gate sensitive fields)
    // but include a small preview of the content so frontend can show a preview and
    // progressively lock after a few scrolls. The preview size can be adjusted via
    // the CHAPTER_PREVIEW_ITEMS env var (default 6).
    const previewLimit = Number(process.env.CHAPTER_PREVIEW_ITEMS) || 6;
    const limited = {
      _id: chapter._id,
      title: chapter.title || chapter.name,
      name: chapter.name || chapter.title,
      description: chapter.description,
      subject: chapter.subject,
      number: chapter.number,
      restricted: true,
      contentPreview: Array.isArray(chapter.content) ? chapter.content.slice(0, previewLimit) : [],
      previewLimit,
    };

    return res.status(200).json(limited);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Find a chapter by board, grade, subject name and chapter title
// @route GET /api/chapters/find?board=CBSE&grade=6&subject=Biology&chapter=Chapter%201
export const findChapter = async (req, res) => {
  try {
    const { board, grade, subject: subjectName, chapter: chapterTitle } = req.query;

    if (!board || !grade || !subjectName || !chapterTitle) {
      return res.status(400).json({ message: "Missing required query parameters" });
    }

    // Resolve board -> grade -> subject -> chapter
    const Board = (await import('../models/boardModel.js')).default;
    const Grade = (await import('../models/gradeModel.js')).default;
    const Subject = (await import('../models/subjectModel.js')).default;

    // case-insensitive match for board name
    const boardDoc = await Board.findOne({ name: new RegExp(`^${board}$`, 'i') });
    if (!boardDoc) return res.status(404).json({ message: 'Board not found' });

    // grade is expected as number or string
    const gradeNum = Number(grade);
    const gradeDoc = await Grade.findOne({ board: boardDoc._id, grade: gradeNum });
    if (!gradeDoc) return res.status(404).json({ message: 'Grade not found' });

    const subjectDoc = await Subject.findOne({
      board: boardDoc._id,
      grade: gradeDoc._id,
      name: new RegExp(`^${subjectName}$`, 'i'),
    });
    if (!subjectDoc) return res.status(404).json({ message: 'Subject not found' });

    // find chapter by exact or partial title (case-insensitive)
    const chapter = await Chapter.findOne({
      subject: subjectDoc._id,
      title: { $regex: chapterTitle, $options: 'i' },
    });

    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    res.status(200).json(chapter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Add a chapter under a subject
// @route POST /api/subjects/:subjectId/chapters
export const addChapter = async (req, res) => {
  try {
    const { title, description, marksType } = req.body;
    const subjectId = req.params.subjectId;

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const chapter = new Chapter({ title, description, marksType, subject: subjectId });
    await chapter.save();
    res.status(201).json(chapter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update a chapter
// @route PUT /api/chapters/:id
export const updateChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    res.status(200).json(chapter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete a chapter
// @route DELETE /api/chapters/:id
export const deleteChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findByIdAndDelete(req.params.id);
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    res.status(200).json({ message: "Chapter deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin endpoints to manage questions (MCQs) inside a chapter
export const addQuestion = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    const question = req.body;
    // add an _id to the question so it can be addressed individually
    const mongoose = (await import('mongoose')).default;
    question._id = new mongoose.Types.ObjectId();

    chapter.content = Array.isArray(chapter.content) ? chapter.content : [];
    chapter.content.push(question);
    await chapter.save();
    res.status(201).json({ question });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id, qId } = req.params;
    const chapter = await Chapter.findById(id);
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    const idx = (chapter.content || []).findIndex((q) => String(q._id) === String(qId));
    if (idx === -1) return res.status(404).json({ message: "Question not found" });

    chapter.content[idx] = { ...chapter.content[idx], ...req.body };
    await chapter.save();
    res.json({ question: chapter.content[idx] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id, qId } = req.params;
    const chapter = await Chapter.findById(id);
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    chapter.content = (chapter.content || []).filter((q) => String(q._id) !== String(qId));
    await chapter.save();
    res.json({ message: "Question deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
