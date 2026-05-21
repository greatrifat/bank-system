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
    status: "success" | "failed";
    loginTime: string;
};


export default function LoginActivityPage() {
    const [logs, setLogs] = useState<LoginActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    // UI (draft)
    const [searchDraft, setSearchDraft] = useState("");
    const [statusDraft, setStatusDraft] = useState("all");
    const [status, setStatus] = useState("all");
    const [search, setSearch] = useState("");
    const [totalPages, setTotalPages] = useState(1);



    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);

                const res = await fetch(
                    `/api/admin/login-activity?page=${page}&limit=10&status=${status}&search=${search}`
                );

                const data = await res.json();

                setLogs(data.logs || []);
                setTotalPages(data.pagination.totalPages || 1);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [page, status, search]);

    if (loading) {
        return <p className="p-4">Loading...</p>;
    }

    return (
        <div className="text-gray-800 p-4 bg-gray-100 min-h-screen">
            <Link
                href="/admin"
                className="inline-block mb-4 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-lg"
            >
                ← Back to Admin
            </Link>



            <h1 className="text-xl font-bold mb-4">Login Activity</h1>

            <div className="flex flex-wrap gap-3 mb-4">

                 {/* SEARCH */}
    <input
        type="text"
        placeholder="Search user/email..."
        value={searchDraft}
        onChange={(e) => setSearchDraft(e.target.value)}
        className="border px-3 py-2 rounded-lg"
    />

    {/* STATUS */}
    <select
        value={statusDraft}
        onChange={(e) => setStatusDraft(e.target.value)}
        className="border px-3 py-2 rounded-lg"
    >
        <option value="all">All</option>
        <option value="success">Success</option>
        <option value="failed">Failed</option>
        <option value="wrong_password">Wrong Password</option>
    </select>

                {/* APPLY BUTTON */}
                <button
                    onClick={() => {
                        setPage(1);
                        setSearch(searchDraft);
                        setStatus(statusDraft);
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                    Apply Filters
                </button>

            </div>

            <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 text-sm">
                    <thead className="">
                        <tr>
                            <th className="border p-2">User</th>
                            <th className="border p-2">Email</th>
                            <th className="border p-2">Status</th>
                            <th className="border p-2">Time</th>
                        </tr>
                    </thead>

                    <tbody>
                        {logs.map((log) => (
                            <tr key={log._id}>
                                <td className="border p-2">
                                    {log.userId?.name ?? "Unknown"}
                                </td>

                                <td className="border p-2">
                                    {log.userId?.email ?? "-"}
                                </td>

                                <td
                                    className={`border p-2 font-semibold ${log.status === "success"
                                        ? "text-green-600"
                                        : "text-red-600"
                                        }`}
                                >
                                    {log.status}
                                </td>

                                <td className="border p-2">
                                    {new Date(log.loginTime).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex items-center justify-center gap-4 mt-4">

                    <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        Prev
                    </button>

                    <span>
                        Page {page} of {totalPages}
                    </span>

                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        Next
                    </button>

                </div>
            </div>
        </div>
    );
}
