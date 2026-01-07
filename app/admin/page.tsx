"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ---------------- Types ----------------
interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
}

interface Transaction {
    _id: string;
    type: "DEBIT" | "CREDIT";
    amount: number;
    description: string;
    createdAt: string;
}

export default function AdminDashboard() {
    const router = useRouter();

    // ---------------- States ----------------
    const [token, setToken] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [balances, setBalances] = useState<Record<string, number | null>>({});
    const [balancesLoading, setBalancesLoading] = useState<Record<string, boolean>>({});
    const [showTransactionsModal, setShowTransactionsModal] = useState(false);
        const [totalBalance, setTotalBalance] = useState<number | null>(null);

    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        password: "",
    });

    const [transactionData, setTransactionData] = useState({
        userId: "",
        amount: 0,
        type: "CREDIT",
        description: "",
    });

    const [activePanel, setActivePanel] = useState<"createUser" | "addTransaction" | "allUsers">(
        "createUser"
    );

    // ---------------- Load token & check admin ----------------
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        const role = localStorage.getItem("role");

        if (!storedToken || role !== "ADMIN") {
            router.replace("/login");
            return;
        }
        setToken(storedToken);
    }, [router]);

    // ---------------- Fetch Users ----------------
    const fetchUsers = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data: User[] = await res.json();
            setUsers(data);
            // fetch balances for each user (best-effort)
            if (data && data.length) {
                await Promise.all(
                    data.map((u) => {
                        return fetchBalance(u._id).catch(() => null);
                    })
                );
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBalance = async (userId: string) => {
        if (!token) return null;
        setBalancesLoading((s) => ({ ...s, [userId]: true }));
        try {
            const res = await fetch(`/api/admin/users/${userId}/balance`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) {
                setBalances((b) => ({ ...b, [userId]: null }));
                return null;
            }
            const bal = typeof data.balance === "number" ? data.balance : null;
            setBalances((b) => ({ ...b, [userId]: bal }));
            return bal;
        } catch (err) {
            setBalances((b) => ({ ...b, [userId]: null }));
            return null;
        } finally {
            setBalancesLoading((s) => ({ ...s, [userId]: false }));
        }
    };

    useEffect(() => {
        if (token) fetchUsers();
            if (token) fetchTotalBalance();
    }, [token]);

        const fetchTotalBalance = async () => {
            if (!token) return;
            setTotalBalance(null);
            try {
                const res = await fetch(`/api/admin/bank`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok) {
                    console.error("Failed to fetch total balance", data);
                    setTotalBalance(null);
                    return null;
                }

                // prefer common keys
                const tb = typeof data.totalBalance === "number" ? data.totalBalance : typeof data.balance === "number" ? data.balance : null;
                setTotalBalance(tb);
                return tb;
            } catch (err) {
                console.error(err);
                setTotalBalance(null);
                return null;
            }
        };

    // ---------------- Fetch transactions ----------------
    const fetchTransactions = async (userId: string) => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}/transactions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data: Transaction[] = await res.json();
            setTransactions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ---------------- Logout ----------------
    const handleLogout = () => {
        localStorage.clear();
        router.replace("/login");
    };

    // ---------------- Create User ----------------
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(newUser),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to create user");
            alert("User created successfully!");
            setNewUser({ name: "", email: "", password: ""});
            fetchUsers();
            setActivePanel("allUsers");
        } catch (err: any) {
            alert(err.message);
        }
    };

    // ---------------- Toggle User Status ----------------
    const toggleUserStatus = async (userId: string, isActive: boolean) => {
        if (!token) return;
        setUpdatingUserId(userId);
        // Optimistic UI update
        setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isActive: !isActive } : u)));

        try {
            const res = await fetch(`/api/admin/users/${userId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ isActive: !isActive }),
            });

            const data = await res.json();
            if (!res.ok) {
                // Revert optimistic update on failure
                setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isActive } : u)));
                throw new Error(data.message || "Failed to update user status");
            }

            // Keep optimistic update, but refresh list to be safe
            fetchUsers();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    // ---------------- Add Transaction ----------------
    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !transactionData.userId) return;

        try {
            const res = await fetch(`/api/admin/users/${transactionData.userId}/balance`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    amount: transactionData.amount,
                    type: transactionData.type,
                    description: transactionData.description,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to update balance");
            alert(`Balance updated: ${data.balance}`);
            const targetUserId = transactionData.userId;
            // reset form
            setTransactionData({ userId: "", amount: 0, type: "CREDIT", description: "" });
            // refresh list and specific user's balance/transactions
            fetchUsers();
            if (targetUserId) await fetchBalance(targetUserId);
            if (targetUserId) fetchTransactions(targetUserId);
            setActivePanel("allUsers");
        } catch (err: any) {
            alert(err.message);
        }
    };

    // ---------------- Summary ----------------
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive).length;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-blue-600 font-medium">Loading dashboard...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen p-6 bg-gray-100">
            {/* Row 1: Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-700">Admin Dashboard</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                >
                    Logout
                </button>
            </div>

            {/* Row 2: Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow text-center">
                    <p className="text-gray-500 text-sm">Total Users</p>
                    <p className="text-xl font-bold text-blue-600 mt-1">{totalUsers}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow text-center">
                    <p className="text-gray-500 text-sm">Active Users</p>
                    <p className="text-xl font-bold text-green-600 mt-1">{activeUsers}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow text-center">
                    <p className="text-gray-500 text-sm">Total Balance</p>
                    <p className="text-xl font-bold text-green-600 mt-1">{totalBalance == null ? "Loading..." : `${totalBalance.toLocaleString()} BDT`}</p>
                </div>
               
            </div>

            {/* Row 3: Action Buttons */}
            <div className="flex justify-center  text-gray-800 gap-4 mb-6">
                <button
                    className={`px-4 py-2 rounded-lg font-semibold ${activePanel === "createUser" ? "bg-blue-600 text-white" : "bg-white shadow hover:bg-gray-100"
                        }`}
                    onClick={() => setActivePanel("createUser")}
                >
                    Create User
                </button>
                <button
                    className={`px-4 py-2 rounded-lg font-semibold ${activePanel === "addTransaction" ? "bg-blue-600 text-white" : "bg-white shadow hover:bg-gray-100"
                        }`}
                    onClick={() => setActivePanel("addTransaction")}
                >
                    Add Transaction
                </button>
                <button
                    className={`px-4 py-2 rounded-lg font-semibold ${activePanel === "allUsers" ? "bg-blue-600 text-white" : "bg-white shadow hover:bg-gray-100"
                        }`}
                    onClick={() => setActivePanel("allUsers")}
                >
                    All Users
                </button>
            </div>

            {/* Dynamic Panel */}
            <div>
                {/* Create User Panel */}
                <div className="flex justify-center">
                    <div className="w-full max-w-2xl">
                        {activePanel === "createUser" && (
                            <div className="bg-white text-gray-800 p-6 rounded-xl shadow max-w-md">
                                <h2 className="text-lg font-semibold mb-4">Create New User</h2>
                                <form onSubmit={handleCreateUser} className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        required
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        required
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        required
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg">
                                        Create User
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Transaction Panel */}
                <div className="flex justify-center">
                    <div className="w-full max-w-2xl">
                        {activePanel === "addTransaction" && (
                            <div className="bg-white text-gray-800 p-6 rounded-xl shadow max-w-md space-y-3">
                                <h2 className="text-lg font-semibold mb-4">Add Transaction</h2>
                                <form onSubmit={handleAddTransaction} className="space-y-3">
                                    <select
                                        required
                                        value={transactionData.userId}
                                        onChange={(e) => setTransactionData({ ...transactionData, userId: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                    >
                                        <option value="">Select User</option>
                                        {users.map((u) => (
                                            <option key={u._id} value={u._id}>
                                                {u.name} ({u.email})
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        required
                                        value={transactionData.amount}
                                        onChange={(e) => setTransactionData({ ...transactionData, amount: Number(e.target.value) })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                    <select
                                        value={transactionData.type}
                                        onChange={(e) => setTransactionData({ ...transactionData, type: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                    >
                                        <option value="CREDIT">CREDIT</option>
                                        <option value="DEBIT">DEBIT</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Description"
                                        required
                                        value={transactionData.description}
                                        onChange={(e) => setTransactionData({ ...transactionData, description: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg">
                                        Add Transaction
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>

                {/* All Users Panel */}
                <div className="flex justify-center">
                    <div className="w-full max-w-2xl">
                        {activePanel === "allUsers" && (
                            <div className="bg-white p-6 rounded-xl shadow">
                                <h2 className="text-lg font-semibold mb-4 text-gray-400">All Users</h2>
                                <ul className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {users.map((user) => (
                                        <li
                                            key={user._id}
                                            className="flex justify-between items-center p-3 rounded-xl bg-gray-50"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-700">{user.name}</p>
                                                <p className="text-xs text-gray-400">{user.email}</p>
                                                <p className="text-xs text-gray-500">
                                                    Active: {user.isActive ? "Yes" : "No"} | Role: {user.role} |
                                                    Balance: {balancesLoading[user._id] ? (
                                                        <span>Loading...</span>
                                                    ) : balances[user._id] != null ? (
                                                        <span>{balances[user._id]!.toLocaleString()} BDT</span>
                                                    ) : (
                                                        <span>-</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => toggleUserStatus(user._id, user.isActive)}
                                                    disabled={updatingUserId === user._id}
                                                    className={`text-white px-2 py-1 rounded-lg text-sm
                                                            ${user.isActive
                                                            ? "bg-yellow-500 hover:bg-yellow-600"
                                                            : "bg-red-500 hover:bg-red-600"}
                                                            ${updatingUserId === user._id 
                                                            ? "opacity-60 cursor-not-allowed" : ""}
                                                            `}
                                                >
                                                    {user.isActive ? "Deactivate" : "Activate"}
                                                </button>

                                                <button
                                                    onClick={async () => {
                                                        setSelectedUser(user);
                                                        // fetch transactions then show modal
                                                        await fetchTransactions(user._id);
                                                        setShowTransactionsModal(true);
                                                    }}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg text-sm"
                                                >
                                                    Transactions
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
                {/* Transactions Modal */}
                {showTransactionsModal && selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
                        <div
                            className="absolute inset-0 bg-black/40"
                            onClick={() => {
                                setShowTransactionsModal(false);
                                setSelectedUser(null);
                                setTransactions([]);
                            }}
                        />

                        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mt-10">
                            <div className="flex justify-between items-center p-4 border-b">
                                <div>
                                    <h3 className="text-lg text-gray-800 font-semibold">Transactions for {selectedUser.name}</h3>
                                    <p className="text-xs text-gray-800">{selectedUser.email}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowTransactionsModal(false);
                                        setSelectedUser(null);
                                        setTransactions([]);
                                    }}
                                    className="text-gray-800 hover:text-gray-900 p-2 rounded"
                                    aria-label="Close transactions"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-4 max-h-[60vh] overflow-y-auto">
                                {loading ? (
                                    <p className="text-gray-500">Loading transactions...</p>
                                ) : transactions.length === 0 ? (
                                    <p className="text-gray-500">No transactions found.</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {transactions.map((t) => (
                                            <li
                                                key={t._id}
                                                className={`p-3 rounded ${t.type === "DEBIT" 
                                                    ? "bg-red-200" : "bg-green-200"}`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-gray-800">
                                                            {t.type} — {t.amount} BDT
                                                        </p>
                                                        <p className="text-xs text-gray-800">{t.description}</p>
                                                    </div>
                                                    <p className="text-xs text-gray-800">
                                                        {new Date(t.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
