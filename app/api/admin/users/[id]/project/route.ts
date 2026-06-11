import { connectDB } from "@/lib/mongodb";
import UserProject from "@/models/UserProject";
import Account from "@/models/Account";
import { adminOnly } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

// PATCH: add user to a project (creates UserProject + Account)
//        or remove user from a project (deletes UserProject)
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    adminOnly(req);
    await connectDB();

    const { id } = await context.params;
    const { projectId, action } = await req.json();

    if (!projectId || !["add", "remove"].includes(action)) {
      return NextResponse.json(
        { message: "projectId and action (add|remove) are required" },
        { status: 400 }
      );
    }

    if (action === "add") {
      const existing = await UserProject.findOne({ userId: id, projectId });
      if (existing) {
        return NextResponse.json(
          { message: "User is already a member of this project" },
          { status: 409 }
        );
      }

      await UserProject.create({ userId: id, projectId });

      // Create a project-scoped account if one doesn't exist yet
      await Account.findOneAndUpdate(
        { userId: id, projectId },
        { $setOnInsert: { balance: 0 } },
        { upsert: true, new: true }
      );

      return NextResponse.json({ message: "User added to project" });
    }

    // action === "remove"
    const deleted = await UserProject.findOneAndDelete({ userId: id, projectId });
    if (!deleted) {
      return NextResponse.json(
        { message: "User is not a member of this project" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "User removed from project" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Unauthorized" },
      { status: 403 }
    );
  }
}
