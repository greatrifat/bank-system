import { connectDB } from "@/lib/mongodb";
import { adminOnly } from "@/lib/adminAuth";
import User from "@/models/User";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

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
    
        // 🛑 USER can only see own transaction
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

    const transactions = await Transaction.find({
  accountId: account._id,
})
  .populate({
    path: "createdBy",
    select: "name email", // choose fields you want
  })
  .sort({ createdAt: -1 });

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Unauthorized" },
      { status: 403 }
    );
  }
}

