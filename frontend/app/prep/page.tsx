"use client";

import { useState, KeyboardEvent } from "react";
import Link from "next/link";
import useSWR from "swr";
import ThemeToggle from "@/components/ThemeToggle";
import SavedPanel from "@/components/SavedPanel";
import { GROUP_STYLES } from "@/lib/conceptCategories";
import {
  fetchPrepResources, addPrepResource, updatePrepResource, deletePrepResource,
  PrepResource,
} from "@/lib/prep";

const RESOURCE_TYPES = ["Article", "Video", "Course", "Practice", "Other"];

const DEFAULT_SKILL_CLS =
  "border-zinc-300 text-zinc-600 bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:bg-zinc-800/20";

function AddResourceForm({ onAdded }: { onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [resourceType, setResourceType] = useState(RESOURCE_TYPES[0]);
  const [notes, setNotes] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addSkill() {
    const val = skillInput.trim();
    if (val && !skills.includes(val)) setSkills((s) => [...s, val]);
    setSkillInput("");
  }

  function onSkillKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    }
    if (e.key === "Backspace" && !skillInput && skills.length) {
      setSkills((s) => s.slice(0, -1));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSubmitting(true);
    try {
      await addPrepResource({
        title: title.trim(),
        url: url.trim(),
        resource_type: resourceType,
        notes: notes.trim() || null,
        skills,
      });
      setTitle(""); setUrl(""); setNotes(""); setSkills([]); setSkillInput("");
      setResourceType(RESOURCE_TYPES[0]);
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-gray-200 dark:border-zinc-800 rounded-lg p-3 space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Add resource</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-2.5 py-1.5 outline-none"
          required
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          type="url"
          className="text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-2.5 py-1.5 outline-none"
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <select
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
          className="text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-2.5 py-1.5 outline-none"
        >
          {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex-1 flex flex-wrap items-center gap-1 text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-2 py-1">
          {skills.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
              {s}
              <button type="button" onClick={() => setSkills((arr) => arr.filter((x) => x !== s))} className="opacity-50 hover:opacity-100 leading-none">✕</button>
            </span>
          ))}
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={onSkillKeyDown}
            onBlur={addSkill}
            placeholder={skills.length ? "" : "skill tags… (enter to add)"}
            className="flex-1 min-w-[8rem] bg-transparent outline-none text-sm py-0.5"
          />
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional) — why this is useful, what to focus on…"
        rows={2}
        className="w-full text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-2.5 py-1.5 outline-none resize-none"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !title.trim() || !url.trim()}
          className="text-xs font-medium px-3 py-1.5 rounded-md bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-40 hover:opacity-90"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>
    </form>
  );
}

function ResourceRow({
  resource, active, onOpen, onToggleComplete, onDelete,
}: {
  resource: PrepResource;
  active: boolean;
  onOpen: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={`px-3 py-2.5 border-b border-gray-50 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 ${active ? "bg-gray-50 dark:bg-zinc-800/60" : ""}`}>
      <div className="flex items-start gap-2.5">
        <button
          onClick={onToggleComplete}
          title={resource.completed ? "Mark as not done" : "Mark as done"}
          className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center text-[10px] leading-none transition-colors ${
            resource.completed
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-gray-300 dark:border-zinc-600 text-transparent hover:border-gray-400 dark:hover:border-zinc-500"
          }`}
        >
          ✓
        </button>
        <div className="flex-1 min-w-0">
          <button
            onClick={onOpen}
            className={`text-sm font-medium text-left hover:underline truncate block ${
              resource.completed ? "text-gray-400 dark:text-zinc-500 line-through" : "text-gray-800 dark:text-zinc-200"
            }`}
          >
            {resource.title}
          </button>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {resource.resource_type && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400">
                {resource.resource_type}
              </span>
            )}
            {resource.skills.map((skill) => {
              const cls = GROUP_STYLES[skill] ?? DEFAULT_SKILL_CLS;
              return (
                <span key={skill} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${cls}`}>
                  {skill}
                </span>
              );
            })}
          </div>
          {resource.notes && (
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 whitespace-pre-wrap">{resource.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <a href={resource.url} target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300" title="Open in new tab">
            ↗
          </a>
          <button onClick={onDelete}
            className="text-[11px] text-gray-300 hover:text-red-400 dark:text-zinc-600 dark:hover:text-red-400" title="Remove">
            ✕
          </button>
        </div>
      </div>
    </li>
  );
}

export default function PrepPage() {
  const { data: resources, isLoading, mutate } = useSWR<PrepResource[]>("prep-resources", fetchPrepResources);
  const [activeId, setActiveId] = useState<string | null>(null);

  // If the active resource was removed, the lookup below naturally returns null
  // and the preview pane disappears — no extra effect needed.
  const active = resources?.find((r) => r.id === activeId) ?? null;

  async function toggleComplete(r: PrepResource) {
    await mutate(
      async (current) => {
        await updatePrepResource(r.id, { completed: !r.completed });
        return current?.map((x) => (x.id === r.id ? { ...x, completed: !r.completed } : x));
      },
      { optimisticData: resources?.map((x) => (x.id === r.id ? { ...x, completed: !r.completed } : x)), revalidate: false }
    );
  }

  async function remove(r: PrepResource) {
    await mutate(
      async (current) => {
        await deletePrepResource(r.id);
        return current?.filter((x) => x.id !== r.id);
      },
      { optimisticData: resources?.filter((x) => x.id !== r.id), revalidate: false }
    );
  }

  const incomplete = (resources ?? []).filter((r) => !r.completed);
  const completed = (resources ?? []).filter((r) => r.completed);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-4 lg:py-6">
      <div className="mb-4 lg:mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300 inline-flex items-center gap-1">
            ← Back to jobs
          </Link>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight mt-1">Interview Prep</h1>
          <p className="text-xs lg:text-sm text-gray-500 dark:text-zinc-500 mt-0.5">
            Links to material worth reviewing, tagged by skill · {incomplete.length} to go
          </p>
        </div>
        <div className="flex items-center gap-1">
          <SavedPanel />
          <ThemeToggle />
        </div>
      </div>

      <div className={`grid gap-4 ${active ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "lg:grid-cols-1"}`}>
        {/* Left: list + add form */}
        <div className="space-y-4 min-w-0">
          <AddResourceForm onAdded={() => mutate()} />

          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-transparent">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                To review {resources ? `(${incomplete.length})` : ""}
              </h2>
            </div>
            {isLoading ? (
              <p className="text-xs text-gray-400 dark:text-zinc-600 px-3 py-6 text-center">Loading…</p>
            ) : incomplete.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-zinc-500 px-3 py-6 text-center">
                Nothing here yet. Add a link above to get started.
              </p>
            ) : (
              <ul>
                {incomplete.map((r) => (
                  <ResourceRow
                    key={r.id}
                    resource={r}
                    active={r.id === activeId}
                    onOpen={() => setActiveId(r.id === activeId ? null : r.id)}
                    onToggleComplete={() => toggleComplete(r)}
                    onDelete={() => remove(r)}
                  />
                ))}
              </ul>
            )}
          </div>

          {completed.length > 0 && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-3 py-2.5 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-transparent">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Completed ({completed.length})
                </h2>
              </div>
              <ul>
                {completed.map((r) => (
                  <ResourceRow
                    key={r.id}
                    resource={r}
                    active={r.id === activeId}
                    onOpen={() => setActiveId(r.id === activeId ? null : r.id)}
                    onToggleComplete={() => toggleComplete(r)}
                    onDelete={() => remove(r)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: inline preview */}
        {active && (
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden flex flex-col lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)]">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between gap-2 bg-white dark:bg-transparent">
              <span className="text-xs text-gray-700 dark:text-zinc-300 truncate">{active.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                <a href={active.url} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300" title="Open in new tab">
                  Open in new tab ↗
                </a>
                <button onClick={() => setActiveId(null)} className="text-[11px] text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300">
                  Close ✕
                </button>
              </div>
            </div>
            <iframe
              key={active.id}
              src={active.url}
              className="flex-1 w-full min-h-[28rem] bg-white"
              title={active.title}
            />
            <p className="px-3 py-1.5 text-[10px] text-gray-400 dark:text-zinc-600 border-t border-gray-100 dark:border-zinc-800">
              Some sites block embedding — use &ldquo;Open in new tab&rdquo; if the preview stays blank.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
