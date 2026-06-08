"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getResume() {
  const r = await fetch(`${BASE}/api/resume`);
  if (!r.ok) return null;
  return r.json();
}

async function uploadResume(filename: string, content: string) {
  const r = await fetch(`${BASE}/api/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, content }),
  });
  return r.json();
}

export default function ResumePage() {
  const [resume, setResume] = useState<{ filename: string; content: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pasted, setPasted] = useState("");
  const [filename, setFilename] = useState("my-resume");
  const [saved, setSaved] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    setLoading(true);
    const r = await getResume();
    setResume(r);
    if (r) setPasted(r.content);
    setLoading(false);
  }

  useState(() => { load(); });

  async function save() {
    if (!pasted.trim()) return;
    setLoading(true);
    await uploadResume(filename || "my-resume", pasted);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300">
          ← Back
        </Link>
        <ThemeToggle />
      </div>

      <h1 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1">Resume</h1>
      <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
        Paste your resume as plain text or markdown. It will be used to tailor cover letters and résumés per job.
      </p>

      <div className="mb-3 flex items-center gap-3">
        <input
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="filename (e.g. my-resume)"
          className="text-sm border border-gray-200 dark:border-zinc-700 rounded px-3 py-1.5 bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 w-56"
        />
        <button
          onClick={save}
          disabled={loading || !pasted.trim()}
          className="text-sm bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-1.5 rounded hover:bg-gray-700 dark:hover:bg-zinc-300 disabled:opacity-40 transition-colors"
        >
          {saved ? "Saved ✓" : "Save resume"}
        </button>
      </div>

      <textarea
        ref={textRef}
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        rows={30}
        placeholder="Paste your resume here in plain text or markdown…"
        className="w-full text-sm font-mono border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 resize-y leading-relaxed focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-zinc-600"
      />

      {resume && (
        <p className="text-xs text-gray-400 dark:text-zinc-600 mt-2">
          Last saved: {resume.filename}
        </p>
      )}
    </div>
  );
}
