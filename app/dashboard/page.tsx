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
  const [projectName, setProjectName] = useState<string>("");
  const [projectCode, setProjectCode] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    setProjectName(localStorage.getItem("selectedProjectName") || "");
    setProjectCode(localStorage.getItem("selectedProjectCode") || "");
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
    const pageW = doc.internal.pageSize.getWidth();
    const generatedAt = new Date().toLocaleString();

    // ── Header band ──────────────────────────────────────────────
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 0, pageW, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Account Statement", 14, 12);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (projectName) doc.text(projectName, 14, 20);
    doc.text(`Generated: ${generatedAt}`, pageW - 14, 20, { align: "right" });

    // ── Info section ─────────────────────────────────────────────
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Account Holder", 14, 38);

    doc.setFont("helvetica", "normal");
    doc.text(name ?? "—", 14, 45);
    if (projectCode) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Project code: ${projectCode}`, 14, 51);
    }

    // ── Summary boxes ─────────────────────────────────────────────
    const currency = balance?.currency ?? "BDT";
    const summaryY = 60;
    const boxW = (pageW - 28) / 3;

    const summaryItems = [
      { label: "Total Credit", value: `+${totalCredit.toLocaleString()} ${currency}`, color: [22, 163, 74] as [number,number,number] },
      { label: "Total Debit",  value: `-${totalDebit.toLocaleString()} ${currency}`,  color: [220, 38, 38]  as [number,number,number] },
      { label: "Balance",      value: `${(balance?.balance ?? 0).toLocaleString()} ${currency}`, color: [37, 99, 235] as [number,number,number] },
    ];

    summaryItems.forEach((item, i) => {
      const x = 14 + i * (boxW + 2);
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, summaryY, boxW, 18, 2, 2, "FD");

      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, x + boxW / 2, summaryY + 6, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...item.color);
      doc.text(item.value, x + boxW / 2, summaryY + 13, { align: "center" });
    });

    // ── Transactions table ────────────────────────────────────────
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Transaction History", 14, summaryY + 28);

    autoTable(doc, {
      startY: summaryY + 32,
      head: [["Date", "Type", "Description", "Amount"]],
      body: transactions.map((tx) => [
        new Date(tx.createdAt).toLocaleDateString(undefined, {
          day: "2-digit", month: "short", year: "numeric",
        }),
        tx.type,
        tx.description ?? "—",
        `${tx.type === "CREDIT" ? "+" : "-"}${tx.amount.toLocaleString()} ${currency}`,
      ]),
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        3: { halign: "right", cellWidth: 38 },
      },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 1) {
          data.cell.styles.textColor =
            data.cell.raw === "CREDIT" ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.section === "body" && data.column.index === 3) {
          const raw = String(data.cell.raw ?? "");
          data.cell.styles.textColor = raw.startsWith("+")
            ? [22, 163, 74]
            : [220, 38, 38];
        }
      },
    });

    // ── Footer ───────────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable.finalY ?? summaryY + 32;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text("This is a system-generated statement.", 14, finalY + 10);
    doc.text("Developed by Robayet", pageW - 14, finalY + 10, { align: "right" });

    doc.save(`${name ?? "account"}-${projectCode || "statement"}.pdf`);
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
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between relative">
        {/* Left */}
        <button
          onClick={() => router.push("/projects")}
          className="text-xs text-blue-500 hover:text-blue-700 transition z-10"
        >
          ← Back
        </button>

        {/* Center */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <p className="text-sm font-bold text-gray-800">{name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            {projectCode && (
              <span className="text-xs font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded leading-none">
                {projectCode}
              </span>
            )}
            <p className="text-xs text-gray-400 leading-none">
              {projectName || "Dashboard"}
            </p>
          </div>
        </div>

        {/* Right */}
        <button
          onClick={handleLogout}
          className="shrink-0 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium px-4 py-2 rounded-xl transition text-sm z-10"
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
