import { connectDB } from "@/lib/mongodb";
import { adminOnly } from "@/lib/adminAuth";
import Account from "@/models/Account";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
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



export async function POST(req: Request) {
  try {
    const admin: any = adminOnly(req); // ✅ admin check
    await connectDB();

    const { amount, type, description } = await req.json();
    const roundTo2 = (num: number) =>
      Math.round((num + Number.EPSILON) * 100) / 100;

    // ✅ Validation
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }

    if (!["CREDIT", "DEBIT"].includes(type)) {
      return NextResponse.json(
        { message: "Invalid transaction type. Must be CREDIT or DEBIT." },
        { status: 400 }
      );
    }

    // ✅ Get active users
    const activeUsers = await User.find({ isActive: true, role: "USER" });

    if (activeUsers.length === 0) {
      return NextResponse.json(
        { message: "No active users found." },
        { status: 400 }
      );
    }

    const totalUsers = activeUsers.length;
    // raw value
    const rawAmountPerUser = amount / totalUsers;
    // ✅ rounded value (2 decimal)
    const amountPerUser = roundTo2(rawAmountPerUser);


    // ✅ Get accounts
    const accounts = await Account.find({
      userId: { $in: activeUsers.map((u) => u._id) },
    });

    // 🔴 STRICT VALIDATION FOR DEBIT
    if (type === "DEBIT") {
      const insufficientAccounts = accounts.filter(
        acc => acc.balance < amountPerUser
      );

      if (insufficientAccounts.length > 0) {
        return NextResponse.json(
          {
            message: "Bulk debit failed. One or more users have insufficient balance.",
            requiredPerUser: amountPerUser,
            failedUsers: insufficientAccounts.length,
          },
          { status: 400 }
        );
      }
    }


    const bulkAccountOps = [];
    const bulkTransactionOps = [];

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

      // ✅ Transaction create
      bulkTransactionOps.push({
        insertOne: {
          document: {
            accountId: account._id,
            type,
            amount: amountPerUser,
            description,
            createdBy: admin.userId,
          },
        },
      });
    }

    // ✅ Execute bulk operations  
    await Account.bulkWrite(bulkAccountOps);
    await Transaction.bulkWrite(bulkTransactionOps);

    return NextResponse.json({
      message: "Bulk balance update successful",
      type,
      totalUsers,
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
