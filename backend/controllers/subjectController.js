import Subject from "../models/subjectModel.js";

// @desc   Get all subjects
// @route  GET /api/subjects
export const getSubjects = async (req, res) => {
  try {
    const { board, grade } = req.query;
    let filter = {};

    if (board) filter.board = board;
    if (grade) filter.grade = grade;

    const subjects = await Subject.find(filter);
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get a single subject by ID
// @route  GET /api/subjects/:id
export const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.status(200).json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Create new subject
// @route  POST /api/subjects
export const createSubject = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const subject = new Subject({ name, description });
    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Update a subject
// @route  PUT /api/subjects/:id
export const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.status(200).json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Delete a subject
// @route  DELETE /api/subjects/:id
export const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.status(200).json({ message: "Subject deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
