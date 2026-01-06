import { connectDB } from "@/lib/mongodb";
import { adminOnly } from "@/lib/adminAuth";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    adminOnly(req);
    const { id } = await context.params;

    await connectDB();

    const account = await Account.findOne({ userId: id });

    if (!account) {
      return NextResponse.json(
        { message: "Account not found" },
        { status: 404 }
      );
    }

    const transactions = await Transaction.find({
      accountId: account._id,
    }).sort({ createdAt: -1 });

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Unauthorized" },
      { status: 403 }
    );
  }
}

