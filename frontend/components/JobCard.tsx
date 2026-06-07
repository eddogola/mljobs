"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { JobListItem } from "@/lib/api";
import { timeAgo, remoteLabel } from "@/lib/utils";

const LIGHT_AVATARS = [
  { bg: "#E8F0FE", text: "#1A56CC" }, // blue
  { bg: "#FDE8F0", text: "#C0175D" }, // pink
  { bg: "#E6F9F1", text: "#0F7148" }, // green
  { bg: "#FEF3E2", text: "#92400E" }, // amber
  { bg: "#F0EBFE", text: "#5B21B6" }, // purple
  { bg: "#FEE8E8", text: "#991B1B" }, // red
  { bg: "#E0F7FA", text: "#00696F" }, // teal
  { bg: "#FFF8E1", text: "#78540B" }, // yellow
];

const DARK_AVATARS = [
  { bg: "#1e3454", text: "#93c5fd" }, // blue
  { bg: "#4a1a2e", text: "#f9a8d4" }, // pink
  { bg: "#0d3326", text: "#6ee7b7" }, // green
  { bg: "#3d2008", text: "#fcd34d" }, // amber
  { bg: "#2d1f5e", text: "#c4b5fd" }, // purple
  { bg: "#3d0f0f", text: "#fca5a5" }, // red
  { bg: "#0a3335", text: "#5eead4" }, // teal
  { bg: "#3d2d00", text: "#fde68a" }, // yellow
];

function avatarIndex(company: string) {
  let hash = 0;
  for (let i = 0; i < company.length; i++) hash = company.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % LIGHT_AVATARS.length;
}

function initials(company: string) {
  return company
    .split(/[\s&,./]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// Light tag colors
const DOMAIN_TAG_LIGHT = "text-[#185FA5] bg-[#E6F1FB]";
const LEVEL_TAG_LIGHT: Record<string, string> = {
  Entry:     "bg-[#E6F1FB] text-[#185FA5]",
  Mid:       "bg-[#E1F5EE] text-[#0F6E56]",
  Senior:    "bg-[#E1F5EE] text-[#0F6E56]",
  Staff:     "bg-[#FAEEDA] text-[#854F0B]",
  Principal: "bg-[#EEEDFE] text-[#534AB7]",
  Research:  "bg-[#EEEDFE] text-[#534AB7]",
};

// Dark tag colors
const DOMAIN_TAG_DARK = "text-[#93c5fd] bg-[#1e3454]";
const LEVEL_TAG_DARK: Record<string, string> = {
  Entry:     "bg-[#1e3454] text-[#93c5fd]",
  Mid:       "bg-[#0d3326] text-[#6ee7b7]",
  Senior:    "bg-[#0d3326] text-[#6ee7b7]",
  Staff:     "bg-[#3d2008] text-[#fcd34d]",
  Principal: "bg-[#2d1f5e] text-[#c4b5fd]",
  Research:  "bg-[#2d1f5e] text-[#c4b5fd]",
};

export default function JobCard({ job }: { job: JobListItem }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const idx = avatarIndex(job.company);
  const palette = dark ? DARK_AVATARS[idx] : LIGHT_AVATARS[idx];
  const initStr = initials(job.company);

  const domainTag = dark ? DOMAIN_TAG_DARK : DOMAIN_TAG_LIGHT;
  const levelMap = dark ? LEVEL_TAG_DARK : LEVEL_TAG_LIGHT;
  const levelCls = job.seniority ? (levelMap[job.seniority] ?? (dark ? "bg-zinc-800 text-zinc-300" : "bg-gray-100 text-gray-600")) : null;

  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <div
        className="flex gap-[14px] items-start py-4 border-b border-gray-200 dark:border-zinc-800 hover:bg-stone-100/70 dark:hover:bg-zinc-800/50 transition-colors"
        style={{ borderBottomWidth: "0.5px" }}
      >
        {/* Col 1 — Avatar */}
        <div
          className="shrink-0 w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-xs font-medium"
          style={{
            background: palette.bg,
            color: palette.text,
            border: `0.5px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          {initStr}
        </div>

        {/* Col 2 — Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate">
                {job.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 truncate flex items-center gap-1">
                {job.company}
                {job.location && (
                  <>
                    <span className="text-gray-300 dark:text-zinc-600">·</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400 dark:text-zinc-500">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span className="truncate">{job.location}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[11px] text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                {timeAgo(job.posted_at)}
              </span>
              {job.remote && (
                <span
                  className="text-[11px] text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-[7px] py-[2px] rounded-[4px]"
                  style={{ border: `0.5px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}` }}
                >
                  {remoteLabel(job.remote)}
                </span>
              )}
            </div>
          </div>

          {(job.ml_domain || job.seniority) && (
            <div className="flex flex-wrap gap-[5px] mt-2">
              {job.ml_domain && (
                <span className={`text-[11px] font-medium px-2 py-[2px] rounded-[4px] ${domainTag}`}>
                  {job.ml_domain}
                </span>
              )}
              {job.seniority && levelCls && (
                <span className={`text-[11px] font-medium px-2 py-[2px] rounded-[4px] ${levelCls}`}>
                  {job.seniority}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
