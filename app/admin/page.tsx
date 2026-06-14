"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ---------------- Types ----------------
interface Project {
    _id: string;
    name: string;
    code: string;
}

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    memberProjects?: { _id: string; name: string; code: string }[];
}

interface Transaction {
    _id: string;
    type: "DEBIT" | "CREDIT";
    amount: number;
    description: string;
    createdAt: string;
    createdBy?: { name: string };
}

export default function AdminDashboard() {
    const router = useRouter();

    // ---------------- Auth ----------------
    const [token, setToken] = useState<string | null>(null);

    // ---------------- Project ----------------
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
    const [newProject, setNewProject] = useState({ name: "", code: "" });

    // ---------------- Users / Data ----------------
    const [users, setUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [balances, setBalances] = useState<Record<string, number | null>>({});
    const [balancesLoading, setBalancesLoading] = useState<Record<string, boolean>>({});
    const [showTransactionsModal, setShowTransactionsModal] = useState(false);
    const [totalBalance, setTotalBalance] = useState<number | null>(null);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [previewData, setPreviewData] = useState({
        totalUsers: 0,
        amountPerUser: 0,
        users: [] as { name: string; email: string }[],
    });

    const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });

    const [transactionData, setTransactionData] = useState({
        userId: "",
        amount: 0,
        type: "CREDIT",
        description: "",
    });

    const [profitLossData, setProfitLossData] = useState({
        amount: 0,
        type: "CREDIT",
        description: "",
    });

    const [activePanel, setActivePanel] = useState<
        "createUser" | "addTransaction" | "allUsers" | "addProfitLoss" | "assignProject"
    >("createUser");

    // ---------------- Auth check ----------------
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        const role = localStorage.getItem("role");

        if (!storedToken || role !== "ADMIN") {
            router.replace("/login");
            return;
        }

        try {
            const payload: any = JSON.parse(atob(storedToken.split(".")[1]));
            const now = Date.now() / 1000;
            if (payload.exp < now) {
                localStorage.clear();
                router.replace("/");
                return;
            }
        } catch {
            localStorage.clear();
            router.replace("/");
            return;
        }

        setToken(storedToken);

        const stored = localStorage.getItem("adminSelectedProjectId");
        if (stored) setSelectedProjectId(stored);
    }, [router]);

    // ---------------- Fetch Projects ----------------
    const fetchProjects = async () => {
        if (!token) return;
        try {
            const res = await fetch("/api/admin/projects", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data: Project[] = await res.json();
            setProjects(data);

            // Auto-select when there's exactly one project and none selected
            if (data.length === 1 && !selectedProjectId) {
                selectProject(data[0]._id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const selectProject = (id: string) => {
        setSelectedProjectId(id);
        localStorage.setItem("adminSelectedProjectId", id);
        // reset data for the new project
        setUsers([]);
        setBalances({});
        setTotalBalance(null);
    };

    // ---------------- Create Project ----------------
    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        try {
            const res = await fetch("/api/admin/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(newProject),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to create project");
            setNewProject({ name: "", code: "" });
            setShowCreateProjectModal(false);
            await fetchProjects();
        } catch (err: any) {
            alert(err.message);
        }
    };

    // ---------------- Fetch Users ----------------
    const fetchUsers = async () => {
        if (!token || !selectedProjectId) return;
        setLoading(true);
        try {
            const res = await fetch(
                `/api/admin/users?projectId=${selectedProjectId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data: User[] = await res.json();
            setUsers(data);
            if (data.length) {
                await Promise.all(data.map((u) => fetchBalance(u._id).catch(() => null)));
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
            const res = await fetch(
                `/api/admin/users/${userId}/balance?projectId=${selectedProjectId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (!res.ok) {
                setBalances((b) => ({ ...b, [userId]: null }));
                return null;
            }
            const bal = typeof data.balance === "number" ? data.balance : null;
            setBalances((b) => ({ ...b, [userId]: bal }));
            return bal;
        } catch {
            setBalances((b) => ({ ...b, [userId]: null }));
            return null;
        } finally {
            setBalancesLoading((s) => ({ ...s, [userId]: false }));
        }
    };

    const fetchTotalBalance = async () => {
        if (!token || !selectedProjectId) return;
        setTotalBalance(null);
        try {
            const res = await fetch(
                `/api/admin/bank?projectId=${selectedProjectId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (!res.ok) return;
            const tb =
                typeof data.totalBalance === "number"
                    ? data.totalBalance
                    : typeof data.balance === "number"
                    ? data.balance
                    : null;
            setTotalBalance(tb);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAllUsers = async () => {
        if (!token) return;
        try {
            const res = await fetch("/api/admin/users", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setAllUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setAllUsers([]);
        }
    };

    const handleAssignProject = async (
        userId: string,
        projectId: string,
        action: "add" | "remove"
    ) => {
        if (!token) return;
        setAssigningUserId(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}/project`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ projectId, action }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to assign project");
                await fetchAllUsers();
            if (selectedProjectId) fetchUsers();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setAssigningUserId(null);
        }
    };

    const fetchTransactions = async (userId: string) => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(
                `/api/admin/users/${userId}/transactions?projectId=${selectedProjectId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data: Transaction[] = await res.json();
            setTransactions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ---------------- Effects ----------------
    useEffect(() => {
        if (token) fetchProjects();
    }, [token]);

    useEffect(() => {
        if (token && selectedProjectId) {
            fetchUsers();
            fetchTotalBalance();
        }
    }, [token, selectedProjectId]);

    // ---------------- Logout ----------------
    const handleLogout = () => {
        localStorage.clear();
        router.replace("/login");
    };

    // ---------------- Create User ----------------
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !selectedProjectId) return;
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ...newUser, projectId: selectedProjectId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to create user");
            alert("User created successfully!");
            setNewUser({ name: "", email: "", password: "" });
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
        setUsers((prev) =>
            prev.map((u) => (u._id === userId ? { ...u, isActive: !isActive } : u))
        );
        try {
            const res = await fetch(`/api/admin/users/${userId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isActive: !isActive, projectId: selectedProjectId }),
            });
            const data = await res.json();
            if (!res.ok) {
                setUsers((prev) =>
                    prev.map((u) => (u._id === userId ? { ...u, isActive } : u))
                );
                throw new Error(data.message || "Failed to update user status");
            }
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
            const res = await fetch(
                `/api/admin/users/${transactionData.userId}/balance`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        amount: transactionData.amount,
                        type: transactionData.type,
                        description: transactionData.description,
                        projectId: selectedProjectId,
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to update balance");
            alert(`Balance updated: ${data.balance}`);
            const targetUserId = transactionData.userId;
            setTransactionData({ userId: "", amount: 0, type: "CREDIT", description: "" });
            fetchUsers();
            if (targetUserId) await fetchBalance(targetUserId);
            if (targetUserId) fetchTransactions(targetUserId);
            setActivePanel("allUsers");
        } catch (err: any) {
            alert(err.message);
        }
    };

    // ---------------- Add Profit/Loss ----------------
    const handleAddProfitLoss = async (e: React.FormEvent) => {
        e.preventDefault();

        const activeUsers = users.filter((u) => u.isActive && u.role === "USER");
        if (activeUsers.length === 0) return alert("No active users found");

        const totalUsers = activeUsers.length;
        const amountPerUser = Number((profitLossData.amount / totalUsers).toFixed(2));

        setPreviewData({
            totalUsers,
            amountPerUser,
            users: activeUsers.map((u) => ({ name: u.name, email: u.email })),
        });

        setShowConfirmModal(true);
    };

    const confirmProfitLoss = async () => {
        if (!token) return;
        try {
            const res = await fetch("/api/admin/bank", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    amount: profitLossData.amount,
                    type: profitLossData.type,
                    description: profitLossData.description,
                    projectId: selectedProjectId,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to apply profit/loss");

            alert(`${profitLossData.type} applied successfully.\nPer user: ${data.amountPerUser}`);
            setShowConfirmModal(false);
            setProfitLossData({ amount: 0, type: "CREDIT", description: "" });
            fetchUsers();
            fetchTotalBalance();
            setActivePanel("allUsers");
        } catch (err: any) {
            alert(err.message);
        }
    };

    // ---------------- Summary ----------------
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive).length;
    const selectedProject = projects.find((p) => p._id === selectedProjectId);

    // ---------------- Render ----------------
    return (
        <main className="min-h-screen p-6 bg-gray-100">
            {/* Row 1: Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-bold text-gray-700 mr-1">Admin</h1>
                    <select
                        value={selectedProjectId}
                        onChange={(e) => selectProject(e.target.value)}
                        className="text-sm border rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm min-w-0 flex-1 sm:flex-none sm:w-auto"
                    >
                        <option value="">— Select Project —</option>
                        {projects.map((p) => (
                            <option key={p._id} value={p._id}>
                                [{p.code}] {p.name}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowCreateProjectModal(true)}
                        className="text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 py-2 rounded-lg min-h-[40px] transition"
                    >
                        + New Project
                    </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Link
                        href="/admin/loginactivity"
                        className="text-sm bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white px-3 py-2 rounded-lg min-h-[40px] flex items-center transition"
                    >
                        Login Activity
                    </Link>
                    <Link
                        href="/admin/notice"
                        className="text-sm bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-3 py-2 rounded-lg min-h-[40px] flex items-center transition"
                    >
                        Notice
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="text-sm bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-3 py-2 rounded-lg min-h-[40px] transition"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* No project selected */}
            {!selectedProjectId ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-gray-500 text-lg">Select a project above to get started.</p>
                    {projects.length === 0 && (
                        <p className="text-gray-400 text-sm mt-2">
                            No projects yet — click <strong>+ New Project</strong> to create one.
                        </p>
                    )}
                </div>
            ) : (
                <>
                    {/* Project badge */}
                    {selectedProject && (
                        <div className="mb-4 flex items-center gap-2">
                            <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {selectedProject.code}
                            </span>
                            <span className="text-sm font-semibold text-gray-600">
                                {selectedProject.name}
                            </span>
                        </div>
                    )}

                    {/* Row 2: Summary Cards */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-white px-3 py-2.5 rounded-xl shadow text-center">
                            <p className="text-gray-500 text-xs">Total Users</p>
                            <p className="text-lg font-bold text-blue-600 tabular-nums">{totalUsers}</p>
                        </div>
                        <div className="bg-white px-3 py-2.5 rounded-xl shadow text-center">
                            <p className="text-gray-500 text-xs">Active</p>
                            <p className="text-lg font-bold text-green-600 tabular-nums">{activeUsers}</p>
                        </div>
                        <div className="bg-white px-3 py-2.5 rounded-xl shadow text-center">
                            <p className="text-gray-500 text-xs">Balance</p>
                            <p className="text-lg font-bold text-green-600 tabular-nums">
                                {totalBalance == null
                                    ? "…"
                                    : totalBalance.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Row 3: Action Buttons */}
                    <div className="flex flex-wrap justify-center gap-2 mb-6 text-gray-800">
                        {(
                            [
                                ["createUser", "Create User"],
                                ["addTransaction", "Add Transaction"],
                                ["addProfitLoss", "Add Profit/Loss"],
                                ["allUsers", "All Users"],
                                ["assignProject", "Assign Project"],
                            ] as const
                        ).map(([panel, label]) => (
                            <button
                                key={panel}
                                className={`px-3 py-2 rounded-lg font-semibold text-sm min-h-[40px] ${
                                    activePanel === panel
                                        ? "bg-blue-600 text-white"
                                        : "bg-white shadow hover:bg-gray-100"
                                }`}
                                onClick={() => {
                                    setActivePanel(panel);
                                    if (panel === "assignProject") fetchAllUsers();
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Panel */}
                    <div>
                        {/* Create User */}
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
                                                onChange={(e) =>
                                                    setNewUser({ ...newUser, name: e.target.value })
                                                }
                                                className="w-full p-2 border rounded-lg"
                                            />
                                            <input
                                                type="email"
                                                placeholder="Email"
                                                required
                                                value={newUser.email}
                                                onChange={(e) =>
                                                    setNewUser({ ...newUser, email: e.target.value })
                                                }
                                                className="w-full p-2 border rounded-lg"
                                            />
                                            <input
                                                type="password"
                                                placeholder="Password"
                                                required
                                                value={newUser.password}
                                                onChange={(e) =>
                                                    setNewUser({ ...newUser, password: e.target.value })
                                                }
                                                className="w-full p-2 border rounded-lg"
                                            />
                                            <button
                                                type="submit"
                                                className="w-full bg-blue-600 text-white py-2 rounded-lg"
                                            >
                                                Create User
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add Transaction */}
                        <div className="flex justify-center">
                            <div className="w-full max-w-2xl">
                                {activePanel === "addTransaction" && (
                                    <div className="bg-white text-gray-800 p-6 rounded-xl shadow max-w-md space-y-3">
                                        <h2 className="text-lg font-semibold mb-4">Add Transaction</h2>
                                        <form onSubmit={handleAddTransaction} className="space-y-3">
                                            <select
                                                required
                                                value={transactionData.userId}
                                                onChange={(e) =>
                                                    setTransactionData({
                                                        ...transactionData,
                                                        userId: e.target.value,
                                                    })
                                                }
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
                                                onChange={(e) =>
                                                    setTransactionData({
                                                        ...transactionData,
                                                        amount: Number(e.target.value),
                                                    })
                                                }
                                                className="w-full p-2 border rounded-lg"
                                            />
                                            <select
                                                value={transactionData.type}
                                                onChange={(e) =>
                                                    setTransactionData({
                                                        ...transactionData,
                                                        type: e.target.value,
                                                    })
                                                }
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
                                                onChange={(e) =>
                                                    setTransactionData({
                                                        ...transactionData,
                                                        description: e.target.value,
                                                    })
                                                }
                                                className="w-full p-2 border rounded-lg"
                                            />
                                            <button
                                                type="submit"
                                                className="w-full bg-blue-600 text-white py-2 rounded-lg"
                                            >
                                                Add Transaction
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add Profit/Loss */}
                        <div className="flex justify-center">
                            <div className="w-full max-w-2xl">
                                {activePanel === "addProfitLoss" && (
                                    <div className="bg-white text-gray-800 p-6 rounded-xl shadow max-w-md space-y-3">
                                        <h2 className="text-lg font-semibold mb-4">
                                            Add Profit / Loss (All Active Users)
                                        </h2>
                                        <form onSubmit={handleAddProfitLoss} className="space-y-3">
                                            <input
                                                type="number"
                                                placeholder="Total Amount"
                                                required
                                                value={profitLossData.amount}
                                                onChange={(e) =>
                                                    setProfitLossData({
                                                        ...profitLossData,
                                                        amount: Number(e.target.value),
                                                    })
                                                }
                                                className="w-full p-2 border rounded-lg"
                                            />
                                            <select
                                                value={profitLossData.type}
                                                onChange={(e) =>
                                                    setProfitLossData({
                                                        ...profitLossData,
                                                        type: e.target.value,
                                                    })
                                                }
                                                className="w-full p-2 border rounded-lg"
                                            >
                                                <option value="CREDIT">CREDIT (Profit)</option>
                                                <option value="DEBIT">DEBIT (Loss / Charge)</option>
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Description"
                                                required
                                                value={profitLossData.description}
                                                onChange={(e) =>
                                                    setProfitLossData({
                                                        ...profitLossData,
                                                        description: e.target.value,
                                                    })
                                                }
                                                className="w-full p-2 border rounded-lg"
                                            />
                                            <button
                                                type="submit"
                                                className={`w-full py-2 rounded-lg text-white ${
                                                    profitLossData.type === "CREDIT"
                                                        ? "bg-green-600 hover:bg-green-700"
                                                        : "bg-red-600 hover:bg-red-700"
                                                }`}
                                            >
                                                Apply {profitLossData.type}
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Confirm Profit/Loss Modal */}
                        {showConfirmModal && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
                                    <h2 className="text-lg text-gray-700 font-semibold mb-4">
                                        Confirm Operation
                                    </h2>
                                    <div className="space-y-2 text-gray-700">
                                        <p><strong>Type:</strong> {profitLossData.type}</p>
                                        <p><strong>Total Users:</strong> {previewData.totalUsers}</p>
                                        <p><strong>Total Amount:</strong> {profitLossData.amount}</p>
                                        <p><strong>Per User:</strong> {previewData.amountPerUser}</p>
                                        <p><strong>Description:</strong> {profitLossData.description}</p>
                                    </div>
                                    <div className="mt-4">
                                        <p className="font-semibold text-gray-700 mb-2">Affected Users:</p>
                                        <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50 text-gray-700">
                                            {previewData.users.map((u, index) => (
                                                <div
                                                    key={index}
                                                    className="text-sm py-2 border-b last:border-b-0"
                                                >
                                                    <div className="font-medium">{u.name}</div>
                                                    <div className="text-xs text-gray-500">{u.email}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            onClick={() => setShowConfirmModal(false)}
                                            className="px-4 py-2 rounded-lg bg-red-700 text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmProfitLoss}
                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* All Users */}
                        <div className="flex justify-center">
                            <div className="w-full max-w-2xl">
                                {activePanel === "allUsers" && (
                                    <div className="bg-white p-6 rounded-xl shadow">
                                        <h2 className="text-lg font-semibold mb-4 text-gray-400">
                                            All Users
                                        </h2>
                                        {loading ? (
                                            <p className="text-blue-600 text-sm">Loading users...</p>
                                        ) : (
                                            <ul className="space-y-2 max-h-[500px] overflow-y-auto">
                                                {users.map((user) => (
                                                    <li
                                                        key={user._id}
                                                        className="flex justify-between items-center p-3 rounded-xl bg-gray-50"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium text-gray-700 truncate">{user.name}</p>
                                                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
                                                                <span className={user.isActive ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                                                                    {user.isActive ? "Active" : "Inactive"}
                                                                </span>
                                                                <span>
                                                                    {balancesLoading[user._id] ? (
                                                                        "…"
                                                                    ) : balances[user._id] != null ? (
                                                                        <span
                                                                            className={
                                                                                balances[user._id]! < 0
                                                                                    ? "text-red-600 font-semibold"
                                                                                    : "text-green-600 font-semibold"
                                                                            }
                                                                        >
                                                                            {balances[user._id]!.toLocaleString()} BDT
                                                                        </span>
                                                                    ) : (
                                                                        "—"
                                                                    )}
                                                                </span>
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row gap-1.5 shrink-0 ml-2">
                                                            <button
                                                                onClick={() =>
                                                                    toggleUserStatus(user._id, user.isActive)
                                                                }
                                                                disabled={updatingUserId === user._id}
                                                                className={`text-white px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] min-w-[76px] transition ${
                                                                    user.isActive
                                                                        ? "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700"
                                                                        : "bg-red-500 hover:bg-red-600 active:bg-red-700"
                                                                } ${
                                                                    updatingUserId === user._id
                                                                        ? "opacity-60 cursor-not-allowed"
                                                                        : ""
                                                                }`}
                                                            >
                                                                {user.isActive ? "Deactivate" : "Activate"}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    setSelectedUser(user);
                                                                    await fetchTransactions(user._id);
                                                                    setShowTransactionsModal(true);
                                                                }}
                                                                className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] transition"
                                                            >
                                                                Txns
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Assign Project Panel */}
                        <div className="flex justify-center">
                            <div className="w-full max-w-2xl">
                                {activePanel === "assignProject" && (
                                    <div className="bg-white p-6 rounded-xl shadow">
                                        <h2 className="text-lg font-semibold mb-1 text-gray-700">
                                            Assign Project
                                        </h2>
                                        <p className="text-xs text-gray-400 mb-4">
                                            Change or assign a project for any user.
                                        </p>
                                        <ul className="space-y-2 max-h-[500px] overflow-y-auto">
                                            {allUsers.map((user) => (
                                                <li
                                                    key={user._id}
                                                    className="p-3 rounded-xl bg-gray-50"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-700 truncate">
                                                            {user.name}
                                                        </p>
                                                        <p className="text-xs text-gray-400 truncate mb-2">
                                                            {user.email}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {projects.map((p) => {
                                                                const assigned = (user.memberProjects || []).some(
                                                                    (up: { _id: string }) => up._id === p._id
                                                                );
                                                                return (
                                                                    <label
                                                                        key={p._id}
                                                                        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border cursor-pointer select-none transition ${
                                                                            assigned
                                                                                ? "bg-blue-50 border-blue-300 text-blue-700"
                                                                                : "bg-gray-50 border-gray-200 text-gray-500"
                                                                        } ${assigningUserId === user._id ? "opacity-50 pointer-events-none" : ""}`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            className="accent-blue-600"
                                                                            checked={assigned}
                                                                            onChange={() =>
                                                                                handleAssignProject(
                                                                                    user._id,
                                                                                    p._id,
                                                                                    assigned ? "remove" : "add"
                                                                                )
                                                                            }
                                                                        />
                                                                        <span className="font-mono">{p.code}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                            {projects.length === 0 && (
                                                                <span className="text-xs text-gray-400 italic">
                                                                    No projects yet
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                            {allUsers.length === 0 && (
                                                <p className="text-gray-400 text-sm text-center py-4">
                                                    No users found.
                                                </p>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Transactions Modal */}
                        {showTransactionsModal && selectedUser && (
                            <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:p-6 overflow-y-auto">
                                <div
                                    className="absolute inset-0 bg-black/40"
                                    onClick={() => {
                                        setShowTransactionsModal(false);
                                        setSelectedUser(null);
                                        setTransactions([]);
                                    }}
                                />
                                <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-2xl sm:mt-10">
                                    <div className="flex justify-between items-center p-4 border-b">
                                        <div>
                                            <h3 className="text-lg text-gray-800 font-semibold">
                                                Transactions for {selectedUser.name}
                                            </h3>
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
                                                        className={`p-3 rounded ${
                                                            t.type === "DEBIT" ? "bg-red-200" : "bg-green-200"
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="font-medium text-gray-800">
                                                                    {t.type} — {t.amount} BDT
                                                                </p>
                                                                <p className="text-xs text-gray-800">
                                                                    {t.description}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-800">
                                                                    CreatedBy: {t.createdBy?.name ?? "—"}
                                                                </p>
                                                                <p className="text-xs text-gray-800">
                                                                    {new Date(t.createdAt).toLocaleString()}
                                                                </p>
                                                            </div>
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
                </>
            )}

            {/* Create Project Modal */}
            {showCreateProjectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">New Project</h2>
                        <form onSubmit={handleCreateProject} className="space-y-3">
                            <input
                                type="text"
                                placeholder="Project Name"
                                required
                                value={newProject.name}
                                onChange={(e) =>
                                    setNewProject({ ...newProject, name: e.target.value })
                                }
                                className="w-full p-2 border rounded-lg text-gray-800"
                            />
                            <input
                                type="text"
                                placeholder="Project Code (e.g. PROJ_A)"
                                required
                                value={newProject.code}
                                onChange={(e) =>
                                    setNewProject({ ...newProject, code: e.target.value })
                                }
                                className="w-full p-2 border rounded-lg text-gray-800"
                            />
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateProjectModal(false)}
                                    className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
