"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import Link from "next/link";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable,
  horizontalListSortingStrategy, verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getSavedJobs, getSavedSkills, unsaveJob, unsaveSkill, saveSkill,
  reorderSkillsInCategory, getSectionOrder, setSectionOrder,
  SavedJob, SavedSkill,
} from "@/lib/saved";
import { GROUP_STYLES } from "@/lib/conceptCategories";

const SKILLS_KEY = "joblens_saved_skills";

type Tab = "jobs" | "skills";

const SKILL_CATEGORIES = [
  "Architectures",
  "AI Safety & Interpretability",
  "Alignment & Training",
  "Optimization & Fine-tuning",
  "Inference & Serving",
  "Scaling & Evals",
  "Distributed Systems",
  "ML Frameworks",
  "Infrastructure & MLOps",
  "Data & Pipeline",
  "Languages",
  "Experiment & Tooling",
  "Math & Theory",
  "Other Concepts",
];

const DEFAULT_SKILL_CLS =
  "border-zinc-300 text-zinc-600 bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:bg-zinc-800/20";

function groupSkills(skills: SavedSkill[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const { skill, category } of skills) {
    if (!map[category]) map[category] = [];
    map[category].push(skill);
  }
  return map;
}

function SortableSkill({ skill, cls, onRemove }: { skill: string; cls: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: skill });
  return (
    <span
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-80 text-[10px] select-none"
        title="Drag to reorder"
      >
        ⠿
      </span>
      {skill}
      <button onClick={onRemove} className="opacity-50 hover:opacity-100 leading-none">✕</button>
    </span>
  );
}

function SortableSection({ id, children }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const dragHandle = (
    <span
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing opacity-30 hover:opacity-70 text-sm select-none px-0.5"
      title="Drag to reorder section"
    >
      ⠿
    </span>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      {children(dragHandle)}
    </div>
  );
}

export default function SavedPanel() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("jobs");
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [skills, setSkills] = useState<SavedSkill[]>([]);
  const [sectionOrder, setSectionOrderState] = useState<string[]>([]);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reload() {
    setJobs(getSavedJobs());
    const s = getSavedSkills();
    setSkills(s);
    setSectionOrderState(getSectionOrder());
  }

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    window.addEventListener("joblens:saved", reload);
    return () => window.removeEventListener("joblens:saved", reload);
  }, []);

  useEffect(() => { if (open) reload(); }, [open]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (addingIn) setTimeout(() => inputRef.current?.focus(), 50);
  }, [addingIn]);

  function startAdding(category: string) {
    setAddingIn(category);
    setInputVal("");
  }

  function commitAdd() {
    const val = inputVal.trim();
    if (val && addingIn) {
      saveSkill(val, addingIn);
      reload();
    }
    setAddingIn(null);
    setInputVal("");
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") commitAdd();
    if (e.key === "Escape") { setAddingIn(null); setInputVal(""); }
  }

  const grouped = groupSkills(skills);

  // Merge saved order with active categories — new categories append to end
  const activeCategories = (() => {
    const active = new Set(SKILL_CATEGORIES.filter((c) => grouped[c]));
    const ordered = sectionOrder.filter((c) => active.has(c));
    const remaining = [...active].filter((c) => !sectionOrder.includes(c));
    return [...ordered, ...remaining];
  })();

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = activeCategories.indexOf(String(active.id));
    const newIdx = activeCategories.indexOf(String(over.id));
    if (oldIdx !== -1 && newIdx !== -1) {
      const reordered = arrayMove(activeCategories, oldIdx, newIdx);
      setSectionOrder(reordered);
      setSectionOrderState(reordered);
    }
  }
  // Categories with no skills get no section unless user clicks "Add to section"

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Saved items"
        className="relative w-8 h-8 flex items-center justify-center rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        {jobs.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {jobs.length > 99 ? "99" : jobs.length}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-10 w-screen max-w-sm sm:w-96 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Saved</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 text-xs">✕</button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-zinc-800">
            {(["jobs", "skills"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  tab === t
                    ? "text-gray-900 dark:text-zinc-100 border-b-2 border-gray-900 dark:border-zinc-100"
                    : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
                }`}
              >
                {t === "jobs" ? `Jobs (${jobs.length})` : `Skills (${skills.length})`}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="max-h-[28rem] overflow-y-auto">

            {/* Jobs tab */}
            {tab === "jobs" && (
              <>
                {jobs.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-zinc-500 text-center py-8 px-4">
                    No saved jobs yet.<br />Click the bookmark on any job detail page.
                  </p>
                ) : (
                  <ul>
                    {jobs.map((job) => (
                      <li key={job.id} className="flex items-start gap-2 px-4 py-3 border-b border-gray-50 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/jobs/${job.id}`}
                            onClick={() => setOpen(false)}
                            className="text-sm font-medium text-gray-800 dark:text-zinc-200 hover:underline truncate block"
                          >
                            {job.title}
                          </Link>
                          <p className="text-xs text-gray-400 dark:text-zinc-500 truncate mt-0.5">{job.company}</p>
                        </div>
                        <div className="flex gap-2 shrink-0 mt-0.5">
                          <a href={job.url} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300" title="Apply">
                            ↗
                          </a>
                          <button onClick={() => { unsaveJob(job.id); reload(); }}
                            className="text-[11px] text-gray-300 hover:text-red-400 dark:text-zinc-600 dark:hover:text-red-400" title="Remove">
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* Skills tab */}
            {tab === "skills" && (
              <div className="p-4 space-y-5">
                {skills.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-zinc-500 text-center py-4">
                    No saved skills yet.<br />Click ☆ on any skill in the landscape or job analysis.
                  </p>
                )}

                {skills.length > 0 && (
                  <div className="flex justify-end mb-1">
                    <button
                      onClick={() => {
                        localStorage.removeItem(SKILLS_KEY);
                        reload();
                      }}
                      className="text-[10px] text-gray-300 dark:text-zinc-600 hover:text-red-400 dark:hover:text-red-400"
                    >
                      Clear all skills
                    </button>
                  </div>
                )}

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                  <SortableContext items={activeCategories} strategy={verticalListSortingStrategy}>
                    <div className="space-y-5">
                      {activeCategories.map((category) => {
                        const cls = GROUP_STYLES[category] ?? DEFAULT_SKILL_CLS;
                        const categorySkills = grouped[category] ?? [];

                        function handleSkillDragEnd(event: DragEndEvent) {
                          const { active, over } = event;
                          if (!over || active.id === over.id) return;
                          const oldIdx = categorySkills.indexOf(String(active.id));
                          const newIdx = categorySkills.indexOf(String(over.id));
                          if (oldIdx !== -1 && newIdx !== -1) {
                            reorderSkillsInCategory(category, oldIdx, newIdx);
                            reload();
                          }
                        }

                        return (
                          <SortableSection key={category} id={category}>
                            {(dragHandle) => (
                              <>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1">
                                    {dragHandle}
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-zinc-500 font-semibold">
                                      {category}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => startAdding(category)}
                                    className="text-[10px] text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                                  >
                                    + add
                                  </button>
                                </div>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSkillDragEnd}>
                                  <SortableContext items={categorySkills} strategy={horizontalListSortingStrategy}>
                                    <div className="flex flex-wrap gap-1.5">
                                      {categorySkills.map((skill) => (
                                        <SortableSkill
                                          key={skill}
                                          skill={skill}
                                          cls={cls}
                                          onRemove={() => { unsaveSkill(skill); reload(); }}
                                        />
                                      ))}
                                      {addingIn === category && (
                                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cls}`}>
                                          <input
                                            ref={inputRef}
                                            value={inputVal}
                                            onChange={(e) => setInputVal(e.target.value)}
                                            onKeyDown={onKeyDown}
                                            onBlur={commitAdd}
                                            placeholder="skill name…"
                                            className="bg-transparent outline-none w-24 placeholder:opacity-50"
                                          />
                                        </span>
                                      )}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                              </>
                            )}
                          </SortableSection>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Add to a new category */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-600 font-semibold mb-2">
                    Add to another section
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {SKILL_CATEGORIES.filter((c) => !grouped[c]).map((c) => (
                      <button
                        key={c}
                        onClick={() => startAdding(c)}
                        className="text-[10px] border border-dashed border-gray-300 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 px-2 py-0.5 rounded-full"
                      >
                        + {c}
                      </button>
                    ))}
                  </div>
                  {addingIn && !grouped[addingIn] && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 dark:text-zinc-400">{addingIn}:</span>
                      <input
                        ref={inputRef}
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onKeyDown={onKeyDown}
                        onBlur={commitAdd}
                        placeholder="skill name…"
                        className="text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded px-2 py-1 outline-none flex-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
