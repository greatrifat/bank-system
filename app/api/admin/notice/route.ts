import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Notice from "@/models/Notice";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || null;

    let notice = await Notice.findOne({ projectId });

    if (!notice) {
      notice = await Notice.create({ message: "", projectId });
    }

    return NextResponse.json(notice);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch notice" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const projectId = body.projectId || null;

    const updated = await Notice.findOneAndUpdate(
      { projectId },
      { message: body.message },
      { new: true, upsert: true }
    );

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update notice" },
      { status: 500 }
    );
  }
}
