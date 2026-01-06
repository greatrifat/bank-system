import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
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

    if (!user || !user.isActive) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user._id,
      role: user.role,
    });

    return NextResponse.json({
      message: "Login successful",
      token,
      role: user.role,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
