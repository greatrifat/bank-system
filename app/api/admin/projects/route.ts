import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import { adminOnly } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    adminOnly(req);
    await connectDB();
    const projects = await Project.find().sort({ createdAt: -1 });
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    adminOnly(req);
    await connectDB();

    const { name, code } = await req.json();

    if (!name || !code) {
      return NextResponse.json(
        { message: "Name and code are required" },
        { status: 400 }
      );
    }

    const existing = await Project.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return NextResponse.json(
        { message: "Project code already exists" },
        { status: 409 }
      );
    }

    const project = await Project.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
