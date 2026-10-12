import mongoose from "mongoose";

const chapterSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    videoUrl: {
      type: String, // YouTube iframe link
    },
      notes: {
        type: String, // can store HTML or markdown text
      },
      number: {
        type: Number,
      },
      content: {
        type: Array,
        default: [],
      },
  },
  { timestamps: true }
);

const Chapter = mongoose.model("Chapter", chapterSchema);

export default Chapter;
