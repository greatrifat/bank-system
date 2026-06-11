import mongoose, { Schema, models } from "mongoose";

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default models.Project || mongoose.model("Project", ProjectSchema);
