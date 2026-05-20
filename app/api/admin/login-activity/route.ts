import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { adminOnly } from "@/lib/adminAuth";
import LoginActivity from "@/models/LoginActivity";
import User from "@/models/User";

export async function GET() {
  try {
    await adminOnly(req); // ✅ admin check
    await connectDB();

    const logs = await LoginActivity.find()
      .populate("userId", "name email")
      .sort({ loginTime: -1 });

    return NextResponse.json(logs);
  } catch (error) {
  console.error("LOGIN ACTIVITY ERROR:", error);

  return NextResponse.json(
    {
      message: "Failed to fetch login activity",
      error: String(error),
    },
    { status: 500 }
  );
}
}
