import mongoose, { Schema, models } from "mongoose";

const UserProjectSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: "User",    required: true },
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  isActive:  { type: Boolean, default: true },
  joinedAt:  { type: Date,    default: Date.now },
});

UserProjectSchema.index({ userId: 1, projectId: 1 }, { unique: true });

export default models.UserProject || mongoose.model("UserProject", UserProjectSchema);
