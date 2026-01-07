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

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ❌ Block login if user is not active
    if (!user.isActive) {
      return NextResponse.json(
        { message: "Your account is not active yet" },
        { status: 403 } // 403 Forbidden is suitable
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
      name: user.name,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
