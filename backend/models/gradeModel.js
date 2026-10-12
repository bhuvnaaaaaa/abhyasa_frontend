import mongoose from "mongoose";

const gradeSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    grade: {
      type: Number,
      required: true, // e.g., 6, 7, 8, 9, 10
    },
  },
  { timestamps: true }
);

const Grade = mongoose.model("Grade", gradeSchema);

export default Grade;
