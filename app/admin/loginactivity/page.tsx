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

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch("/api/admin/login-activity");
                const data: LoginActivity[] = await res.json();
                setLogs(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

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
            </div>
        </div>
    );
}
