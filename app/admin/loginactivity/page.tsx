"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type User = {
    name: string;
    email: string;
};

type LoginActivity = {
    _id: string;
    userId: User | null;
    status: "success" | "failed" | "wrong_password";
    loginTime: string;
};

const STATUS_STYLES: Record<string, string> = {
    success:        "bg-green-100 text-green-700",
    failed:         "bg-red-100 text-red-700",
    wrong_password: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS: Record<string, string> = {
    success:        "Success",
    failed:         "Failed",
    wrong_password: "Wrong Password",
};

function formatDate(iso: string) {
    const d = new Date(iso);
    return {
        date: d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
        time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    };
}

export default function LoginActivityPage() {
    const [logs, setLogs] = useState<LoginActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchDraft, setSearchDraft] = useState("");
    const [statusDraft, setStatusDraft] = useState("all");
    const [status, setStatus] = useState("all");
    const [search, setSearch] = useState("");
    const [totalPages, setTotalPages] = useState(1);
    const [projectId, setProjectId] = useState("");

    useEffect(() => {
        setProjectId(localStorage.getItem("adminSelectedProjectId") || "");
    }, []);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                const res = await fetch(
                    `/api/admin/login-activity?page=${page}&limit=10&status=${status}&search=${encodeURIComponent(search)}&projectId=${projectId}`
                );
                const data = await res.json();
                setLogs(data.logs || []);
                setTotalPages(data.pagination?.totalPages || 1);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [page, status, search, projectId]);

    const applyFilters = () => {
        setPage(1);
        setSearch(searchDraft);
        setStatus(statusDraft);
    };

    return (
        <div className="min-h-screen text-gray-800 bg-gray-100">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                <Link
                    href="/admin"
                    className="inline-flex items-center gap-1 text-sm bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg shadow-sm transition min-h-[40px]"
                >
                    ← Back
                </Link>
                <h1 className="text-base font-bold text-gray-800">Login Activity</h1>
            </div>

            <div className="p-4 max-w-4xl mx-auto">
                {/* Filters */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            placeholder="Search name or email…"
                            value={searchDraft}
                            onChange={(e) => setSearchDraft(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                            className="flex-1 border border-gray-300 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                        <select
                            value={statusDraft}
                            onChange={(e) => setStatusDraft(e.target.value)}
                            className="sm:w-44 border border-gray-300 px-3 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        >
                            <option value="all">All Statuses</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                            <option value="wrong_password">Wrong Password</option>
                        </select>
                        <button
                            onClick={applyFilters}
                            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition"
                        >
                            Apply
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">Loading…</p>
                        </div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
                        <p className="text-gray-500 text-sm">No login activity found.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map((log) => {
                                        const { date, time } = formatDate(log.loginTime);
                                        return (
                                            <tr key={log._id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-800">
                                                    {log.userId?.name ?? <span className="text-gray-400 italic">Unknown</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {log.userId?.email ?? "—"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[log.status] ?? "bg-gray-100 text-gray-600"}`}>
                                                        {STATUS_LABELS[log.status] ?? log.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 tabular-nums">
                                                    {date} · {time}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <ul className="sm:hidden space-y-2 mb-4">
                            {logs.map((log) => {
                                const { date, time } = formatDate(log.loginTime);
                                return (
                                    <li key={log._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-800 text-sm truncate">
                                                    {log.userId?.name ?? <span className="text-gray-400 italic font-normal">Unknown</span>}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">{log.userId?.email ?? "—"}</p>
                                            </div>
                                            <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[log.status] ?? "bg-gray-100 text-gray-600"}`}>
                                                {STATUS_LABELS[log.status] ?? log.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2 tabular-nums">{date} · {time}</p>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Pagination */}
                        <div className="flex items-center justify-center gap-4">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="px-4 py-2 border border-gray-300 rounded-xl text-sm bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[40px]"
                            >
                                ← Prev
                            </button>
                            <span className="text-sm text-gray-600 tabular-nums">
                                {page} / {totalPages}
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-4 py-2 border border-gray-300 rounded-xl text-sm bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[40px]"
                            >
                                Next →
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
