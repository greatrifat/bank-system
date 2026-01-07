import { connectDB } from "@/lib/mongodb";
import { adminOnly } from "@/lib/adminAuth";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin: any = adminOnly(req);
    const { id } = await context.params;

    const { amount, type, description } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount" },
        { status: 400 }
      );
    }

    await connectDB();

    const account = await Account.findOne({ userId: id });

    if (!account) {
      return NextResponse.json(
        { message: "Account not found" },
        { status: 404 }
      );
    }

    if (type === "DEBIT" && account.balance < amount) {
      return NextResponse.json(
        { message: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Update balance
    account.balance =
      type === "CREDIT"
        ? account.balance + amount
        : account.balance - amount;

    await account.save();

    // Create transaction
    await Transaction.create({
      accountId: account._id,
      type,
      amount,
      description,
      createdBy: admin.userId,
    });

    return NextResponse.json({
      message: "Balance updated successfully",
      balance: account.balance,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Unauthorized" },
      { status: 403 }
    );
  }
}



export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 🔐 Extract user from token
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // 🛑 USER can only see own balance
    if (decoded.role !== "ADMIN" && decoded.userId !== id) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    await connectDB();

    const account = await Account.findOne({ userId: id });

    if (!account) {
      return NextResponse.json(
        { message: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: id,
      balance: account.balance,
      currency: "BDT",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Unauthorized" },
      { status: 401 }
    );
  }
}