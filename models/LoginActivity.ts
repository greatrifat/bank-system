// models/LoginActivity.js

import mongoose, { Schema, models } from "mongoose";

const LoginActivitySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    status: {
      type: String,
      enum: ["success", "failed", "wrong_password"],
      required: true,
    },

    loginTime: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default models.LoginActivity ||
  mongoose.model("LoginActivity", LoginActivitySchema);