import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import UserProject from "@/models/UserProject";
import Account from "@/models/Account";
import { hashPassword } from "@/lib/password";
import { adminOnly } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

// GET: list users for a project (with project-specific isActive)
// or all users with their project memberships (no projectId filter)
export async function GET(req: Request) {
  // Auth check isolated so its error doesn't get swallowed by DB errors
  try {
    adminOnly(req);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (projectId) {
      const memberships = await UserProject.find({ projectId })
        .populate("userId", "-password");

      const users = memberships
        .filter((m: any) => m.userId)
        .map((m: any) => ({
          ...m.userId.toObject(),
          isActive: m.isActive,
        }));

      return NextResponse.json(users);
    }

    // No projectId — return all users with their project memberships (for Assign panel)
    const users = await User.find({ role: "USER" }).select("-password");

    const memberships = await UserProject.find({
      userId: { $in: users.map((u) => u._id) },
    }).populate("projectId", "name code");

    const usersWithProjects = users.map((u) => {
      const userMemberships = memberships.filter(
        (m: any) => m.userId.toString() === u._id.toString()
      );
      return {
        ...u.toObject(),
        memberProjects: userMemberships
          .map((m: any) => m.projectId)
          .filter(Boolean), // drop any refs whose Project was deleted
      };
    });

    return NextResponse.json(usersWithProjects);
  } catch (error: any) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json({ message: error.message || "Server error" }, { status: 500 });
  }
}

// POST: create new user, add to project, create project-scoped account
export async function POST(req: Request) {
  try {
    adminOnly(req);

    const { name, email, password, initialBalance = 0, projectId } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    const user = await User.create({
      name,
      email,
      password: await hashPassword(password),
      role: "USER",
    });

    if (projectId) {
      await UserProject.create({ userId: user._id, projectId });
      await Account.create({ userId: user._id, projectId, balance: initialBalance });
    }

    return NextResponse.json(
      { message: "User created successfully", userId: user._id },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Unauthorized or server error" },
      { status: 403 }
    );
  }
}
