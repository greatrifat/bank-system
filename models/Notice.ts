import mongoose, { Schema, models } from "mongoose";

const NoticeSchema = new Schema(
  {
    message: {
      type: String,
      required: true,
      default: "",
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
  },
  { timestamps: true }
);

export default models.Notice || mongoose.model("Notice", NoticeSchema);
