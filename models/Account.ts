import mongoose, { Schema, models } from "mongoose";

const AccountSchema = new Schema(
  {
    userId:    { type: Schema.Types.ObjectId, ref: "User",    required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    balance:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

AccountSchema.index({ userId: 1, projectId: 1 }, { unique: true });

export default models.Account || mongoose.model("Account", AccountSchema);
