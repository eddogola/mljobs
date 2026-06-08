"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ResumePage() {
  const [resume, setResume] = useState<{ filename: string; content: string } | null>(null);
  const [pasted, setPasted] = useState("");
  const [filename, setFilename] = useState("my-resume");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "uploading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${BASE}/api/resume`).then((r) => r.ok ? r.json() : null).then((r) => {
      if (r) { setResume(r); setPasted(r.content); }
    });
  }, []);

  async function saveText() {
    if (!pasted.trim()) return;
    setStatus("saving");
    await fetch(`${BASE}/api/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: filename || "my-resume", content: pasted }),
    });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  async function uploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");
    const form = new FormData();
    form.append("file", file);
    const r = await fetch(`${BASE}/api/resume/upload-pdf`, { method: "POST", body: form });
    if (r.ok) {
      const data = await r.json();
      setResume({ filename: data.filename, content: "" });
      setFilename(data.filename.replace(".pdf", ""));
      // reload full content
      const full = await fetch(`${BASE}/api/resume`);
      if (full.ok) { const d = await full.json(); setPasted(d.content); }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      const err = await r.json();
      setErrorMsg(err.detail || "Upload failed");
      setStatus("error");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const busy = status === "saving" || status === "uploading";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300">← Back</Link>
        <ThemeToggle />
      </div>

      <h1 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1">Resume</h1>
      <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
        Upload a PDF or paste as text. Used to tailor your resume per job.
      </p>

      {/* Upload / save bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className={`cursor-pointer text-sm px-4 py-1.5 rounded border transition-colors ${busy ? "opacity-40 pointer-events-none" : ""} bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800`}>
          {status === "uploading" ? "Uploading…" : "Upload PDF"}
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={uploadPdf} />
        </label>

        <span className="text-xs text-gray-400 dark:text-zinc-600">or paste below</span>

        <div className="flex items-center gap-2 ml-auto">
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="filename"
            className="text-sm border border-gray-200 dark:border-zinc-700 rounded px-3 py-1.5 bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 w-40"
          />
          <button
            onClick={saveText}
            disabled={busy || !pasted.trim()}
            className="text-sm bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-1.5 rounded hover:bg-gray-700 dark:hover:bg-zinc-300 disabled:opacity-40 transition-colors"
          >
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save text"}
          </button>
        </div>
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{errorMsg}</p>
      )}

      <textarea
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        rows={30}
        placeholder="Paste your resume here, or upload a PDF above to auto-extract the text…"
        className="w-full text-sm font-mono border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 resize-y leading-relaxed focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-zinc-600"
      />

      {resume && (
        <p className="text-xs text-gray-400 dark:text-zinc-600 mt-2">Current: {resume.filename}</p>
      )}
    </div>
  );
}
