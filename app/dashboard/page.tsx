"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Transaction {
  _id: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  description: string;
  createdAt: string;
}

interface BalanceResponse {
  userId: string;
  balance: number;
  currency: string;
}

export default function DashboardPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🔹 Read token and userId from localStorage in browser only
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUserId = localStorage.getItem("userId");

    if (!storedToken || !storedUserId) {
      router.replace("/login");
      return;
    }

    setToken(storedToken);
    setUserId(storedUserId);
  }, [router]);

  // 🔹 Fetch balance & transactions after token and userId are loaded
  useEffect(() => {
    if (!token || !userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // 1️⃣ Fetch balance
        const balanceRes = await fetch(`/api/admin/users/${userId}/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!balanceRes.ok) throw new Error("Failed to fetch balance");
        const balanceData = await balanceRes.json();
        setBalance(balanceData);

        // 2️⃣ Fetch transactions
        const txRes = await fetch(
          `/api/admin/users/${userId}/transactions`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!txRes.ok) throw new Error("Failed to fetch transactions");
        const txData = await txRes.json();
        setTransactions(txData);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, userId]);

  // 🔹 Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-blue-600 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button
          onClick={handleLogout}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      {/* Top Bar with Logout */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-700">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-xl transition"
        >
          Logout
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 text-center">
        <h2 className="text-gray-500 text-sm">Current Balance</h2>
        <p className="text-2xl font-bold text-blue-600 mt-2">
          {balance?.balance.toLocaleString()} {balance?.currency}
        </p>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Recent Transactions
        </h3>

        {transactions.length === 0 ? (
          <p className="text-gray-800 text-center">No transactions yet</p>
        ) : (
          <ul className="space-y-3">
            {transactions.map((tx) => (
              <li
                key={tx._id}
                className="flex justify-between items-center p-3 rounded-xl bg-slate-200"
              >
                <div>
                  <p className="font-medium text-gray-800">{tx.description}</p>
                  <p className="text-xs text-gray-800">
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
                <div
                  className={`font-semibold ${
                    tx.type === "CREDIT" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {tx.type === "CREDIT" ? "+" : "-"}
                  {tx.amount.toLocaleString()} {balance?.currency}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
