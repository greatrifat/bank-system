// import { NextResponse } from "next/server";
// import { connectDB } from "@/lib/mongodb";

// import LoginActivity from "@/models/LoginActivity";
// import "@/models/User";

// export async function GET() {
//   try {
//     await connectDB();

//     const logs = await LoginActivity.find()
//       .populate("userId", "name email")
//       .sort({ loginTime: -1 });

//     return NextResponse.json(logs);
//   } catch (error) {
//   console.error("LOGIN ACTIVITY ERROR:", error);

//   return NextResponse.json(
//     {
//       message: "Failed to fetch login activity",
//       error: String(error),
//     },
//     { status: 500 }
//   );
// }
// }

// app/api/admin/login-activity/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import LoginActivity from "@/models/LoginActivity";
import "@/models/User";

export async function GET(req: NextRequest) {
  try {

    await connectDB();

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;

    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const skip = (page - 1) * limit;

    const query: any = {};

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    // Date range filter
    if (from || to) {
      query.loginTime = {};

      if (from) {
        query.loginTime.$gte = new Date(from);
      }

      if (to) {
        query.loginTime.$lte = new Date(to);
      }
    }

    let logsQuery = LoginActivity.find(query)
      .populate({
        path: "userId",
        select: "name email",
        match: search
          ? {
              $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
              ],
            }
          : {},
      })
      .sort({ loginTime: -1 })
      .skip(skip)
      .limit(limit);

    let logs = await logsQuery;

    // remove unmatched populate results
    if (search) {
      logs = logs.filter((log) => log.userId);
    }

    const total = await LoginActivity.countDocuments(query);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("LOGIN ACTIVITY ERROR:", error);

    return NextResponse.json(
      {
        message: "Failed to fetch login activity",
      },
      { status: 500 }
    );
  }
}
