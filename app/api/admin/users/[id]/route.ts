import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { adminOnly } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    adminOnly(req);

    const { id } = await context.params; // ✅ FIX

    await connectDB();

    const { name, email } = await req.json();

    const user = await User.findByIdAndUpdate(
      id,
      { name, email },
      { new: true }
    ).select("-password");

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "User updated", user });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Unauthorized" },
      { status: 403 }
    );
  }
}
