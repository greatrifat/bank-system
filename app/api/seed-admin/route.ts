import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/password";
import { NextResponse } from "next/server";

export async function POST() {
  await connectDB();

  const adminExists = await User.findOne({ role: "ADMIN" });
  if (adminExists) {
    return NextResponse.json({ message: "Admin already exists" });
  }

  const admin = await User.create({
    name: "Robayet Admin",
    email: "Robayet@gmail.com",
    password: await hashPassword("Robayet@1"),
    role: "ADMIN",
  });

  return NextResponse.json({
    message: "Admin created",
    admin,
  });
}
