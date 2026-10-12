import Board from "../models/boardModel.js";

// @desc Get all boards
// @route GET /api/boards
export const getBoards = async (req, res) => {
  try {
    const boards = await Board.find();
    res.status(200).json(boards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create a new board
// @route POST /api/boards
export const createBoard = async (req, res) => {
  const { name, description } = req.body;

  try {
    const existingBoard = await Board.findOne({ name });
    if (existingBoard)
      return res.status(400).json({ message: "Board already exists" });

    const board = new Board({ name, description });
    const savedBoard = await board.save();
    res.status(201).json(savedBoard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update a board
// @route PUT /api/boards/:id
export const updateBoard = async (req, res) => {
  try {
    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedBoard) return res.status(404).json({ message: "Board not found" });
    res.status(200).json(updatedBoard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete a board
// @route DELETE /api/boards/:id
export const deleteBoard = async (req, res) => {
  try {
    const deletedBoard = await Board.findByIdAndDelete(req.params.id);
    if (!deletedBoard) return res.status(404).json({ message: "Board not found" });
    res.status(200).json({ message: "Board deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
