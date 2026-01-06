import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { adminOnly } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    adminOnly(req);
    const { isActive } = await req.json();

    await connectDB();

    const user = await User.findByIdAndUpdate(
      params.id,
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
  } catch {
    return NextResponse.json(
      { message: "Unauthorized or error" },
      { status: 403 }
    );
  }
}
