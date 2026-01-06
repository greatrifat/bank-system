import mongoose, { Schema, models } from "mongoose";

const TransactionSchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // Admin ID
    },
  },
  { timestamps: true }
);

export default models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
