import Grade from "../models/gradeModel.js";

// ✅ Create new grade
export const createGrade = async (req, res) => {
  try {
    const { name, board } = req.body;
    const grade = new Grade({ name, board });
    await grade.save();
    res.status(201).json(grade);
  } catch (error) {
    res.status(500).json({ message: "Error creating grade", error });
  }
};

// ✅ Get all grades or filter by board
export const getGrades = async (req, res) => {
  try {
    const { board } = req.query;
    const filter = board ? { board } : {};
    const grades = await Grade.find(filter).populate("board");
    res.status(200).json(grades);
  } catch (error) {
    res.status(500).json({ message: "Error fetching grades", error });
  }
};

// ✅ Get grade by ID
export const getGradeById = async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id).populate("board");
    if (!grade) return res.status(404).json({ message: "Grade not found" });
    res.status(200).json(grade);
  } catch (error) {
    res.status(500).json({ message: "Error fetching grade", error });
  }
};

// ✅ Update grade
export const updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedGrade = await Grade.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedGrade)
      return res.status(404).json({ message: "Grade not found" });
    res.status(200).json(updatedGrade);
  } catch (error) {
    res.status(500).json({ message: "Error updating grade", error });
  }
};

// ✅ Delete grade
export const deleteGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedGrade = await Grade.findByIdAndDelete(id);
    if (!deletedGrade)
      return res.status(404).json({ message: "Grade not found" });
    res.status(200).json({ message: "Grade deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting grade", error });
  }
};
