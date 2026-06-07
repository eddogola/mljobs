"use client";

export interface SavedJob {
  id: string;
  title: string;
  company: string;
  url: string;
  savedAt: string;
}

export interface SavedSkill {
  skill: string;
  category: string;
}

const JOBS_KEY = "joblens_saved_jobs";
const SKILLS_KEY = "joblens_saved_skills";

function notify() {
  window.dispatchEvent(new Event("joblens:saved"));
}

// --- Jobs ---

export function getSavedJobs(): SavedJob[] {
  try {
    return JSON.parse(localStorage.getItem(JOBS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveJob(job: SavedJob): void {
  const jobs = getSavedJobs().filter((j) => j.id !== job.id);
  localStorage.setItem(JOBS_KEY, JSON.stringify([job, ...jobs]));
  notify();
}

export function unsaveJob(id: string): void {
  const jobs = getSavedJobs().filter((j) => j.id !== id);
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  notify();
}

export function isJobSaved(id: string): boolean {
  return getSavedJobs().some((j) => j.id === id);
}

// --- Skills ---

export function getSavedSkills(): SavedSkill[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SKILLS_KEY) ?? "[]");
    // Migrate old flat string[] format — write back so migration only runs once
    if (raw.length > 0 && typeof raw[0] === "string") {
      const migrated = (raw as string[]).map((s) => ({ skill: s, category: "Other Concepts" }));
      localStorage.setItem(SKILLS_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return raw as SavedSkill[];
  } catch {
    return [];
  }
}

export function saveSkill(skill: string, category: string): void {
  const skills = getSavedSkills().filter((s) => s.skill !== skill);
  localStorage.setItem(SKILLS_KEY, JSON.stringify([{ skill, category }, ...skills]));
  notify();
}

export function unsaveSkill(skill: string): void {
  const skills = getSavedSkills().filter((s) => s.skill !== skill);
  localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
  notify();
}

export function isSkillSaved(skill: string): boolean {
  return getSavedSkills().some((s) => s.skill === skill);
}

// Section order

const SECTION_ORDER_KEY = "joblens_section_order";

export function getSectionOrder(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SECTION_ORDER_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function setSectionOrder(order: string[]): void {
  localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(order));
  window.dispatchEvent(new Event("joblens:saved"));
}

// Reorder skills within a category — moves skill at oldIdx to newIdx, preserves other categories
export function reorderSkillsInCategory(category: string, oldIdx: number, newIdx: number): void {
  const all = getSavedSkills();
  // Find the positions of skills in this category within the full array
  const catPositions = all.reduce<number[]>((acc, s, i) => {
    if (s.category === category) acc.push(i);
    return acc;
  }, []);

  if (oldIdx >= catPositions.length || newIdx >= catPositions.length) return;

  // Build the reordered category slice
  const catSkills = catPositions.map((i) => all[i]);
  const [moved] = catSkills.splice(oldIdx, 1);
  catSkills.splice(newIdx, 0, moved);

  // Put them back into the full array at the same positions
  const updated = [...all];
  catPositions.forEach((pos, i) => { updated[pos] = catSkills[i]; });

  localStorage.setItem("joblens_saved_skills", JSON.stringify(updated));
  window.dispatchEvent(new Event("joblens:saved"));
}
