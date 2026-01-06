import mongoose, { Schema, models } from "mongoose";

const AccountSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export default models.Account || mongoose.model("Account", AccountSchema);
