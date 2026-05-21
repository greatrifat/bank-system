import mongoose, { Schema, models } from "mongoose";

const NoticeSchema = new Schema(
  {
    message: {
      type: String,
      required: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Always use a single document
export default models.Notice || mongoose.model("Notice", NoticeSchema);
