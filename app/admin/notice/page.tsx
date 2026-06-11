"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function NoticePage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    const pid = localStorage.getItem("adminSelectedProjectId") || null;
    setProjectId(pid);
    fetchNotice(pid);
  }, []);

  const fetchNotice = async (pid: string | null) => {
    setLoading(true);
    const url = pid ? `/api/admin/notice?projectId=${pid}` : "/api/admin/notice";
    const res = await fetch(url);
    const data = await res.json();
    setMessage(data.message || "");
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/notice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, projectId }),
    });
    setSaving(false);
    alert("Notice updated!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 mb-5 text-sm bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg shadow-sm transition min-h-[40px]"
        >
          ← Back to Admin
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-1">Admin Notice</h1>
          <p className="text-sm text-gray-500 mb-5">
            This message is shown to all users in the selected project.
          </p>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notice Message
          </label>
          <textarea
            className="w-full border border-gray-300 p-3 rounded-xl text-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write notice here…"
          />

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition min-h-[44px]"
            >
              {saving ? "Saving…" : "Save Notice"}
            </button>
            {message && (
              <button
                onClick={() => setMessage("")}
                className="text-sm text-gray-500 hover:text-red-600 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
