import { connectDB } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.role !== "ADMIN" && decoded.userId !== id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ message: "projectId is required" }, { status: 400 });
    }

    await connectDB();

    const isAdmin = decoded.role === "ADMIN";

    // Select only the fields each role actually needs
    const query = Transaction.find({ userId: id, projectId })
      .select("type amount description createdAt" + (isAdmin ? " createdBy" : ""))
      .sort({ createdAt: -1 });

    if (isAdmin) {
      query.populate("createdBy", "name -_id");
    }

    const transactions = await query;

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Unauthorized" },
      { status: 403 }
    );
  }
}
