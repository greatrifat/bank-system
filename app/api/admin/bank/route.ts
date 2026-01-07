import { connectDB } from "@/lib/mongodb";
import { adminOnly } from "@/lib/adminAuth";
import Account from "@/models/Account";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await adminOnly(req); // ✅ admin check

    await connectDB();

    const result = await Account.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balance" },
        },
      },
    ]);

    const totalBalance = result[0]?.totalBalance || 0;

    return NextResponse.json({
      totalBalance,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Unauthorized" },
      { status: 403 }
    );
  }
}
