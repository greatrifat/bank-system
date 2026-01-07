"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
        
        {/* App Title */}
        <h1 className="text-2xl font-bold text-blue-600 mb-2">
          Digital Banking
        </h1>

        <p className="text-gray-500 text-sm mb-8">
          Secure. Simple. Reliable.
        </p>

        {/* Login Button */}
        <button
          onClick={() => router.push("/login")}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition"
        >
          Login
        </button>

        {/* Footer Text */}
        <p className="text-xs text-gray-400 mt-6">
           Banking System
        </p>
      </div>
    </main>
  );
}
