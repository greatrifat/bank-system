import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import LoginActivity from "@/models/LoginActivity";

export async function GET() {
  try {
    await connectDB();

    const logs = await LoginActivity.find()
      .populate("userId", "name email")
      .sort({ loginTime: -1 });

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch login activity" },
      { status: 500 }
    );
  }
}
