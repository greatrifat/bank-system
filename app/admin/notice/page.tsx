"use client";

import { useEffect, useState } from "react";

export default function NoticePage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // fetch notice
  const fetchNotice = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/notice");
    const data = await res.json();
    setMessage(data.message || "");
    setLoading(false);
  };

  useEffect(() => {
    fetchNotice();
  }, []);

  // update notice
  const handleSave = async () => {
    setSaving(true);

    await fetch("/api/admin/notice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    setSaving(false);
    alert("Notice updated!");
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Admin Notice</h1>

      <textarea
        className="w-full border p-3 rounded h-20"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write notice here..."
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded"
      >
        {saving ? "Saving..." : "Save Notice"}
      </button>
    </div>
  );
}