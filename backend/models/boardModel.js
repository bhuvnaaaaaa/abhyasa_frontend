import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // e.g., "CBSE", "ICSE", "STATE"
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

const Board = mongoose.model("Board", boardSchema);

export default Board;
