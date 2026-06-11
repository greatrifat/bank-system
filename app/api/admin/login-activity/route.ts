import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import LoginActivity from "@/models/LoginActivity";
import UserProject from "@/models/UserProject";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const page      = Number(searchParams.get("page"))  || 1;
    const limit     = Number(searchParams.get("limit")) || 10;
    const status    = searchParams.get("status");
    const search    = searchParams.get("search");
    const from      = searchParams.get("from");
    const to        = searchParams.get("to");
    const projectId = searchParams.get("projectId");

    const skip = (page - 1) * limit;
    const query: any = {};

    if (status && status !== "all") query.status = status;

    if (from || to) {
      query.loginTime = {};
      if (from) query.loginTime.$gte = new Date(from);
      if (to)   query.loginTime.$lte = new Date(to);
    }

    if (projectId) {
      const memberships = await UserProject.find({ projectId }, "userId");
      query.userId = { $in: memberships.map((m: any) => m.userId) };
    }

    const populateMatch: Record<string, any> = search
      ? { $or: [
          { name:  { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ]}
      : {};

    let logs = await LoginActivity.find(query)
      .populate({ path: "userId", select: "name email", match: populateMatch })
      .sort({ loginTime: -1 })
      .skip(skip)
      .limit(limit);

    if (search) logs = logs.filter((log) => log.userId);

    const total = await LoginActivity.countDocuments(query);

    return NextResponse.json({
      logs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("LOGIN ACTIVITY ERROR:", error);
    return NextResponse.json(
      { message: "Failed to fetch login activity" },
      { status: 500 }
    );
  }
}
