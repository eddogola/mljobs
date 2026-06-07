"use client";

import { useState, useEffect } from "react";
import { JobAnalysis } from "@/lib/api";
import { DOMAIN_COLORS } from "@/lib/utils";
import { groupConcepts } from "@/lib/conceptCategories";
import { saveSkill, unsaveSkill, getSavedSkills } from "@/lib/saved";

function Tag({ text, variant = "default" }: { text: string; variant?: "must" | "nice" | "domain" | "default" | "warn" }) {
  const cls = {
    must: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    nice: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    domain: "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800",
    warn: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800",
    default: "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700",
  }[variant];
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${cls}`}>{text}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2">{title}</h4>
      {children}
    </div>
  );
}

export default function AnalysisPanel({ analysis }: { analysis: JobAnalysis }) {
  const [savedSkills, setSavedSkills] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = () => setSavedSkills(new Set(getSavedSkills().map((s) => s.skill)));
    load();
    window.addEventListener("joblens:saved", load);
    return () => window.removeEventListener("joblens:saved", load);
  }, []);

  function toggleSkill(skill: string, category: string) {
    if (savedSkills.has(skill)) {
      unsaveSkill(skill);
    } else {
      saveSkill(skill, category);
    }
    setSavedSkills(new Set(getSavedSkills().map((s) => s.skill)));
  }

  const domainCls = analysis.ml_domain
    ? (DOMAIN_COLORS[analysis.ml_domain] ?? "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-700")
    : "";

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2 mb-5">
        {analysis.seniority && (
          <span className="text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 px-2 py-0.5 rounded-full">
            {analysis.seniority}
          </span>
        )}
        {analysis.ml_domain && (
          <span className={`text-xs px-2 py-0.5 rounded-full border ${domainCls}`}>
            {analysis.ml_domain}
          </span>
        )}
      </div>

      {analysis.role_summary && (
        <Section title="Role Summary">
          <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">{analysis.role_summary}</p>
        </Section>
      )}

      {analysis.must_have_technical.length > 0 && (
        <Section title="Must Have — Technical">
          <div className="flex flex-wrap gap-1.5">
            {analysis.must_have_technical.map((s) => <Tag key={s} text={s} variant="must" />)}
          </div>
        </Section>
      )}

      {analysis.must_have_non_technical.length > 0 && (
        <Section title="Must Have — Non-Technical">
          <div className="flex flex-wrap gap-1.5">
            {analysis.must_have_non_technical.map((s) => <Tag key={s} text={s} />)}
          </div>
        </Section>
      )}

      {analysis.nice_to_have_technical.length > 0 && (
        <Section title="Nice to Have">
          <div className="flex flex-wrap gap-1.5">
            {analysis.nice_to_have_technical.map((s) => <Tag key={s} text={s} variant="nice" />)}
          </div>
        </Section>
      )}

      {analysis.tech_stack && (
        <Section title="Tech Stack">
          <div className="space-y-2">
            {analysis.tech_stack.frameworks.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-400 dark:text-zinc-600 uppercase mr-2">Frameworks</span>
                <div className="inline-flex flex-wrap gap-1">
                  {analysis.tech_stack.frameworks.map((s) => <Tag key={s} text={s} variant="domain" />)}
                </div>
              </div>
            )}
            {analysis.tech_stack.languages.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-400 dark:text-zinc-600 uppercase mr-2">Languages</span>
                <div className="inline-flex flex-wrap gap-1">
                  {analysis.tech_stack.languages.map((s) => <Tag key={s} text={s} />)}
                </div>
              </div>
            )}
            {analysis.tech_stack.infra.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-400 dark:text-zinc-600 uppercase mr-2">Infra</span>
                <div className="inline-flex flex-wrap gap-1">
                  {analysis.tech_stack.infra.map((s) => <Tag key={s} text={s} />)}
                </div>
              </div>
            )}
            {analysis.tech_stack.tools.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-400 dark:text-zinc-600 uppercase mr-2">Tools</span>
                <div className="inline-flex flex-wrap gap-1">
                  {analysis.tech_stack.tools.map((s) => <Tag key={s} text={s} />)}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {analysis.domain_knowledge.length > 0 && (
        <Section title="Core Concepts">
          <div className="space-y-3">
            {groupConcepts(analysis.domain_knowledge).map(({ label, cls, concepts }) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500 font-semibold mb-1.5">
                  {label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {concepts.map((c) => {
                    const isSaved = savedSkills.has(c);
                    return (
                      <span
                        key={c}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${cls}`}
                      >
                        {c}
                        <button
                          onClick={() => toggleSkill(c, label)}
                          title={isSaved ? "Remove from saved skills" : "Save skill"}
                          className={`leading-none transition-opacity ${isSaved ? "opacity-100" : "opacity-30 hover:opacity-100"}`}
                        >
                          {isSaved ? "★" : "☆"}
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {analysis.interview_topics.length > 0 && (
        <Section title="Likely Interview Topics">
          <ul className="space-y-2">
            {analysis.interview_topics.map((t, i) => (
              <li key={i} className="text-sm text-gray-800 dark:text-zinc-200 flex gap-2 bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 rounded px-3 py-2">
                <span className="text-gray-400 dark:text-zinc-600 font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.experience_signals.length > 0 && (
        <Section title="Seniority Signals">
          <ul className="space-y-1">
            {analysis.experience_signals.map((s) => (
              <li key={s} className="text-xs text-gray-500 dark:text-zinc-400 italic flex gap-2">
                <span className="text-gray-300 dark:text-zinc-600">"</span>
                <span>{s}</span>
                <span className="text-gray-300 dark:text-zinc-600">"</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.red_flags.length > 0 && (
        <Section title="Red Flags">
          <div className="flex flex-wrap gap-1.5">
            {analysis.red_flags.map((f) => <Tag key={f} text={f} variant="warn" />)}
          </div>
        </Section>
      )}
    </div>
  );
}
