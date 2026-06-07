"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import AnalysisPanel from "@/components/AnalysisPanel";
import ThemeToggle from "@/components/ThemeToggle";
import SavedPanel from "@/components/SavedPanel";
import { fetchJob } from "@/lib/api";
import { timeAgo, remoteLabel, sourceLabel } from "@/lib/utils";
import { saveJob, unsaveJob, isJobSaved } from "@/lib/saved";

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: job, isLoading, error } = useSWR(id, () => fetchJob(id));
  const [saved, setSaved] = useState(false);

  useEffect(() => { setSaved(isJobSaved(id)); }, [id]);

  function toggleSave() {
    if (!job) return;
    if (saved) {
      unsaveJob(id);
      setSaved(false);
    } else {
      saveJob({ id, title: job.title, company: job.company, url: job.url, savedAt: new Date().toISOString() });
      setSaved(true);
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
