import { connectDB } from "@/lib/mongodb";
import UserProject from "@/models/UserProject";
import { adminOnly } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await adminOnly(req);

    const { id } = await context.params;
    const { isActive, projectId } = await req.json();

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { message: "isActive must be boolean" },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { message: "projectId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const membership = await UserProject.findOneAndUpdate(
      { userId: id, projectId },
      { isActive },
      { new: true }
    );

    if (!membership) {
      return NextResponse.json(
        { message: "User is not a member of this project" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `User ${isActive ? "activated" : "deactivated"} in this project`,
      isActive: membership.isActive,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Unauthorized or server error" },
      { status: 403 }
    );
  }
}
