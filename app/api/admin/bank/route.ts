import { connectDB } from "@/lib/mongodb";
import { adminOnly } from "@/lib/adminAuth";
import Account from "@/models/Account";
import UserProject from "@/models/UserProject";
import Transaction from "@/models/Transaction";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

// GET: total balance across all accounts in a project
export async function GET(req: Request) {
  try {
    await adminOnly(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const matchStage = projectId
      ? { projectId: new mongoose.Types.ObjectId(projectId) }
      : {};

    const result = await Account.aggregate([
      { $match: matchStage },
      { $group: { _id: null, totalBalance: { $sum: "$balance" } } },
    ]);

    return NextResponse.json({ totalBalance: result[0]?.totalBalance || 0 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Unauthorized" },
      { status: 403 }
    );
  }
}

// POST: distribute amount equally among all active members of a project
export async function POST(req: Request) {
  try {
    const admin: any = adminOnly(req);
    await connectDB();

    const { amount, type, description, projectId } = await req.json();
    const roundTo2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }

    if (!["CREDIT", "DEBIT"].includes(type)) {
      return NextResponse.json(
        { message: "Invalid transaction type." },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json({ message: "projectId is required" }, { status: 400 });
    }

    // Active members of this project
    const activeMemberships = await UserProject.find({ projectId, isActive: true });

    if (activeMemberships.length === 0) {
      return NextResponse.json(
        { message: "No active users in this project." },
        { status: 400 }
      );
    }

    const userIds = activeMemberships.map((m: any) => m.userId);
    const amountPerUser = roundTo2(amount / activeMemberships.length);

    const accounts = await Account.find({ projectId, userId: { $in: userIds } });

    const bulkAccountOps: any[] = [];
    const bulkTransactionOps: any[] = [];

    for (const account of accounts) {
      const newBalance =
        type === "CREDIT"
          ? account.balance + amountPerUser
          : account.balance - amountPerUser;

      bulkAccountOps.push({
        updateOne: {
          filter: { _id: account._id },
          update: { balance: newBalance },
        },
      });

      bulkTransactionOps.push({
        insertOne: {
          document: {
            accountId:   account._id,
            userId:      account.userId,
            projectId,
            type,
            amount:      amountPerUser,
            description,
            createdBy:   admin.userId,
          },
        },
      });
    }

    await Account.bulkWrite(bulkAccountOps);
    await Transaction.bulkWrite(bulkTransactionOps);

    return NextResponse.json({
      message:         "Bulk balance update successful",
      type,
      totalUsers:      activeMemberships.length,
      amountPerUser,
      accountsUpdated: bulkAccountOps.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
