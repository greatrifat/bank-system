"use client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

  const [name, setName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🔹 Read token and userId from localStorage in browser only
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUserId = localStorage.getItem("userId");
    const storedName = localStorage.getItem("name");

    if (!storedToken || !storedUserId) {
      router.replace("/login");
      return;
    }

    setToken(storedToken);
    setUserId(storedUserId);
    setName(storedName);
    setProjectId(localStorage.getItem("selectedProjectId") || "");
  }, [router]);

  // 🔹 Fetch balance & transactions after token and userId are loaded
  useEffect(() => {
    if (!token || !userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // 0️⃣ Notice
        const noticeRes = await fetch(`/api/admin/notice?projectId=${projectId}`);
        if (noticeRes.ok) {
          const noticeData = await noticeRes.json();
          setNotice(noticeData.message || "");
        }

        // 1️⃣ Fetch balance
        const balanceRes = await fetch(
          `/api/admin/users/${userId}/balance?projectId=${projectId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!balanceRes.ok) throw new Error("Failed to fetch balance");
        const balanceData = await balanceRes.json();
        setBalance(balanceData);

        // 2️⃣ Fetch transactions
        const txRes = await fetch(
          `/api/admin/users/${userId}/transactions?projectId=${projectId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!txRes.ok) throw new Error("Failed to fetch transactions");
        const txData = await txRes.json();
        setTransactions(txData);

        let credit = 0;
        let debit = 0;

        txData.forEach((tx: Transaction) => {
          if (tx.type === "CREDIT") {
            credit += tx.amount;
          } else {
            debit += tx.amount;
          }
        });

        setTotalCredit(credit);
        setTotalDebit(debit);

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
    localStorage.clear();
    router.replace("/login");
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const downloadTime = new Date().toLocaleString();

    // Title
    doc.setFontSize(16);
    doc.text("Account Report", 14, 15);

    // User Info
    doc.setFontSize(12);
    doc.text(`Name: ${name}`, 14, 25);
    doc.text(`Balance: ${balance?.balance} ${balance?.currency}`, 14, 32);

    // Summary
    doc.text(`Total Credit: ${totalCredit}`, 14, 40);
    doc.text(`Total Debit: ${totalDebit}`, 14, 47);

    // Transactions Table
    autoTable(doc, {
      startY: 55,
      head: [["Date", "Type", "Description", "Amount"]],
      body: transactions.map((tx) => [
        new Date(tx.createdAt).toLocaleString(),
        tx.type,
        tx.description,
        `${tx.type === "CREDIT" ? "+" : "-"}${tx.amount}`,
      ]),
    });

    // 👇 Get last Y position after table
    const finalY = (doc as any).lastAutoTable.finalY || 60;

    // Footer - Download time
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Downloaded at: ${downloadTime}`, 14, finalY + 10);

    // Developer credit
    doc.text(`Developed by Robayet`, 14, finalY + 17);

    const fileName = `${name || "user"}.pdf`;

    doc.save(fileName);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <p className="text-red-600 font-medium text-center">{error}</p>
        <button
          onClick={handleLogout}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-medium"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center gap-3">
        <div className="flex flex-col min-w-0">
          <button
            onClick={() => router.push("/projects")}
            className="text-xs text-blue-500 hover:text-blue-700 text-left mb-0.5 w-fit"
          >
            ← Back to Projects
          </button>
          <h1 className="text-base font-bold text-gray-700 leading-tight">Dashboard</h1>
          <p className="text-sm text-blue-700 font-medium truncate">Hi, {name ?? "User"}</p>
        </div>
        <button
          onClick={handleLogout}
          className="shrink-0 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium px-4 py-2 rounded-xl transition text-sm"
        >
          Logout
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4 flex-1">
        {/* Notice */}
        {notice && (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-xl text-sm">
            ⚠️ {notice}
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
            <div className="pr-2">
              <p className="text-gray-500 text-xs mb-1">Total Credit</p>
              <p className="text-base font-bold text-green-600 tabular-nums">
                {totalCredit?.toLocaleString()}
              </p>
            </div>
            <div className="px-2">
              <p className="text-gray-500 text-xs mb-1">Total Debit</p>
              <p className="text-base font-bold text-red-600 tabular-nums">
                {totalDebit?.toLocaleString()}
              </p>
            </div>
            <div className="pl-2">
              <p className="text-gray-500 text-xs mb-1">Balance</p>
              <p className="text-base font-bold text-blue-600 tabular-nums">
                {balance?.balance?.toLocaleString()}
                <span className="text-xs font-normal ml-0.5">{balance?.currency}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col flex-1">
          <div className="flex justify-between items-center mb-4 gap-2">
            <h3 className="text-base font-semibold text-gray-700">Recent Transactions</h3>
            <button
              onClick={handleDownloadPDF}
              className="shrink-0 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm px-3 py-2 rounded-xl transition"
            >
              PDF
            </button>
          </div>

          <div className="overflow-y-auto max-h-[55vh] -mr-1 pr-1">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">No transactions yet</p>
            ) : (
              <ul className="space-y-2">
                {transactions.map((tx) => (
                  <li
                    key={tx._id}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0 mr-2">
                      <p className="font-medium text-gray-800 text-sm truncate">{tx.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                        {" · "}
                        {new Date(tx.createdAt).toLocaleTimeString(undefined, {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div
                      className={`shrink-0 font-semibold text-sm tabular-nums ${
                        tx.type === "CREDIT" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.type === "CREDIT" ? "+" : "−"}
                      {tx.amount.toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
