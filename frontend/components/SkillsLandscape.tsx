"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { GROUP_STYLES } from "@/lib/conceptCategories";
import { saveSkill, unsaveSkill, getCachedSkills, fetchSavedSkills } from "@/lib/saved";

interface SkillEntry {
  skill: string;
  count: number;
}

interface LandscapeData {
  total_parsed: number;
  groups: Record<string, SkillEntry[]>;
}

interface Props {
  activeSkill?: string;
  onSkillClick: (skill: string) => void;
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEFAULT_CLS =
  "border-zinc-300 text-zinc-600 bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:bg-zinc-800/20";

const DISPLAY_ORDER = [
  "ML Frameworks",
  "Architectures",
  "AI Safety & Interpretability",
  "Alignment & Training",
  "Optimization & Fine-tuning",
  "Inference & Serving",
  "Scaling & Evals",
  "Distributed Systems",
  "Languages",
  "Infrastructure & MLOps",
  "Data & Pipeline",
  "Experiment & Tooling",
  "Math & Theory",
  "Other Concepts",
];

export default function SkillsLandscape({ activeSkill, onSkillClick }: Props) {
  // All hooks before any early returns
  const { data, isLoading } = useSWR<LandscapeData>(
    "skills",
    () => fetch(`${BASE}/api/jobs/skills`).then((r) => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  const [savedSkills, setSavedSkills] = useState<Set<string>>(new Set());
  useEffect(() => {
    const load = () => setSavedSkills(new Set(getCachedSkills().map((s) => s.skill)));
    load();
    fetchSavedSkills().then(({ skills }) => setSavedSkills(new Set(skills.map((s) => s.skill))));
    window.addEventListener("joblens:saved", load);
    return () => window.removeEventListener("joblens:saved", load);
  }, []);

  function toggleSkillSave(skill: string, group: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (savedSkills.has(skill)) {
      setSavedSkills((prev) => { const n = new Set(prev); n.delete(skill); return n; });
      unsaveSkill(skill);
    } else {
      setSavedSkills((prev) => new Set(prev).add(skill));
      saveSkill(skill, group);
    }
  }

  if (isLoading) {
    return (
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
        <p className="text-xs text-gray-400 dark:text-zinc-600">Building skills landscape...</p>
      </div>
    );
  }

  if (!data || !Object.keys(data.groups).length) return null;

  const { groups, total_parsed } = data;

  const sortedGroups = [
    ...DISPLAY_ORDER.filter((g) => groups[g]),
    ...Object.keys(groups).filter((g) => !DISPLAY_ORDER.includes(g)),
  ];

  return (
    <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-transparent">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
          Skills Landscape
        </h2>
        <span className="text-[10px] text-gray-400 dark:text-zinc-500">{total_parsed} jobs</span>
      </div>

      {activeSkill && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/60 flex items-center justify-between">
          <span className="text-xs text-gray-700 dark:text-zinc-300">
            Filtered: <span className="text-gray-900 dark:text-white font-medium">{activeSkill}</span>
          </span>
          <button
            onClick={() => onSkillClick("")}
            className="text-[10px] text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
          >
            Clear ✕
          </button>
        </div>
      )}

      <div className="p-3 space-y-4 bg-white dark:bg-transparent">
        {sortedGroups.map((group) => {
          const cls = GROUP_STYLES[group] ?? DEFAULT_CLS;
          return (
            <div key={group}>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-zinc-500 mb-1.5 font-semibold">
                {group}
              </p>
              <div className="flex flex-wrap gap-1">
                {groups[group].map(({ skill, count }) => {
                  const isActive = activeSkill === skill;
                  const maxCount = groups[group][0]?.count ?? 1;
                  const opacity = isActive ? 1 : Math.max(0.5, count / maxCount);
                  const isSaved = savedSkills.has(skill);
                  return (
                    <span
                      key={skill}
                      className={`
                        group/tag inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border
                        transition-all
                        ${cls}
                        ${isActive ? "ring-2 ring-offset-1 ring-current" : "hover:brightness-95 dark:hover:brightness-125"}
                      `}
                      style={{ opacity }}
                    >
                      <button
                        onClick={() => onSkillClick(isActive ? "" : skill)}
                        title={`${count} job${count !== 1 ? "s" : ""} — click to filter`}
                        className="cursor-pointer"
                      >
                        {skill}
                      </button>
                      <span className="text-[9px] opacity-60">{count}</span>
                      <button
                        onClick={(e) => toggleSkillSave(skill, group, e)}
                        title={isSaved ? "Remove from saved skills" : "Save skill"}
                        className={`ml-0.5 leading-none transition-opacity ${
                          isSaved ? "opacity-100" : "opacity-30 hover:opacity-100"
                        }`}
                      >
                        {isSaved ? "★" : "☆"}
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
