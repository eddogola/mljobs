"use client";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN = process.env.NEXT_PUBLIC_PERSONAL_TOKEN ?? "";

export interface PrepResource {
  id: string;
  title: string;
  url: string;
  resource_type: string | null;
  notes: string | null;
  skills: string[];
  completed: boolean;
  created_at: string;
}

export interface PrepResourceInput {
  title: string;
  url: string;
  resource_type?: string | null;
  notes?: string | null;
  skills?: string[];
}

function headers() {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (TOKEN) h["x-personal-token"] = TOKEN;
  return h;
}

export async function fetchPrepResources(): Promise<PrepResource[]> {
  const res = await fetch(`${BASE}/api/prep/resources`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch prep resources");
  return res.json();
}

export async function addPrepResource(input: PrepResourceInput): Promise<PrepResource> {
  const res = await fetch(`${BASE}/api/prep/resources`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to add prep resource");
  return res.json();
}

export async function updatePrepResource(
  id: string,
  patch: Partial<Pick<PrepResource, "title" | "url" | "resource_type" | "notes" | "skills" | "completed">>
): Promise<PrepResource> {
  const res = await fetch(`${BASE}/api/prep/resources/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update prep resource");
  return res.json();
}

export async function deletePrepResource(id: string): Promise<void> {
  await fetch(`${BASE}/api/prep/resources/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(),
  });
}

export async function reorderPrepResources(ids: string[]): Promise<void> {
  await fetch(`${BASE}/api/prep/resources/reorder`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ ids }),
  });
}
