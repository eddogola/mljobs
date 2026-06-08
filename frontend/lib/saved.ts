"use client";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN = process.env.NEXT_PUBLIC_PERSONAL_TOKEN ?? "";

export interface SavedJob {
  job_id: string;
  title: string;
  company: string;
  url: string;
  saved_at: string;
}

export interface SavedSkill {
  skill: string;
  category: string;
}

// ── Local cache keys (used for instant reads while API is in-flight) ──────────

const JOBS_CACHE = "joblens_saved_jobs";
const SKILLS_CACHE = "joblens_saved_skills";
const SECTION_ORDER_CACHE = "joblens_section_order";

function headers() {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (TOKEN) h["x-personal-token"] = TOKEN;
  return h;
}

function notify() {
  window.dispatchEvent(new Event("joblens:saved"));
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export function getCachedJobs(): SavedJob[] {
  try { return JSON.parse(localStorage.getItem(JOBS_CACHE) ?? "[]"); }
  catch { return []; }
}

export async function fetchSavedJobs(): Promise<SavedJob[]> {
  const res = await fetch(`${BASE}/api/saved/jobs`, { headers: headers() });
  if (!res.ok) return getCachedJobs();
  const data: SavedJob[] = await res.json();
  localStorage.setItem(JOBS_CACHE, JSON.stringify(data));
  return data;
}

export async function saveJob(job: Omit<SavedJob, "saved_at">): Promise<void> {
  // Optimistic: update cache immediately
  const current = getCachedJobs().filter((j) => j.job_id !== job.job_id);
  localStorage.setItem(JOBS_CACHE, JSON.stringify([{ ...job, saved_at: new Date().toISOString() }, ...current]));
  notify();
  await fetch(`${BASE}/api/saved/jobs`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(job),
  });
}

export async function unsaveJob(job_id: string): Promise<void> {
  // Optimistic
  const current = getCachedJobs().filter((j) => j.job_id !== job_id);
  localStorage.setItem(JOBS_CACHE, JSON.stringify(current));
  notify();
  await fetch(`${BASE}/api/saved/jobs/${encodeURIComponent(job_id)}`, {
    method: "DELETE",
    headers: headers(),
  });
}

export function isJobSaved(job_id: string): boolean {
  return getCachedJobs().some((j) => j.job_id === job_id);
}

// ── Skills ────────────────────────────────────────────────────────────────────

export function getCachedSkills(): SavedSkill[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SKILLS_CACHE) ?? "[]");
    // Migrate old flat string[] format
    if (raw.length > 0 && typeof raw[0] === "string") {
      return (raw as string[]).map((s) => ({ skill: s, category: "Other Concepts" }));
    }
    return raw as SavedSkill[];
  } catch { return []; }
}

export async function fetchSavedSkills(): Promise<{ skills: SavedSkill[]; section_order: Record<string, number> }> {
  const res = await fetch(`${BASE}/api/saved/skills`, { headers: headers() });
  if (!res.ok) {
    return { skills: getCachedSkills(), section_order: getCachedSectionOrder() };
  }
  const data = await res.json();
  localStorage.setItem(SKILLS_CACHE, JSON.stringify(data.skills));
  localStorage.setItem(SECTION_ORDER_CACHE, JSON.stringify(data.section_order));
  return data;
}

export async function saveSkill(skill: string, category: string): Promise<void> {
  const current = getCachedSkills().filter((s) => s.skill !== skill);
  localStorage.setItem(SKILLS_CACHE, JSON.stringify([{ skill, category }, ...current]));
  notify();
  await fetch(`${BASE}/api/saved/skills`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ skill, category }),
  });
}

export async function unsaveSkill(skill: string): Promise<void> {
  const current = getCachedSkills().filter((s) => s.skill !== skill);
  localStorage.setItem(SKILLS_CACHE, JSON.stringify(current));
  notify();
  await fetch(`${BASE}/api/saved/skills/${encodeURIComponent(skill)}`, {
    method: "DELETE",
    headers: headers(),
  });
}

export function isSkillSaved(skill: string): boolean {
  return getCachedSkills().some((s) => s.skill === skill);
}

// ── Skill confidence ──────────────────────────────────────────────────────────

export interface ConfidenceEntry {
  value: number;       // 1-5
  recorded_at: string;
}

export async function logSkillConfidence(skill: string, value: number): Promise<void> {
  await fetch(`${BASE}/api/saved/skills/${encodeURIComponent(skill)}/confidence`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ value }),
  });
}

export async function fetchSkillConfidenceHistory(skill: string): Promise<ConfidenceEntry[]> {
  const res = await fetch(`${BASE}/api/saved/skills/${encodeURIComponent(skill)}/confidence`, { headers: headers() });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAllConfidenceHistory(): Promise<Record<string, ConfidenceEntry[]>> {
  const res = await fetch(`${BASE}/api/saved/skills/confidence`, { headers: headers() });
  if (!res.ok) return {};
  return res.json();
}

// ── Section order ─────────────────────────────────────────────────────────────

export function getCachedSectionOrder(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SECTION_ORDER_CACHE) ?? "{}"); }
  catch { return {}; }
}

export function getCachedSectionOrderArray(): string[] {
  const map = getCachedSectionOrder();
  return Object.entries(map).sort((a, b) => a[1] - b[1]).map(([k]) => k);
}

export async function setSectionOrder(categories: string[]): Promise<void> {
  const map = Object.fromEntries(categories.map((c, i) => [c, i]));
  localStorage.setItem(SECTION_ORDER_CACHE, JSON.stringify(map));
  notify();
  await fetch(`${BASE}/api/saved/sections/reorder`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ categories }),
  });
}

// ── Skill reorder within category ─────────────────────────────────────────────

export async function reorderSkillsInCategory(category: string, oldIdx: number, newIdx: number): Promise<void> {
  const skills = getCachedSkills();
  const catSkills = skills.filter((s) => s.category === category);
  const [moved] = catSkills.splice(oldIdx, 1);
  catSkills.splice(newIdx, 0, moved);

  // Rebuild full list preserving other categories' order
  const otherSkills = skills.filter((s) => s.category !== category);
  localStorage.setItem(SKILLS_CACHE, JSON.stringify([...otherSkills, ...catSkills]));
  notify();

  await fetch(`${BASE}/api/saved/skills/reorder`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ category, skills: catSkills.map((s) => s.skill) }),
  });
}
