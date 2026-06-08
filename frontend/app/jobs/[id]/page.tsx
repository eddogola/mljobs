"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import AnalysisPanel from "@/components/AnalysisPanel";
import ThemeToggle from "@/components/ThemeToggle";
import SavedPanel from "@/components/SavedPanel";
import { fetchJob } from "@/lib/api";
import { timeAgo, remoteLabel, sourceLabel } from "@/lib/utils";
import { saveJob, unsaveJob, isJobSaved, fetchSavedJobs } from "@/lib/saved";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: job, isLoading, error } = useSWR(id, () => fetchJob(id));
  const [saved, setSaved] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [tailored, setTailored] = useState<string | null>(null);
  const [tailorPhase, setTailorPhase] = useState<"idle" | "connecting" | "writing" | "done">("idle");
  const tailoredRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (tailorPhase === "writing" && tailored && !hasScrolled.current) {
      hasScrolled.current = true;
      tailoredRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (tailorPhase === "idle") hasScrolled.current = false;
  }, [tailored, tailorPhase]);

  async function tailorResume() {
    setTailoring(true);
    setTailored("");
    setTailorPhase("connecting");

    const r = await fetch(`${BASE}/api/resume/tailor/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      if (r.status === 404) alert(err.detail || "Upload your resume first at /resume");
      setTailoring(false);
      setTailorPhase("idle");
      return;
    }

    setTailorPhase("writing");
    const reader = r.body!.getReader();
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      setTailored(full);
    }
    setTailoring(false);
    setTailorPhase("done");
  }

  useEffect(() => {
    setSaved(isJobSaved(id));           // instant from cache
    fetchSavedJobs().then((jobs) => {   // then verify against server
      setSaved(jobs.some((j) => j.job_id === id));
    });
  }, [id]);

  async function toggleSave() {
    if (!job) return;
    if (saved) {
      setSaved(false);
      await unsaveJob(id);
    } else {
      setSaved(true);
      await saveJob({ job_id: id, title: job.title, company: job.company, url: job.url });
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="text-gray-400 dark:text-zinc-600 text-sm">Loading...</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/" className="text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300">← Back</Link>
        <div className="mt-8 text-gray-500 dark:text-zinc-500 text-sm">Job not found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300 inline-flex items-center gap-1">
          ← Back to jobs
        </Link>
        <div className="flex items-center gap-1">
          <SavedPanel />
          <ThemeToggle />
        </div>
      </div>

      {/* Job header */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">
              {sourceLabel(job.source)} · {timeAgo(job.posted_at)}
              {job.remote && ` · ${remoteLabel(job.remote)}`}
            </p>
            <h1 className="text-lg font-bold text-gray-900 dark:text-zinc-100">{job.title}</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{job.company}</p>
            {job.location && (
              <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">{job.location}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={toggleSave}
              title={saved ? "Remove from saved" : "Save job"}
              className={`text-sm px-3 py-2 rounded border transition-colors ${
                saved
                  ? "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400"
                  : "bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-600"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button
              onClick={tailorResume}
              disabled={tailoring}
              className="text-sm bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 px-3 py-2 rounded border border-gray-200 dark:border-zinc-700 transition-colors disabled:opacity-50 min-w-[120px]"
            >
              {tailorPhase === "connecting" ? "Connecting…"
                : tailorPhase === "writing" ? "Writing…"
                : tailorPhase === "done" ? "Done ✓"
                : "Tailor resume"}
            </button>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 px-4 py-2 rounded border border-gray-200 dark:border-zinc-700 transition-colors"
            >
              Apply →
            </a>
          </div>
        </div>
      </div>

      {/* Team / outreach */}
      {job.analysis && (job.analysis.team_name || job.analysis.hiring_manager) && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">Team & Outreach</h2>
          <div className="flex flex-wrap items-center gap-4">
            {job.analysis.team_name && (
              <div>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mb-0.5">Team / Org</p>
                <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">{job.analysis.team_name}</p>
              </div>
            )}
            {job.analysis.hiring_manager && (
              <div>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mb-0.5">Hiring Manager</p>
                <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">{job.analysis.hiring_manager}</p>
              </div>
            )}
            <a
              href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
                [job.analysis.team_name, job.company].filter(Boolean).join(" ")
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded transition-colors"
            >
              Find team on LinkedIn →
            </a>
          </div>
        </div>
      )}

      {/* Analysis */}
      {job.analysis ? (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-5">Role Analysis</h2>
          <AnalysisPanel analysis={job.analysis} />
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-5">
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            {job.parse_status === "unparsed"
              ? "Analysis is pending — check back shortly."
              : "Analysis could not be generated for this job."}
          </p>
        </div>
      )}

      {/* Tailored resume output */}
      {(tailored !== null && tailored !== "") && (
        <div ref={tailoredRef} className="mt-4 border border-gray-200 dark:border-zinc-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 print:hidden">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Tailored Resume</h2>
              {tailorPhase === "writing" && (
                <span className="text-xs text-gray-400 dark:text-zinc-500 animate-pulse">writing…</span>
              )}
            </div>
            {tailorPhase === "done" && (
              <button
                onClick={() => window.print()}
                className="text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 px-3 py-1.5 rounded border border-gray-200 dark:border-zinc-700 transition-colors print:hidden"
              >
                Download PDF (print)
              </button>
            )}
          </div>
          <pre className="text-sm text-gray-800 dark:text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed print-area">
            {tailored}
            {tailorPhase === "writing" && <span className="animate-pulse">▍</span>}
          </pre>
        </div>
      )}

      <details className="mt-4">
        <summary className="text-xs text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 cursor-pointer select-none py-2">
          View raw job description
        </summary>
        <div
          className="mt-3 text-xs text-gray-600 dark:text-zinc-400 leading-relaxed border border-gray-200 dark:border-zinc-800 rounded-lg p-4 whitespace-pre-wrap max-h-96 overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: job.description }}
        />
      </details>
    </div>
  );
}
