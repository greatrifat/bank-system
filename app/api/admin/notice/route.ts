import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Notice from "@/models/Notice";

// GET: fetch latest notice
export async function GET() {
  try {
    await connectDB();

    let notice = await Notice.findOne();

    // if not exists, create empty notice
    if (!notice) {
      notice = await Notice.create({ message: "" });
    }

    return NextResponse.json(notice);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch notice" },
      { status: 500 }
    );
  }
}

// POST: update notice
export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const updated = await Notice.findOneAndUpdate(
      {},
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