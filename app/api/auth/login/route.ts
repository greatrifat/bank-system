import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import UserProject from "@/models/UserProject";
import LoginActivity from "@/models/LoginActivity";
import "@/models/Project";
import { comparePassword } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email });

    if (!user) {
      await LoginActivity.create({ status: "failed" });
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      await LoginActivity.create({ userId: user._id, status: "wrong_password" });
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({ userId: user._id, role: user.role });

    await LoginActivity.create({ userId: user._id, status: "success" });

    // Fetch all project memberships for this user
    const memberships = await UserProject.find({ userId: user._id })
      .populate("projectId", "name code");

    const projects = memberships.map((m: any) => ({
      _id:      m.projectId._id.toString(),
      name:     m.projectId.name,
      code:     m.projectId.code,
      isActive: m.isActive,
    }));

    return NextResponse.json({
      message: "Login successful",
      token,
      role:     user.role,
      name:     user.name,
      projects,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
