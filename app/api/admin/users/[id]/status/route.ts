import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { adminOnly } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await adminOnly(req);

    const { id } = await context.params; // ✅ FIX HERE

    const { isActive } = await req.json();

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { message: "isActive must be boolean" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select("-password");

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `User ${isActive ? "activated" : "deactivated"}`,
      user,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Unauthorized or server error" },
      { status: 403 }
    );
  }
}
