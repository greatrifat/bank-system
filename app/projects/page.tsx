"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Project {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (role === "ADMIN") {
      router.replace("/admin");
      return;
    }

    setName(localStorage.getItem("name"));

    try {
      const stored = localStorage.getItem("userProjects");
      setProjects(stored ? JSON.parse(stored) : []);
    } catch {
      setProjects([]);
    }

    setReady(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.replace("/login");
  };

  const handleEnter = (project: Project) => {
    localStorage.setItem("selectedProjectId", project._id);
    localStorage.setItem("selectedProjectName", project.name);
    localStorage.setItem("selectedProjectCode", project.code);
    router.push("/dashboard");
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Logged in as</p>
          <p className="font-semibold text-gray-800 text-sm truncate">{name}</p>
        </div>
        <button
          onClick={handleLogout}
          className="shrink-0 text-sm bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2 rounded-xl transition min-h-[40px]"
        >
          Logout
        </button>
      </div>

      <div className="px-4 py-8 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-gray-700 mb-1">Your Projects</h1>
        <p className="text-sm text-gray-500 mb-8">Select a project to view its dashboard</p>

        {projects.filter((p) => p.isActive).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 w-full max-w-lg text-center">
            <p className="text-gray-500">No active projects assigned to your account.</p>
            <p className="text-xs text-gray-400 mt-2">Contact your administrator.</p>
          </div>
        ) : (
          <div className="w-full max-w-lg space-y-3">
            {projects.filter((p) => p.isActive).map((project) => (
              <button
                key={project._id}
                onClick={() => handleEnter(project)}
                className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 p-5 text-left hover:shadow-md active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-block text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded mb-2">
                      {project.code}
                    </span>
                    <h2 className="text-base font-bold text-gray-800 group-hover:text-blue-600 transition truncate">
                      {project.name}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">Tap to open dashboard</p>
                  </div>
                  <span className="text-xl text-gray-300 group-hover:text-blue-400 transition shrink-0">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
