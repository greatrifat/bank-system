import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Account from "@/models/Account";
import { hashPassword } from "@/lib/password";
import { adminOnly } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    adminOnly(req);

    const { name, email, password, initialBalance = 0 } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 409 }
      );
    }

    const user = await User.create({
      name,
      email,
      password: await hashPassword(password),
      role: "USER",
    });

    await Account.create({
      userId: user._id,
      balance: initialBalance,
    });

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

export async function GET(req: Request) {
  try {
    adminOnly(req);
    await connectDB();

    const users = await User.find({ role: "USER" }).select("-password");

    return NextResponse.json(users);
  } catch {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 403 }
    );
  }
}

