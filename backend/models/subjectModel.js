import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    grade: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

subjectSchema.index({ name: 1 }, { unique: false });

// ✔ Instead, make subjects unique per board+grade+name
subjectSchema.index(
  { board: 1, grade: 1, name: 1 },
  { unique: true }
);

export default mongoose.model("Subject", subjectSchema);
